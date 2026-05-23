import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'vnd', standalone: false })
export class CurrencyVndPipe implements PipeTransform {
  transform(value: number | null | undefined): string {
    if (value === null || value === undefined || isNaN(Number(value))) return '0';
    return Number(value).toLocaleString('vi-VN');
  }
}
