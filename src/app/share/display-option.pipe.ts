import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'displayOption'
})
export class DisplayOptionPipe implements PipeTransform {

  transform(value: any[]): string {
    const options = value.map(item => item.name);
    return options.length > 0 ? options.toString().split(',').join(', ').toLowerCase() : '';
  }

}
