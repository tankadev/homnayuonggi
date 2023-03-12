import { RoomRO } from 'src/app/ro/room.ro';
import { Pipe, PipeTransform } from '@angular/core';
import { PaymentPaidRO } from '../ro/payment-paid.ro';
import { DeliveryRO } from '../ro/delivery.ro';

@Pipe({
    name: 'paymentPaidByRoom'
})
export class PaymentPaidByRoomPipe implements PipeTransform {

    constructor() { }

    transform(paymentsPaid: PaymentPaidRO[], deliveryInfo?: DeliveryRO, room?: RoomRO): PaymentPaidRO {
      if (!room || !deliveryInfo) {
        return null;
      }
      return paymentsPaid.find(i => i.roomId === room.key && i.deliveryId !== deliveryInfo.key);
    }
}
