import { DeliveryDTO } from './../../dto/delivery.dto';
import { DeliveryService } from './../../services/delivery.service';
import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from './../../ro/delivery.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { LocalStorage } from 'src/app/const/local-storage';
import { LocalStorageService } from 'src/app/services/localstorage.service';

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
    private storage: LocalStorageService
  ) {
    this.user = this.storage.getUserInfo();
  }

  ngOnInit(): void {
  }

  public onCreateDelivery = (value: boolean, isAdd?: boolean): void => {
    if (isAdd) {
      const deliveryDTO = new DeliveryDTO();
      deliveryDTO.isEdit = true;
      deliveryDTO.userCreate = this.storage.getUserInfo().key ?? null;
      this.deliveryService.create(deliveryDTO);
    }
    this.isCreate = value;
  }

}
