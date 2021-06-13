import { Pipe, PipeTransform } from '@angular/core';
import { Photo } from '../ro/delivery-detail-now-api.ro';

@Pipe({
  name: 'displayImage'
})
export class DisplayImagePipe implements PipeTransform {

  transform(value: Photo[], width: number = 160): unknown {
    const photo = value.find(image => image.width === width);
    return photo.value;
  }

}
