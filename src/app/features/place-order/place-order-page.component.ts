import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';

import {
  MockCartLine,
  MockDish,
  MockHistoryEntry,
  MockMember,
  MockMenuSection,
  MockVoucher,
} from './mock-data';
import { RoomDraft } from './modals/room-draft';
import {
  findDishInDelivery,
  findOrderByDish,
  mapDelivery,
  mapDish,
  mapHistory,
  mapMembers,
  mapOrders,
} from './place-order.adapter';

import { AuthService } from '../../core/services/auth.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { OrderService } from '../../core/services/order.service';
import { OrderHistoryService } from '../../core/services/order-history.service';
import { PaymentPaidService } from '../../core/services/payment-paid.service';
import { UserService } from '../../core/services/user.service';
import { RoomsService } from '../../core/services/rooms.service';
import { CompleteOrderResult, paymentInfoToList } from './modals/complete-order-modal.component';
import { encryptPassword } from '../rooms/room-view';
import { OrderDTO, UserNote } from '../../core/dto/order.dto';
import { DeliveryRO } from '../../core/ro/delivery.ro';
import { OrderRO } from '../../core/ro/order.ro';
import { UserRO } from '../../core/ro/user.ro';
import { OrderHistoryRO } from '../../core/ro/order-history.ro';
import { RoomRO } from '../../core/ro/room.ro';

@Component({
  selector: 'app-place-order',
  standalone: false,
  templateUrl: './place-order-page.component.html',
  styleUrls: ['./place-order-page.component.scss'],
})
export class PlaceOrderPageComponent implements OnInit, OnChanges, OnDestroy {
  @Input() room: RoomRO | null = null;
  @Input() editRoomTrigger = 0;
  @Output() roomChanged = new EventEmitter<RoomRO>();
  @Output() orderCompleted = new EventEmitter<void>();

  /* ─── view models (rebuilt every snapshot) ────────────────── */
  shop = {
    name: '—',
    rating: 0,
    reviews: '—',
    address: '',
    url: '',
    avatarEmoji: '🍚',
    photoUrl: null as string | null,
  };
  members: MockMember[] = [];
  vouchers: MockVoucher[] = [];
  menu: MockMenuSection[] = [];
  history: MockHistoryEntry[] = [];
  cart: MockCartLine[] = [];

  totalSeconds = 0;
  secondsLeft = 0;

  /* ─── modal state ─────────────────────────────────────────── */
  editingNote: MockCartLine | null = null;
  cancelOpen = false;
  submitOpen = false;
  editRoomOpen = false;

  roomDraft: RoomDraft = {
    name: '',
    desc: '',
    private: false,
    password: '',
  };

  /* ─── raw refs kept for mutations ─────────────────────────── */
  private delivery: DeliveryRO | null = null;
  private rawOrders: OrderRO[] = [];
  private rawHistory: OrderHistoryRO[] = [];
  private userMap: Record<string, UserRO> = {};

  private tickId?: number;
  private sub?: Subscription;
  private lastTrigger = 0;
  /** Guard so we only emit orderCompleted once per delivery completion event. */
  private completionEmittedFor: string | null = null;
  /** Anchor used to recompute the countdown each tick, immune to snapshot churn. */
  private countdownAnchor: { createdAtMs: number; totalSec: number } | null = null;

  constructor(
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private orderHistoryService: OrderHistoryService,
    private paymentPaidService: PaymentPaidService,
    private userService: UserService,
    private roomsService: RoomsService,
    private auth: AuthService,
  ) {}

  ngOnInit(): void {
    if (this.room) this.refreshRoomDraft(this.room);
    this.subscribeAll();
    this.tickId = window.setInterval(() => this.tick(), 1000);
  }

  ngOnChanges(changes: SimpleChanges): void {
    const trig = changes['editRoomTrigger'];
    if (trig) {
      /* On first bind, baseline the counter so re-entering a room (where the parent's
         trigger is already > 0 from a previous edit click) doesn't auto-open the modal.
         Only treat *subsequent* increments as a real "open" intent. */
      if (trig.firstChange) {
        this.lastTrigger = trig.currentValue;
      } else if (trig.currentValue !== this.lastTrigger) {
        this.lastTrigger = trig.currentValue;
        this.editRoomOpen = true;
      }
    }
    if (changes['room'] && this.room) {
      this.refreshRoomDraft(this.room);
    }
  }

  ngOnDestroy(): void {
    if (this.tickId !== undefined) window.clearInterval(this.tickId);
    this.sub?.unsubscribe();
  }

  /* ─── derived getters used by template ────────────────────── */
  get allDishes(): MockDish[] {
    return this.menu.flatMap((s) => s.items);
  }
  trackBySection = (_: number, s: MockMenuSection) => s.id;
  get dishMap(): Record<string, MockDish> {
    return Object.fromEntries(this.allDishes.map((d) => [d.id, d]));
  }
  get memberMap(): Record<string, MockMember> {
    return Object.fromEntries(this.members.map((m) => [m.id, m]));
  }
  get myCart(): MockCartLine[] {
    const me = this.auth.currentUser?.key;
    if (!me) return [];
    return this.cart.filter((l) => l.memberId === me);
  }
  get subtotal(): number {
    return this.cart.reduce((s, l) => s + (this.dishMap[l.dishId]?.price || 0) * l.qty, 0);
  }

  /** True iff the logged-in user is the orderer assigned for this delivery. */
  get isOrderer(): boolean {
    const me = this.auth.currentUser?.key;
    if (!me || !this.delivery) return false;
    return this.delivery.assignUserId === me;
  }

  /** Display name of the assigned orderer — shown in cart-panel disabled tooltips. */
  get ordererName(): string {
    const uid = this.delivery?.assignUserId;
    if (!uid) return '';
    const u = this.userMap[uid];
    return u?.displayName || u?.username || '';
  }

  /** Payment array of the current logged-in user — passed to the complete-order modal
   *  so it pre-fills from the user's own profile rather than a shared localStorage cache. */
  get currentUserPayment() {
    const me = this.auth.currentUser;
    if (!me) return undefined;
    return this.userMap[me.key]?.payment || me.payment;
  }

  get currentUserName(): string {
    const me = this.auth.currentUser;
    if (!me) return '';
    const live = this.userMap[me.key];
    return live?.displayName || live?.username || me.displayName || me.username || '';
  }

  /* ─── live subscription ───────────────────────────────────── */
  private subscribeAll(): void {
    if (!this.room) return;
    this.sub = combineLatest([
      this.deliveryService.getAll(),
      this.orderService.getListOrders(),
      this.orderHistoryService.getAll(),
      this.userService.getAll(),
    ]).subscribe(([deliveries, orders, history, users]) => {
      this.apply(deliveries, orders, history, users);
    });
  }

  private apply(
    deliveries: DeliveryRO[],
    orders: OrderRO[],
    history: OrderHistoryRO[],
    users: UserRO[],
  ): void {
    if (!this.room) return;
    const roomKey = this.room.key;

    /* Pick latest active delivery for this room. */
    const forRoom = deliveries.filter((d) => d.roomKey === roomKey);
    const active = forRoom.find((d) => d.isCreate === true) || null;
    this.delivery = active;

    /* If delivery was just completed by someone else, bubble that up so the parent
       can navigate to payment-review. */
    if (active && active.isCompleted === true && this.completionEmittedFor !== active.key) {
      this.completionEmittedFor = active.key;
      this.orderCompleted.emit();
    }

    this.userMap = {};
    for (const u of users) this.userMap[u.key] = u;

    const me = this.auth.currentUser;
    const view = mapDelivery(active, Date.now());
    if (view) {
      this.shop = view.shop;
      this.menu = view.menu;
      this.vouchers = view.vouchers;
      this.totalSeconds = view.totalSeconds;
      /* Anchor the countdown to delivery's createDateTime + remainingTime so tick()
         recomputes it from Date.now() instead of decrementing a value that this
         snapshot would otherwise constantly reset. */
      const createdAtMs = active?.createDateTime ? Date.parse(active.createDateTime) : NaN;
      this.countdownAnchor = Number.isFinite(createdAtMs)
        ? { createdAtMs, totalSec: view.totalSeconds }
        : null;
      this.recomputeSecondsLeft();
    } else {
      /* Delivery vanished — reset menu so the user isn't confused. */
      this.shop = { name: '—', rating: 0, reviews: '—', address: '', url: '', avatarEmoji: '🍚', photoUrl: null };
      this.menu = [];
      this.vouchers = [];
      this.totalSeconds = 0;
      this.secondsLeft = 0;
      this.countdownAnchor = null;
    }
    this.members = mapMembers(users, me, this.room, active?.assignUserId || null);
    this.rawOrders = orders;
    this.cart = mapOrders(orders, roomKey);
    this.rawHistory = history;
    this.history = mapHistory(history, roomKey, this.userMap, me?.key ?? null);
  }

  private tick(): void {
    this.recomputeSecondsLeft();
  }

  private recomputeSecondsLeft(): void {
    if (!this.countdownAnchor) return;
    const elapsed = Math.floor((Date.now() - this.countdownAnchor.createdAtMs) / 1000);
    this.secondsLeft = Math.max(0, this.countdownAnchor.totalSec - elapsed);
  }

  /* ─── cart mutations ──────────────────────────────────────── */

  async onAdd(dishId: string): Promise<void> {
    const me = this.auth.currentUser;
    if (!me || !this.room) return;
    const dishMeta = findDishInDelivery(this.delivery, dishId);
    const existing = findOrderByDish(this.rawOrders, this.room.key, dishId);

    if (existing) {
      const notes = [...(existing.userNotes || [])];
      const idx = notes.findIndex((n) => n.userId === me.key);
      if (idx >= 0) {
        notes[idx] = { ...notes[idx], quantity: (notes[idx].quantity || 0) + 1 };
      } else {
        notes.push({ userId: me.key, content: '', quantity: 1 });
      }
      await this.orderService.updateOrder(existing.key, { userNotes: notes });
    } else {
      if (!dishMeta) return;
      const dto: OrderDTO = {
        roomKey: this.room.key,
        dish: dishMeta,
        userNotes: [{ userId: me.key, content: '', quantity: 1 }],
      };
      await this.orderService.addOrder(dto);
    }
    this.logHistory(0, this.dishName(dishId));
  }

  async onMinus(dishId: string): Promise<void> {
    const me = this.auth.currentUser;
    if (!me || !this.room) return;
    const existing = findOrderByDish(this.rawOrders, this.room.key, dishId);
    if (!existing) return;
    const notes = [...(existing.userNotes || [])];
    const idx = notes.findIndex((n) => n.userId === me.key);
    if (idx < 0) return;
    const cur = notes[idx];
    if ((cur.quantity || 0) <= 1) {
      notes.splice(idx, 1);
      if (notes.length === 0) {
        await this.orderService.deleteOrder(existing.key);
      } else {
        await this.orderService.updateOrder(existing.key, { userNotes: notes });
      }
      this.logHistory(1, this.dishName(dishId));
    } else {
      notes[idx] = { ...cur, quantity: cur.quantity - 1 };
      await this.orderService.updateOrder(existing.key, { userNotes: notes });
    }
  }

  /* ─── modal handlers ─────────────────────────────────────── */

  onEditNote(line: MockCartLine): void {
    this.editingNote = line;
  }

  async saveNote(note: string): Promise<void> {
    if (!this.editingNote || !this.room) return;
    const me = this.auth.currentUser;
    if (!me) return;
    const target = this.editingNote;
    const existing = findOrderByDish(this.rawOrders, this.room.key, target.dishId);
    if (existing) {
      const notes = [...(existing.userNotes || [])];
      const idx = notes.findIndex((n) => n.userId === me.key);
      if (idx >= 0) {
        notes[idx] = { ...notes[idx], content: note };
        await this.orderService.updateOrder(existing.key, { userNotes: notes });
        this.logHistory(2, this.dishName(target.dishId), note || undefined);
      }
    }
    this.editingNote = null;
  }

  askClear(): void {
    if (!this.delivery) return;
    this.cancelOpen = true;
  }

  /** Cancel the whole order — delete delivery + all room orders + this room's history feed. */
  async confirmClear(): Promise<void> {
    if (!this.room) return;
    this.cancelOpen = false;
    const roomKey = this.room.key;

    const orderTargets = this.rawOrders.filter((o) => o.roomKey === roomKey);
    await Promise.all(orderTargets.map((o) => this.orderService.deleteOrder(o.key)));

    /* Clear the room's order-history feed so a fresh poll starts with an empty log. */
    await this.orderHistoryService.removeForRoom(roomKey, this.rawHistory);

    if (this.delivery) {
      await this.deliveryService.remove(this.delivery.key);
    }
  }

  askSubmit(): void {
    if (!this.isOrderer || this.cart.length === 0) return;
    this.submitOpen = true;
  }

  async onSubmitDone(result: CompleteOrderResult): Promise<void> {
    this.submitOpen = false;
    if (!this.delivery || !this.room) {
      this.orderCompleted.emit();
      return;
    }

    /* Orderer (recipient of the money) — picked back in CreateOrderPage. */
    const ordererId =
      this.delivery.assignUserId || this.delivery.userCreate || this.auth.currentUser?.key || '';

    /* Persist the orderer's payment info on their /users record so payment-review
       (which reads userMap[ordererId].payment) can show MoMo / bank to other members.
       Only the orderer can submit, so auth.currentUser is the orderer here. */
    if (this.auth.currentUser?.key === ordererId) {
      try {
        await this.auth.patch({ payment: paymentInfoToList(result.payment) });
      } catch {
        /* swallow — payment persistence is best-effort */
      }
    }

    /* Type 0 = chia đều, 2 = người đặt tài trợ 100%. */
    const splitType = result.splitMode === 'sponsor' ? 2 : 0;

    try {
      await this.deliveryService.update(this.delivery.key, {
        shippingFee: result.shipping,
        serviceFee: result.serviceFee,
        sponsorPrice: result.discount,
        splitMoney: { type: splitType, sponsorUserId: splitType === 2 ? ordererId : '' },
        isCompleted: true,
      });
    } catch {
      /* swallow — UI moves on regardless */
    }

    /* Build per-member bill — must match payment-review's calcShares logic so history
       and payment-review show the same per-member numbers. */
    const subByMember: Record<string, number> = {};
    for (const line of this.cart) {
      const price = this.dishMap[line.dishId]?.price || 0;
      subByMember[line.memberId] = (subByMember[line.memberId] || 0) + price * line.qty;
    }
    const memberIds = Object.keys(subByMember);
    const n = Math.max(1, memberIds.length);
    const subtotalAll = Object.values(subByMember).reduce((s, v) => s + v, 0);

    let usersPaid: { userId: string; moneyPaid: number; isPaid: boolean }[];
    if (splitType === 2) {
      /* Sponsor: orderer ứng toàn bộ, người khác trả 0. */
      usersPaid = memberIds.map((uid) => ({
        userId: uid,
        moneyPaid: uid === ordererId ? result.total : 0,
        isPaid: uid === ordererId,
      }));
      /* Make sure orderer row exists even if they didn't order any dish. */
      if (!memberIds.includes(ordererId)) {
        usersPaid.push({ userId: ordererId, moneyPaid: result.total, isPaid: true });
      }
    } else {
      /* Equal mode = each pays for their own dishes + fees/discount chia đều theo đầu người.
         (Matches calcShares() in payment-review/mock-data.ts.) */
      const shipShare = Math.round(result.shipping / n);
      const serviceShare = Math.round(result.serviceFee / n);
      const discShare = Math.round(result.discount / n);
      usersPaid = memberIds.map((uid) => {
        const sub = subByMember[uid] || 0;
        const moneyPaid = Math.max(0, sub + shipShare + serviceShare - discShare);
        return { userId: uid, moneyPaid, isPaid: uid === ordererId };
      });
    }
    /* Silence the unused-var warning — subtotalAll is kept for future "items" split mode. */
    void subtotalAll;

    /* Skip writing /paymentsPaid when there's nothing to collect — i.e. only the orderer
       ordered, or sponsor mode where the orderer covers 100%. Saves an RTDB record that
       would just sit at "fully paid" and get deleted on the next action anyway. */
    const hasUnpaidPayer = usersPaid.some((u) => u.userId !== ordererId && !u.isPaid);
    if (hasUnpaidPayer) {
      try {
        /* Snapshot room name + shop photo so the history screen + payment-review still
           render correctly after the delivery record is later cleared. */
        const photos = this.delivery.delivery?.photos;
        const deliveryPhoto =
          (photos && photos.length
            ? [...photos].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.value
            : null) || this.shop.photoUrl || undefined;

        await this.paymentPaidService.create({
          roomId: this.room.key,
          roomName: this.room.name,
          orderDate: new Date().toISOString(),
          userOrderId: ordererId,
          deliveryId: this.delivery.key,
          deliveryName: this.delivery.delivery?.name || this.shop.name,
          deliveryAddress: this.delivery.delivery?.address || this.shop.address,
          ...(deliveryPhoto ? { deliveryPhoto } : {}),
          totalBill: result.total,
          usersPaid,
        });
      } catch (err) {
        /* Log so we can see if payment-record creation is silently failing — this is
           the root cause of "F5 mất trạng thái trả tiền" + "lịch sử không hiện đơn" if
           it ever fires. payment-review's onTogglePaid has a self-healing fallback. */
        console.error('[place-order] failed to create payment record', err);
      }
    }

    /* Cart action log is no longer useful once the bill is finalized — clear it so the
       next poll in this room starts with a fresh feed. */
    try {
      await this.orderHistoryService.removeForRoom(this.room.key, this.rawHistory);
    } catch {
      /* swallow */
    }

    this.orderCompleted.emit();
  }

  async saveRoom(updated: RoomDraft): Promise<void> {
    this.editRoomOpen = false;
    if (!this.room) return;
    const patch: any = {
      name: updated.name,
      description: updated.desc || '',
      isPrivate: updated.private,
    };
    if (updated.private && updated.password) {
      patch.password = encryptPassword(updated.password);
    } else if (!updated.private) {
      patch.password = '';
    }
    try {
      await this.roomsService.update(this.room.key, patch);
      const next: RoomRO = { ...this.room, ...patch };
      this.room = next;
      this.refreshRoomDraft(next);
      this.roomChanged.emit(next);
    } catch {
      /* swallow */
    }
  }

  /* ─── helpers ────────────────────────────────────────────── */

  private dishName(dishId: string): string {
    return this.allDishes.find((d) => d.id === dishId)?.name || dishId;
  }

  private logHistory(action: 0 | 1 | 2, what: string, note?: string): void {
    const me = this.auth.currentUser;
    if (!me || !this.room) return;
    void this.orderHistoryService.create({
      action,
      userId: me.key,
      dishName: what,
      createAt: new Date().toISOString(),
      roomKey: this.room.key,
      ...(note ? { note } : {}),
    });
  }

  private refreshRoomDraft(room: RoomRO): void {
    this.roomDraft = {
      name: room.name,
      desc: room.description,
      private: !!room.isPrivate,
      password: '',
    };
  }
}
