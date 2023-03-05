import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstCharOfEachWord'
})
export class FirstCharOfEachWordPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) {
      return 'N';
    }
    var matches = value.match(/\b(\w)/g);
    return matches.join('');
  }
}
