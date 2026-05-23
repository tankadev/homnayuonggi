export class OrderHistoryRO {
  key: string;
  action: number; // 0: add, 1: remove
  userId: string;
  dishName: string;
  createAt: string;
  roomKey: string;
}
