import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';

import { LocalStorage } from '../const/local-storage';

@Injectable({ providedIn: 'root' })
export class AppService {
  private deliveryCreateSuccess = new Subject<boolean>();
  private isLogin = new Subject<boolean>();
  private isSelectedRoom = new Subject<boolean>();

  changeStatusDelivery = (status: boolean) => this.deliveryCreateSuccess.next(status);
  getDeliveryStatus(): Observable<boolean> {
    return this.deliveryCreateSuccess.asObservable();
  }

  loginChanged = () => {
    const userInfo = localStorage.getItem(LocalStorage.USER_INFO);
    this.isLogin.next(!!userInfo);
  };
  getLoginStatus(): Observable<boolean> {
    return this.isLogin.asObservable();
  }

  changeSelectedRoom = () => {
    const room = localStorage.getItem(LocalStorage.SELECTED_ROOM);
    this.isSelectedRoom.next(!!room);
  };
  getSelectedRoomStatus(): Observable<boolean> {
    return this.isSelectedRoom.asObservable();
  }
}
