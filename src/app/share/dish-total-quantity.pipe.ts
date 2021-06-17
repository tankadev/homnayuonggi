import { Pipe, PipeTransform } from '@angular/core';
import { UserNote } from '../dto/order.dto';

@Pipe({
  name: 'dishTotalQuantity'
})
export class DishTotalQuantityPipe implements PipeTransform {

  transform(userOrders: UserNote[]): number {
    let total = 0;
    userOrders.forEach(item => {
      total += item.quantity;
    });
    return total;
  }

}
