import { DeliveryRO } from './../ro/delivery.ro';
import { Injectable } from '@angular/core';

import { LocalStorage } from '../const/local-storage';
import { UserRO } from '../ro/user.ro';
import { AppService } from './app.service';
import { OrderRO } from '../ro/order.ro';
import { OrderHistoryRO } from '../ro/order-history.ro';

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

  getOrdersList(): OrderRO[] {
    const orders: OrderRO[] = JSON.parse(localStorage.getItem(LocalStorage.ORDERS_LIST));
    return orders;
  }

  getOrdersHistory(): OrderHistoryRO[] {
    const histories: OrderHistoryRO[] = JSON.parse(localStorage.getItem(LocalStorage.ORDERS_HISTORY));
    return histories;
  }

  getFcmToken(): string {
    const token: string = localStorage.getItem(LocalStorage.FCM_TOKEN);
    return token;
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

  setOrdersList = (orders: OrderRO[]) => {
    localStorage.setItem(LocalStorage.ORDERS_LIST, JSON.stringify(orders));
  }

  setOrdersHistory = (histories: OrderHistoryRO[]) => {
    localStorage.setItem(LocalStorage.ORDERS_HISTORY, JSON.stringify(histories));
  }

  setFcmToken = (token: string) => {
    localStorage.setItem(LocalStorage.FCM_TOKEN, token);
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
