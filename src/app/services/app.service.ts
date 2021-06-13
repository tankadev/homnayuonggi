import { Injectable } from '@angular/core';
import { Observable, Subject } from 'rxjs';
import { LocalStorage } from '../const/local-storage';
import { UserRO } from '../ro/user.ro';

@Injectable({
  providedIn: 'root'
})
export class AppService {

  private deliveryCreateSuccess = new Subject<boolean>();
  private isLogin = new Subject<any>();

  changeStatusDelivery = (status: boolean) => {
    this.deliveryCreateSuccess.next(status);
  }

  getDeliveryStatus(): Observable<any> {
    return this.deliveryCreateSuccess.asObservable();
  }

  loginChanged = () => {
    const userInfo: UserRO = JSON.parse(localStorage.getItem(LocalStorage.USER_INFO));
    this.isLogin.next(userInfo ? true : false);
  }

  getLoginStatus(): Observable<any> {
    return this.isLogin.asObservable();
  }

}
