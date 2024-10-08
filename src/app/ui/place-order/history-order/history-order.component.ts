import { Component, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';
import { RoomRO } from 'src/app/ro/room.ro';

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
  room: RoomRO = this.storage.getSelectedRoom();

  constructor(
    private orderHistoryService: OrderHistoryService,
    private storage: LocalStorageService
  ) {
    const histories = this.storage.getOrdersHistory();
    if (histories) {
      this.histories = histories.filter(i => i.roomKey === this.room.key).reverse();
    }
  }

  ngOnInit(): void {
    this.onListenOrdersHistoryChangesFromFirebaseDB();
  }

  private onListenOrdersHistoryChangesFromFirebaseDB(): void {
    this.orderHistoryService.getAll().subscribe(data => {
      this.storage.setOrdersHistory(data);
      if (data.length > 0) {
        this.histories = data.filter(i => i.roomKey === this.room.key).reverse();
      } else {
        this.histories = [];
      }
    });
  }

}
