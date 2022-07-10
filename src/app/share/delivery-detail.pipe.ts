import { Pipe, PipeTransform } from '@angular/core';
import { DeliveryRO } from '../ro/delivery.ro';
import { LocalStorageService } from '../services/localstorage.service';

@Pipe({
    name: 'deliveryDetail'
})
export class DeliveryDetailPipe implements PipeTransform {

    constructor(private storage: LocalStorageService) { }

    transform(deliveries: DeliveryRO[]): DeliveryRO {
        const room = this.storage.getSelectedRoom();
        return deliveries.find(i => i.roomKey === room.key);
    }
}
