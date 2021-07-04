import { Pipe, PipeTransform } from '@angular/core';

import { UserNote } from '../dto/order.dto';
import { OrderRO } from '../ro/order.ro';
import { DisplayNameUserPipe } from './display-name-user.pipe';

@Pipe({
  name: 'displayUserOrder'
})
export class DisplayUserOrderPipe implements PipeTransform {

  constructor(
    private displayUsernamePipe: DisplayNameUserPipe
  ) {}

  transform(listOrders: OrderRO[], displayType: 'userName' | 'countUser' | 'countDish' = 'userName', isNumber: boolean = false): string | number {

    let totalUserNotes: UserNote[] = [];
    listOrders.forEach(item => {
      totalUserNotes = totalUserNotes.concat(item.userNotes);
    });

    const unique = [];
    const distinctUser = [];
    if (totalUserNotes.length > 0) {
      for( let i = 0; i < totalUserNotes.length; i++ ){
        if( !unique[totalUserNotes[i].userId]){
          distinctUser.push(totalUserNotes[i].userId);
          unique[totalUserNotes[i].userId] = 1;
        }
      }
    }

    if (displayType === 'userName') {
      return  distinctUser.length > 0 ? (
        distinctUser.map(item => this.displayUsernamePipe.transform(item)).toString()
      ) : '';
    }

    if (displayType === 'countDish') {
      let count: number = 0;
      totalUserNotes.forEach(item => {
        count = count + item.quantity;
      });
      return  count ? (isNumber ? count : `${count} phần`) : '';
    }

    if (displayType === 'countUser') {
      return  distinctUser.length > 0 ? `${distinctUser.length} người đặt` : '';
    }

    return  '';
  }

}
