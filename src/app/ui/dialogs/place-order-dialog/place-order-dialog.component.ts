import { DecimalPipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { LocalStorage } from 'src/app/const/local-storage';
import { DeliveryDTO } from 'src/app/dto/delivery.dto';
import { UserDTO } from 'src/app/dto/user.dto';
import { FormHelper } from 'src/app/helper/form.help';
import { SplitMoneyDeliveryModel, SplitMoneyModel } from 'src/app/models/split-money.model';
import { UserPaymentModel } from 'src/app/models/user-payment.model';
import { UserRO } from 'src/app/ro/user.ro';
import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'place-order-dialog',
  templateUrl: './place-order-dialog.component.html',
  styleUrls: ['./place-order-dialog.component.scss']
})
export class PlaceOrderDialogComponent implements OnInit {

  @Input() assignUserId?: string;
  @Input() set isSponsor(value: boolean) {
    this._isSponsor = value;
  };

  _isSponsor: boolean = false;

  currentStep: number = 0;
  deliveryUpdateDTO: DeliveryDTO = new DeliveryDTO();
  placeOrderForm: FormGroup;
  paymentForm: FormGroup;
  userList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
  splitMoneyOptions: SplitMoneyModel[] = [
    {
      type: 0,
      content: 'Chia đều tất cả mọi người',
      disable: false
    },
    {
      type: 1,
      content: 'Chia theo % món trên giá trị đơn hàng',
      disable: false
    },
    {
      type: 2,
      content: 'Ai đó tài trợ 100% luôn',
      disable: false
    },
    {
      type: 3,
      content: 'Ai đó tài trợ chút đỉnh thôi',
      disable: true
    }
  ];

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private decimalPipe: DecimalPipe,
    private deliveryService: DeliveryService,
    private userService: UserService,
    private storage: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.initPlaceOrderForm();
    this.initPaymentForm();
  }

  public submitPlaceOrderForm(): void {
    if (this.placeOrderForm.valid && this.placeOrderForm.value.sponsorPrice > 0) {
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
      const userPaymentId: string = this.storage.getDelivery().assignUserId;
      const userPaymentInfo: UserRO = this.storage.findUserByUserId(userPaymentId);
      const { phone, paymentTypeGroup } = this.paymentForm.value;

      const userDTO = new UserDTO();
      userDTO.username = userPaymentInfo.username;
      userDTO.displayName = userPaymentInfo.displayName;
      userDTO.phone = phone;
      userDTO.payment = paymentTypeGroup;

      this.deliveryService.update(this.deliveryUpdateDTO).then();
      this.userService.update(userPaymentId, userDTO).then();
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
    if (type === 2) {
      const sponsorUserCtrl: AbstractControl = this.fb.control(null, [Validators.required]);
      this.placeOrderForm.addControl('sponsorUser', sponsorUserCtrl);
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
      sponsorPrice: [0, [Validators.required]],
      splitMoneyType: [null, [Validators.required]]
    });

    if (this._isSponsor) {
      const sponsorUserCtrl: AbstractControl = this.fb.control(null, [Validators.required]);
      this.placeOrderForm.addControl('sponsorUser', sponsorUserCtrl);
      this.placeOrderForm.controls.sponsorUser.setValue(this.assignUserId);
    }
  }

  private initPaymentForm(): void {
    const userPaymentId: string = this.storage.getDelivery().assignUserId;
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

}
