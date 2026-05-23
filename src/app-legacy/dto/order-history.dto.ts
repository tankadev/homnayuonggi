export class OrderHistoryDTO {
  action: number; // 0: add, 1: remove
  userId: string;
  dishName: string;
  createAt: string;
  roomKey: string;
}
