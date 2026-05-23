import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'pad', standalone: false })
export class PadZeroPipe implements PipeTransform {
  transform(value: number, len = 2): string {
    return String(Math.max(0, Math.floor(value || 0))).padStart(len, '0');
  }
}
