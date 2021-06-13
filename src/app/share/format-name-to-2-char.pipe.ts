import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'formatNameTo2Char'
})
export class FormatNameTo2CharPipe implements PipeTransform {

  transform(value: string): string {
    const listCharBySpace = value.split(' ');
    const listChar = listCharBySpace.length > 1 ?
    [listCharBySpace[listCharBySpace.length - 2], listCharBySpace[listCharBySpace.length - 1]] : listCharBySpace;
    return listChar.length ? (listChar.length > 1 ?
      `${listChar[0].charAt(0).toUpperCase()}${listChar[1].charAt(0).toUpperCase()}` : `${listChar[0].charAt(0).toUpperCase()}`) : '';
  }

}
