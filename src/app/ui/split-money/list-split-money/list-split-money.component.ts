import { Component, Input, OnInit } from '@angular/core';
import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { OrderRO } from 'src/app/ro/order.ro';
import { RoomRO } from 'src/app/ro/room.ro';
import { LocalStorageService } from 'src/app/services/localstorage.service';

@Component({
  selector: 'list-split-money',
  templateUrl: './list-split-money.component.html',
  styleUrls: ['./list-split-money.component.scss']
})
export class ListSplitMoneyComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  @Input() createUserId: string;

  listOrders: OrderRO[] = [];
  room: RoomRO = this.localStorage.getSelectedRoom();

  constructor(
    private localStorage: LocalStorageService,
  ) {
    this.listOrders = this.localStorage.getOrdersList().filter(i => i.roomKey === this.room.key);
  }

  ngOnInit(): void {
  }

}
