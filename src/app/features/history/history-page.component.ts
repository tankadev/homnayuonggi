import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';

import {
  Balance,
  calcBalances,
  classifyMyRole,
  dayLabel,
  HMember,
  HOrder,
  orderStatus,
  weekdayLabel,
} from './mock-data';
import { mapHistory } from './history.adapter';
import { PairEntry } from './pairs-card.component';
import { RangeFilter } from './filters-card.component';

import { AuthService } from '../../core/services/auth.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { PaymentPaidService } from '../../core/services/payment-paid.service';
import { RoomsService } from '../../core/services/rooms.service';
import { UserService } from '../../core/services/user.service';

type ListFilter = 'all' | 'owe' | 'owed' | 'settled';

interface DayGroup {
  dateKey: string;
  label: string;
  weekday: string;
  pretty: string;
  total: number;
  orders: HOrder[];
}

@Component({
  selector: 'app-history-page',
  standalone: false,
  templateUrl: './history-page.component.html',
  styleUrls: ['./history-page.component.scss'],
})
export class HistoryPageComponent implements OnInit, OnDestroy, AfterViewInit {
  @ViewChild('tabsBar') tabsBar?: ElementRef<HTMLElement>;
  @ViewChildren('tabBtn') tabBtns?: QueryList<ElementRef<HTMLButtonElement>>;

  /** Sliding pill backdrop position/size — computed from the active tab. */
  pillX = 0;
  pillW = 0;
  /** False until the first measurement lands — used to suppress the entrance
   *  transition (which would otherwise look like the pill is "growing in"). */
  pillReady = false;

  meId = '';

  range: RangeFilter = '7d';
  memberFilter = 'all';
  roomFilter = 'all';
  shopFilter = 'all';
  search = '';
  filter: ListFilter = 'all';

  paidOverrides: Record<string, boolean> = {};
  openMap: Record<string, boolean> = {};

  private rawOrders: HOrder[] = [];
  membersMap: Record<string, HMember> = {};
  private sub?: Subscription;

  constructor(
    private paymentPaidService: PaymentPaidService,
    private deliveryService: DeliveryService,
    private roomsService: RoomsService,
    private userService: UserService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    this.meId = this.auth.currentUser?.key || '';
    this.sub = combineLatest([
      this.paymentPaidService.getAll(),
      this.roomsService.getAll(),
      this.userService.getAll(),
      this.deliveryService.getAll(),
    ]).subscribe(([payments, rooms, users, deliveries]) => {
      /* Hide payments whose delivery is still in payment-review (delivery record
         still exists with isCompleted=true). Once the orderer presses "Tạo đơn mới"
         or "Xác nhận thanh toán đủ" the delivery is removed, then the payment
         shows up in history. */
      const inReview = new Set(
        deliveries
          .filter((d) => d.isCompleted === true)
          .map((d) => d.key),
      );
      const visible = payments.filter((p) => !inReview.has(p.deliveryId));
      const view = mapHistory(visible, rooms, users, this.meId || null);
      this.membersMap = view.members;
      this.rawOrders = view.orders;
    });
  }

  ngAfterViewInit(): void {
    /* rAF, not microtask — measurement must run AFTER Angular's CD has
       applied the .active class to the initial button. */
    requestAnimationFrame(() => this.updatePill());
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private updatePill(): void {
    const bar = this.tabsBar?.nativeElement;
    const btns = this.tabBtns?.toArray() || [];
    if (!bar || !btns.length) return;
    const active = btns.find((b) => b.nativeElement.classList.contains('active'));
    if (!active) return;
    const barRect = bar.getBoundingClientRect();
    const r = active.nativeElement.getBoundingClientRect();
    this.pillX = r.left - barRect.left;
    this.pillW = r.width;
    /* Enable transitions on the next frame so the FIRST positioning doesn't
       animate from 0/0 (which looks like the pill is "growing in"). */
    if (!this.pillReady) requestAnimationFrame(() => (this.pillReady = true));
  }

  /* ─── filter helpers ─────────────────────────────────────── */
  get memberOptions(): HMember[] {
    return Object.values(this.membersMap).filter((m) => m.id !== this.meId);
  }
  get roomOptions(): string[] {
    return Array.from(new Set(this.rawOrders.map((o) => o.room)));
  }
  get shopOptions(): string[] {
    return Array.from(new Set(this.rawOrders.map((o) => o.shop)));
  }

  get orders(): HOrder[] {
    return this.rawOrders.map((o) => ({
      ...o,
      payers: o.payers.map((p) => {
        const k = `${o.id}:${p.memberId}`;
        return this.paidOverrides[k] !== undefined ? { ...p, paid: this.paidOverrides[k] } : p;
      }),
    }));
  }

  get balance(): Balance {
    return calcBalances(this.orders, this.meId);
  }

  get owedOrderCount(): number {
    return this.orders.filter((o) => o.ownerId === this.meId && orderStatus(o).tag !== 'settled').length;
  }
  get oweOrderCount(): number {
    return this.orders.filter((o) => classifyMyRole(o, this.meId) === 'owe').length;
  }

  get peopleBalance(): { id: string; amt: number; member: HMember }[] {
    const bal = this.balance;
    return Object.entries(bal.map)
      .map(([id, amt]) => ({ id, amt, member: this.membersMap[id] }))
      .filter((p) => p.member)
      .sort((a, b) => Math.abs(b.amt) - Math.abs(a.amt));
  }

  get owedPairs(): PairEntry[] {
    return this.peopleBalance
      .filter((p) => p.amt > 0)
      .map((p) => ({
        ...p,
        unpaidOrders: this.orders.filter(
          (o) => o.ownerId === this.meId && o.payers.some((pp) => pp.memberId === p.id && !pp.paid),
        ).length,
      }));
  }
  get owePairs(): PairEntry[] {
    return this.peopleBalance
      .filter((p) => p.amt < 0)
      .map((p) => ({
        ...p,
        unpaidOrders: this.orders.filter(
          (o) => o.ownerId === p.id && o.payers.some((pp) => pp.memberId === this.meId && !pp.paid),
        ).length,
      }));
  }

  get allClearMembers(): HMember[] {
    const map = this.balance.map;
    return Object.values(this.membersMap).filter((m) => m.id !== this.meId && !map[m.id]);
  }

  get filteredOrders(): HOrder[] {
    const q = this.search.trim().toLowerCase();
    return this.orders.filter((o) => {
      if (q && !o.shop.toLowerCase().includes(q)) return false;
      if (this.memberFilter !== 'all') {
        const involves =
          o.ownerId === this.memberFilter || o.payers.some((p) => p.memberId === this.memberFilter);
        if (!involves) return false;
      }
      if (this.roomFilter !== 'all' && o.room !== this.roomFilter) return false;
      if (this.shopFilter !== 'all' && o.shop !== this.shopFilter) return false;
      const role = classifyMyRole(o, this.meId);
      const st = orderStatus(o);
      if (this.filter === 'owe') return role === 'owe';
      if (this.filter === 'owed') return o.ownerId === this.meId && st.tag !== 'settled';
      if (this.filter === 'settled') return st.tag === 'settled';
      return true;
    });
  }

  get groups(): DayGroup[] {
    const map = new Map<string, HOrder[]>();
    for (const o of this.filteredOrders) {
      if (!map.has(o.dateKey)) map.set(o.dateKey, []);
      map.get(o.dateKey)!.push(o);
    }
    return Array.from(map.entries()).map(([dateKey, orders]) => ({
      dateKey,
      label: dayLabel(dateKey),
      weekday: weekdayLabel(dateKey),
      pretty: dateKey.split('-').reverse().join('/'),
      total: orders.reduce((s, o) => s + o.total, 0),
      orders,
    }));
  }

  get counts() {
    let owe = 0;
    let owed = 0;
    let settled = 0;
    for (const o of this.orders) {
      const st = orderStatus(o);
      const role = classifyMyRole(o, this.meId);
      if (role === 'owe') owe++;
      if (o.ownerId === this.meId && st.tag !== 'settled') owed++;
      if (st.tag === 'settled') settled++;
    }
    return { all: this.orders.length, owe, owed, settled };
  }

  get totalOrders(): number {
    return this.orders.length;
  }
  get settledOrders(): number {
    return this.orders.filter((o) => orderStatus(o).tag === 'settled').length;
  }
  get roomsCount(): number {
    return new Set(this.orders.map((o) => o.room)).size;
  }

  setFilter(f: ListFilter): void {
    this.filter = f;
    requestAnimationFrame(() => this.updatePill());
  }

  isOpen(id: string): boolean {
    return !!this.openMap[id];
  }

  onToggleOpen(id: string): void {
    this.openMap = { ...this.openMap, [id]: !this.openMap[id] };
  }

  onTogglePaid(ev: { orderId: string; memberId: string; paid: boolean }): void {
    this.paidOverrides = { ...this.paidOverrides, [`${ev.orderId}:${ev.memberId}`]: ev.paid };
    /* Persist back to /paymentsPaid so other members see it. */
    void this.persistPaid(ev.orderId, ev.memberId, ev.paid);
  }

  /** Orderer confirms order is fully settled — wipe the /paymentsPaid record. */
  async onConfirmFullyPaid(orderId: string): Promise<void> {
    try {
      await this.paymentPaidService.remove(orderId);
    } catch {
      /* swallow — UI will refresh from the next snapshot */
    }
  }

  private async persistPaid(orderId: string, memberId: string, paid: boolean): Promise<void> {
    /* Fetch current payment record via the in-memory list (we don't have a getOne service). */
    const order = this.rawOrders.find((o) => o.id === orderId);
    if (!order) return;
    /* We need the latest usersPaid list — read it from the order's payers/owner combo. */
    const updated = [
      ...order.payers.map((p) => ({
        userId: p.memberId,
        moneyPaid: p.share,
        isPaid: p.memberId === memberId ? paid : p.paid,
      })),
      { userId: order.ownerId, moneyPaid: 0, isPaid: true },
    ];
    try {
      await this.paymentPaidService.update(orderId, { usersPaid: updated });
    } catch {
      /* swallow */
    }
  }

  trackByGroup = (_: number, g: DayGroup) => g.dateKey;
  trackByOrder = (_: number, o: HOrder) => o.id;
  trackByPair = (_: number, p: PairEntry) => p.id;
  trackByMember = (_: number, m: HMember) => m.id;
}
