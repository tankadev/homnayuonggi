import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from 'src/app/ro/delivery.ro';

@Component({
  selector: 'info-order',
  templateUrl: './info-order.component.html',
  styleUrls: ['./info-order.component.scss']
})
export class InfoOrderComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  @Input() splitMoneyType: number = 0;

  constructor() { }

  ngOnInit(): void {
  }

}
