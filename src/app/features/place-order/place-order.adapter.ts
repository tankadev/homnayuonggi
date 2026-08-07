import { DeliveryRO } from '../../core/ro/delivery.ro';
import {
  DeliveryDetailNowAPI,
  Dish,
  SelectedOption,
} from '../../core/ro/delivery-detail-now-api.ro';
import { OrderRO } from '../../core/ro/order.ro';
import { OrderHistoryRO } from '../../core/ro/order-history.ro';
import { RoomRO } from '../../core/ro/room.ro';
import { UserRO } from '../../core/ro/user.ro';
import { orderedUnitPrice } from '../../core/utils/dish-price';

import {
  MockCartLine,
  MockDish,
  MockHistoryEntry,
  MockMember,
  MockMenuSection,
  MockOptionChoice,
  MockOptionGroup,
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

/** Normalise one option group into the UI model, tolerating all three shapes we
 *  can receive:
 *    - `/get-detail` today: `{ choices: [{ id, label, priceDelta, isDefault }] }`
 *    - `/extract-from-image` + the manual builder: same, but `absolutePrice`
 *    - deliveries created before the API normalised options, still sitting in
 *      Firebase: raw ShopeeFood `{ option_items: { min_select, max_select, items } }`
 *  Returns null when the group has nothing selectable. */
function mapOptionGroup(raw: any, index: number, basePrice: number): MockOptionGroup | null {
  if (!raw || typeof raw !== 'object') return null;

  /* Raw ShopeeFood: the item list is nested in an object, and item prices are
     surcharges under `price.value`. */
  const bucket = raw.option_items;
  const isRaw = !!bucket && !Array.isArray(bucket) && Array.isArray(bucket.items);
  const rawChoices: any[] = isRaw ? bucket.items : Array.isArray(raw.choices) ? raw.choices : [];
  if (!rawChoices.length) return null;

  const choices: MockOptionChoice[] = rawChoices
    .map((c: any, i: number) => {
      const label = String(c?.label ?? c?.name ?? '').trim();
      /* absolutePrice is a full price for the variant, so back it out into a
         delta — the modal adds deltas to the base price uniformly. */
      const absolute = c?.absolutePrice;
      const delta =
        absolute !== null && absolute !== undefined
          ? Number(absolute) - basePrice
          : Number(c?.priceDelta ?? c?.price?.value ?? 0);
      return {
        id: String(c?.id ?? label ?? i),
        label: label || 'Lựa chọn',
        delta: Number.isFinite(delta) ? delta : 0,
        isDefault: !!(c?.isDefault ?? c?.is_default),
      };
    })
    .filter((c) => !!c.label);
  if (!choices.length) return null;

  const min = Number(raw.minSelect ?? bucket?.min_select ?? (raw.required ? 1 : 0)) || 0;
  const rawMax = Number(raw.maxSelect ?? bucket?.max_select ?? 1);
  /* Clamp so a bad upstream value can never make max < min or exceed the list. */
  const max = Math.min(choices.length, Math.max(min, Number.isFinite(rawMax) ? rawMax : 1)) || 1;

  return {
    id: String(raw.id ?? raw.name ?? index),
    name: String(raw.name ?? '').trim() || 'Tùy chọn',
    min,
    max,
    /* `required` and `mandatory` are advisory; min is what actually gates. */
    required: min > 0,
    multi: max > 1,
    choices,
  };
}

function mapOptionGroups(d: Dish, basePrice: number): MockOptionGroup[] {
  const opts: any[] = (d.options as any) || [];
  if (!Array.isArray(opts)) return [];
  return opts
    .map((raw, i) => mapOptionGroup(raw, i, basePrice))
    .filter((g): g is MockOptionGroup => !!g);
}

/** Cheapest orderable price: base + the unavoidable surcharge of every required
 *  group (its `min` cheapest choices). Shown as "từ …đ" on the dish card. */
export function minPriceWithOptions(basePrice: number, groups: MockOptionGroup[]): number {
  return groups.reduce((sum, g) => {
    if (!g.required) return sum;
    const cheapest = [...g.choices].sort((a, b) => a.delta - b.delta).slice(0, g.min);
    return sum + cheapest.reduce((s, c) => s + c.delta, 0);
  }, basePrice);
}

/** Convert a Firebase Dish into the UI MockDish. */
export function mapDish(d: Dish): MockDish {
  const key = String(d.id ?? d.name);
  const discount = priceValue(d.discountPrice);
  const full = priceValue(d.price);
  const hasDiscount = discount > 0 && discount < full;
  const finalPrice = hasDiscount ? discount : full;
  const optionGroups = mapOptionGroups(d, finalPrice);
  return {
    id: key,
    name: d.name || '(không tên)',
    shortName: d.baseName || d.name || '(không tên)',
    desc: d.description || '',
    /* Only a fallback hint: dishes with a usable picker get the modal instead. */
    options: optionGroups.length ? undefined : summariseOptions(d.options),
    price: optionGroups.length ? minPriceWithOptions(finalPrice, optionGroups) : finalPrice,
    originalPrice: hasDiscount ? full : undefined,
    photoUrl: pickDishPhoto(d.photos),
    img: dishImageGradient(key),
    out: d.isAvailable === false || d.isDelete === true || d.isActive === false,
    votes: Number(d.totalLike || 0) || undefined,
    optionGroups: optionGroups.length ? optionGroups : undefined,
    basePrice: finalPrice,
    /* For a variant the key is composite (`123#45+67`); strip it back to the
       menu dish so the cart's "group by menu section" view still resolves. */
    baseId: baseDishId(key),
    picked: d.selectedOptions?.length
      ? d.selectedOptions.map((s) => ({ groupName: s.groupName, label: s.label, delta: s.delta }))
      : undefined,
  };
}

/** Build the composite cart key identifying one (dish × exact set of choices).
 *  Choice ids are sorted so the same picks always collapse onto the same line
 *  regardless of the order the user ticked them. */
export function dishLineKey(dishId: string, choiceIds?: string[] | null): string {
  if (!choiceIds || !choiceIds.length) return dishId;
  return `${dishId}#${[...choiceIds].sort().join('+')}`;
}

/** Split a composite cart key back into its base dish id. */
export function baseDishId(lineKey: string): string {
  const hash = lineKey.indexOf('#');
  return hash > 0 ? lineKey.slice(0, hash) : lineKey;
}

/** Every unit the cart can address: plain menu dishes (orderable as-is) plus one
 *  entry per ordered variant, read back from the orders themselves.
 *
 *  Variants can't be enumerated from the menu the way sizes once were — a dish
 *  with 4 option groups has thousands of combinations — so the orders are the
 *  source of truth for which ones actually exist. */
export function orderableDishes(
  menu: MockMenuSection[],
  orders: OrderRO[],
  roomKey: string,
): MockDish[] {
  const out: MockDish[] = [];
  const seen = new Set<string>();
  for (const s of menu) {
    for (const d of s.items) {
      if (d.optionGroups?.length) continue; // only reachable through a variant
      out.push(d);
      seen.add(d.id);
    }
  }
  for (const o of orders) {
    if (o.roomKey !== roomKey || !o.dish) continue;
    const id = String(o.dish.id ?? o.dish.name ?? o.key);
    if (seen.has(id)) continue;
    seen.add(id);
    const d = mapDish(o.dish);
    /* A placed line is charged exactly what was stored on it, and can't be
       re-configured in place. Orders written before options existed hold the
       plain menu dish, option groups and all — mapping those the normal way
       would re-price them at base + cheapest required choice and silently move
       money in a room that is already collecting. */
    out.push({ ...d, price: orderedUnitPrice(o.dish), optionGroups: undefined });
  }
  return out;
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
  /** Source menu photos the orderer uploaded (base64 dataURLs). Empty when URL-mode. */
  menuPhotos: string[];
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
    menuPhotos: delivery.menuPhotos || [],
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

/** Find an OrderRO whose dish.id matches the given composite cart key; null if none. */
export function findOrderByDish(orders: OrderRO[], roomKey: string, lineKey: string): OrderRO | null {
  for (const o of orders) {
    if (o.roomKey !== roomKey) continue;
    const oid = String(o.dish?.id ?? o.dish?.name ?? o.key);
    if (oid === lineKey) return o;
  }
  return null;
}

/** Find a dish from delivery.menus by base id (i.e. *not* the composite cart key). */
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

/** Clone a menu Dish into the variant persisted in OrderRO. The chosen options are
 *  collapsed into id/name/price so cart, history and payment-review — which all read
 *  the stored dish, not the menu — show and charge the right thing with no extra
 *  lookups. `selectedOptions` is kept alongside purely for display.
 *
 *  Deliberately does *not* keep `options`: the source groups are ~3KB per dish, and a
 *  stored variant that still carried them would re-render as if nothing was picked. */
export function buildOrderDish(
  base: Dish,
  lineKey: string,
  selections: SelectedOption[],
  finalPrice: number,
): Dish {
  if (!selections.length) return base;
  const clone: any = JSON.parse(JSON.stringify(base));
  clone.id = lineKey;
  clone.baseName = base.name || '';
  clone.name = `${base.name || ''} (${selections.map((s) => s.label).join(', ')})`.trim();
  clone.price = { text: String(finalPrice), unit: 'VND', value: finalPrice };
  /* payment-review prefers discountPrice over price, so a stale discount on a
     variant would undo the surcharge we just added. The discount is already
     folded into finalPrice. */
  clone.discountPrice = null;
  clone.selectedOptions = selections;
  clone.options = [];
  clone.hasSize = false;
  return clone as Dish;
}
