import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';
import { NzNotificationService } from 'ng-zorro-antd/notification';
import { environment } from 'src/environments/environment';

import * as CryptoJS from 'crypto-js';

import { FormHelper } from 'src/app/helper/form.help';
import { RoomRO } from 'src/app/ro/room.ro';
import { RoomPwdModel } from 'src/app/models/rooms-pwd.model';
import { LocalStorageService } from 'src/app/services/localstorage.service';

@Component({
  selector: 'join-room-pwd',
  templateUrl: './join-room-pwd.component.html',
  styleUrls: ['./join-room-pwd.component.scss']
})
export class JoinRoomPwdComponent implements OnInit {

  @Input() roomInfo: RoomRO;

  joinRoomForm: FormGroup;

  constructor(
    private fb: FormBuilder,
    private modal: NzModalRef,
    private notification: NzNotificationService,
    private storage: LocalStorageService
  ) { }

  ngOnInit(): void {
    this.joinRoomForm = this.fb.group({
      passwordRoom: [null, [Validators.required]]
    });
  }

  public closeModal(): void {
    this.modal.destroy(null);
  }

  public submitForm(): void {
    if (this.joinRoomForm.valid) {
      const { passwordRoom } = this.joinRoomForm.value;
      const pwd = CryptoJS.AES.decrypt(this.roomInfo.password.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);
      console.log(pwd);
      if (pwd === passwordRoom.trim()) {
        const roomPwd = new RoomPwdModel();
        roomPwd.key = this.roomInfo.key;
        roomPwd.pwd = this.roomInfo.password;
        this.storage.setMyRoomsPwd(roomPwd);
        this.modal.destroy({data: true});
      } else {
        this.notification.create(
          'error',
          'Mật khẩu sai',
          'Vui lòng kiểm tra lại mật khẩu!'
        );
      }
    } else {
      FormHelper.validateAllFormFields(this.joinRoomForm);
    }
  }

}
