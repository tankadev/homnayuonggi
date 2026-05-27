import { Injectable } from '@angular/core';
import * as CryptoJS from 'crypto-js';

import { LocalStorage } from '../const/local-storage';
import { UserRO } from '../ro/user.ro';
import { OrderRO } from '../ro/order.ro';
import { OrderHistoryRO } from '../ro/order-history.ro';
import { DeliveryRO } from '../ro/delivery.ro';
import { RoomRO } from '../ro/room.ro';
import { RoomPwdModel } from '../models/rooms-pwd.model';
import { PaymentPaidRO } from '../ro/payment-paid.ro';
import { environment } from '../../../environments/environment';
import { AppService } from './app.service';

@Injectable({ providedIn: 'root' })
export class LocalStorageService {
  constructor(private appService: AppService) {}

  getUserInfo(): UserRO {
    return JSON.parse(localStorage.getItem(LocalStorage.USER_INFO));
  }

  getListUser(): UserRO[] {
    return JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
  }

  getDeliveriesList(): DeliveryRO[] {
    return JSON.parse(localStorage.getItem(LocalStorage.DELIVERY_LIST));
  }

  getSelectedRoom(): RoomRO {
    return JSON.parse(localStorage.getItem(LocalStorage.SELECTED_ROOM));
  }

  getRoomsList(): RoomRO[] {
    return JSON.parse(localStorage.getItem(LocalStorage.ROOMS_LIST));
  }

  getOrdersList(): OrderRO[] {
    const raw = localStorage.getItem(LocalStorage.ORDERS_LIST);
    return raw ? JSON.parse(raw) : [];
  }

  getOrdersHistory(): OrderHistoryRO[] {
    const raw = localStorage.getItem(LocalStorage.ORDERS_HISTORY);
    return raw ? JSON.parse(raw) : [];
  }

  getMyRoomsPwd(): RoomPwdModel[] {
    const raw = localStorage.getItem(LocalStorage.ROOM_PWD_LIST);
    return raw ? JSON.parse(raw) : [];
  }

  getPaymentsPaid(): PaymentPaidRO[] {
    const raw = localStorage.getItem(LocalStorage.PAYMENT_PAID_LIST);
    return raw ? JSON.parse(raw) : [];
  }

  getTheme(): string | null {
    return localStorage.getItem(LocalStorage.THEME);
  }

  getCartViewMode(): 'flat' | 'menu' {
    return localStorage.getItem(LocalStorage.CART_VIEW_MODE) === 'menu' ? 'menu' : 'flat';
  }

  setUser(user: UserRO) {
    localStorage.setItem(LocalStorage.USER_INFO, JSON.stringify(user));
  }

  setUserList(userList: UserRO[]) {
    localStorage.setItem(LocalStorage.USER_LIST, JSON.stringify(userList));
  }

  setDeliveriesList(deliveries: DeliveryRO[]) {
    localStorage.setItem(LocalStorage.DELIVERY_LIST, JSON.stringify(deliveries));
  }

  setSelectedRoom(room: RoomRO) {
    localStorage.setItem(LocalStorage.SELECTED_ROOM, JSON.stringify(room));
  }

  setOrdersList(orders: OrderRO[]) {
    localStorage.setItem(LocalStorage.ORDERS_LIST, JSON.stringify(orders));
  }

  setRoomsList(rooms: RoomRO[]) {
    localStorage.setItem(LocalStorage.ROOMS_LIST, JSON.stringify(rooms));
  }

  setOrdersHistory(histories: OrderHistoryRO[]) {
    localStorage.setItem(LocalStorage.ORDERS_HISTORY, JSON.stringify(histories));
  }

  setPaymentsPaid(paymentsPaid: PaymentPaidRO[]) {
    localStorage.setItem(LocalStorage.PAYMENT_PAID_LIST, JSON.stringify(paymentsPaid));
  }

  setTheme(theme: string) {
    localStorage.setItem(LocalStorage.THEME, theme);
  }

  setCartViewMode(mode: 'flat' | 'menu') {
    localStorage.setItem(LocalStorage.CART_VIEW_MODE, mode);
  }

  setMyRoomsPwd(roomPwd: RoomPwdModel) {
    const roomsPwd = this.getMyRoomsPwd();
    roomsPwd.push(roomPwd);
    localStorage.setItem(LocalStorage.ROOM_PWD_LIST, JSON.stringify(roomsPwd));
  }

  findUserByUserName(username: string): UserRO {
    const userList = this.getListUser() || [];
    return userList.find((u) => u.username === username);
  }

  findUserByUserId(id: string): UserRO {
    const userList = this.getListUser() || [];
    return userList.find((u) => u.key === id);
  }

  removeAll() {
    localStorage.removeItem(LocalStorage.USER_INFO);
    localStorage.removeItem(LocalStorage.SELECTED_ROOM);
    this.appService.loginChanged();
    this.appService.changeSelectedRoom();
  }

  quitRoom() {
    localStorage.removeItem(LocalStorage.SELECTED_ROOM);
    this.appService.changeSelectedRoom();
  }

  validRoomPwd(room: RoomRO): boolean {
    const roomsPwd = this.getMyRoomsPwd();
    const roomPwd = roomsPwd.find((i) => i.key === room.key);
    if (!roomPwd) return false;
    const pwdSaved = CryptoJS.AES.decrypt(roomPwd.pwd.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);
    const pwdActiveRoom = CryptoJS.AES.decrypt(room.password.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);
    return pwdSaved === pwdActiveRoom;
  }
}
