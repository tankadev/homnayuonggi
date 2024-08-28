import { Injectable } from '@angular/core';

import { Database, ref, push, update, set, remove, onValue, DataSnapshot } from '@angular/fire/database';

import { OrderHistoryDTO } from '../dto/order-history.dto';
import { OrderHistoryRO } from '../ro/order-history.ro';
import { LocalStorageService } from './localstorage.service';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderHistoryService {

  private dbPath = '/ordersHistory';
  private ordersHistoryRef = ref(this.db, this.dbPath);

  constructor(private db: Database, private localStorage: LocalStorageService) {}

  getAll(): Observable<OrderHistoryRO[]> {
    return new Observable(observer => {
      const usersRef = ref(this.db, this.dbPath);

      onValue(usersRef, (snapshot: DataSnapshot) => {
        const users: OrderHistoryRO[] = [];

        snapshot.forEach(childSnapshot => {
          const user: OrderHistoryRO = {
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

  create(histories: OrderHistoryDTO): Promise<void> {
    const newOrdersHistoryRef = push(this.ordersHistoryRef);
    return set(newOrdersHistoryRef, histories);
  }

  update(key: string, value: OrderHistoryDTO): Promise<void> {
    const ordersHistoryRef = ref(this.db, `${this.dbPath}/${key}`);
    return update(ordersHistoryRef, value);
  }

  removeAll(): void {
    const orderHistories = this.localStorage.getOrdersHistory();
    const room = this.localStorage.getSelectedRoom();
    orderHistories.forEach(i => {
      if (i.roomKey === room.key) {
        const ordersHistoryRef = ref(this.db, `${this.dbPath}/${i.key}`);
        remove(ordersHistoryRef);
      }
    });
  }
}
