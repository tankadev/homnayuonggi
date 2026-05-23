import { Injectable } from '@angular/core';

import { Database, ref, push, update, get, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { OrderDetailDTO } from '../dto/order-detail.dto';
import { OrderDTO } from '../dto/order.dto';
import { OrderDetailRO } from '../ro/order-detail.ro';
import { OrderRO } from '../ro/order.ro';
import { LocalStorageService } from './localstorage.service';
import { Observable, from } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private dbOrdersPath = '/orders';
  private dbOrderDetailPath = '/orderDetail';

  private ordersRef = ref(this.db, this.dbOrdersPath);
  private orderDetailRef = ref(this.db, this.dbOrderDetailPath);

  constructor(private db: Database, private localStorage: LocalStorageService) { }

  getListOrders(): Observable<OrderRO[]> {
    return new Observable(observer => {
      const usersRef = ref(this.db, this.dbOrdersPath);

      onValue(usersRef, (snapshot: DataSnapshot) => {
        const users: OrderRO[] = [];

        snapshot.forEach(childSnapshot => {
          const user: OrderRO = {
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

  addOrder(order: OrderDTO): Promise<void> {
    const newOrdersRef = push(this.ordersRef);
    return set(newOrdersRef, order);
  }

  updateOrder(key: string, value: OrderDTO): Promise<void> {
    const ordersRef = ref(this.db, `${this.dbOrdersPath}/${key}`);
    return update(ordersRef, value);
  }

  deleteOrder(key: string): Promise<void> {
    const ordersRef = ref(this.db, `${this.dbOrdersPath}/${key}`);
    return remove(ordersRef);
  }

  deleteAllListOrders(): void {
    const orders = this.localStorage.getOrdersList();
    const room = this.localStorage.getSelectedRoom();
    orders.forEach(i => {
      if (i.roomKey === room.key) {
        this.deleteOrder(i.key);
      }
    });
  }

  // order detail
  getOrderDetail(): Observable<OrderDetailRO> {
    return from(get(this.orderDetailRef).then(snapshot => {
      if (snapshot.exists()) {
        return snapshot.val() as OrderDetailRO;
      } else {
        return null;
      }
    }));
  }

  createOrderDetail(order: OrderDetailDTO): any {
    return set(this.orderDetailRef, order);
  }

  updateOrderDetail(order: OrderDetailDTO): Promise<void> {
    return update(this.orderDetailRef, order);
  }

  removeOrderDetail(): Promise<void> {
    return remove(this.orderDetailRef);
  }

}
