import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormControl, FormGroup, Validators } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';

import { LocalStorage } from 'src/app/const/local-storage';
import { UserRO } from 'src/app/ro/user.ro';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { UserService } from 'src/app/services/user.service';
import { FormHelper } from './../../../helper/form.help';

type LoginType = 'REGISTER' | 'LOGIN';

@Component({
  selector: 'join-to-app',
  templateUrl: './join-to-app.component.html',
  styleUrls: ['./join-to-app.component.scss']
})
export class JoinToAppComponent implements OnInit {

  usersList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));

  joinAppForm: FormGroup;
  loginMethod: LoginType = 'LOGIN';
  isRegister: boolean = false;

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private notification: NzNotificationService,
    private userService: UserService,
    private storage: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.joinAppForm = this.fb.group({
      username: [null, [Validators.required, Validators.pattern(/^[a-z]*$/)]]
    });
  }

  public submitLoginForm(): void {
    if (this.joinAppForm.valid) {
      if ((this.loginMethod === 'REGISTER' && !this.isRegister)) {
        const displayNameCtrl: AbstractControl = this.fb.control('', [Validators.required]);
        this.joinAppForm.addControl('displayName', displayNameCtrl);
        this.isRegister = true;
        this.joinAppForm.controls.username.disable();
      } else {
        const { username, displayName } = this.joinAppForm.getRawValue();
        if (this.loginMethod === 'REGISTER') {
          const token = this.storage.getFcmToken();
          this.userService.create({ username, displayName, fcmToken: token ? token : null });
          this.modal.destroy({ username });
        } else {
          const findUser = this.usersList.find(user => user.username === username);
          if (!findUser) {
            this.notification.create(
              'error',
              'Cảnh báo',
              'Tài khoản này chưa tồn tại trong hệ thống'
            );
          } else {
            const token = this.storage.getFcmToken();
            this.userService.update(findUser.key, { fcmToken: token ? token : null });
            this.modal.destroy({ username });
          }
        }
      }
    } else {
      FormHelper.validateAllFormFields(this.joinAppForm);
    }
  }

  public onChangeLoginType = (loginMethod: LoginType) => {
    if (this.loginMethod !== loginMethod) {
      this.joinAppForm.reset();
      if (loginMethod === 'LOGIN') {
        this.isRegister = false;
        this.joinAppForm.removeControl('displayName');
        this.joinAppForm.controls.username.setValidators([Validators.required, Validators.pattern(/^[a-z]*$/)]);
        this.joinAppForm.controls.username.enable();
        this.joinAppForm.updateValueAndValidity();
        if (this.joinAppForm.controls.displayName) {
        }
      } else {
        this.joinAppForm.controls.username.setValidators(
          [Validators.required, Validators.pattern(/^[a-z]*$/), this.checkUsernameWhenRegister]
        );
        this.joinAppForm.controls.username.enable();
        this.joinAppForm.updateValueAndValidity();
      }
    }
    this.loginMethod = loginMethod;
  }

  public closeModal(data?: any): void {
    this.modal.destroy(data ? { data } : null);
  }

  private checkUsernameWhenRegister = (control: FormControl): { [s: string]: boolean } => {
    const findUser = this.usersList.find(user => user.username === control.value);
    if (!control.value) {
      return { required: true };
    } else if (findUser) {
      return { checkUsernameRegister: true, error: true };
    }
    return {};
  }
}
