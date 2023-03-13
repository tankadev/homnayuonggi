import { RoomRO } from 'src/app/ro/room.ro';
import { Pipe, PipeTransform } from '@angular/core';
import { PaymentPaidRO } from '../ro/payment-paid.ro';
import { DeliveryRO } from '../ro/delivery.ro';

@Pipe({
    name: 'unPaidListSort'
})
export class UnPaidListSortPipe implements PipeTransform {

    constructor() { }

    transform(paymentsPaid: PaymentPaidRO[]): PaymentPaidRO[] {
      return paymentsPaid.sort((a: PaymentPaidRO, b: PaymentPaidRO) => {
        return new Date(a.orderDate).getTime() - new Date(b.orderDate).getTime();
      });
    }
}
