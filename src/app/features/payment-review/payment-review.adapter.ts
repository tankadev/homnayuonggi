import { DeliveryRO } from '../../core/ro/delivery.ro';
import { OrderRO } from '../../core/ro/order.ro';
import { PaymentPaidRO } from '../../core/ro/payment-paid.ro';
import { RoomRO } from '../../core/ro/room.ro';
import { UserRO } from '../../core/ro/user.ro';

import { parseOwnerPayment } from '../../core/utils/payment-info';

import { PrItem, PrMember, PrOrder, SplitMode } from './mock-data';

const FALLBACK_PAYMENT: PrOrder = {
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

function initialOf(name: string): string {
  const n = (name || '').trim();
  if (!n) return '?';
  const head = n.split(/\s+/).pop() || n;
  return head[0]?.toUpperCase() || '?';
}

export interface PaymentReviewView {
  members: PrMember[];
  order: PrOrder;
  paidMap: Record<string, boolean>;
  isOwner: boolean;
  splitMode: SplitMode;
  ordererId: string;
}

/** Build the view-model from live Firebase records for a given room. */
export function mapPaymentReview(
  room: RoomRO | null,
  delivery: DeliveryRO | null,
  orders: OrderRO[],
  users: UserRO[],
  payment: PaymentPaidRO | null,
  meKey: string | null,
): PaymentReviewView | null {
  if (!room || !delivery) return null;

  const ordererId = delivery.assignUserId || delivery.userCreate || '';
  const userMap: Record<string, UserRO> = {};
  for (const u of users) userMap[u.key] = u;

  /* Aggregate cart by user from /orders for this room. */
  const itemsByUser: Record<string, PrItem[]> = {};
  for (const o of orders) {
    if (o.roomKey !== room.key) continue;
    const dish = o.dish;
    if (!dish) continue;
    const price = dish.discountPrice?.value || dish.price?.value || 0;
    for (const note of o.userNotes || []) {
      const list = (itemsByUser[note.userId] = itemsByUser[note.userId] || []);
      list.push({
        name: dish.name,
        qty: note.quantity || 0,
        price,
        note: note.content || undefined,
      });
    }
  }

  /* Build member rows. Include everyone who ordered + the orderer (even if empty). */
  const memberIds = new Set<string>(Object.keys(itemsByUser));
  if (ordererId) memberIds.add(ordererId);
  if (payment) for (const u of payment.usersPaid || []) memberIds.add(u.userId);

  const members: PrMember[] = Array.from(memberIds).map((uid) => {
    const u = userMap[uid];
    const name = u?.displayName || u?.username || '—';
    return {
      id: uid,
      name,
      initial: initialOf(name),
      phone: u?.phone || '',
      me: uid === meKey,
      owner: uid === ordererId,
      items: itemsByUser[uid] || [],
    };
  });
  /* Owner first, then me, then alphabetical for stability. */
  members.sort((a, b) => {
    if (a.owner !== b.owner) return a.owner ? -1 : 1;
    if (a.me !== b.me) return a.me ? -1 : 1;
    return a.name.localeCompare(b.name);
  });

  /* Map fees / split mode. */
  const splitType = delivery.splitMoney?.type ?? 0;
  const splitMode: SplitMode = splitType === 0 ? 'equal' : 'items';
  const discount = delivery.sponsorPrice ? -Math.abs(delivery.sponsorPrice) : 0;

  /* Payment details — read from orderer's saved payment list, fall back to their phone. */
  const ordererUser = userMap[ordererId];
  const pay = parseOwnerPayment(ordererUser?.payment);
  const ordererName = ordererUser?.displayName || ordererUser?.username || '';
  const momoPhone = pay.momo.phone || ordererUser?.phone || '';

  /* If we have any phone number, prefer MoMo so the user always sees a number to copy. */
  if (momoPhone) {
    pay.method = 'momo';
    pay.momo.phone = momoPhone;
  }

  /* Pick the widest shop photo if the scraper returned any. */
  const photos = delivery.delivery?.photos;
  const shopPhoto = photos && photos.length
    ? [...photos].sort((a, b) => (b.width || 0) - (a.width || 0))[0]?.value || null
    : null;

  const order: PrOrder = {
    shop: delivery.delivery?.name || FALLBACK_PAYMENT.shop,
    shopSub: delivery.delivery?.address || '',
    shopIcon: '🍚',
    shopPhoto,
    shipFee: delivery.shippingFee || 0,
    serviceFee: delivery.serviceFee || 0,
    voucher: discount < 0 ? { code: 'VOUCHER', amount: discount, desc: 'Giảm giá' } : null,
    splitMode,
    paymentMethod: pay.method,
    bank: { ...pay.bank, holder: pay.bank.holder || ordererName },
    momo: { ...pay.momo, phone: momoPhone, holder: pay.momo.holder || ordererName },
  };

  /* Paid map from PaymentPaid record. */
  const paidMap: Record<string, boolean> = {};
  if (payment) {
    for (const u of payment.usersPaid || []) paidMap[u.userId] = !!u.isPaid;
  }

  return {
    members,
    order,
    paidMap,
    isOwner: !!meKey && meKey === ordererId,
    splitMode,
    ordererId,
  };
}

/** Pick the most recent completed delivery for the room from the full list. */
export function pickActiveCompletedDelivery(deliveries: DeliveryRO[], roomKey: string): DeliveryRO | null {
  const candidates = deliveries
    .filter((d) => d.roomKey === roomKey && d.isCompleted === true)
    .sort((a, b) => (b.createDateTime || '').localeCompare(a.createDateTime || ''));
  return candidates[0] || null;
}

/**
 * Strict match by deliveryId. The previous "fallback to latest payment in room" was unsafe:
 * once place-order skips writing PaymentPaid (single-person orders or fully-paid sponsor mode),
 * the fallback would return an UNRELATED prior payment from the same room — leaking stale
 * paidMap / members into a fresh delivery's payment-review view.
 */
export function pickPaymentForDelivery(
  payments: PaymentPaidRO[],
  deliveryKey: string,
  _roomKey: string,
): PaymentPaidRO | null {
  return payments.find((p) => p.deliveryId === deliveryKey) || null;
}
