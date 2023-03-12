import { DecimalPipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { LocalStorage } from 'src/app/const/local-storage';
import { DeliveryDTO } from 'src/app/dto/delivery.dto';
import { UserNote } from 'src/app/dto/order.dto';
import { PaymentPaidDetailDTO, PaymentPaidDTO } from 'src/app/dto/payment-paid.dto';
import { UserDTO } from 'src/app/dto/user.dto';
import { FormHelper } from 'src/app/helper/form.help';
import { SplitMoneyDeliveryModel, SplitMoneyModel } from 'src/app/models/split-money.model';
import { UserPaymentModel } from 'src/app/models/user-payment.model';
import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { OrderRO } from 'src/app/ro/order.ro';
import { RoomRO } from 'src/app/ro/room.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { PaymentPaidService } from 'src/app/services/payment-paid.service';
import { UserService } from 'src/app/services/user.service';
import { TotalOrderPipe } from 'src/app/share/total-order.pipe';

@Component({
  selector: 'place-order-dialog',
  templateUrl: './place-order-dialog.component.html',
  styleUrls: ['./place-order-dialog.component.scss']
})
export class PlaceOrderDialogComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  @Input() assignUserId?: string;
  @Input() listOrders: OrderRO[] = [];
  @Input() set isSponsor(value: boolean) {
    this._isSponsor = value;
  };

  _isSponsor: boolean = false;

  currentStep: number = 0;
  deliveryUpdateDTO: DeliveryDTO = new DeliveryDTO();
  placeOrderForm: FormGroup;
  paymentForm: FormGroup;
  userList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
  room: RoomRO = this.storage.getSelectedRoom();

  splitMoneyOptions: SplitMoneyModel[] = [
    {
      type: 0,
      content: 'Chia đều tất cả mọi người',
      disable: false
    },
    {
      type: 1,
      content: 'Tài trợ 100%',
      disable: false
    }
  ];

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private decimalPipe: DecimalPipe,
    private deliveryService: DeliveryService,
    private userService: UserService,
    private storage: LocalStorageService,
    private paymentPaidService: PaymentPaidService,
    private totalOrderPipe: TotalOrderPipe
  ) { }

  ngOnInit(): void {
    this.initPlaceOrderForm();
    this.initPaymentForm();
  }

  public submitPlaceOrderForm(): void {
    if (this.placeOrderForm.valid) {
      const { shippingFee, serviceFee, sponsorPrice, splitMoneyType, sponsorUser } = this.placeOrderForm.value;

      const splitMoney = new SplitMoneyDeliveryModel();
      splitMoney.type = splitMoneyType;
      splitMoney.sponsorUserId = this._isSponsor ? sponsorUser : null;

      this.deliveryUpdateDTO.isCompleted = true;
      this.deliveryUpdateDTO.shippingFee = shippingFee;
      this.deliveryUpdateDTO.serviceFee = serviceFee;
      this.deliveryUpdateDTO.sponsorPrice = sponsorPrice;
      this.deliveryUpdateDTO.splitMoney = splitMoney;
      this.deliveryUpdateDTO.deliveryStatus = 1;

      this.currentStep = 1;
    } else {
      FormHelper.validateAllFormFields(this.placeOrderForm);
    }
  }

  public submitPaymentForm(): void {
    if (this.paymentForm.valid) {
      const userPaymentId: string = this.deliveryInfo.assignUserId;
      const userPaymentInfo: UserRO = this.storage.findUserByUserId(userPaymentId);
      const { phone, paymentTypeGroup } = this.paymentForm.value;

      const userDTO = new UserDTO();
      userDTO.username = userPaymentInfo.username;
      userDTO.displayName = userPaymentInfo.displayName;
      userDTO.phone = phone;
      userDTO.payment = paymentTypeGroup;

      this.deliveryService.update(this.deliveryInfo.key, this.deliveryUpdateDTO).then();
      this.userService.update(userPaymentId, userDTO).then();

      if (this.deliveryUpdateDTO.splitMoney && this.deliveryUpdateDTO.splitMoney.type == 0) {
        this.checkPaymentPaidListByOrders();
      }

      this.modal.destroy();
    }
  }

  public onIndexChange(index: number): void {
    if (index === 1) {
      if (this.placeOrderForm.valid && this.placeOrderForm.value.sponsorPrice > 0) {
        this.currentStep = index;
      }
    } else {
      this.currentStep = index;
    }
  }

  public closeModal(): void {
    this.modal.destroy();
  }

  public formatterPrice = (value: number) => value ? `${this.decimalPipe.transform(value)} vnđ` : '';

  public parserPrice = (value: string) => value.replace(' vnđ', '').replace(',', '');

  public onSplitMoneyTypeChange = (type: number): void => {
    if (type === 1) {
      const sponsorUserCtrl: AbstractControl = this.fb.control(null, [Validators.required]);
      this.placeOrderForm.addControl('sponsorUser', sponsorUserCtrl);
      this.placeOrderForm.controls.sponsorUser.setValue(this.assignUserId);
      this._isSponsor = true;
    } else {
      this.placeOrderForm.removeControl('sponsorUser');
      this._isSponsor = false;
    }
  }

  private initPlaceOrderForm(): void {
    this.placeOrderForm = this.fb.group({
      shippingFee: [0],
      serviceFee: [0],
      sponsorPrice: [0],
      splitMoneyType: [null, [Validators.required]]
    });

    if (this._isSponsor) {
      const sponsorUserCtrl: AbstractControl = this.fb.control(null, [Validators.required]);
      this.placeOrderForm.addControl('sponsorUser', sponsorUserCtrl);
      this.placeOrderForm.controls.sponsorUser.setValue(this.assignUserId);
    }
  }

  private initPaymentForm(): void {
    const userPaymentId: string = this.deliveryInfo.assignUserId;
    const userPaymentInfo: UserRO = this.storage.findUserByUserId(userPaymentId);
    const phone = userPaymentInfo.phone ?? null;
    let paymentType: UserPaymentModel[] = [];
    if (userPaymentInfo.payment && userPaymentInfo.payment.length > 0) {
      paymentType = userPaymentInfo.payment;
    } else {
      paymentType = [
        { label: 'Tiền mặt', value: 'cash', disabled: true, checked: true },
        { label: 'Momo', value: 'momo'},
        { label: 'ShopeePay', value: 'shopee' }
      ];
    }
    this.paymentForm = this.fb.group({
      phone: [phone, [Validators.required, Validators.pattern('[- +()0-9]+')]],
      paymentTypeGroup: [paymentType]
    });
  }

  private checkPaymentPaidListByOrders(): void {
    const userOrder = this.storage.findUserByUserId(this.deliveryInfo.assignUserId);
    const tempTotalBill = +this.totalOrderPipe.transform('', this.listOrders);

    const paymentsPaid = new PaymentPaidDTO();
    paymentsPaid.roomId = this.room.key;
    paymentsPaid.orderDate =  new Date().toISOString();
    paymentsPaid.userOrderId = userOrder.key;
    paymentsPaid.deliveryId = this.deliveryInfo.key;
    paymentsPaid.deliveryName = this.deliveryInfo.delivery.name;
    paymentsPaid.deliveryAddress = this.deliveryInfo.delivery.address;

    let totalBill = 0;
    const usersPaid: PaymentPaidDetailDTO[] = [];

    let totalUserNotes: UserNote[] = [];
    this.listOrders.forEach(item => {
      totalUserNotes = totalUserNotes.concat(item.userNotes);
    });

    // Lấy ra danh sách người dùng đã đặt món
    const unique = [];
    const distinctUserId: string[] = [];
    if (totalUserNotes.length > 0) {
      for( let i = 0; i < totalUserNotes.length; i++ ){
        if( !unique[totalUserNotes[i].userId]){
          distinctUserId.push(totalUserNotes[i].userId);
          unique[totalUserNotes[i].userId] = 1;
        }
      }
    }

    distinctUserId.forEach(userOrderId => {
      const userPaid = new PaymentPaidDetailDTO();
      userPaid.userId = userOrderId;
      userPaid.isPaid = false;
      let totalPaid = 0;

      this.listOrders.forEach(order => {
        const orderUserNote: UserNote[] = JSON.parse(JSON.stringify(order.userNotes));
        orderUserNote.forEach(userNote => {
          const { shippingFee, serviceFee, sponsorPrice } = this.placeOrderForm.value;
          const dishPrice = order.dish.discountPrice ? order.dish.discountPrice.value : order.dish.price.value;
          const plusPrice = shippingFee + serviceFee;

          const addFee = dishPrice / tempTotalBill * plusPrice;
          const discountPrice = dishPrice / tempTotalBill * sponsorPrice;
          const lastDiscountPrice = discountPrice - addFee;

          if (userNote.userId === userOrderId) {
            totalPaid += (userNote.quantity * (dishPrice - lastDiscountPrice));
          }
        });
      });

      // Tính toán giá tổng bill của từng user
      userPaid.moneyPaid = totalPaid;
      totalBill += totalPaid;
      usersPaid.push(userPaid);
    });

    paymentsPaid.totalBill = totalBill;
    paymentsPaid.usersPaid = usersPaid;

    this.paymentPaidService.create(paymentsPaid);
  }

}
