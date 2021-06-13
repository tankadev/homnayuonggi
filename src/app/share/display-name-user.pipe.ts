import { Pipe, PipeTransform } from '@angular/core';

import { LocalStorageService } from 'src/app/services/localstorage.service';

@Pipe({
  name: 'displayNameUser'
})
export class DisplayNameUserPipe implements PipeTransform {

  constructor(private storage: LocalStorageService) {}

  transform(value: string): string {
    const user = this.storage.findUserByUserId(value);
    return user ? user.displayName : 'unknow';
  }

}
