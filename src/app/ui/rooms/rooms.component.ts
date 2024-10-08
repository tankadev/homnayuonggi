import { Component, OnInit, ViewContainerRef } from '@angular/core';
import { NzModalService } from 'ng-zorro-antd/modal';
import { map } from 'rxjs/operators';
import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { RoomRO } from 'src/app/ro/room.ro';
import { AppService } from 'src/app/services/app.service';
import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { RoomsService } from 'src/app/services/rooms.service';
import { CreateRoomComponent } from '../dialogs/create-room/create-room.component';
import { JoinRoomPwdComponent } from '../dialogs/join-room-pwd/join-room-pwd.component';

@Component({
  selector: 'rooms',
  templateUrl: './rooms.component.html',
  styleUrls: ['./rooms.component.scss']
})
export class RoomsComponent implements OnInit {

  listRooms: RoomRO[] = [];
  listDeliveries: DeliveryRO[] = [];

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private roomService: RoomsService,
    private localStorage: LocalStorageService,
    private deliveryService: DeliveryService,
    private appService: AppService,
  ) { }

  ngOnInit(): void {
    this.onListenListRoomsChangesFromFirebaseDB();
    this.onListenListOrdersChangesFromFirebaseDB();
  }

  public onSelectedRoom(room: RoomRO) {
    if (room.isPrivate) {
      const checkPwdSaved = this.localStorage.validRoomPwd(room);
      if (checkPwdSaved) {
        this.localStorage.setSelectedRoom(room);
        this.appService.changeSelectedRoom();
      } else {
        const modal = this.modal.create({
          nzTitle: null,
          nzContent: JoinRoomPwdComponent,
          nzViewContainerRef: this.viewContainerRef,
          nzFooter: null,
          nzClosable: false,
          nzAutofocus: null,
          nzMaskClosable: false,
          nzComponentParams: {
            roomInfo: room,
          }
        });
        modal.afterClose.subscribe(data => {
          if (data) {
            this.localStorage.setSelectedRoom(room);
            this.appService.changeSelectedRoom();
          }
        });
      }
    } else {
      this.localStorage.setSelectedRoom(room);
      this.appService.changeSelectedRoom();
    }
  }

  public addRoom() {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: CreateRoomComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
    });
    modal.afterClose.subscribe(data => {
      if (data) {

      }
    });
  }

  private onListenListRoomsChangesFromFirebaseDB(): void {
    this.listRooms = this.localStorage.getRoomsList();
    this.roomService.getAll().subscribe(data => {
      this.localStorage.setRoomsList(data);
      this.listRooms = data;
    });
  }

  private onListenListOrdersChangesFromFirebaseDB(): void {
    this.listDeliveries = this.localStorage.getDeliveriesList();
    this.deliveryService.getAll().subscribe(data => {
      this.listDeliveries = data;
    });
  }

}
