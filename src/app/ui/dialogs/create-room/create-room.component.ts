import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

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

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private roomService: RoomsService,
  ) { }

  ngOnInit(): void {
    this.roomForm = this.fb.group({
      name: [null, [Validators.required]]
    });
  }

  public submitRoomForm(): void {
    if (this.roomForm.valid) {
      const roomDTO = new RoomDTO();
      roomDTO.name = this.roomForm.value.name;
      this.roomService.create(roomDTO);
      this.closeModal();
    } else {
      FormHelper.validateAllFormFields(this.roomForm);
    }
  }

  public closeModal(): void {
    this.modal.destroy();
  }

}
