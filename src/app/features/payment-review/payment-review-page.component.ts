import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  Output,
  QueryList,
  SimpleChanges,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';

import { calcShares, PrMember, PrOrder, PrShare, SplitMode } from './mock-data';
import { mapPaymentReview, pickActiveCompletedDelivery, pickPaymentForDelivery } from './payment-review.adapter';

import { AuthService } from '../../core/services/auth.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { OrderService } from '../../core/services/order.service';
import { PaymentPaidService } from '../../core/services/payment-paid.service';
import { UserService } from '../../core/services/user.service';
import { LocalStorageService } from '../../core/services/localstorage.service';
import { UserRO } from '../../core/ro/user.ro';
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
export class PaymentReviewPageComponent implements OnInit, OnChanges, OnDestroy, AfterViewInit {
  @Input() room: RoomRO | null = null;
  @Input() roomName = '';
  @Output() newOrder = new EventEmitter<void>();

  @ViewChild('tabsBar') tabsBar?: ElementRef<HTMLElement>;
  @ViewChildren('tabBtn') tabBtns?: QueryList<ElementRef<HTMLButtonElement>>;

  members: PrMember[] = [];
  order: PrOrder = blankOrder();
  splitMode: SplitMode = 'items';
  isOwner = false;

  paidMap: Record<string, boolean> = {};
  filter: Filter = 'all';

  newOrderOpen = false;

  /** Underline indicator pos/width — driven by ViewChild on the active tab. */
  underlineX = 0;
  underlineW = 0;
  /** Suppresses the initial transition so the underline doesn't grow from 0. */
  underlineReady = false;

  /** Confetti burst — pieces rendered while celebrating; cleared after ~3s. */
  confettiPieces: ConfettiPiece[] = [];
  /** Drives the banner glow-pulse class for ~2 cycles. */
  bannerGlow = false;
  /** Tracks the prior isAllPaid so we only fire celebration on false→true. */
  private prevAllPaid = false;
  /** First snapshot establishes the baseline — we don't celebrate on mount. */
  private celebrationArmed = false;

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
    private storage: LocalStorageService,
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

  ngAfterViewInit(): void {
    /* Initial underline position once the view has rendered. */
    requestAnimationFrame(() => this.updateUnderline());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private subscribe(): void {
    if (!this.room) return;
    const meKey = this.auth.currentUser?.key || null;
    const roomKey = this.room.key;

    /* Paint immediately from the last cached snapshot so F5 doesn't blink the cards
       to empty for ~0.5s while the 4 RTDB streams roundtrip. */
    this.hydrateFromCache(roomKey, meKey);

    this.sub = combineLatest([
      this.deliveryService.getAll(),
      this.orderService.getListOrders(),
      this.userService.getAll(),
      this.paymentPaidService.getAll(),
    ]).subscribe(([deliveries, orders, users, payments]) => {
      this.applySnapshot(deliveries, orders, users, payments, roomKey, meKey);
      this.storage.setDeliveriesList(deliveries);
      this.storage.setOrdersList(orders);
      this.storage.setUserList(users);
      this.storage.setPaymentsPaid(payments);
    });
  }

  private hydrateFromCache(roomKey: string, meKey: string | null): void {
    const deliveries = this.safeReadArray<DeliveryRO>(() => this.storage.getDeliveriesList());
    const completed = pickActiveCompletedDelivery(deliveries, roomKey);
    if (!completed) return;
    const orders = this.safeReadArray<OrderRO>(() => this.storage.getOrdersList());
    const users = this.safeReadArray<UserRO>(() => this.storage.getListUser());
    const payments = this.safeReadArray<PaymentPaidRO>(() => this.storage.getPaymentsPaid());
    this.applySnapshot(deliveries, orders, users, payments, roomKey, meKey);
  }

  private applySnapshot(
    deliveries: DeliveryRO[],
    orders: OrderRO[],
    users: UserRO[],
    payments: PaymentPaidRO[],
    roomKey: string,
    meKey: string | null,
  ): void {
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
    this.checkCelebration(this.isAllPaid);
  }

  private safeReadArray<T>(read: () => T[] | null | undefined): T[] {
    try {
      const v = read();
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
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
    /* Wait for the .active class to land on the new button before measuring. */
    requestAnimationFrame(() => this.updateUnderline());
  }

  /** Position the sliding underline under the active tab. */
  private updateUnderline(): void {
    const bar = this.tabsBar?.nativeElement;
    const btns = this.tabBtns?.toArray() || [];
    if (!bar || !btns.length) return;
    const active = btns.find((b) => b.nativeElement.classList.contains('active'));
    if (!active) return;
    const barRect = bar.getBoundingClientRect();
    const r = active.nativeElement.getBoundingClientRect();
    this.underlineX = r.left - barRect.left;
    this.underlineW = r.width;
    if (!this.underlineReady) requestAnimationFrame(() => (this.underlineReady = true));
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
    if (!this.isOwner) {
      /* Non-orderer fallback — keep the local toggle so the readonly UI updates visually. */
      this.paidMap = { ...this.paidMap, [id]: !this.paidMap[id] };
      return;
    }
    const next = !this.paidMap[id];
    this.paidMap = { ...this.paidMap, [id]: next };

    /* No payment record exists yet (e.g. place-order's create silently failed at finalize).
       Build one from the current shares + delivery snapshot so the toggle persists and
       the entry shows up in /paymentsPaid / history. Without this, the toggle would only
       live in memory and F5 would lose it. */
    if (!this.payment) {
      await this.createPaymentRecord(id, next);
      return;
    }

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
    } catch (err) {
      /* Log so the failure is visible — revert the optimistic local toggle. */
      console.error('[payment-review] failed to update usersPaid', err);
      this.paidMap = { ...this.paidMap, [id]: !next };
    }
  }

  /** Build a /paymentsPaid record from the live delivery + shares when none exists yet. */
  private async createPaymentRecord(toggledId: string, toggledPaid: boolean): Promise<void> {
    if (!this.room || !this.delivery) return;
    const ordererId = this.ordererId;
    const usersPaid = this.shares.map((s) => ({
      userId: s.id,
      moneyPaid: s.share || 0,
      isPaid: s.id === ordererId ? true : s.id === toggledId ? toggledPaid : false,
    }));
    /* Make sure orderer row exists even if they didn't order any dish. */
    if (ordererId && !usersPaid.find((u) => u.userId === ordererId)) {
      usersPaid.push({ userId: ordererId, moneyPaid: 0, isPaid: true });
    }
    const photos = this.delivery.delivery?.photos;
    const deliveryPhoto =
      (photos && photos.length
        ? [...photos].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.value
        : null) || this.order.shopPhoto || undefined;
    try {
      await this.paymentPaidService.create({
        roomId: this.room.key,
        roomName: this.room.name,
        orderDate: this.delivery.createDateTime || new Date().toISOString(),
        userOrderId: ordererId,
        deliveryId: this.delivery.key,
        deliveryName: this.delivery.delivery?.name || this.order.shop,
        deliveryAddress: this.delivery.delivery?.address || this.order.shopSub,
        ...(deliveryPhoto ? { deliveryPhoto } : {}),
        totalBill: this.grand,
        usersPaid,
      });
    } catch (err) {
      console.error('[payment-review] failed to create payment record on toggle', err);
      /* Revert optimistic local toggle. */
      this.paidMap = { ...this.paidMap, [toggledId]: !toggledPaid };
    }
  }

  trackByMember = (_: number, m: PrShare) => m.id;
  trackConfetti = (_: number, p: ConfettiPiece) => p.id;

  /** True iff there's a payment record AND every non-orderer in it is marked paid. */
  get isAllPaid(): boolean {
    if (!this.payment) return false;
    const others = (this.payment.usersPaid || []).filter((u) => u.userId !== this.ordererId);
    if (!others.length) return false;
    return others.every((u) => !!u.isPaid);
  }

  /**
   * Detects a fresh false→true transition of isAllPaid and fires the
   * confetti burst + banner glow. Called from the template via a side-effect
   * binding; using a getter here avoids zoning a separate subscription.
   */
  checkCelebration(allPaid: boolean): void {
    if (this.celebrationArmed && allPaid && !this.prevAllPaid) this.celebrate();
    this.prevAllPaid = allPaid;
    this.celebrationArmed = true;
  }

  private celebrate(): void {
    this.spawnConfetti();
    this.bannerGlow = true;
    /* Glow runs 2 cycles × ~900ms each = ~1.8s, then clear so the class can
       re-apply on a subsequent celebration (e.g., user toggled off then on). */
    window.setTimeout(() => (this.bannerGlow = false), 2000);
  }

  private spawnConfetti(): void {
    const palette = [
      'var(--primary)',
      'var(--amber)',
      'var(--accent, var(--primary))',
      'var(--rose, var(--primary))',
      'color-mix(in oklab, var(--primary) 60%, var(--amber))',
    ];
    const pieces: ConfettiPiece[] = [];
    for (let i = 0; i < 24; i++) {
      pieces.push({
        id: i,
        color: palette[i % palette.length],
        left: 30 + Math.random() * 40, // start in middle 40% of the column
        dx: (Math.random() - 0.5) * 280, // ±140px horizontal drift
        dy: 280 + Math.random() * 240, // 280–520px fall
        rot: (Math.random() - 0.5) * 1200, // ±600deg
        delay: Math.random() * 150,
        size: 6 + Math.random() * 6,
        round: Math.random() > 0.6,
      });
    }
    this.confettiPieces = pieces;
    window.setTimeout(() => (this.confettiPieces = []), 2800);
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

}

interface ConfettiPiece {
  id: number;
  color: string;
  /** Starting x as a % of the confetti container width. */
  left: number;
  /** Horizontal drift in px applied via CSS var --dx. */
  dx: number;
  /** Vertical fall distance in px applied via CSS var --dy. */
  dy: number;
  /** Rotation amount applied via CSS var --rot. */
  rot: number;
  delay: number;
  size: number;
  /** Round pieces vs square — adds variety. */
  round: boolean;
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
