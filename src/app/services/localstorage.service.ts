import { Injectable } from '@angular/core';
import { LocalStorage } from '../const/local-storage';
import { UserRO } from '../ro/user.ro';

@Injectable({
  providedIn: 'root'
})
export class LocalStorageService {

  getUserInfo(): UserRO {
    const userInfo: UserRO = JSON.parse(localStorage.getItem(LocalStorage.USER_INFO));
    return userInfo;
  }

  getListUser(): UserRO[] {
    const usersList: UserRO[] = JSON.parse(localStorage.getItem(LocalStorage.USER_LIST));
    return usersList;
  }

  findUserByUserName(username: string): UserRO {
    const userList = this.getListUser();
    const findUser = userList.find(user => user.username === username);
    return findUser;
  }

}
