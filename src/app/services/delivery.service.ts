import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireObject } from '@angular/fire/database';
import { DeliveryDTO } from '../dto/delivery.dto';
import { DeliveryRO } from '../ro/delivery.ro';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {

  private dbPath = '/delivery';

  deliveryRef: AngularFireObject<DeliveryRO | DeliveryDTO> = null;
  constructor(
    private db: AngularFireDatabase,
    private http: HttpClient
  ) {
    this.deliveryRef = db.object(this.dbPath);
  }

  getDetailDeliveryFromNowApi(param: string): Observable<any> {
    return this.http.get(`https://todayuonggi-be.herokuapp.com/get-detail?url=${param}`);
  }

  getDetail(): AngularFireObject<DeliveryRO> {
    return this.deliveryRef as AngularFireObject<DeliveryRO>;
  }

  create(delivery: DeliveryDTO): any {
    return this.deliveryRef.set(delivery);
  }

  update(value: DeliveryDTO): Promise<void> {
    return this.deliveryRef.update(value);
  }

  remove(): Promise<void> {
    return this.deliveryRef.remove();
  }
}
