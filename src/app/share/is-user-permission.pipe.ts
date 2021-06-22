import { Pipe, PipeTransform } from '@angular/core';
import { LocalStorageService } from '../services/localstorage.service';

@Pipe({
  name: 'isUserPermission'
})
export class IsUserPermissionPipe implements PipeTransform {

  constructor(
    private storage: LocalStorageService
  ) {}

  transform(createUserId: string, assignUserId: string, isAllowCreateUser: boolean = true): boolean {

    const userLogin = this.storage.getUserInfo();

    if (isAllowCreateUser) {
      if (userLogin.key === createUserId || userLogin.key === assignUserId) {
        return true;
      }

      return false;
    } else {
      if (userLogin.key === assignUserId) {
        return true;
      }

      return false;
    }
  }

}
