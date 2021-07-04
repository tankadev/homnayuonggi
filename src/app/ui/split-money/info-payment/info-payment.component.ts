import { Component, Input, OnChanges, OnInit, SimpleChanges, ViewContainerRef } from '@angular/core';

import { NzModalService } from 'ng-zorro-antd/modal';
import { DeliveryDTO } from 'src/app/dto/delivery.dto';

import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { OrderRO } from 'src/app/ro/order.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderHistoryService } from 'src/app/services/order-history.service';
import { OrderService } from 'src/app/services/order.service';
import { DisplayImagePipe } from 'src/app/share/display-image.pipe';
import { DisplayUserOrderPipe } from 'src/app/share/display-user-order.pipe';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog.component';

class PaymentOrder {
  image: string;
  dishName: string;
  price: number;
  discountPrice: number;
  quantity: number;
  sponsorPrice: number;
  totalPrice: number;
}

@Component({
  selector: 'info-payment',
  templateUrl: './info-payment.component.html',
  styleUrls: ['./info-payment.component.scss']
})
export class InfoPaymentComponent implements OnInit, OnChanges {

  @Input() deliveryInfo: DeliveryRO;
  @Input() createUserId: string;
  @Input() assignUserId: string;
  
  paymentDishByUser: PaymentOrder[] = [];
  totalPayment: number = 0;
  totalDish: number = 0;
  downPrice: number = 0;

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private storage: LocalStorageService,
    private orderHistoryService: OrderHistoryService,
    private displayImagePipe: DisplayImagePipe,
    private displayUserOrderPipe: DisplayUserOrderPipe
  ) { }

  ngOnInit(): void { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes.deliveryInfo) {
      this.generatePaymentInfoForUser();
    }
  }

  public renewDelivery = (): void => {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: ConfirmDialogComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
      nzComponentParams: {
        body: 'Bạn có chắc chắn muốn tạo bình chọn mới chứ ?'
      }
    });
    modal.afterClose.subscribe(isAccept => {
      if (isAccept) {
        this.deliveryService.remove();
        this.orderService.deleteAllListOrders();
        this.orderHistoryService.removeAll();
      }
    });
  }

  public completeDelivery = (): void => {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: ConfirmDialogComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
      nzComponentParams: {
        body: 'Bạn đã nhận được đơn hàng này rồi phải không ?'
      }
    });
    modal.afterClose.subscribe(isAccept => {
      if (isAccept) {
        const deliveryUpdateDTO: DeliveryDTO = new DeliveryDTO();
        deliveryUpdateDTO.deliveryStatus = 2;

        this.deliveryService.update(deliveryUpdateDTO).then();
      }
    });
  }

  private generatePaymentInfoForUser = (): void => {
    this.paymentDishByUser = [];
    this.totalPayment = 0;
    this.totalDish = 0;
    this.downPrice = 0;
    const userLogin: UserRO = this.storage.getUserInfo();
    const orderList: OrderRO[] = this.storage.getOrdersList();
    const splitMoney = this.deliveryInfo.splitMoney;
    switch (splitMoney.type) {
      case 0:
        this.equallyDivided(userLogin, orderList);
        break;
    }

    
  }

  private equallyDivided = (userLogin: UserRO, orderList: OrderRO[]) => {
    orderList.forEach(order => {
      const paymentOrder = new PaymentOrder();
      paymentOrder.image = this.displayImagePipe.transform(order.dish.photos, 120);
      paymentOrder.dishName = order.dish.name;
      paymentOrder.price = order.dish.price.value;
      paymentOrder.discountPrice = order.dish.discountPrice ? order.dish.discountPrice.value : null;

      const findUserNote = order.userNotes.find(item => item.userId === userLogin.key);
      if (findUserNote) {
        paymentOrder.quantity = findUserNote.quantity;

        const totalDish = this.displayUserOrderPipe.transform(orderList, 'countDish', true);
        const dishPrice = order.dish.discountPrice ? order.dish.discountPrice.value : order.dish.price.value;
        const plusPrice = this.deliveryInfo.shippingFee + this.deliveryInfo.serviceFee;
        const minusPrice = this.deliveryInfo.sponsorPrice;

        paymentOrder.sponsorPrice = Math.floor(((minusPrice - plusPrice) / +totalDish));
        paymentOrder.totalPrice = findUserNote.quantity * (dishPrice - paymentOrder.sponsorPrice);

        this.totalPayment += paymentOrder.totalPrice;
        this.totalDish = +totalDish;
        this.downPrice = minusPrice - plusPrice;
        this.paymentDishByUser.push(paymentOrder);
      }
    });
  }

}
