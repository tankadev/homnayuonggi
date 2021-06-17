import { Pipe, PipeTransform } from '@angular/core';
import { LocalStorageService } from '../services/localstorage.service';

@Pipe({
  name: 'isAllow'
})
export class IsAllowPipe implements PipeTransform {

  constructor(
    private storage: LocalStorageService
  ) { }

  transform(userId: string): boolean {
    return (this.storage.getUserInfo().key === userId);
  }

}
