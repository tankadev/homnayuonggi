import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, EventEmitter, OnInit, Output } from '@angular/core';

import { NzNotificationService } from 'ng-zorro-antd/notification';

import { FormHelper } from 'src/app/helper/form.help';
import { LocalStorage } from 'src/app/const/local-storage';
import { UserRO } from 'src/app/ro/user.ro';
import { DeliveryService } from './../../../services/delivery.service';

@Component({
  selector: 'create-delivery-form',
  templateUrl: './create-delivery-form.component.html',
  styleUrls: ['./create-delivery-form.component.scss']
})
export class CreateDeliveryFormComponent implements OnInit {

  @Output() onClose = new EventEmitter<boolean>();

  createDeliveryForm: FormGroup;
  userList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
  isShowSpinner: boolean = false;

  constructor(
    private fb: FormBuilder,
    private notification: NzNotificationService,
    private deliveryService: DeliveryService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  public onBtnCancelClick = () => {
    this.onClose.emit(false);
  }

  public submitDeliveryForm = () => {
    if (this.createDeliveryForm.valid) {
      console.log(this.createDeliveryForm.value);
      const { urlShop, minute, assignUser } = this.createDeliveryForm.value;
      const getOnlyShopUrl = urlShop.replace('https', '').replace('http', '').replace('www.', '').replace('now.vn/', '');
      this.isShowSpinner = true;
      this.deliveryService.getDetailDeliveryFromNowApi(getOnlyShopUrl).subscribe(
        (res) => {
          console.log(res);
          this.isShowSpinner = false;
        }, () => {
          this.isShowSpinner = false;
          this.notification.create(
            'error',
            'Lỗi API',
            'Không thể lấy dữ liệu quán, liên hệ thằng code để fix bug ^.^'
          );
        }
      );
      console.log(getOnlyShopUrl);
    } else {
      FormHelper.validateAllFormFields(this.createDeliveryForm);
    }
  }

  public valueWith = (data: UserRO) => `${data.username}`;

  private initForm = () => {
    this.createDeliveryForm = this.fb.group({
      urlShop: [null, [Validators.required, Validators.pattern(/^[a-z0-9./-]*$/)]],
      minute: [null, [Validators.required]],
      assignUser: [null, [Validators.required]]
    });
  }

}
