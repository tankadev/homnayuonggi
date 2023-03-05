import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { environment } from 'src/environments/environment';

import * as CryptoJS from 'crypto-js';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { RoomDTO } from 'src/app/dto/room.dto';

import { FormHelper } from 'src/app/helper/form.help';
import { RoomsService } from 'src/app/services/rooms.service';

@Component({
  selector: 'create-room',
  templateUrl: './create-room.component.html',
  styleUrls: ['./create-room.component.scss']
})
export class CreateRoomComponent implements OnInit {

  roomForm: FormGroup;
  isConfigPrivateRoom: boolean = false;

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private roomService: RoomsService,
  ) { }

  ngOnInit(): void {
    this.roomForm = this.fb.group({
      name: [null, [Validators.required]],
      isPrivate: [false],
      description: []
    });
  }

  public submitRoomForm(): void {
    if (this.roomForm.valid) {
      const { isPrivate, name, description } = this.roomForm.value;
      const roomDTO = new RoomDTO();
      roomDTO.name = name;
      roomDTO.isPrivate = isPrivate;
      roomDTO.description = description;
      if (isPrivate) {
        roomDTO.password = CryptoJS.AES.encrypt(this.roomForm.value.passwordRoom.trim(), environment.pwd).toString();
      }
      this.roomService.create(roomDTO);
      this.closeModal();
    } else {
      FormHelper.validateAllFormFields(this.roomForm);
    }
  }

  public closeModal(): void {
    this.modal.destroy();
  }

  public optionPrivateRoomChanged(): void {
    const { isPrivate } = this.roomForm.value;
    this.isConfigPrivateRoom = isPrivate;
    if (isPrivate) {
      const displayNameCtrl: AbstractControl = this.fb.control('', [Validators.required]);
      this.roomForm.addControl('passwordRoom', displayNameCtrl);
    } else {
      this.roomForm.removeControl('passwordRoom');
    }
  }

}
