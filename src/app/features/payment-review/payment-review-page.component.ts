import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';

import { calcShares, PrMember, PrOrder, PrShare, SplitMode } from './mock-data';
import { mapPaymentReview, pickActiveCompletedDelivery, pickPaymentForDelivery } from './payment-review.adapter';

import { AuthService } from '../../core/services/auth.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentPaidService } from '../../core/services/payment-paid.service';
import { UserService } from '../../core/services/user.service';
import { DeliveryRO } from '../../core/ro/delivery.ro';
import { OrderRO } from '../../core/ro/order.ro';
import { PaymentPaidRO } from '../../core/ro/payment-paid.ro';
import { RoomRO } from '../../core/ro/room.ro';

type Filter = 'all' | 'unpaid' | 'paid';

@Component({
  selector: 'app-payment-review-page',
  standalone: false,
  templateUrl: './payment-review-page.component.html',
  styleUrls: ['./payment-review-page.component.scss'],
})
export class PaymentReviewPageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() room: RoomRO | null = null;
  @Input() roomName = '';
  @Output() newOrder = new EventEmitter<void>();

  members: PrMember[] = [];
  order: PrOrder = blankOrder();
  splitMode: SplitMode = 'items';
  isOwner = false;

  paidMap: Record<string, boolean> = {};
  filter: Filter = 'all';

  newOrderOpen = false;

  private delivery: DeliveryRO | null = null;
  private payment: PaymentPaidRO | null = null;
  private rawOrders: OrderRO[] = [];
  private ordererId = '';

  private sub?: Subscription;

  constructor(
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private paymentPaidService: PaymentPaidService,
    private userService: UserService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.subscribe();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['room']) {
      this.sub?.unsubscribe();
      this.subscribe();
    }
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private subscribe(): void {
    if (!this.room) return;
    const meKey = this.auth.currentUser?.key || null;
    const roomKey = this.room.key;
    this.sub = combineLatest([
      this.deliveryService.getAll(),
      this.orderService.getListOrders(),
      this.userService.getAll(),
      this.paymentPaidService.getAll(),
    ]).subscribe(([deliveries, orders, users, payments]) => {
      const delivery = pickActiveCompletedDelivery(deliveries, roomKey);
      const payment = delivery ? pickPaymentForDelivery(payments, delivery.key, roomKey) : null;
      this.delivery = delivery;
      this.payment = payment;
      this.rawOrders = orders;
      const view = mapPaymentReview(this.room, delivery, orders, users, payment, meKey);
      if (!view) {
        this.members = [];
        this.order = blankOrder();
        this.splitMode = 'items';
        this.paidMap = {};
        this.isOwner = false;
        this.ordererId = '';
        return;
      }
      this.members = view.members;
      this.order = view.order;
      this.splitMode = view.splitMode;
      this.paidMap = view.paidMap;
      this.isOwner = view.isOwner;
      this.ordererId = view.ordererId;
    });
  }

  /* ─── derived view ────────────────────────────────────────── */
  get shares(): PrShare[] {
    return calcShares(this.members, this.order, this.splitMode);
  }
  get me(): PrShare | undefined {
    return this.shares.find((m) => m.me);
  }
  get payers(): PrShare[] {
    return this.shares.filter((m) => !m.owner);
  }
  get paidCount(): number {
    return this.payers.filter((m) => this.paidMap[m.id]).length;
  }
  get totalPayers(): number {
    return this.payers.length;
  }
  get pct(): number {
    return this.totalPayers === 0 ? 0 : Math.round((this.paidCount / this.totalPayers) * 100);
  }
  get unpaidTotal(): number {
    return this.payers.filter((m) => !this.paidMap[m.id]).reduce((s, m) => s + m.share, 0);
  }
  get payersTotal(): number {
    return this.payers.reduce((s, m) => s + m.share, 0);
  }
  get subtotal(): number {
    return this.members.reduce((s, m) => s + m.items.reduce((ss, it) => ss + it.qty * it.price, 0), 0);
  }
  get grand(): number {
    const fees = this.order.shipFee + this.order.serviceFee;
    const discount = this.order.voucher ? this.order.voucher.amount : 0;
    return this.subtotal + fees + discount;
  }
  get myPaid(): boolean {
    return !!(this.me && (this.me.owner || this.paidMap[this.me.id]));
  }
  get filtered(): PrShare[] {
    const list = this.shares.filter((m) => {
      if (this.filter === 'paid') return m.owner || this.paidMap[m.id];
      if (this.filter === 'unpaid') return !m.owner && !this.paidMap[m.id];
      return true;
    });
    return [...list].sort((a, b) => {
      if (a.me !== b.me) return a.me ? -1 : 1;
      const ap = a.owner || this.paidMap[a.id];
      const bp = b.owner || this.paidMap[b.id];
      if (ap !== bp) return ap ? 1 : -1;
      return 0;
    });
  }

  setFilter(f: Filter): void {
    this.filter = f;
  }

  async setSplitMode(m: SplitMode): Promise<void> {
    this.splitMode = m;
    if (!this.delivery || !this.isOwner) return;
    /* 0 = chia đều, 1 = chia theo món, 2 = tài trợ (not exposed here). */
    const type = m === 'equal' ? 0 : 1;
    try {
      await this.deliveryService.update(this.delivery.key, {
        splitMoney: { type, sponsorUserId: this.delivery.splitMoney?.sponsorUserId || '' },
      });
    } catch {
      /* swallow */
    }
  }

  async onTogglePaid(id: string): Promise<void> {
    if (!this.isOwner || !this.payment) {
      /* Optimistic local toggle even if no payment record. */
      this.paidMap = { ...this.paidMap, [id]: !this.paidMap[id] };
      return;
    }
    const next = !this.paidMap[id];
    this.paidMap = { ...this.paidMap, [id]: next };
    const updated = (this.payment.usersPaid || []).map((u) =>
      u.userId === id ? { ...u, isPaid: next } : u,
    );
    /* If the user wasn't in the list (e.g. joined late), append them with their computed share. */
    if (!updated.find((u) => u.userId === id)) {
      const share = this.shares.find((s) => s.id === id);
      updated.push({ userId: id, moneyPaid: share?.share || 0, isPaid: next });
    }
    try {
      await this.paymentPaidService.update(this.payment.key, { usersPaid: updated });
    } catch {
      /* swallow */
    }
  }

  trackByMember = (_: number, m: PrShare) => m.id;

  /** True iff there's a payment record AND every non-orderer in it is marked paid. */
  get isAllPaid(): boolean {
    if (!this.payment) return false;
    const others = (this.payment.usersPaid || []).filter((u) => u.userId !== this.ordererId);
    if (!others.length) return false;
    return others.every((u) => !!u.isPaid);
  }

  openNewOrder(): void {
    this.newOrderOpen = true;
  }

  /**
   * Orderer chose "Tạo đơn mới" — wipe the active delivery + cart + history feed so a fresh
   * poll can start in this room. Keep /paymentsPaid intact when members still owe; drop it
   * when every non-orderer has been marked paid so the record doesn't linger in RTDB.
   */
  async confirmNewOrder(): Promise<void> {
    this.newOrderOpen = false;
    if (this.payment) {
      const others = (this.payment.usersPaid || []).filter((u) => u.userId !== this.ordererId);
      const everyonePaid = !others.length || others.every((u) => !!u.isPaid);
      if (everyonePaid) {
        try {
          await this.paymentPaidService.remove(this.payment.key);
        } catch {
          /* swallow */
        }
      }
    }
    await this.cleanupForNextPoll();
    this.newOrder.emit();
  }

  /** Orderer pressed "Xác nhận thanh toán đủ" — everyone paid, delete the payment record too. */
  async confirmFullyPaid(): Promise<void> {
    if (this.payment) {
      try {
        await this.paymentPaidService.remove(this.payment.key);
      } catch {
        /* swallow */
      }
    }
    await this.cleanupForNextPoll();
    this.newOrder.emit();
  }

  /** Shared cleanup: drop delivery + orders for this room. /paymentsPaid handled by callers. */
  private async cleanupForNextPoll(): Promise<void> {
    if (!this.room) return;
    const roomKey = this.room.key;

    const orderTargets = this.rawOrders.filter((o) => o.roomKey === roomKey);
    await Promise.all(orderTargets.map((o) => this.orderService.deleteOrder(o.key)));

    if (this.delivery) {
      try {
        await this.deliveryService.remove(this.delivery.key);
      } catch {
        /* swallow */
      }
    }
  }

  paidAtFor(id: string): string | null {
    /* No timestamp persisted today — return null so the card hides the "đã trả lúc" line. */
    return this.paidMap[id] ? '' : null;
  }
}

function blankOrder(): PrOrder {
  return {
    shop: '—',
    shopSub: '',
    shopIcon: '🍚',
    shipFee: 0,
    serviceFee: 0,
    voucher: null,
    splitMode: 'items',
    paymentMethod: 'cash',
    bank: { name: '', acc: '', holder: '', branch: '' },
    momo: { phone: '', holder: '' },
  };
}
