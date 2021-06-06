import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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
  deadline = Date.now() + 1000 * 60 * 60 * 0.5;
  myApiRoute = 'https://www.now.vn/can-tho/nuoc-mia-my-tho-mt68';
  addOrderItemForm: FormGroup;
  
  constructor(
    private orderService: OrderService,
    private fb: FormBuilder
  ) {
    this.initAddOrderItemForm();
  }

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

  orderFinish(event) {
    console.log(event);
  }

  initAddOrderItemForm() {
    this.addOrderItemForm = this.fb.group({
      itemName: [null, [Validators.required]],
      itemNote: [null],
      itemPrice: [null, [Validators.required]]
    });
  }

  submitAddOrderItemForm() {

  }

  formatter(value: number): string {
    return `${value} vnđ`;
  }
}
