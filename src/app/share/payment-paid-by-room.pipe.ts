import { RoomRO } from 'src/app/ro/room.ro';
import { Pipe, PipeTransform } from '@angular/core';
import { PaymentPaidRO } from '../ro/payment-paid.ro';

@Pipe({
    name: 'paymentPaidByRoom'
})
export class PaymentPaidByRoomPipe implements PipeTransform {

    constructor() { }

    transform(paymentsPaid: PaymentPaidRO[], room?: RoomRO): PaymentPaidRO {
      if (!room) {
        return null;
      }
      return paymentsPaid.find(i => i.roomId === room.key);
    }
}
