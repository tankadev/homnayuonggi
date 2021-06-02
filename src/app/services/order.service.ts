import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';
import { OrderDTO } from '../dto/order.dto';
import { OrderRO } from '../ro/order.ro';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private dbPath = '/orders';

  ordersRef: AngularFireList<OrderRO | OrderDTO> = null;
  constructor(
    private db: AngularFireDatabase
  ) {
    this.ordersRef = db.list(this.dbPath);
  }

  getAll(): AngularFireList<OrderRO> {
    return this.ordersRef as AngularFireList<OrderRO>;
  }

  create(tutorial: OrderDTO): any {
    return this.ordersRef.push(tutorial);
  }

  update(key: string, value: OrderDTO): Promise<void> {
    return this.ordersRef.update(key, value);
  }

  delete(key: string): Promise<void> {
    return this.ordersRef.remove(key);
  }

  deleteAll(): Promise<void> {
    return this.ordersRef.remove();
  }

}
