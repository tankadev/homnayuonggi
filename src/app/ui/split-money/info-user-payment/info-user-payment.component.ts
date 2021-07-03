import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from 'src/app/ro/delivery.ro';

@Component({
  selector: 'info-user-payment',
  templateUrl: './info-user-payment.component.html',
  styleUrls: ['./info-user-payment.component.scss']
})
export class InfoUserPaymentComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  constructor() { }

  ngOnInit(): void {
  }

}
