import { UserNote } from '../dto/order.dto';
import { Dish } from './delivery-detail-now-api.ro';

export class OrderRO {
  key: string;
  userNotes: UserNote[];
  dish: Dish;
}
