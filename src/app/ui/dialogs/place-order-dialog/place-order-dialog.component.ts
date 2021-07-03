import { DecimalPipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { LocalStorage } from 'src/app/const/local-storage';
import { DeliveryDTO } from 'src/app/dto/delivery.dto';
import { FormHelper } from 'src/app/helper/form.help';
import { SplitMoneyDeliveryModel, SplitMoneyModel } from 'src/app/models/split-money.model';
import { UserRO } from 'src/app/ro/user.ro';
import { DeliveryService } from 'src/app/services/delivery.service';

@Component({
  selector: 'place-order-dialog',
  templateUrl: './place-order-dialog.component.html',
  styleUrls: ['./place-order-dialog.component.scss']
})
export class PlaceOrderDialogComponent implements OnInit {

  @Input() set isSponsor(value: boolean) {
    this._isSponsor = value;
  };

  _isSponsor: boolean = false;
  placeOrderForm: FormGroup;
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
    private deliveryService: DeliveryService
  ) { }

  ngOnInit(): void {
    this.placeOrderForm = this.fb.group({
      shippingFee: [0],
      serviceFee: [0],
      sponsorPrice: [0, [Validators.required]],
      splitMoneyType: [null, [Validators.required]]
    });
  }

  public submitPlaceOrderForm(): void {
    if (this.placeOrderForm.valid && this.placeOrderForm.value.sponsorPrice > 0) {
      const { shippingFee, serviceFee, sponsorPrice, splitMoneyType, sponsorUser } = this.placeOrderForm.value;

      const splitMoney = new SplitMoneyDeliveryModel();
      splitMoney.type = splitMoneyType;
      splitMoney.sponsorUserId = this._isSponsor ? sponsorUser : null;

      const deliveryUpdateDTO = new DeliveryDTO();
      deliveryUpdateDTO.isCompleted = true;
      deliveryUpdateDTO.shippingFee = shippingFee;
      deliveryUpdateDTO.serviceFee = serviceFee;
      deliveryUpdateDTO.sponsorPrice = sponsorPrice;
      deliveryUpdateDTO.splitMoney = splitMoney;

      this.deliveryService.update(deliveryUpdateDTO).then(
        () => {
          this.modal.destroy();
        }
      );
    } else {
      FormHelper.validateAllFormFields(this.placeOrderForm);
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

}
