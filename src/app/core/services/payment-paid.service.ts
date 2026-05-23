import { Injectable } from '@angular/core';
import { Database, ref, push, update, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { PaymentPaidRO } from '../ro/payment-paid.ro';
import { PaymentPaidDTO } from '../dto/payment-paid.dto';

@Injectable({ providedIn: 'root' })
export class PaymentPaidService {
  private dbPath = '/paymentsPaid';
  private listRef = ref(this.db, this.dbPath);

  constructor(private db: Database) {}

  getAll(): Observable<PaymentPaidRO[]> {
    return new Observable((observer) => {
      onValue(
        ref(this.db, this.dbPath),
        (snapshot: DataSnapshot) => {
          const items: PaymentPaidRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as PaymentPaidRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  create(dto: PaymentPaidDTO): Promise<void> {
    return set(push(this.listRef), dto);
  }

  update(key: string, value: Partial<PaymentPaidDTO>): Promise<void> {
    return update(ref(this.db, `${this.dbPath}/${key}`), value);
  }

  remove(key: string): Promise<void> {
    return remove(ref(this.db, `${this.dbPath}/${key}`));
  }
}
