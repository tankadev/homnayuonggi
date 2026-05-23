import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';

import { Database, ref, push, update, set, remove, onValue, DataSnapshot } from '@angular/fire/database';

import { DeliveryDTO } from '../dto/delivery.dto';
import { DeliveryRO } from '../ro/delivery.ro';
import { Observable } from 'rxjs';
import { ConfigService } from './config.service';

@Injectable({
  providedIn: 'root'
})
export class DeliveryService {

  private dbPath = '/deliveries';
  private deliveryRef = ref(this.db, this.dbPath);

  constructor(
    private db: Database,
    private http: HttpClient,
    private config: ConfigService,
  ) { }

  getDetailDeliveryFromShopeeFoodApi(param: string): Observable<any> {
    return this.http.get(`${this.config.getApiUrl()}/get-detail?url=${param}`);
  }

  getAll(): Observable<DeliveryRO[]> {
    return new Observable(observer => {
      const usersRef = ref(this.db, this.dbPath);

      onValue(usersRef, (snapshot: DataSnapshot) => {
        const users: DeliveryRO[] = [];

        snapshot.forEach(childSnapshot => {
          const user: DeliveryRO = {
            key: childSnapshot.key,
            ...childSnapshot.val()
          };
          users.push(user);
        });

        observer.next(users);
      }, error => {
        observer.error(error);
      });
    });
  }

  create(delivery: DeliveryDTO): Promise<void> {
    const newDeliveryRef = push(this.deliveryRef);
    return set(newDeliveryRef, delivery);
  }

  update(key: string, value: DeliveryDTO): Promise<void> {
    const deliveryRef = ref(this.db, `${this.dbPath}/${key}`);
    return update(deliveryRef, value);
  }

  remove(key: string): Promise<void> {
    const deliveryRef = ref(this.db, `${this.dbPath}/${key}`);
    return remove(deliveryRef);
  }
}
