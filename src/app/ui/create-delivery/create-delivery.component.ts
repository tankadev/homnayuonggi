import { DeliveryDTO } from './../../dto/delivery.dto';
import { DeliveryService } from './../../services/delivery.service';
import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from './../../ro/delivery.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { RoomRO } from 'src/app/ro/room.ro';

@Component({
  selector: 'create-delivery',
  templateUrl: './create-delivery.component.html',
  styleUrls: ['./create-delivery.component.scss']
})
export class CreateDeliveryComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  @Input() user: UserRO;

  isCreate: boolean = false;

  constructor(
    private deliveryService: DeliveryService,
    private storage: LocalStorageService,
    private notification: NzNotificationService,
  ) {
    this.user = this.storage.getUserInfo();
  }

  ngOnInit(): void {
    const currentUser = this.storage.getUserInfo().key;
    if (this.deliveryInfo && this.deliveryInfo.isEdit && this.deliveryInfo.userCreate === currentUser) {
      this.isCreate = true;
    }
  }

  public onCreateDelivery = (value: boolean, isAdd?: boolean): void => {
    const room: RoomRO = this.storage.getSelectedRoom();
    if (room && room.key) {
      if (isAdd) {
        const deliveryDTO = new DeliveryDTO();
        deliveryDTO.isEdit = true;
        deliveryDTO.userCreate = this.storage.getUserInfo().key ?? null;
        deliveryDTO.roomKey = this.storage.getSelectedRoom().key;
        this.deliveryService.create(deliveryDTO);
      }
      this.isCreate = value;
    } else {
      this.notification.create(
        'error',
        'Lỗi xảy ra',
        'Không tìm thấy phòng đặt nước'
      );
    }
  }

}
