// Phase 1 mock data — shape-compatible with the React design (`data.js`).
// Once Phase 2 wires real Firebase data, replace this with subscriptions
// to OrderService / DeliveryService.

export interface MockMember {
  id: string;
  name: string;
  initial: string;
  me?: boolean;
  owner?: boolean;
}

export interface MockDishSize {
  label: string;
  price: number;
}

export interface MockDish {
  id: string;
  name: string;
  desc: string;
  options?: string;
  price: number;
  /** Original price (before discount), only set when a discount is applied. */
  originalPrice?: number;
  /** Real shop photo URL — when present, dish-menu renders it instead of the gradient. */
  photoUrl?: string;
  img: [string, string];
  out?: boolean;
  popular?: boolean;
  votes?: number;
  /** When present, this dish must be ordered by picking one of these sizes. The
   *  cart, history and payment-review treat each (dish × size) as its own line. */
  sizes?: MockDishSize[];
}

export interface MockMenuSection {
  id: string;
  name: string;
  items: MockDish[];
}

export interface MockVoucher {
  id: string;
  code: string;
  /** Full voucher description (from `voucher.content`). */
  desc: string;
  sub: string;
  /** Optional short highlight like "−30k" — not all scrapers provide an amount. */
  highlight?: string;
  /** Expiry text from the scraper (e.g. "31/05/2026"). */
  expired?: string;
}

export interface MockCartLine {
  memberId: string;
  dishId: string;
  qty: number;
  note: string;
}

export interface MockHistoryEntry {
  who: string;
  action: 'add' | 'remove' | 'edit';
  what: string;
  when: string;
  note?: string;
  me?: boolean;
}

export const MOCK_MEMBERS: MockMember[] = [
  { id: 'me', name: 'Chick',  initial: 'C', me: true, owner: true },
  { id: 'm1', name: 'Minh',   initial: 'M' },
  { id: 'm2', name: 'Linh',   initial: 'L' },
  { id: 'm3', name: 'Phương', initial: 'P' },
  { id: 'm4', name: 'Đạt',    initial: 'Đ' },
];

export const MOCK_VOUCHERS: MockVoucher[] = [
  { id: 'v1', code: 'HOMECREDIT',  desc: 'Giảm 30.000đ',       sub: 'trên giá món',   highlight: '30.000đ' },
  { id: 'v2', code: 'FREESHIP-CT', desc: 'Miễn phí giao hàng', sub: 'đơn từ 50.000đ', highlight: '0đ' },
  { id: 'v3', code: 'BUFFFOOD',    desc: 'Giảm 10%',           sub: 'tối đa 15.000đ', highlight: '10%' },
];

const C = {
  brown:   ['#a05a3a', '#5a3520'] as [string, string],
  amber:   ['#c98549', '#7e4a23'] as [string, string],
  olive:   ['#7a6f3a', '#43391a'] as [string, string],
  ginger:  ['#b87a3c', '#704620'] as [string, string],
  egg:     ['#d9a35a', '#8e5f24'] as [string, string],
  herb:    ['#5e7a3c', '#34481f'] as [string, string],
  charred: ['#5c3826', '#291710'] as [string, string],
  cream:   ['#caa479', '#7d5734'] as [string, string],
  soup:    ['#9a6533', '#5e3a18'] as [string, string],
};

export const MOCK_MENU: MockMenuSection[] = [
  {
    id: 'main',
    name: 'Món Mặn',
    items: [
      { id: 'd1', name: 'Cơm Sườn ram Mặn',   desc: 'Được bao gồm một phần canh, vui lòng chọn trong topping.', options: 'loại canh', price: 46000, img: C.brown,   votes: 12 },
      { id: 'd2', name: 'Cơm Thịt Kho tiêu',  desc: 'Được bao gồm một phần canh, vui lòng chọn trong topping.', options: 'loại canh', price: 46000, img: C.charred, votes: 7 },
      { id: 'd3', name: 'Cơm Ếch Kho sả ớt',  desc: 'Được bao gồm một phần canh, vui lòng chọn trong topping.', options: 'loại canh', price: 46000, img: C.herb,    out: true, votes: 3 },
      { id: 'd4', name: 'Cơm Vịt Kho Gừng',   desc: 'Được bao gồm một phần canh, vui lòng chọn trong topping.', options: 'loại canh', price: 46000, img: C.ginger,  votes: 5 },
      { id: 'd5', name: 'Cơm Thịt Kho Trứng', desc: 'Được bao gồm một phần canh, vui lòng chọn trong topping.', options: 'loại canh', price: 46000, img: C.egg,     out: true, votes: 9 },
      { id: 'd6', name: 'Cơm Gà Xối Mỡ',      desc: 'Cơm trắng, gà giòn rụm, kèm dưa leo, đồ chua và canh nhỏ.', options: 'loại canh', price: 48000, img: C.amber,   votes: 18 },
      { id: 'd7', name: 'Cơm Cá Kho Tộ',      desc: 'Cá lóc kho tộ đậm vị, dùng với cơm trắng và canh chua.',    options: 'loại canh', price: 52000, img: C.brown,   popular: true, votes: 24 },
    ],
  },
];

export const MOCK_INITIAL_CART: MockCartLine[] = [
  { memberId: 'm1', dishId: 'd1', qty: 1, note: 'không hành' },
  { memberId: 'm2', dishId: 'd1', qty: 1, note: 'thêm trứng ốp la' },
  { memberId: 'm4', dishId: 'd4', qty: 1, note: '' },
];

export const MOCK_HISTORY: MockHistoryEntry[] = [
  { who: 'Minh',   action: 'add',    what: 'Cơm Sườn ram Mặn',  when: '12:14' },
  { who: 'Linh',   action: 'add',    what: 'Cơm Sườn ram Mặn',  when: '12:13', note: 'thêm trứng ốp la' },
  { who: 'Đạt',    action: 'add',    what: 'Cơm Vịt Kho Gừng',  when: '12:11' },
  { who: 'Chick',  action: 'add',    what: 'Trà Đá',             when: '12:08', me: true },
  { who: 'Phương', action: 'remove', what: 'Cơm Thịt Kho tiêu', when: '12:05' },
  { who: 'Linh',   action: 'edit',   what: 'Trà Đá',             when: '12:02', note: 'ít đá' },
  { who: 'Minh',   action: 'add',    what: 'Cơm Sườn ram Mặn',  when: '11:58', note: 'không hành' },
  { who: 'Chick',  action: 'remove', what: 'Cơm Cá Kho Tộ',     when: '11:55', me: true },
  { who: 'Đạt',    action: 'add',    what: 'Cơm Vịt Kho Gừng',  when: '11:50' },
  { who: 'Phương', action: 'add',    what: 'Cơm Thịt Kho tiêu', when: '11:48' },
];

export const MOCK_SHOP = {
  name: 'Quán Cơm Thanh Hồng',
  rating: 4.5,
  reviews: '999+',
  address: '163H4 — KV1, Nguyễn Văn Cừ Nối Dài, P. An Khánh, Q. Ninh Kiều, Cần Thơ',
  url: 'https://shopeefood.vn/can-tho/thanh-hong-com-banh-xeo',
  avatarEmoji: '🍚',
};
