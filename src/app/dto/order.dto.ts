import { Dish } from "../ro/delivery-detail-now-api.ro";

export class OrderDTO extends Dish {
    userNotes: UserNote[];
    quantity: number;
}

export class UserNote {
  userId: string;
  content: string;
}
