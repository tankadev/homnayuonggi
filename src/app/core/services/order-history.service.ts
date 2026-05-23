import { Injectable } from '@angular/core';
import { Database, ref, push, update, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { OrderHistoryDTO } from '../dto/order-history.dto';
import { OrderHistoryRO } from '../ro/order-history.ro';
import { LocalStorageService } from './localstorage.service';

@Injectable({ providedIn: 'root' })
export class OrderHistoryService {
  private dbPath = '/ordersHistory';
  private historyRef = ref(this.db, this.dbPath);

  constructor(private db: Database, private storage: LocalStorageService) {}

  getAll(): Observable<OrderHistoryRO[]> {
    return new Observable((observer) => {
      onValue(
        ref(this.db, this.dbPath),
        (snapshot: DataSnapshot) => {
          const items: OrderHistoryRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as OrderHistoryRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  create(history: OrderHistoryDTO): Promise<void> {
    return set(push(this.historyRef), history);
  }

  update(key: string, value: Partial<OrderHistoryDTO>): Promise<void> {
    return update(ref(this.db, `${this.dbPath}/${key}`), value);
  }

  /** Convenience for logging a dish-related action by the current user. */
  log(action: 0 | 1 | 2, dishName: string, note?: string): Promise<void> | void {
    const user = this.storage.getUserInfo();
    const room = this.storage.getSelectedRoom();
    if (!user || !room) return;
    return this.create({
      action,
      userId: user.key,
      dishName,
      createAt: new Date().toISOString(),
      roomKey: room.key,
      ...(note !== undefined ? { note } : {}),
    });
  }

  removeAll(): void {
    const histories = this.storage.getOrdersHistory();
    const room = this.storage.getSelectedRoom();
    if (!room) return;
    histories.forEach((h) => h.roomKey === room.key && remove(ref(this.db, `${this.dbPath}/${h.key}`)));
  }

  /** Delete one history entry directly. */
  removeOne(key: string): Promise<void> {
    return remove(ref(this.db, `${this.dbPath}/${key}`));
  }

  /** Delete every history entry that belongs to a given room. Resolves once all writes finish. */
  async removeForRoom(roomKey: string, histories: OrderHistoryRO[]): Promise<void> {
    const targets = histories.filter((h) => h.roomKey === roomKey);
    await Promise.all(targets.map((h) => this.removeOne(h.key)));
  }
}
