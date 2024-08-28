import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { Messaging } from '@angular/fire/messaging';
import { LocalStorageService } from './localstorage.service';
import { UserService } from './user.service';
import { UserDTO } from '../dto/user.dto';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MessagingService {

  currentMessage = new BehaviorSubject(null);

  constructor(
    private messaging: Messaging,
    private storage: LocalStorageService,
    private userService: UserService
  ) {
    // Lắng nghe tin nhắn mới từ Firebase Cloud Messaging
    onMessage(this.messaging, (payload) => {
      console.log("New message received. ", payload);
      this.currentMessage.next(payload);
    });
  }

  // Yêu cầu quyền nhận thông báo và lấy token FCM
  requestPermission() {
    const messaging = getMessaging();

    // getToken(messaging, { vapidKey: environment.vapidKey }).then((token) => {
    //   if (token) {
    //     this.storage.setFcmToken(token);

    //     const currentUser = this.storage.getUserInfo();
    //     if (currentUser) {
    //       const currentFcmToken = currentUser.fcmToken;
    //       const userDTO = new UserDTO();
    //       userDTO.fcmToken = token;

    //       // Cập nhật token mới nếu token cũ khác
    //       if (currentFcmToken !== token) {
    //         this.userService.update(currentUser.key, userDTO);
    //       }
    //     }
    //   }
    // }).catch((err) => {
    //   console.error('Unable to get permission to notify.', err);
    // });
  }

  // Nhận tin nhắn từ Firebase Cloud Messaging
  receiveMessage() {
    onMessage(this.messaging, (payload) => {
      console.log("New message received: ", payload);
      this.currentMessage.next(payload);
    });
  }
}
