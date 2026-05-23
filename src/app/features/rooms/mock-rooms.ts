export interface MockRoomMember {
  initial: string;
  me?: boolean;
}

export interface MockRoom {
  id: string;
  name: string;
  desc?: string;
  shop?: string | null;
  icon?: string;
  initialLabel?: string;
  color: [string, string];
  status: 'live' | 'idle';
  private: boolean;
  members: MockRoomMember[];
}

export const MOCK_ROOMS: MockRoom[] = [
  {
    id: 'r1',
    name: 'Đặt đồ ăn',
    desc: 'Ăn uống là vô đây hết',
    shop: 'Quán Cơm Thanh Hồng',
    icon: '🍚',
    color: ['#c98549', '#7e4a23'],
    status: 'live',
    private: false,
    members: [
      { initial: 'C', me: true },
      { initial: 'M' },
      { initial: 'L' },
      { initial: 'P' },
    ],
  },
  {
    id: 'r2',
    name: 'Test',
    desc: 'Cà phê chiều thứ 6',
    shop: 'Highlands Coffee — Trà, Cafe',
    icon: '☕',
    color: ['#5a7a3c', '#2c4a1f'],
    status: 'live',
    private: false,
    members: [{ initial: 'Đ' }, { initial: 'T' }],
  },
  {
    id: 'r3',
    name: 'Test 2',
    desc: '',
    initialLabel: 'T2',
    color: ['#2f5a3b', '#1a3522'],
    status: 'idle',
    private: false,
    members: [],
  },
  {
    id: 'r4',
    name: 'Test 4',
    desc: '',
    initialLabel: 'T4',
    color: ['#2f5a3b', '#1a3522'],
    status: 'idle',
    private: true,
    members: [],
  },
  {
    id: 'r5',
    name: 'Cơm trưa Q3',
    desc: 'Trưa nay ai ăn cơm tấm?',
    shop: 'Cơm Tấm Phúc Lộc Thọ',
    icon: '🥩',
    color: ['#a05a3a', '#5a3520'],
    status: 'live',
    private: false,
    members: [{ initial: 'H' }, { initial: 'N' }, { initial: 'T' }, { initial: 'M' }, { initial: 'Q' }],
  },
  {
    id: 'r6',
    name: 'Trà sữa team Eng',
    desc: 'Mỗi tuần / một buổi',
    shop: 'Phúc Long — Trà & Cafe',
    icon: '🧋',
    color: ['#5e7a3c', '#34481f'],
    status: 'live',
    private: true,
    members: [{ initial: 'K' }, { initial: 'V' }, { initial: 'B' }],
  },
  {
    id: 'r7',
    name: 'Tối nay nhậu',
    desc: 'Hẹn nhau quán quen',
    initialLabel: 'TN',
    color: ['#a05a3a', '#5a3520'],
    status: 'idle',
    private: false,
    members: [],
  },
];
