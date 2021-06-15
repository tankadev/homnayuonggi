import { UserNote } from '../dto/order.dto';
import { Dish } from './delivery-detail-now-api.ro';

export class OrderRO extends Dish {
  userNotes: UserNote[];
  quantity: number;
}
