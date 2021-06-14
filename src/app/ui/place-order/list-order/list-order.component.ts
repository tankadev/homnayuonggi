import { Component, OnInit } from '@angular/core';

import { DeliveryService } from 'src/app/services/delivery.service';

@Component({
  selector: 'list-order',
  templateUrl: './list-order.component.html',
  styleUrls: ['./list-order.component.scss']
})
export class ListOrderComponent implements OnInit {

  deadline = Date.now() + 1000 * 60 * 60 * 0.5;

  constructor(
    private deliveryService: DeliveryService
  ) { }

  ngOnInit(): void {
  }

  public cancelDelivery = (): void => {
    this.deliveryService.remove();
  }

  public remainingTimeFinish = (value: any) => {
    //
  }

}
