import { Component, OnInit } from '@angular/core';

import { map } from 'rxjs/operators';

import { OrderRO } from 'src/app/ro/order.ro';
import { OrderService } from 'src/app/services/order.service';

@Component({
  selector: 'order-content',
  templateUrl: './order-content.component.html',
  styleUrls: ['./order-content.component.scss']
})
export class OrderContentComponent implements OnInit {

  listOrders: OrderRO[] = [];

  constructor(
    private orderService: OrderService
  ) { }

  ngOnInit(): void {
    this.orderService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.listOrders = data;
    });
  }

  onSave() {
    this.orderService.create(
      {
        title: 'Nước ép mía',
        description: ''
      }
    ).then(() => {
      console.log('Created new item successfully!');
    });
  }

  addNewOrder() {
    this.orderService.deleteAll().then(() => {
      console.log('delete all successfully!');
    });
  }

}
