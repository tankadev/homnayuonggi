import { PaymentPaidRO } from '../../core/ro/payment-paid.ro';
import { RoomRO } from '../../core/ro/room.ro';
import { UserRO } from '../../core/ro/user.ro';
import { parseOwnerPayment } from '../../core/utils/payment-info';

import { HMember, HOrder, HPayer } from './mock-data';

function initialOf(name: string): string {
  const n = (name || '').trim();
  if (!n) return '?';
  const head = n.split(/\s+/).pop() || n;
  return head[0]?.toUpperCase() || '?';
}

function emojiForShop(name: string): string {
  const lo = (name || '').toLowerCase();
  if (/cơm|com/.test(lo)) return '🍚';
  if (/trà sữa|tocotoco|gongcha|milkbar/.test(lo)) return '🧋';
  if (/bún|pho|phở|hủ tiếu/.test(lo)) return '🍜';
  if (/cà phê|coffee|highlands|starbucks/.test(lo)) return '☕';
  if (/pizza|burger/.test(lo)) return '🍕';
  if (/bánh|cake|kem/.test(lo)) return '🍰';
  return '🍽️';
}

function timeFromIso(iso: string): { dateKey: string; date: string; time: string } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { dateKey: '', date: '', time: '' };
  const pad = (n: number) => String(n).padStart(2, '0');
  const dateKey = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  const date = `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  return { dateKey, date, time };
}

export interface HistoryView {
  members: Record<string, HMember>;
  orders: HOrder[];
}

export function mapHistory(
  payments: PaymentPaidRO[],
  rooms: RoomRO[],
  users: UserRO[],
  meKey: string | null,
): HistoryView {
  const userMap: Record<string, UserRO> = {};
  for (const u of users) userMap[u.key] = u;
  const roomMap: Record<string, RoomRO> = {};
  for (const r of rooms) roomMap[r.key] = r;

  const members: Record<string, HMember> = {};
  const addMember = (uid: string) => {
    if (!uid || members[uid]) return;
    const u = userMap[uid];
    const name = u?.displayName || u?.username || '—';
    members[uid] = {
      id: uid,
      name,
      initial: initialOf(name),
      phone: u?.phone || '',
      payments: parseOwnerPayment(u?.payment, u?.phone, name).lines,
    };
  };
  if (meKey) addMember(meKey);

  const orders: HOrder[] = payments
    .map((p) => {
      const ts = timeFromIso(p.orderDate);
      /* Prefer the snapshot stored on the payment record, then fall back to live /rooms
         (room may have been renamed) so we still get something if the snapshot is missing. */
      const roomName = p.roomName || roomMap[p.roomId]?.name || '—';
      addMember(p.userOrderId);
      const payers: HPayer[] = (p.usersPaid || [])
        .filter((u) => u.userId !== p.userOrderId)
        .map((u) => {
          addMember(u.userId);
          return { memberId: u.userId, share: u.moneyPaid || 0, paid: !!u.isPaid };
        });
      return {
        id: p.key,
        shop: p.deliveryName || '—',
        shopIcon: emojiForShop(p.deliveryName),
        shopPhoto: p.deliveryPhoto || undefined,
        room: roomName,
        dateKey: ts.dateKey,
        date: ts.date,
        time: ts.time,
        ownerId: p.userOrderId,
        total: p.totalBill || 0,
        payers,
      } as HOrder;
    })
    /* Only show orders the current user actually participates in. */
    .filter((o) => {
      if (!meKey) return true;
      if (o.ownerId === meKey) return true;
      return o.payers.some((p) => p.memberId === meKey);
    })
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey) || b.time.localeCompare(a.time));

  return { members, orders };
}
