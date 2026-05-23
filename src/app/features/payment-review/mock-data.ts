export type SplitMode = 'items' | 'equal';
export type PayMethod = 'bank' | 'momo' | 'cash';

export interface PrItem {
  name: string;
  qty: number;
  price: number;
  note?: string;
}

export interface PrMember {
  id: string;
  name: string;
  initial: string;
  phone: string;
  me?: boolean;
  owner?: boolean;
  items: PrItem[];
}

export interface PrShare extends PrMember {
  sub: number;
  ship: number;
  service: number;
  disc: number;
  share: number;
}

export interface PrOrder {
  shop: string;
  shopSub: string;
  shopIcon: string;
  /** Shop avatar URL (from delivery.delivery.photos) — when present, order-info-card shows the image. */
  shopPhoto?: string | null;
  shipFee: number;
  serviceFee: number;
  voucher: { code: string; amount: number; desc: string } | null;
  splitMode: SplitMode;
  paymentMethod: PayMethod;
  bank: { name: string; acc: string; holder: string; branch: string };
  momo: { phone: string; holder: string };
}

export const PR_MEMBERS: PrMember[] = [
  {
    id: 'me', name: 'Chick', initial: 'C', phone: '0775 854 815',
    me: true, owner: true,
    items: [
      { name: 'Cơm Cá Kho Tộ', qty: 1, price: 52000, note: 'thêm cơm' },
      { name: 'Trà Đá', qty: 1, price: 5000 },
    ],
  },
  {
    id: 'm1', name: 'Minh', initial: 'M', phone: '0901 234 567',
    items: [
      { name: 'Cơm Sườn ram Mặn', qty: 1, price: 46000, note: 'không hành' },
      { name: 'Trà Đá', qty: 2, price: 5000, note: 'ít đá' },
    ],
  },
  {
    id: 'm2', name: 'Linh', initial: 'L', phone: '0908 765 432',
    items: [
      { name: 'Cơm Sườn ram Mặn', qty: 1, price: 46000, note: 'thêm trứng ốp la' },
    ],
  },
  {
    id: 'm4', name: 'Đạt', initial: 'Đ', phone: '0912 345 678',
    items: [
      { name: 'Cơm Vịt Kho Gừng', qty: 1, price: 46000 },
    ],
  },
];

export const PR_ORDER: PrOrder = {
  shop: 'Quán Cơm Thanh Hồng',
  shopSub: 'Cần Thơ · Cơm tấm, cơm bento',
  shopIcon: '🍚',
  shipFee: 25000,
  serviceFee: 5000,
  voucher: { code: 'HOMECREDIT', amount: -30000, desc: 'Giảm 30.000đ trên giá món' },
  splitMode: 'items',
  paymentMethod: 'bank',
  bank: { name: 'Vietcombank', acc: '0123 456 789', holder: 'NGUYEN THI CHICK', branch: 'CN Cần Thơ' },
  momo: { phone: '0775 854 815', holder: 'Nguyễn Thị Chick' },
};

export function calcShares(members: PrMember[], order: PrOrder, mode: SplitMode): PrShare[] {
  const itemsSubs = members.map((m) => m.items.reduce((s, it) => s + it.qty * it.price, 0));
  const subtotal = itemsSubs.reduce((s, v) => s + v, 0);
  const discount = order.voucher ? order.voucher.amount : 0;
  const fees = order.shipFee + order.serviceFee;
  const grand = subtotal + fees + discount;
  const N = members.length;

  return members.map((m, i) => {
    const sub = itemsSubs[i];
    let ship: number, service: number, disc: number;
    if (mode === 'equal') {
      /* Equal mode = each person pays for their own dishes, fees & discount split equally. */
      ship = Math.round(order.shipFee / N);
      service = Math.round(order.serviceFee / N);
      disc = Math.round(discount / N);
    } else {
      /* Items mode = pay for own dishes, fees & discount split proportionally to subtotal. */
      const r = subtotal === 0 ? 1 / N : sub / subtotal;
      ship = Math.round(order.shipFee * r);
      service = Math.round(order.serviceFee * r);
      disc = Math.round(discount * r);
    }
    const share = sub + ship + service + disc;
    return { ...m, sub, ship, service, disc, share };
  });
}
