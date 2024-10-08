import { Component, Input, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';

import { map } from 'rxjs/operators';

import { NzModalService } from 'ng-zorro-antd/modal';

import { UserRO } from 'src/app/ro/user.ro';
import { UserService } from 'src/app/services/user.service';
import { JoinToAppComponent } from '../dialogs/join-to-app/join-to-app.component';
import { AppService } from 'src/app/services/app.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { RoomRO } from 'src/app/ro/room.ro';
import { Subscription } from 'rxjs';
import { CreateRoomComponent } from '../dialogs/create-room/create-room.component';
import { PaymentPaidRO } from 'src/app/ro/payment-paid.ro';

@Component({
  selector: 'header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit, OnDestroy {

  @Input() userInfo: UserRO;
  @Input() unpaidList: PaymentPaidRO[];

  room: RoomRO = new RoomRO();
  subSelectedRoom$: Subscription;
  visibleDrawerPaymentsPaid: boolean = false;

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private userService: UserService,
    private appService: AppService,
    private storage: LocalStorageService
  ) {
    this.subSelectedRoom$ = this.appService.getSelectedRoomStatus().subscribe(status => {
      if (status) {
        this.room = this.storage.getSelectedRoom();
      } else {
        this.room = null;
      }
    });
    this.room = this.storage.getSelectedRoom();
  }

  ngOnInit(): void {
    this.onListenUsersChangesFromFirebaseDB();
  }

  ngOnDestroy(): void {
    this.subSelectedRoom$.unsubscribe();
  }

  public openLoginDialog(): void {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: JoinToAppComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false
    });
    modal.afterClose.subscribe(result => {
      if (result) {
        const findUser = this.storage.findUserByUserName(result.username);
        if (findUser) {
          this.userInfo = findUser;
          this.storage.setUser(findUser);
          this.appService.loginChanged();
        }
      }
    });
  }

  public logOut = () => {
    this.storage.removeAll();
  }

  public quitRoom = () => {
    this.storage.quitRoom();
  }

  public editRoom(): void {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: CreateRoomComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
      nzComponentParams: {
        roomInfo: this.room,
      }
    });
    modal.afterClose.subscribe(data => {
      if (data) {
        this.room.name = data.name;
        this.room.description = data.description;
      }
    });
  }

  public openDrawer(): void {
    this.visibleDrawerPaymentsPaid = true;
  }

  public closeDrawer(): void {
    this.visibleDrawerPaymentsPaid = false;
  }

  private onListenUsersChangesFromFirebaseDB(): void {
    this.userService.getAll().subscribe(data => {
      if (data.length > 0) {
        const userList: UserRO[] = data;
        this.storage.setUserList(userList);
        if (this.userInfo) {
          const findUserLogin = userList.find(user => user.key === this.userInfo.key && user.username === this.userInfo.username);
          if (findUserLogin) {
            this.userInfo = findUserLogin;
            this.storage.setUser(findUserLogin);
          } else {
            this.logOut();
          }
        }
      }
    });
  }

}
