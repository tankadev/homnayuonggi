import { PaymentLine } from '../../core/utils/payment-info';

export interface HMember {
  id: string;
  name: string;
  initial: string;
  phone?: string;
  /** Display-ready payment methods (how to pay this person), owner-relevant. */
  payments?: PaymentLine[];
}

export interface HPayer {
  memberId: string;
  share: number;
  paid: boolean;
  paidAt?: string;
  overdue?: boolean;
}

export interface HOrder {
  id: string;
  shop: string;
  shopIcon: string;
  /** Optional real shop photo URL — preferred over the emoji when available. */
  shopPhoto?: string;
  room: string;
  dateKey: string; // yyyy-mm-dd
  date: string;
  time: string;
  ownerId: string;
  total: number;
  payers: HPayer[];
}

export interface OrderStatus {
  tag: 'settled' | 'partial' | 'pending';
  label: string;
  paid: number;
  total: number;
}

export type MyRole = 'owner' | 'paid' | 'owe' | 'n/a';

export interface Balance {
  /** memberId → net amount me-receives (positive = they owe me, negative = I owe them) */
  map: Record<string, number>;
  totalOwedToMe: number;
  totalIOwe: number;
  net: number;
  nOwedToMe: number;
  nIOwe: number;
}

export const ME_ID = 'me';

export const H_MEMBERS: Record<string, HMember> = {
  me: { id: 'me', name: 'Chick', initial: 'C' },
  m1: { id: 'm1', name: 'Minh', initial: 'M' },
  m2: { id: 'm2', name: 'Linh', initial: 'L' },
  m3: { id: 'm3', name: 'Hoa', initial: 'H' },
  m4: { id: 'm4', name: 'Đạt', initial: 'Đ' },
  m5: { id: 'm5', name: 'Tâm', initial: 'T' },
  m6: { id: 'm6', name: 'Bảo', initial: 'B' },
};

export const H_ORDERS: HOrder[] = [
  {
    id: 'o-0523-1',
    shop: 'Quán Cơm Thanh Hồng',
    shopIcon: '🍚',
    room: 'Test',
    dateKey: '2026-05-23',
    date: '23/05/2026',
    time: '11:42',
    ownerId: 'me',
    total: 221000,
    payers: [
      { memberId: 'm1', share: 62000, paid: false },
      { memberId: 'm2', share: 51000, paid: true, paidAt: '12:38, 23/05' },
      { memberId: 'm4', share: 51000, paid: false },
    ],
  },
  {
    id: 'o-0523-2',
    shop: 'Trà sữa TocoToco',
    shopIcon: '🧋',
    room: 'Marketing',
    dateKey: '2026-05-23',
    date: '23/05/2026',
    time: '15:10',
    ownerId: 'm1',
    total: 158000,
    payers: [
      { memberId: 'me', share: 40000, paid: false },
      { memberId: 'm2', share: 38000, paid: false },
      { memberId: 'm3', share: 42000, paid: true, paidAt: '15:55, 23/05' },
      { memberId: 'm4', share: 38000, paid: true, paidAt: '15:30, 23/05' },
    ],
  },
  {
    id: 'o-0522-1',
    shop: 'Bún Bò Huế Cô Ba',
    shopIcon: '🍜',
    room: 'Test',
    dateKey: '2026-05-22',
    date: '22/05/2026',
    time: '12:05',
    ownerId: 'me',
    total: 268000,
    payers: [
      { memberId: 'm1', share: 60000, paid: true, paidAt: '13:20, 22/05' },
      { memberId: 'm2', share: 55000, paid: true, paidAt: '12:48, 22/05' },
      { memberId: 'm3', share: 65000, paid: true, paidAt: '14:02, 22/05' },
      { memberId: 'm4', share: 60000, paid: true, paidAt: '13:55, 22/05' },
    ],
  },
  {
    id: 'o-0521-1',
    shop: 'Cà phê Highlands',
    shopIcon: '☕',
    room: 'Marketing',
    dateKey: '2026-05-21',
    date: '21/05/2026',
    time: '09:18',
    ownerId: 'm2',
    total: 184000,
    payers: [
      { memberId: 'me', share: 48000, paid: true, paidAt: '10:15, 21/05' },
      { memberId: 'm1', share: 45000, paid: false },
      { memberId: 'm3', share: 45000, paid: false },
      { memberId: 'm4', share: 46000, paid: true, paidAt: '11:22, 21/05' },
    ],
  },
  {
    id: 'o-0520-1',
    shop: 'Pizza Hut Cần Thơ',
    shopIcon: '🍕',
    room: 'Team Dev',
    dateKey: '2026-05-20',
    date: '20/05/2026',
    time: '18:45',
    ownerId: 'm3',
    total: 482000,
    payers: [
      { memberId: 'me', share: 96000, paid: false, overdue: true },
      { memberId: 'm1', share: 95000, paid: true, paidAt: '19:20, 20/05' },
      { memberId: 'm2', share: 96000, paid: true, paidAt: '19:33, 20/05' },
      { memberId: 'm4', share: 98000, paid: false, overdue: true },
      { memberId: 'm5', share: 97000, paid: true, paidAt: '20:01, 20/05' },
    ],
  },
  {
    id: 'o-0518-1',
    shop: 'Cơm Tấm Sài Gòn',
    shopIcon: '🥘',
    room: 'Test',
    dateKey: '2026-05-18',
    date: '18/05/2026',
    time: '11:30',
    ownerId: 'me',
    total: 165000,
    payers: [
      { memberId: 'm1', share: 55000, paid: true, paidAt: '12:01, 18/05' },
      { memberId: 'm3', share: 55000, paid: true, paidAt: '13:44, 18/05' },
      { memberId: 'm6', share: 55000, paid: false, overdue: true },
    ],
  },
];

export function calcBalances(orders: HOrder[], meId: string): Balance {
  const map: Record<string, number> = {};
  let totalOwedToMe = 0;
  let totalIOwe = 0;
  const countersOwedToMe = new Set<string>();
  const countersIOwe = new Set<string>();

  for (const o of orders) {
    if (o.ownerId === meId) {
      for (const p of o.payers) {
        if (p.paid) continue;
        map[p.memberId] = (map[p.memberId] || 0) + p.share;
        totalOwedToMe += p.share;
        countersOwedToMe.add(p.memberId);
      }
    } else {
      const mine = o.payers.find((p) => p.memberId === meId);
      if (mine && !mine.paid) {
        map[o.ownerId] = (map[o.ownerId] || 0) - mine.share;
        totalIOwe += mine.share;
        countersIOwe.add(o.ownerId);
      }
    }
  }
  return {
    map,
    totalOwedToMe,
    totalIOwe,
    net: totalOwedToMe - totalIOwe,
    nOwedToMe: countersOwedToMe.size,
    nIOwe: countersIOwe.size,
  };
}

export function orderStatus(o: HOrder): OrderStatus {
  const paid = o.payers.filter((p) => p.paid).length;
  const total = o.payers.length;
  if (paid === total) return { tag: 'settled', label: 'Đã đối soát', paid, total };
  if (paid > 0) return { tag: 'partial', label: 'Đang chia', paid, total };
  return { tag: 'pending', label: 'Chờ thanh toán', paid: 0, total };
}

export function classifyMyRole(o: HOrder, meId: string): MyRole {
  if (o.ownerId === meId) return 'owner';
  const mine = o.payers.find((p) => p.memberId === meId);
  if (mine) return mine.paid ? 'paid' : 'owe';
  return 'n/a';
}

export function dayLabel(dateKey: string): string {
  const today = '2026-05-23';
  const yest = '2026-05-22';
  if (dateKey === today) return 'Hôm nay';
  if (dateKey === yest) return 'Hôm qua';
  const [y, m, d] = dateKey.split('-');
  return `${d}/${m}/${y}`;
}

export function weekdayLabel(dateKey: string): string {
  const dt = new Date(dateKey);
  const wd = ['Chủ nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
  return wd[dt.getDay()] || '';
}
