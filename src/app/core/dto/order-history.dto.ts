export class OrderHistoryDTO {
  action: number; // 0: add, 1: remove, 2: edit
  userId: string;
  dishName: string;
  createAt: string;
  roomKey: string;
  note?: string;
}
