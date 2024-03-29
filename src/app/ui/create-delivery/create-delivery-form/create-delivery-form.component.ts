import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { NzNotificationService } from 'ng-zorro-antd/notification';

import { FormHelper } from 'src/app/helper/form.help';
import { LocalStorage } from 'src/app/const/local-storage';
import { UserRO } from 'src/app/ro/user.ro';
import { DeliveryService } from './../../../services/delivery.service';
import { DeliveryDetailNowAPI } from 'src/app/ro/delivery-detail-now-api.ro';
import { DeliveryDTO } from 'src/app/dto/delivery.dto';
import { LocalStorageService } from './../../../services/localstorage.service';
import { DeliveryRO } from 'src/app/ro/delivery.ro';

@Component({
  selector: 'create-delivery-form',
  templateUrl: './create-delivery-form.component.html',
  styleUrls: ['./create-delivery-form.component.scss']
})
export class CreateDeliveryFormComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  @Output() onClose = new EventEmitter<boolean>();

  createDeliveryForm: FormGroup;
  userList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
  isShowSpinner: boolean = false;

  constructor(
    private fb: FormBuilder,
    private notification: NzNotificationService,
    private deliveryService: DeliveryService,
    private storage: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.initForm();
  }

  public onBtnCancelClick = () => {
    this.deliveryService.remove(this.deliveryInfo.key);
    this.onClose.emit(false);
  }

  public submitDeliveryForm = () => {
    if (this.createDeliveryForm.valid) {
      const { urlShop, minute, assignUser } = this.createDeliveryForm.value;
      const getOnlyShopUrl = urlShop.replace('https', '').replace('http', '')
            .replace('://', '').replace('www.', '').replace('now.vn/', '').replace('shopeefood.vn/', '');
      this.isShowSpinner = true;
      this.deliveryService.getDetailDeliveryFromShopeeFoodApi(getOnlyShopUrl).subscribe(
        (res: DeliveryDetailNowAPI) => {
          if (res.result === 'success') {
            const deliveryUpdateDTO = new DeliveryDTO();
            deliveryUpdateDTO.isEdit = false;
            deliveryUpdateDTO.isCreate = true;
            deliveryUpdateDTO.isCompleted = false;
            deliveryUpdateDTO.remainingTime = +minute;
            deliveryUpdateDTO.createDateTime = new Date().toISOString();
            deliveryUpdateDTO.assignUserId = this.storage.findUserByUserName(assignUser).key;
            deliveryUpdateDTO.delivery = res;
            deliveryUpdateDTO.shippingFee = 0;
            deliveryUpdateDTO.serviceFee = 0;
            deliveryUpdateDTO.sponsorPrice = 0;
            deliveryUpdateDTO.splitMoney = null;
            this.deliveryService.update(this.deliveryInfo.key, deliveryUpdateDTO);
          } else {
            this.notification.create(
              'warning',
              'Không lấy được dữ liệu',
              'Vui lòng kiểm tra link quán của ShopeeFood!'
            );
          }
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
    } else {
      FormHelper.validateAllFormFields(this.createDeliveryForm);
    }
  }

  private initForm = () => {
    this.createDeliveryForm = this.fb.group({
      urlShop: [null, [Validators.required, Validators.pattern(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/gi)]],
      minute: [null, [Validators.required]],
      assignUser: [null, [Validators.required]]
    });
  }

}
