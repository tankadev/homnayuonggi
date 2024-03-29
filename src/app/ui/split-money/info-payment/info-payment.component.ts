import { PaymentOrderModel } from './../../../models/payment-order.model';
import { Component, Input, OnInit, ViewContainerRef } from '@angular/core';

import { NzModalService } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { DeliveryDTO } from 'src/app/dto/delivery.dto';
import { UserNote } from 'src/app/dto/order.dto';

import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { OrderRO } from 'src/app/ro/order.ro';
import { RoomRO } from 'src/app/ro/room.ro';
import { DeliveryService } from 'src/app/services/delivery.service';
import { FcmService } from 'src/app/services/fcm.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderHistoryService } from 'src/app/services/order-history.service';
import { OrderService } from 'src/app/services/order.service';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog.component';
import { PaymentPaidRO } from 'src/app/ro/payment-paid.ro';
import { PaymentPaidService } from 'src/app/services/payment-paid.service';

@Component({
  selector: 'info-payment',
  templateUrl: './info-payment.component.html',
  styleUrls: ['./info-payment.component.scss']
})
export class InfoPaymentComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  @Input() createUserId: string;
  @Input() assignUserId: string;
  @Input() paymentDishByUser: PaymentOrderModel[] = [];
  @Input() paymentDishByOtherUser: PaymentOrderModel[] = [];
  @Input() totalPayment: number = 0;
  @Input() totalDish: number = 0;
  @Input() downPrice: number = 0;
  @Input() totalPaymentOther: number = 0;
  @Input() totalDishOther: number = 0;
  @Input() downPriceOther: number = 0;
  @Input() splitMoneyType: number = 0;
  @Input() paymentsPaid: PaymentPaidRO;

  isSendMessage: boolean = false;
  room: RoomRO = this.storage.getSelectedRoom();

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private storage: LocalStorageService,
    private orderHistoryService: OrderHistoryService,
    private fcmService: FcmService,
    private notification: NzNotificationService,
    private paymentPaidService: PaymentPaidService,
  ) { }

  ngOnInit(): void { }

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
        if (this.paymentsPaid && this.paymentsPaid.usersPaid) {
          const findIndex = this.paymentsPaid.usersPaid.findIndex(i => i.isPaid == false);
          if (findIndex == -1) {
            this.paymentPaidService.remove(this.paymentsPaid.key);
          }
        }
        this.deliveryService.remove(this.deliveryInfo.key);
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
        const listTokenFcm = this.getListFcmTokenByUserOrder();
        if (listTokenFcm.length > 0) {
          this.isSendMessage = true;
          this.fcmService.sendNotificationWhenDeliverySuccess(listTokenFcm).subscribe(
            () => {
              this.isSendMessage = false;
            },
            () => {
              this.isSendMessage = false;
              this.notification.create(
                'error',
                'Lỗi xảy ra',
                'Không thể gửi thông báo đến mọi người'
              );
            }, () => {
              this.completePayment();
            }
          );
        } else {
          this.completePayment();
        }
      }
    });
  }

  private getListFcmTokenByUserOrder = (): string[] => {
    const listFcmToken: string[] = [];
    let totalUserNotes: UserNote[] = [];
    const unique = [];
    const distinctUser = [];
    const orderList: OrderRO[] = this.storage.getOrdersList().filter(i => i.roomKey === this.room.key);
    orderList.forEach(item => {
      totalUserNotes = totalUserNotes.concat(item.userNotes);
    });
    if (totalUserNotes.length > 0) {
      for( let i = 0; i < totalUserNotes.length; i++ ){
        if( !unique[totalUserNotes[i].userId]){
          distinctUser.push(totalUserNotes[i].userId);
          unique[totalUserNotes[i].userId] = 1;
        }
      }
    }
    if (distinctUser.length > 0) {
      distinctUser.forEach(userId => {
        if (userId !== this.assignUserId) {
          const findUser = this.storage.findUserByUserId(userId);
          if (findUser && findUser.fcmToken) {
            listFcmToken.push(findUser.fcmToken);
          }
        }
      });
    }

    return listFcmToken;
  }

  private completePayment = () => {
    const deliveryUpdateDTO: DeliveryDTO = new DeliveryDTO();
    deliveryUpdateDTO.deliveryStatus = 2;

    this.deliveryService.update(this.deliveryInfo.key, deliveryUpdateDTO).then();
  }

}
