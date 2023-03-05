import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'firstCharOfEachWord'
})
export class FirstCharOfEachWordPipe implements PipeTransform {

  transform(value: string): string {
    if (!value) {
      return 'N';
    }
    var from = "àáãảạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệđùúủũụưừứửữựòóỏõọôồốổỗộơờớởỡợìíỉĩịäëïîöüûñçýỳỹỵỷ",
      to   = "aaaaaaaaaaaaaaaaaeeeeeeeeeeeduuuuuuuuuuuoooooooooooooooooiiiiiaeiiouuncyyyyy";
    for (var i=0, l=from.length ; i < l ; i++) {
      value = value.replace(RegExp(from[i], "gi"), to[i]);
    }

    value = value.toLowerCase()
        .trim()
        .replace(/[^a-z0-9\-]/g, '-')
        .replace(/-+/g, '-');
    var matches = value.match(/\b(\w)/g);
    return matches.join('').toUpperCase();
  }
}
