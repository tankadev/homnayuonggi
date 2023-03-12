import { Component, Input, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { UserNote } from 'src/app/dto/order.dto';
import { PaymentOrderModel } from 'src/app/models/payment-order.model';

import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { OrderRO } from 'src/app/ro/order.ro';
import { PaymentPaidRO } from 'src/app/ro/payment-paid.ro';
import { RoomRO } from 'src/app/ro/room.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { DisplayImagePipe } from 'src/app/share/display-image.pipe';
import { DisplayUserOrderPipe } from 'src/app/share/display-user-order.pipe';

@Component({
  selector: 'split-money',
  templateUrl: './split-money.component.html',
  styleUrls: ['./split-money.component.scss']
})
export class SplitMoneyComponent implements OnInit, OnChanges {

  @Input() deliveryInfo: DeliveryRO;
  @Input() paymentPaid?: PaymentPaidRO;

  paymentDishByUser: PaymentOrderModel[] = [];
  paymentDishByOtherUser: PaymentOrderModel[] = [];
  totalPayment: number = 0;
  totalDish: number = 0;
  downPrice: number = 0;
  totalPaymentOther: number = 0;
  totalDishOther: number = 0;
  downPriceOther: number = 0;
  room: RoomRO = this.storage.getSelectedRoom();

  constructor(
    private storage: LocalStorageService,
    private displayImagePipe: DisplayImagePipe,
    private displayUserOrderPipe: DisplayUserOrderPipe,
  ) { }

  ngOnInit(): void {
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.deliveryInfo) {
      this.generatePaymentInfoForUser();
    }
  }

  private generatePaymentInfoForUser = (): void => {
    this.paymentDishByUser = [];
    this.paymentDishByOtherUser = [];
    this.totalPayment = 0;
    this.totalDish = 0;
    this.downPrice = 0;
    this.totalPaymentOther = 0;
    this.totalDishOther = 0;
    this.downPriceOther = 0;
    const userLogin: UserRO = this.storage.getUserInfo();
    const orderList: OrderRO[] = this.storage.getOrdersList().filter(i => i.roomKey === this.room.key);
    const splitMoney = this.deliveryInfo.splitMoney;
    switch (splitMoney.type) {
      case 0:
        this.equallyDivided(userLogin, orderList);
        break;
    }
  }

  private equallyDivided = (userLogin: UserRO, orderList: OrderRO[]) => {
    orderList.forEach(order => {
      const paymentOrder = new PaymentOrderModel();
      paymentOrder.image = this.displayImagePipe.transform(order.dish.photos, 120);
      paymentOrder.dishName = order.dish.name;
      paymentOrder.price = order.dish.price.value;
      paymentOrder.discountPrice = order.dish.discountPrice ? order.dish.discountPrice.value : null;

      const orderUserNote: UserNote[] = JSON.parse(JSON.stringify(order.userNotes));

      orderUserNote.forEach(userNote => {
        paymentOrder.quantity = userNote.quantity;

        const totalDish = this.displayUserOrderPipe.transform(orderList, 'countDish', true);
        const dishPrice = order.dish.discountPrice ? order.dish.discountPrice.value : order.dish.price.value;
        const plusPrice = this.deliveryInfo.shippingFee + this.deliveryInfo.serviceFee;
        const minusPrice = this.deliveryInfo.sponsorPrice;

        paymentOrder.sponsorPrice = Math.floor(((minusPrice - plusPrice) / +totalDish));
        paymentOrder.totalPrice = userNote.quantity * (dishPrice - paymentOrder.sponsorPrice);
        paymentOrder.userKey = userNote.userId;
        paymentOrder.note = userNote.content;

        if (userNote.userId === userLogin.key) {
          this.totalPayment += paymentOrder.totalPrice;
          this.totalDish = +totalDish;
          this.downPrice = minusPrice - plusPrice;
          this.paymentDishByUser.push(JSON.parse(JSON.stringify(paymentOrder)));
        } else {
          this.totalPaymentOther += paymentOrder.totalPrice;
          this.totalDishOther = +totalDish;
          this.downPriceOther = minusPrice - plusPrice;
          this.paymentDishByOtherUser.push(JSON.parse(JSON.stringify(paymentOrder)));
        }
      });
    });
  }

}
