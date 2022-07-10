import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';

import { environment } from 'src/environments/environment';

import { DeliveryDTO } from '../dto/delivery.dto';
import { DeliveryRO } from '../ro/delivery.ro';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {

  private dbPath = '/deliveries';

  deliveryRef: AngularFireList<DeliveryRO | DeliveryDTO> = null;
  constructor(
    private db: AngularFireDatabase,
    private http: HttpClient
  ) {
    this.deliveryRef = db.list(this.dbPath);
  }

  getDetailDeliveryFromShopeeFoodApi(param: string): Observable<any> {
    return this.http.get(`${environment.apiURL}/get-detail?url=${param}`);
  }

  getAll(): AngularFireList<DeliveryRO> {
    return this.deliveryRef as AngularFireList<DeliveryRO>;
  }

  create(delivery: DeliveryDTO): any {
    return this.deliveryRef.push(delivery);
  }

  update(key: string, value: DeliveryDTO): Promise<void> {
    return this.deliveryRef.update(key, value);
  }

  remove(key: string): Promise<void> {
    return this.deliveryRef.remove(key);
  }
}
