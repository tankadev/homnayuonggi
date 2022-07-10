import { Pipe, PipeTransform } from '@angular/core';
import { DeliveryRO } from '../ro/delivery.ro';

@Pipe({
    name: 'findRoomInOrders'
})
export class FindRoomInOrdersPipe implements PipeTransform {

    constructor() { }

    transform(roomKey: string, deliveries: DeliveryRO[]): boolean {
        return deliveries.findIndex(i => i.roomKey === roomKey) != -1;
    }
}
