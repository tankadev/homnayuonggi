import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';

import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderService } from './../../../services/order.service';
import { OrderRO } from './../../../ro/order.ro';

@Component({
  selector: 'list-order',
  templateUrl: './list-order.component.html',
  styleUrls: ['./list-order.component.scss']
})
export class ListOrderComponent implements OnInit {

  @Input() remainingTime: number;
  @Input() createDate: string;

  timeout: boolean = false;
  listOrders: OrderRO[] = [];

  constructor(
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef
  ) {
    this.listOrders = this.localStorage.getOrdersList();
  }

  ngOnInit(): void {
    this.onListenListOrdersChangesFromFirebaseDB();
  }

  public cancelDelivery = (): void => {
    this.deliveryService.remove();
  }

  public remainingTimeFinish = () => {
    this.timeout = true;
    this.cdr.detectChanges();
    console.log('finish');
  }

  public trackByIndex = (index: number): number => {
    return index;
  }

  private onListenListOrdersChangesFromFirebaseDB(): void {
    this.orderService.getListOrders().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.localStorage.setOrdersList(data);
      this.listOrders = data;
    });
  }

}
