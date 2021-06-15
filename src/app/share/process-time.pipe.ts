import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'processTime'
})
export class ProcessTimePipe implements PipeTransform {

  transform(value: number, createDate: string): number {
    const createTime = new Date(createDate).getTime();
    const resultMinute: number = (createTime + (+value * 60 * 1000)) - (Date.now());
    if (resultMinute < 0) {
      return null;
    }
    return (Date.now() + 1000 * 60 * 60 * ((resultMinute / (60 * 1000)) / 60));
  }

}
