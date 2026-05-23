import { Component, Input, OnDestroy, OnInit, ViewContainerRef } from '@angular/core';

import { map } from 'rxjs/operators';

import { NzModalService } from 'ng-zorro-antd/modal';
import { NzMessageService } from 'ng-zorro-antd/message';

import { UserRO } from 'src/app/ro/user.ro';
import { UserService } from 'src/app/services/user.service';
import { JoinToAppComponent } from '../dialogs/join-to-app/join-to-app.component';
import { AppService } from 'src/app/services/app.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { RoomRO } from 'src/app/ro/room.ro';
import { Subscription } from 'rxjs';
import { CreateRoomComponent } from '../dialogs/create-room/create-room.component';
import { PaymentPaidRO } from 'src/app/ro/payment-paid.ro';
import { ConfigService } from 'src/app/services/config.service';

@Component({
    selector: 'header',
    templateUrl: './header.component.html',
    styleUrls: ['./header.component.scss'],
    standalone: false
})
export class HeaderComponent implements OnInit, OnDestroy {

  @Input() userInfo: UserRO;
  @Input() unpaidList: PaymentPaidRO[];

  room: RoomRO = new RoomRO();
  subSelectedRoom$: Subscription;
  visibleDrawerPaymentsPaid: boolean = false;
  isRefreshingConfig: boolean = false;

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private userService: UserService,
    private appService: AppService,
    private storage: LocalStorageService,
    private configService: ConfigService,
    private message: NzMessageService,
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
      nzData: {
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

  public async refreshApiUrl(): Promise<void> {
    if (this.isRefreshingConfig) return;
    this.isRefreshingConfig = true;
    try {
      const url = await this.configService.refresh();
      this.message.success(`API URL: ${url}`);
    } catch (err) {
      this.message.error('Không cập nhật được cấu hình');
    } finally {
      this.isRefreshingConfig = false;
    }
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
