import { Pipe, PipeTransform } from '@angular/core';
import { UserRO } from '../ro/user.ro';
import { LocalStorageService } from '../services/localstorage.service';

@Pipe({
  name: 'displayUserInfo'
})
export class DisplayUserInfoPipe implements PipeTransform {

  constructor(private storage: LocalStorageService) { }

  transform(userId: string, type: 'phone' | 'payment' = 'phone'): any {
    const userInfo: UserRO = this.storage.findUserByUserId(userId);
    
    if (type === 'phone') {
      return userInfo.phone;
    }

    if (type === 'payment') {
      return userInfo.payment;
    }
  }

}
