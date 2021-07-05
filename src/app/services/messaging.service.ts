import { Injectable } from '@angular/core';

import { BehaviorSubject } from 'rxjs';

import { AngularFireMessaging } from '@angular/fire/messaging';

import { LocalStorageService } from './localstorage.service';
import { UserService } from './user.service';
import { UserDTO } from '../dto/user.dto';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  currentMessage = new BehaviorSubject(null);

  constructor(
    private angularFireMessaging: AngularFireMessaging,
    private storage: LocalStorageService,
    private userService: UserService
  ) {
    this.angularFireMessaging.messages.subscribe(
      (_messaging: AngularFireMessaging) => {
        _messaging.onMessage = _messaging.onMessage.bind(_messaging);
        _messaging.onTokenRefresh = _messaging.onTokenRefresh.bind(_messaging);
      });

  }

  requestPermission() {
    this.angularFireMessaging.requestToken.subscribe(
      (token) => {
        if (token) {
          this.storage.setFcmToken(token);
        }
        const currentUser = this.storage.getUserInfo();
        if (currentUser && token) {
          const currentFcmToken = currentUser.fcmToken;
          if (currentFcmToken) {
            if (currentFcmToken !== token) {
              const userDTO = new UserDTO();
              userDTO.fcmToken = token;
              this.userService.update(currentUser.key, userDTO);
            }
          } else {
            const userDTO = new UserDTO();
            userDTO.fcmToken = token;
            this.userService.update(currentUser.key, userDTO);
          }
        }
      },
      (err) => {
        console.error('Unable to get permission to notify.', err);
      }
    );
  }

  receiveMessage() {
    this.angularFireMessaging.messages.subscribe(
      (payload) => {
        console.log("new message received. ", payload);
        this.currentMessage.next(payload);
      })
  }
}
