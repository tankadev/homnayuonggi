import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList, AngularFireObject } from '@angular/fire/database';
import { OrderDetailDTO } from '../dto/order-detail.dto';
import { OrderDTO } from '../dto/order.dto';
import { OrderDetailRO } from '../ro/order-detail.ro';
import { OrderRO } from '../ro/order.ro';

@Injectable({
  providedIn: 'root'
})
export class OrderService {

  private dbOrdersPath = '/orders';
  private dbOrderDetailPath = '/orderDetail';

  ordersRef: AngularFireList<OrderRO | OrderDTO> = null;
  orderDetailRef: AngularFireObject<OrderDetailRO | OrderDetailDTO> = null;
  constructor(
    private db: AngularFireDatabase
  ) {
    this.ordersRef = db.list(this.dbOrdersPath);
    this.orderDetailRef = db.object(this.dbOrderDetailPath);
  }

  getListOrders(): AngularFireList<OrderRO> {
    return this.ordersRef as AngularFireList<OrderRO>;
  }

  addOrder(order: OrderDTO): any {
    return this.ordersRef.push(order);
  }

  updateOrder(key: string, value: OrderDTO): Promise<void> {
    return this.ordersRef.update(key, value);
  }

  deleteOrder(key: string): Promise<void> {
    return this.ordersRef.remove(key);
  }

  deleteAllListOrders(): Promise<void> {
    return this.ordersRef.remove();
  }

  // order detail
  getOrderDetail(): AngularFireObject<OrderDetailRO> {
    return this.orderDetailRef as AngularFireObject<OrderDetailRO>;
  }

  createOrderDetail(order: OrderDetailDTO): any {
    return this.orderDetailRef.set(order);
  }

  updateOrderDetail(order: OrderDetailDTO): Promise<void> {
    return this.orderDetailRef.update(order);
  }

  removeOrderDetail(): Promise<void> {
    return this.orderDetailRef.remove();
  }

}
