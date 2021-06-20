import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';

import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderHistoryService } from 'src/app/services/order-history.service';
import { OrderHistoryRO } from './../../../ro/order-history.ro';

@Component({
  selector: 'history-order',
  templateUrl: './history-order.component.html',
  styleUrls: ['./history-order.component.scss']
})
export class HistoryOrderComponent implements OnInit {

  histories: OrderHistoryRO[] = [];

  constructor(
    private orderHistoryService: OrderHistoryService,
    private storage: LocalStorageService
  ) {
    this.histories = this.storage.getOrdersHistory().reverse() ?? [];
  }

  ngOnInit(): void {
    this.onListenOrdersHistoryChangesFromFirebaseDB();
  }

  private onListenOrdersHistoryChangesFromFirebaseDB(): void {
    this.orderHistoryService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.storage.setOrdersHistory(data);
      this.histories = data.reverse();
    });
  }

}
