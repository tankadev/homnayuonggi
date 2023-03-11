import { Pipe, PipeTransform } from '@angular/core';
import { DeliveryRO } from '../ro/delivery.ro';
import { LocalStorageService } from '../services/localstorage.service';

@Pipe({
    name: 'deliveryDetail'
})
export class DeliveryDetailPipe implements PipeTransform {

    constructor(private storage: LocalStorageService) { }

    transform(deliveries: DeliveryRO[], roomId?: string): DeliveryRO {
        const room = this.storage.getSelectedRoom();
        const tempRoomId = roomId ? roomId : room.key;
        return deliveries.find(i => i.roomKey === tempRoomId);
    }
}
