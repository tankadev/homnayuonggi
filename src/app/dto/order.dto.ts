import { Dish } from '../ro/delivery-detail-now-api.ro';

export class OrderDTO {
  userNotes?: UserNote[];
  dish?: Dish;
}

export class UserNote {
  userId: string;
  content: string;
  quantity: number;
}
