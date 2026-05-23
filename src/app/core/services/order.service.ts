import { Injectable } from '@angular/core';
import { Database, ref, push, update, get, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable, from } from 'rxjs';

import { OrderDetailDTO } from '../dto/order-detail.dto';
import { OrderDTO } from '../dto/order.dto';
import { OrderDetailRO } from '../ro/order-detail.ro';
import { OrderRO } from '../ro/order.ro';
import { LocalStorageService } from './localstorage.service';

@Injectable({ providedIn: 'root' })
export class OrderService {
  private dbOrdersPath = '/orders';
  private dbOrderDetailPath = '/orderDetail';

  private ordersRef = ref(this.db, this.dbOrdersPath);
  private orderDetailRef = ref(this.db, this.dbOrderDetailPath);

  constructor(private db: Database, private storage: LocalStorageService) {}

  getListOrders(): Observable<OrderRO[]> {
    return new Observable((observer) => {
      onValue(
        ref(this.db, this.dbOrdersPath),
        (snapshot: DataSnapshot) => {
          const items: OrderRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as OrderRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  addOrder(order: OrderDTO): Promise<void> {
    const newRef = push(this.ordersRef);
    return set(newRef, order);
  }

  updateOrder(key: string, value: Partial<OrderDTO>): Promise<void> {
    return update(ref(this.db, `${this.dbOrdersPath}/${key}`), value);
  }

  deleteOrder(key: string): Promise<void> {
    return remove(ref(this.db, `${this.dbOrdersPath}/${key}`));
  }

  deleteAllListOrders(): void {
    const orders = this.storage.getOrdersList();
    const room = this.storage.getSelectedRoom();
    if (!room) return;
    orders.forEach((i) => i.roomKey === room.key && this.deleteOrder(i.key));
  }

  getOrderDetail(): Observable<OrderDetailRO> {
    return from(get(this.orderDetailRef).then((snap) => (snap.exists() ? (snap.val() as OrderDetailRO) : null)));
  }

  createOrderDetail(order: OrderDetailDTO) {
    return set(this.orderDetailRef, order);
  }

  updateOrderDetail(order: OrderDetailDTO): Promise<void> {
    return update(this.orderDetailRef, order);
  }

  removeOrderDetail(): Promise<void> {
    return remove(this.orderDetailRef);
  }
}
