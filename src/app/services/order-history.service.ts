import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';

import { OrderHistoryDTO } from '../dto/order-history.dto';
import { OrderHistoryRO } from '../ro/order-history.ro';

@Injectable({
  providedIn: 'root'
})
export class OrderHistoryService {

  private dbPath = '/ordersHistory';

  ordersHistoryRef: AngularFireList<OrderHistoryRO | OrderHistoryDTO> = null;
  constructor(
    private db: AngularFireDatabase
  ) {
    this.ordersHistoryRef = db.list(this.dbPath);
  }

  getAll(): AngularFireList<OrderHistoryRO> {
    return this.ordersHistoryRef as AngularFireList<OrderHistoryRO>;
  }

  create(histories: OrderHistoryDTO): any {
    return this.ordersHistoryRef.push(histories);
  }

  update(key: string, value: OrderHistoryDTO): Promise<void> {
    return this.ordersHistoryRef.update(key, value);
  }

  removeAll(): Promise<void> {
    return this.ordersHistoryRef.remove();
  }
}
