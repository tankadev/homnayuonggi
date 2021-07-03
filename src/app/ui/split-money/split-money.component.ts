import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from 'src/app/ro/delivery.ro';

@Component({
  selector: 'split-money',
  templateUrl: './split-money.component.html',
  styleUrls: ['./split-money.component.scss']
})
export class SplitMoneyComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  constructor() { }

  ngOnInit(): void {
  }

}
