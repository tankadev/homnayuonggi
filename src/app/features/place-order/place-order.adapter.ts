import { DeliveryRO } from '../../core/ro/delivery.ro';
import { DeliveryDetailNowAPI, Dish } from '../../core/ro/delivery-detail-now-api.ro';
import { OrderRO } from '../../core/ro/order.ro';
import { OrderHistoryRO } from '../../core/ro/order-history.ro';
import { RoomRO } from '../../core/ro/room.ro';
import { UserRO } from '../../core/ro/user.ro';

import {
  MockCartLine,
  MockDish,
  MockHistoryEntry,
  MockMember,
  MockMenuSection,
  MockVoucher,
} from './mock-data';

/** Stable color pairs picked deterministically from a dish key. */
const DISH_COLOR_PAIRS: [string, string][] = [
  ['#a05a3a', '#5a3520'],
  ['#c98549', '#7e4a23'],
  ['#7a6f3a', '#43391a'],
  ['#b87a3c', '#704620'],
  ['#d9a35a', '#8e5f24'],
  ['#5e7a3c', '#34481f'],
  ['#5c3826', '#291710'],
  ['#caa479', '#7d5734'],
  ['#9a6533', '#5e3a18'],
];

function djbHash(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = (h * 33) ^ s.charCodeAt(i);
  return h >>> 0;
}

export function dishImageGradient(key: string): [string, string] {
  return DISH_COLOR_PAIRS[djbHash(key) % DISH_COLOR_PAIRS.length];
}

function priceValue(p?: Dish['price']): number {
  if (!p) return 0;
  if (typeof p === 'number') return p as unknown as number;
  return Number(p.value || 0);
}

/** Pick the widest photo URL from a dish's photo list. */
function pickDishPhoto(photos?: Dish['photos']): string | undefined {
  if (!photos || !photos.length) return undefined;
  const best = [...photos].sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  return best?.value || undefined;
}

/** Flatten the variable Shopee-style options array into a short pill label. */
function summariseOptions(options: any): string | undefined {
  if (!options || !Array.isArray(options) || !options.length) return undefined;
  const names = options
    .map((o: any) => o?.name || o?.label || o?.title || '')
    .filter((s: string) => !!s)
    .slice(0, 2);
  if (!names.length) return undefined;
  const extra = options.length - names.length;
  return extra > 0 ? `${names.join(', ')} +${extra}` : names.join(', ');
}

/** Convert a Firebase Dish into the UI MockDish. */
export function mapDish(d: Dish): MockDish {
  const key = String(d.id ?? d.name);
  const discount = priceValue(d.discountPrice);
  const full = priceValue(d.price);
  const hasDiscount = discount > 0 && discount < full;
  const finalPrice = hasDiscount ? discount : full;
  return {
    id: key,
    name: d.name || '(không tên)',
    desc: d.description || '',
    options: summariseOptions(d.options),
    price: finalPrice,
    originalPrice: hasDiscount ? full : undefined,
    photoUrl: pickDishPhoto(d.photos),
    img: dishImageGradient(key),
    out: d.isAvailable === false || d.isDelete === true || d.isActive === false,
    votes: Number(d.totalLike || 0) || undefined,
  };
}

export interface PlaceOrderViewState {
  shop: {
    name: string;
    rating: number;
    reviews: string;
    address: string;
    url: string;
    avatarEmoji: string;
    photoUrl: string | null;
  };
  menu: MockMenuSection[];
  vouchers: MockVoucher[];
  /** Total seconds the room started with (for the countdown ring max). */
  totalSeconds: number;
  /** Seconds remaining at the moment of mapping. */
  secondsLeft: number;
}

/** Map a delivery RO + the now timestamp into shop/menu/voucher view models. */
export function mapDelivery(delivery: DeliveryRO | null, now = Date.now()): PlaceOrderViewState | null {
  if (!delivery) return null;
  const api: DeliveryDetailNowAPI | undefined = delivery.delivery as DeliveryDetailNowAPI | undefined;

  const menu: MockMenuSection[] = (api?.menus || []).map((m, idx) => ({
    id: String(m.id ?? `m-${idx}`),
    name: m.name || 'Thực đơn',
    items: (m.dishes || []).map(mapDish),
  }));

  const vouchers: MockVoucher[] = (api?.voucher || []).map((v: any, idx: number) => {
    const amt = v.discount || v.amount || v.value;
    return {
      id: String(v.code || `v-${idx}`),
      code: String(v.code || 'VOUCHER'),
      desc: String(v.content || v.desc || ''),
      sub: '',
      highlight: amt ? String(amt) : undefined,
      expired: v.expired ? String(v.expired) : undefined,
    };
  });

  /* Countdown: legacy stores remainingTime in ms snapshot at creation; clamp by createDateTime. */
  const total = Math.max(0, Math.floor((delivery.remainingTime || 0) / 1000));
  const createdAt = delivery.createDateTime ? Date.parse(delivery.createDateTime) : NaN;
  const elapsedSec = Number.isFinite(createdAt) ? Math.max(0, Math.floor((now - createdAt) / 1000)) : 0;
  const left = Math.max(0, total - elapsedSec);

  return {
    shop: {
      name: api?.name || 'Quán chưa có tên',
      rating: Number(api?.rating || 0),
      reviews: String(api?.displayTotalReview || '—'),
      address: api?.address || '',
      url: api?.url || '',
      avatarEmoji: pickShopEmoji(api?.name || ''),
      photoUrl: pickShopPhoto(api),
    },
    menu,
    vouchers,
    totalSeconds: total,
    secondsLeft: left,
  };
}

const SHOP_ICON_MAP: Array<[RegExp, string]> = [
  [/cà ?phê|coffee|highlands|starbucks/i, '☕'],
  [/trà ?sữa|milk ?tea|tocotoco|gong cha|phúc long/i, '🧋'],
  [/trà(?! ?sữa)|tea/i, '🍵'],
  [/phở|bún bò|bún|noodle|mì|ramen/i, '🍜'],
  [/pizza|burger|gà rán/i, '🍕'],
  [/sushi|nhật/i, '🍣'],
  [/bánh mì/i, '🥖'],
  [/kem|ice ?cream/i, '🍦'],
  [/nước ?ép|sinh tố|juice/i, '🥤'],
  [/cơm/i, '🍚'],
];
function pickShopEmoji(name: string): string {
  for (const [re, e] of SHOP_ICON_MAP) if (re.test(name)) return e;
  return '🍚';
}

/** Pick the widest shop photo from the scraped delivery payload. */
function pickShopPhoto(api: DeliveryDetailNowAPI | undefined): string | null {
  const photos = api?.photos;
  if (!photos || !photos.length) return null;
  const best = [...photos].sort((a, b) => (b.width || 0) - (a.width || 0))[0];
  return best?.value || null;
}

/** Flatten orders+userNotes into one MockCartLine per (member × dish) pair. */
export function mapOrders(orders: OrderRO[], roomKey: string): MockCartLine[] {
  const out: MockCartLine[] = [];
  for (const o of orders) {
    if (o.roomKey !== roomKey) continue;
    const dishId = String(o.dish?.id ?? o.dish?.name ?? o.key);
    for (const note of o.userNotes || []) {
      if ((note.quantity || 0) <= 0) continue;
      out.push({
        memberId: note.userId,
        dishId,
        qty: note.quantity,
        note: note.content || '',
      });
    }
  }
  return out;
}

/** Build a MockMember list from /users. `owner` flags the assigned orderer for this delivery. */
export function mapMembers(
  users: UserRO[],
  me: UserRO | null,
  _room: RoomRO | null,
  ordererId: string | null = null,
): MockMember[] {
  return users.map((u) => ({
    id: u.key,
    name: u.displayName || u.username || '(không tên)',
    initial: ((u.displayName || u.username || '?').charAt(0) || '?').toUpperCase(),
    me: !!me && u.key === me.key,
    owner: !!ordererId && u.key === ordererId,
  }));
}

const ACTION_LABEL: Record<number, MockHistoryEntry['action']> = {
  0: 'add',
  1: 'remove',
  2: 'edit',
};

function hhmm(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

/** Map raw history rows (filtered to this room) into the cart history feed view. */
export function mapHistory(
  history: OrderHistoryRO[],
  roomKey: string,
  userMap: Record<string, UserRO>,
  meKey: string | null,
): MockHistoryEntry[] {
  return history
    .filter((h) => h.roomKey === roomKey)
    .sort((a, b) => (b.createAt || '').localeCompare(a.createAt || ''))
    .map((h) => ({
      who: userMap[h.userId]?.displayName || userMap[h.userId]?.username || '?',
      action: ACTION_LABEL[h.action] ?? 'add',
      what: h.dishName,
      when: hhmm(h.createAt),
      note: h.note,
      me: !!meKey && h.userId === meKey,
    }));
}

/** Find an OrderRO whose dish.id (or name) matches the given dishId; null if none. */
export function findOrderByDish(orders: OrderRO[], roomKey: string, dishId: string): OrderRO | null {
  for (const o of orders) {
    if (o.roomKey !== roomKey) continue;
    const oid = String(o.dish?.id ?? o.dish?.name ?? o.key);
    if (oid === dishId) return o;
  }
  return null;
}

/** Find a dish from delivery.menus by id. */
export function findDishInDelivery(delivery: DeliveryRO | null, dishId: string): Dish | null {
  if (!delivery?.delivery?.menus) return null;
  for (const m of delivery.delivery.menus) {
    for (const d of m.dishes || []) {
      const key = String(d.id ?? d.name);
      if (key === dishId) return d;
    }
  }
  return null;
}
