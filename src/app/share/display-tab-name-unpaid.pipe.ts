import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'displayTabNameUnPaid'
})
export class DisplayTabNameUnPaidPipe implements PipeTransform {

  transform(deliveryName: string, date: string): string {
    const name = deliveryName.split(' ').slice(0,2).join(' ');
    return `${date} (${name}...)`;
  }

}
