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
    this.localStorage.setSelectedRoom(room);
    this.appService.changeSelectedRoom();
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
    this.roomService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.localStorage.setRoomsList(data);
      this.listRooms = data;
    });
  }

  private onListenListOrdersChangesFromFirebaseDB(): void {
    this.listDeliveries = this.localStorage.getDeliveriesList();
    this.deliveryService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.listDeliveries = data;
    });
  }

}
