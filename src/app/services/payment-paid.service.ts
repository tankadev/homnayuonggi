import { Injectable } from '@angular/core';

import { Database, ref, push, update, set, remove, onValue, DataSnapshot } from '@angular/fire/database';

import { PaymentPaidRO } from '../ro/payment-paid.ro';
import { PaymentPaidDTO } from '../dto/payment-paid.dto';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PaymentPaidService {

  private dbPath = '/paymentsPaid';
  private paymentsPaidRef = ref(this.db, this.dbPath);

  constructor(private db: Database) {}

  getAll(): Observable<PaymentPaidRO[]> {
    return new Observable(observer => {
      const usersRef = ref(this.db, this.dbPath);

      onValue(usersRef, (snapshot: DataSnapshot) => {
        const users: PaymentPaidRO[] = [];

        snapshot.forEach(childSnapshot => {
          const user: PaymentPaidRO = {
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

  create(paymentPaidDTO: PaymentPaidDTO): Promise<void> {
    const newPaymentsPaidRef = push(this.paymentsPaidRef);
    return set(newPaymentsPaidRef, paymentPaidDTO);
  }

  update(key: string, value: PaymentPaidDTO): Promise<void> {
    const paymentRef = ref(this.db, `${this.dbPath}/${key}`);
    return update(paymentRef, value);
  }

  remove(key: string): Promise<void> {
    const paymentRef = ref(this.db, `${this.dbPath}/${key}`);
    return remove(paymentRef);
  }
}
