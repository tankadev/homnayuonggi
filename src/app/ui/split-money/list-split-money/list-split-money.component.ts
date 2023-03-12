import { Component, Input, OnInit } from '@angular/core';
import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { OrderRO } from 'src/app/ro/order.ro';
import { PaymentPaidRO } from 'src/app/ro/payment-paid.ro';
import { RoomRO } from 'src/app/ro/room.ro';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { PaymentPaidService } from 'src/app/services/payment-paid.service';

@Component({
  selector: 'list-split-money',
  templateUrl: './list-split-money.component.html',
  styleUrls: ['./list-split-money.component.scss']
})
export class ListSplitMoneyComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  @Input() createUserId: string;
  @Input() paymentsPaid: PaymentPaidRO;

  test: boolean = true;

  listOrders: OrderRO[] = [];
  room: RoomRO = this.localStorage.getSelectedRoom();

  constructor(
    private localStorage: LocalStorageService,
    private paymentPaidService: PaymentPaidService,
  ) {
    this.listOrders = this.localStorage.getOrdersList().filter(i => i.roomKey === this.room.key);
  }

  ngOnInit(): void {
  }

  public onPaid(value: boolean, userId: string): void {
    const paymentsPaid = this.paymentsPaid;
    const findUserPaidIndex = paymentsPaid.usersPaid.findIndex(i => i.userId == userId);
    if (findUserPaidIndex != -1) {
      const paidUser = paymentsPaid.usersPaid;
      paidUser[findUserPaidIndex].isPaid = value;
      this.paymentPaidService.update(paymentsPaid.key, paymentsPaid);
    }
  }

  public trackByIndex = (index: number): number => {
    return index;
  }

}
