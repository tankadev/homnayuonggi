import { RoomRO } from 'src/app/ro/room.ro';
import { Pipe, PipeTransform } from '@angular/core';
import { PaymentPaidDetailRO } from '../ro/payment-paid.ro';

@Pipe({
    name: 'unPaidUserList'
})
export class UnPaidUserListPipe implements PipeTransform {

    constructor() { }

    transform(paymentsUser: PaymentPaidDetailRO[]): PaymentPaidDetailRO[] {
      return paymentsUser.filter(user => !user.isPaid);
    }
}
