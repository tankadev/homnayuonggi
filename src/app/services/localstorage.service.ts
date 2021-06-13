import { DeliveryRO } from './../ro/delivery.ro';
import { Injectable } from '@angular/core';

import { LocalStorage } from '../const/local-storage';
import { UserRO } from '../ro/user.ro';
import { AppService } from './app.service';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  constructor(
    private appService: AppService
  ) { }

  getUserInfo(): UserRO {
    const userInfo: UserRO = JSON.parse(localStorage.getItem(LocalStorage.USER_INFO));
    return userInfo;
  }

  getListUser(): UserRO[] {
    const usersList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
    return usersList;
  }

  getDelivery(): DeliveryRO {
    const delivery: DeliveryRO = JSON.parse(localStorage.getItem(LocalStorage.DELIVERY_INFO));
    return delivery;
  }

  setUser = (user: UserRO) => {
    localStorage.setItem(LocalStorage.USER_INFO, JSON.stringify(user));
  }

  setUserList = (userList: UserRO[]) => {
    localStorage.setItem(LocalStorage.USER_LIST, JSON.stringify(userList));
  }

  setDelivery = (delivery: DeliveryRO) => {
    localStorage.setItem(LocalStorage.DELIVERY_INFO, JSON.stringify(delivery));
  }

  findUserByUserName(username: string): UserRO {
    const userList = this.getListUser();
    const findUser = userList.find(user => user.username === username);
    return findUser;
  }

  findUserByUserId(id: string): UserRO {
    const userList = this.getListUser();
    const findUser = userList.find(user => user.key === id);
    return findUser;
  }

  removeAll = () => {
    localStorage.removeItem(LocalStorage.USER_INFO);
    this.appService.loginChanged();
  }

}
