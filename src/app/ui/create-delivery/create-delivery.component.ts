import { DeliveryService } from './../../services/delivery.service';
import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from './../../ro/delivery.ro';

@Component({
  selector: 'create-delivery',
  templateUrl: './create-delivery.component.html',
  styleUrls: ['./create-delivery.component.scss']
})
export class CreateDeliveryComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  isCreate: boolean = false;

  constructor(
    private deliveryService: DeliveryService
  ) { }

  ngOnInit(): void {
  }

  public onCreateDelivery = (value: boolean): void => {
    this.isCreate = value;
  }

}
