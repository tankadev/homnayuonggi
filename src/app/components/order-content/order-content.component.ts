import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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
  deadline = 1000 * 60 * 60 * 24 * 2 + 1000 * 30;
  myApiRoute = 'https://www.now.vn/can-tho/nuoc-mia-my-tho-mt68';
  links = ['https://www.now.vn/can-tho/nuoc-mia-my-tho-mt68'];

  constructor(
    private orderService: OrderService,
    private http: HttpClient
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
  
  public apiCallbackFn = (route: string) => {
    return this.http.get('https://www.now.vn/can-tho/nuoc-mia-my-tho-mt68');
  }

  public previewClick(link: string): void {
    alert('Link:\n' + link + '\nwas clicked!');
  }
}
