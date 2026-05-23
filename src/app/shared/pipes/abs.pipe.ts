import { Pipe, PipeTransform } from '@angular/core';

@Pipe({ name: 'abs', standalone: false })
export class AbsPipe implements PipeTransform {
  transform(value: number | null | undefined): number {
    return Math.abs(Number(value) || 0);
  }
}
