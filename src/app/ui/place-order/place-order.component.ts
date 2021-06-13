import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from 'src/app/ro/delivery.ro';

@Component({
  selector: 'place-order',
  templateUrl: './place-order.component.html',
  styleUrls: ['./place-order.component.scss']
})
export class PlaceOrderComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  constructor() { }

  ngOnInit(): void {
  }

}
