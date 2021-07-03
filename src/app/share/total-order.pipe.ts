import { DecimalPipe } from '@angular/common';
import { Pipe, PipeTransform } from '@angular/core';

import { OrderRO } from '../ro/order.ro';
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

  transform(currency: string, listOrders?: OrderRO[]): string {
    let totalPrice = 0;
    const orders = listOrders ? listOrders : this.storage.getOrdersList();
    orders.forEach(order => {
      const price = order.dish.discountPrice ? order.dish.discountPrice.value : order.dish.price.value;
      totalPrice += (Number(price) * Number(this.totalQuantityPipe.transform(order.userNotes)));
    });
    return `${this.decimalPipe.transform(totalPrice)} ${currency}`;
  }

}