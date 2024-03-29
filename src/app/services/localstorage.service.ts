import { DeliveryRO } from './../ro/delivery.ro';
import { Injectable } from '@angular/core';

import * as CryptoJS from 'crypto-js';

import { LocalStorage } from '../const/local-storage';
import { UserRO } from '../ro/user.ro';
import { AppService } from './app.service';
import { OrderRO } from '../ro/order.ro';
import { OrderHistoryRO } from '../ro/order-history.ro';
import { RoomRO } from '../ro/room.ro';
import { RoomPwdModel } from '../models/rooms-pwd.model';
import { environment } from 'src/environments/environment';
import { PaymentPaidRO } from '../ro/payment-paid.ro';

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

  getDeliveriesList(): DeliveryRO[] {
    const deliveries: DeliveryRO[] = JSON.parse(localStorage.getItem(LocalStorage.DELIVERY_LIST));
    return deliveries;
  }

  getSelectedRoom(): RoomRO {
    const room: RoomRO = JSON.parse(localStorage.getItem(LocalStorage.SELECTED_ROOM));
    return room;
  }

  getRoomsList = () => {
    const rooms: RoomRO[] = JSON.parse(localStorage.getItem(LocalStorage.ROOMS_LIST));
    return rooms;
  }

  getOrdersList(): OrderRO[] {
    const orders: OrderRO[] = JSON.parse(localStorage.getItem(LocalStorage.ORDERS_LIST));
    return localStorage.getItem(LocalStorage.ORDERS_LIST) ? orders : [];
  }

  getOrdersHistory(): OrderHistoryRO[] {
    const histories: OrderHistoryRO[] = JSON.parse(localStorage.getItem(LocalStorage.ORDERS_HISTORY));
    return localStorage.getItem(LocalStorage.ORDERS_HISTORY) ? histories : [];
  }

  getMyRoomsPwd(): RoomPwdModel[] {
    const roomsPwd: RoomPwdModel[] = JSON.parse(localStorage.getItem(LocalStorage.ROOM_PWD_LIST));
    return localStorage.getItem(LocalStorage.ROOM_PWD_LIST) ? roomsPwd : [];
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

  setDeliveriesList = (deliveries: DeliveryRO[]) => {
    localStorage.setItem(LocalStorage.DELIVERY_LIST, JSON.stringify(deliveries));
  }

  setSelectedRoom = (room: RoomRO) => {
    localStorage.setItem(LocalStorage.SELECTED_ROOM, JSON.stringify(room));
  }

  setOrdersList = (orders: OrderRO[]) => {
    localStorage.setItem(LocalStorage.ORDERS_LIST, JSON.stringify(orders));
  }

  setRoomsList = (rooms: RoomRO[]) => {
    localStorage.setItem(LocalStorage.ROOMS_LIST, JSON.stringify(rooms));
  }

  setOrdersHistory = (histories: OrderHistoryRO[]) => {
    localStorage.setItem(LocalStorage.ORDERS_HISTORY, JSON.stringify(histories));
  }

  setPaymentsPaid = (paymentsPaid: PaymentPaidRO[]) => {
    localStorage.setItem(LocalStorage.PAYMENT_PAID_LIST, JSON.stringify(paymentsPaid));
  }

  setFcmToken = (token: string) => {
    localStorage.setItem(LocalStorage.FCM_TOKEN, token);
  }

  setMyRoomsPwd = (roomPwd: RoomPwdModel) => {
    const roomsPwd = this.getMyRoomsPwd();
    roomsPwd.push(roomPwd);
    localStorage.setItem(LocalStorage.ROOM_PWD_LIST, JSON.stringify(roomsPwd));
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
    localStorage.removeItem(LocalStorage.SELECTED_ROOM);
    this.appService.loginChanged();
    this.appService.changeSelectedRoom();
  }

  quitRoom = () => {
    localStorage.removeItem(LocalStorage.SELECTED_ROOM);
    this.appService.changeSelectedRoom();
  }

  validRoomPwd(room: RoomRO): boolean {
    const roomsPwd = this.getMyRoomsPwd();
    const roomPwd = roomsPwd.find(i => i.key === room.key);
    if (!roomPwd) {
      return false;
    }
    const pwdSaved = CryptoJS.AES.decrypt(roomPwd.pwd.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);
    const pwdActiveRoom = CryptoJS.AES.decrypt(room.password.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);

    return pwdSaved === pwdActiveRoom;
  }

}
