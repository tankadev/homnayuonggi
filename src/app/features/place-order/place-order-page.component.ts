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
  baseDishId,
  buildOrderDish,
  dishLineKey,
  findDishInDelivery,
  findOrderByDish,
  mapDelivery,
  mapDish,
  mapHistory,
  mapMembers,
  mapOrders,
  orderableDishes,
} from './place-order.adapter';
import { DishAddEvent } from './dish-menu.component';
import { DishOptionsResult } from './modals/dish-options-modal.component';

import { AuthService } from '../../core/services/auth.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { OrderService } from '../../core/services/order.service';
import { OrderHistoryService } from '../../core/services/order-history.service';
import { PaymentPaidService } from '../../core/services/payment-paid.service';
import { UserService } from '../../core/services/user.service';
import { RoomsService } from '../../core/services/rooms.service';
import { LocalStorageService } from '../../core/services/localstorage.service';
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
  menuPhotos: string[] = [];
  history: MockHistoryEntry[] = [];
  cart: MockCartLine[] = [];

  totalSeconds = 0;
  secondsLeft = 0;

  /** Cart-list display mode — persisted per user in localStorage. */
  cartViewMode: 'flat' | 'menu' = 'flat';

  /** Free-text dish filter for the menu column. */
  dishQuery = '';

  /* ─── modal state ─────────────────────────────────────────── */
  editingNote: MockCartLine | null = null;
  /** Dish whose option picker is open, if any. */
  optionsDish: MockDish | null = null;
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
    private storage: LocalStorageService,
  ) {}

  ngOnInit(): void {
    if (this.room) this.refreshRoomDraft(this.room);
    this.cartViewMode = this.storage.getCartViewMode();
    /* Paint immediately from the last cached snapshot so F5 doesn't flash a blank
       3-col layout while waiting for the 4 combineLatest streams to all resolve. */
    this.hydrateFromCache();
    this.subscribeAll();
    this.tickId = window.setInterval(() => this.tick(), 1000);
  }

  onCartViewModeChange(mode: 'flat' | 'menu'): void {
    this.cartViewMode = mode;
    this.storage.setCartViewMode(mode);
  }

  private hydrateFromCache(): void {
    if (!this.room) return;
    const deliveries = this.safeReadArray<DeliveryRO>(() => this.storage.getDeliveriesList());
    const orders = this.safeReadArray<OrderRO>(() => this.storage.getOrdersList());
    const history = this.safeReadArray<OrderHistoryRO>(() => this.storage.getOrdersHistory());
    const users = this.safeReadArray<UserRO>(() => this.storage.getListUser());
    /* Only worth hydrating when we at least have a delivery for this room cached —
       otherwise apply() would just paint empty and there's no point. */
    if (deliveries.some((d) => d.roomKey === this.room!.key)) {
      this.apply(deliveries, orders, history, users);
    }
  }

  private safeReadArray<T>(read: () => T[] | null | undefined): T[] {
    try {
      const v = read();
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
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
    /* Plain menu dishes plus one entry per ordered variant, so cart lookups by
       composite key (`${dishId}#${choiceIds}`) resolve. Variants come from the
       orders rather than the menu — a dish with 4 option groups has far too many
       combinations to enumerate up front. The menu UI still iterates
       section.items, which keep `optionGroups` for the picker. */
    return orderableDishes(this.menu, this.rawOrders, this.room?.key || '');
  }
  trackBySection = (_: number, s: MockMenuSection) => s.id;

  /** Menu sections filtered by `dishQuery` (matches dish name/desc/options; keeps a
   *  section only if it still has matching items). Empty query → full menu. */
  get filteredMenu(): MockMenuSection[] {
    const q = this.dishQuery.trim().toLowerCase();
    if (!q) return this.menu;
    return this.menu
      .map((s) => ({
        ...s,
        items: s.items.filter((d) =>
          [d.name, d.desc, d.options, ...(d.optionGroups || []).map((g) => g.name)].some((f) =>
            (f || '').toLowerCase().includes(q),
          ),
        ),
      }))
      .filter((s) => s.items.length > 0);
  }
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
      /* Keep the cache warm so the next F5 can hydrate. */
      this.storage.setDeliveriesList(deliveries);
      this.storage.setOrdersList(orders);
      this.storage.setOrdersHistory(history);
      this.storage.setUserList(users);
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
      this.menuPhotos = view.menuPhotos;
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
      this.menuPhotos = [];
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

  /** Dish card asked for the option picker. Cheap guard: if the source dish
   *  vanished from the delivery we'd have nothing to price against. */
  onPick(d: MockDish): void {
    if (!d.optionGroups?.length || d.out) return;
    if (!findDishInDelivery(this.delivery, d.id)) return;
    this.optionsDish = d;
  }

  /** User confirmed a set of options — one cart line per distinct combination,
   *  priced at base + surcharges so cart / bill / history need no menu lookup. */
  async onOptionsConfirm(res: DishOptionsResult): Promise<void> {
    const dish = this.optionsDish;
    this.optionsDish = null;
    if (!dish) return;
    /* Pass the name explicitly: the variant's cart entry only exists once the
       orders snapshot round-trips through Firebase, so dishName() would still
       resolve to the raw line key at this point. */
    const name = `${dish.shortName || dish.name} (${res.selections.map((s) => s.label).join(', ')})`;
    await this.addPortions(dish.id, res.qty, res, name);
  }

  async onAdd(ev: DishAddEvent | string): Promise<void> {
    const lineKey = this.normalizeEvent(ev);
    await this.addPortions(lineKey, 1, null);
  }

  /** Add `qty` portions of one cart line for the current user. `opts` is set only
   *  when the line is being created from the option picker. */
  private async addPortions(
    lineKeyOrDishId: string,
    qty: number,
    opts: DishOptionsResult | null,
    displayName?: string,
  ): Promise<void> {
    const me = this.auth.currentUser;
    if (!me || !this.room || qty <= 0) return;
    const lineKey = opts ? dishLineKey(lineKeyOrDishId, opts.choiceIds) : lineKeyOrDishId;
    const existing = findOrderByDish(this.rawOrders, this.room.key, lineKey);
    /* Resolved before the write: the orders snapshot can round-trip during the
       await, and a variant's name is only derivable from its own order. */
    const name = displayName || this.dishName(lineKey);

    if (existing) {
      const notes = [...(existing.userNotes || [])];
      const idx = notes.findIndex((n) => n.userId === me.key);
      if (idx >= 0) {
        notes[idx] = { ...notes[idx], quantity: (notes[idx].quantity || 0) + qty };
      } else {
        notes.push({ userId: me.key, content: '', quantity: qty });
      }
      await this.orderService.updateOrder(existing.key, { userNotes: notes });
    } else {
      /* A line key with no order yet can only be built from its base dish. */
      const dishMeta = findDishInDelivery(this.delivery, baseDishId(lineKey));
      if (!dishMeta) return;
      const variant = opts
        ? buildOrderDish(dishMeta, lineKey, opts.selections, opts.price)
        : dishMeta;
      const dto: OrderDTO = {
        roomKey: this.room.key,
        dish: variant,
        userNotes: [{ userId: me.key, content: '', quantity: qty }],
      };
      await this.orderService.addOrder(dto);
    }
    this.logHistory(0, name);
  }

  async onMinus(ev: DishAddEvent | string): Promise<void> {
    const me = this.auth.currentUser;
    if (!me || !this.room) return;
    const lineKey = this.normalizeEvent(ev);
    const existing = findOrderByDish(this.rawOrders, this.room.key, lineKey);
    if (!existing) return;
    const notes = [...(existing.userNotes || [])];
    const idx = notes.findIndex((n) => n.userId === me.key);
    if (idx < 0) return;
    const cur = notes[idx];
    if ((cur.quantity || 0) <= 1) {
      /* Resolve the name up front: a variant's name lives on its own order, so
         once the delete lands and the orders snapshot round-trips there is
         nothing left to look it up from. */
      const name = this.dishName(lineKey);
      notes.splice(idx, 1);
      if (notes.length === 0) {
        await this.orderService.deleteOrder(existing.key);
      } else {
        await this.orderService.updateOrder(existing.key, { userNotes: notes });
      }
      this.logHistory(1, name);
    } else {
      notes[idx] = { ...cur, quantity: cur.quantity - 1 };
      await this.orderService.updateOrder(existing.key, { userNotes: notes });
    }
  }

  /** cart-panel emits a bare `string` line key, dish-menu emits a DishAddEvent.
   *  Both already carry the full cart line key (composite or plain). */
  private normalizeEvent(ev: DishAddEvent | string): string {
    return typeof ev === 'string' ? ev : ev.dishId;
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

    /* splitMoney.type: 0 = chia đều (legacy / set explicitly by payment-review toggle),
       1 = chia theo món (default for new non-sponsor orders), 2 = người đặt tài trợ 100%. */
    const splitType = result.splitMode === 'sponsor' ? 2 : 1;

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
      /* Items mode (default) = pay for own dishes, fees/discount split proportionally to
         subtotal. Matches calcShares() with mode='items' in payment-review/mock-data.ts so
         the snapshot bill stays aligned with what payment-review displays by default. */
      usersPaid = memberIds.map((uid) => {
        const sub = subByMember[uid] || 0;
        const r = subtotalAll === 0 ? 1 / n : sub / subtotalAll;
        const moneyPaid = Math.max(
          0,
          Math.round(sub + result.shipping * r + result.serviceFee * r - result.discount * r),
        );
        return { userId: uid, moneyPaid, isPaid: uid === ordererId };
      });
    }

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

  /** Display name for a cart line key. Falls back through the order and then the
   *  menu so a raw composite key (`123#45+67`) can never reach the history feed. */
  private dishName(lineKey: string): string {
    const hit = this.allDishes.find((d) => d.id === lineKey);
    if (hit) return hit.name;
    const order = findOrderByDish(this.rawOrders, this.room?.key || '', lineKey);
    if (order?.dish?.name) return order.dish.name;
    return findDishInDelivery(this.delivery, baseDishId(lineKey))?.name || lineKey;
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
