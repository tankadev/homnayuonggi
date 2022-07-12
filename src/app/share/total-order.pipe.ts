import { DecimalPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { OrderRO } from '../ro/order.ro';
import { RoomRO } from '../ro/room.ro';
import { LocalStorageService } from '../services/localstorage.service';
import { DishTotalQuantityPipe } from './dish-total-quantity.pipe';

@Pipe({
  name: 'totalOrder'
})
export class TotalOrderPipe implements PipeTransform {

  constructor(
    private storage: LocalStorageService,
    private decimalPipe: DecimalPipe,
    private totalQuantityPipe: DishTotalQuantityPipe
  ) {}

  transform(currency: string, listOrders?: OrderRO[]): string | number {
    const room: RoomRO = this.storage.getSelectedRoom();
    let totalPrice = 0;
    const orders = listOrders ? listOrders : this.storage.getOrdersList().filter(i => i.roomKey === room.key);;
    orders.forEach(order => {
      const price = order.dish.discountPrice ? order.dish.discountPrice.value : order.dish.price.value;
      totalPrice += (Number(price) * Number(this.totalQuantityPipe.transform(order.userNotes)));
    });
    return currency === 'vnđ' ? `${this.decimalPipe.transform(totalPrice)} ${currency}` : Number(totalPrice);
  }

}
