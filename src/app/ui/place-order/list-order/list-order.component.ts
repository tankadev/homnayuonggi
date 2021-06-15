import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';

import { DeliveryService } from 'src/app/services/delivery.service';

@Component({
  selector: 'list-order',
  templateUrl: './list-order.component.html',
  styleUrls: ['./list-order.component.scss']
})
export class ListOrderComponent implements OnInit {

  @Input() remainingTime: number;
  @Input() createDate: string;

  timeout: boolean = false;

  constructor(
    private deliveryService: DeliveryService,
    private cdr: ChangeDetectorRef
  ) { }

  ngOnInit(): void {
  }

  public cancelDelivery = (): void => {
    this.deliveryService.remove();
  }

  public remainingTimeFinish = () => {
    this.timeout = true;
    this.cdr.detectChanges();
    console.log('finish');
  }

}
