import { Component, OnInit, ViewContainerRef } from '@angular/core';

import { map } from 'rxjs/operators';

import { NzModalService } from 'ng-zorro-antd/modal';

import { LocalStorage } from 'src/app/const/local-storage';
import { UserRO } from 'src/app/ro/user.ro';
import { UserService } from 'src/app/services/user.service';
import { JoinToAppComponent } from '../dialogs/join-to-app/join-to-app.component';
import { AppService } from 'src/app/services/app.service';

@Component({
  selector: 'header',
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss']
})
export class HeaderComponent implements OnInit {

  userInfo: UserRO = JSON.parse(localStorage.getItem(LocalStorage.USER_INFO));

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private userService: UserService,
    private appService: AppService
  ) { }

  ngOnInit(): void {
    this.onListenUsersChangesFromFirebaseDB();
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
        const usersList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
        const findUser = usersList.find(user => user.username === result.username);
        if (findUser) {
          this.userInfo = findUser;
          localStorage.setItem(LocalStorage.USER_INFO, JSON.stringify(findUser));
          this.appService.loginChanged();
        }
      }
    });
  }

  private onListenUsersChangesFromFirebaseDB(): void {
    this.userService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      if (data.length > 0) {
        const userList: UserRO[] = data;
        localStorage.setItem(LocalStorage.USER_LIST, JSON.stringify(userList));
        if (this.userInfo) {
          const findUserLogin = userList.find(user => user.key === this.userInfo.key && user.username === this.userInfo.username);
          if (findUserLogin) {
            this.userInfo = findUserLogin;
            localStorage.setItem(LocalStorage.USER_INFO, JSON.stringify(findUserLogin));
          }
        }
      }
    });
  }

}