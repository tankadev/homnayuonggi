import { Component, Input, OnInit } from '@angular/core';
import { DeliveryRO } from 'src/app/ro/delivery.ro';

@Component({
  selector: 'shop-info',
  templateUrl: './shop-info.component.html',
  styleUrls: ['./shop-info.component.scss']
})
export class ShopInfoComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  constructor() { }

  ngOnInit(): void {
  }

}
