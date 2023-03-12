import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';

import { PaymentPaidRO } from '../ro/payment-paid.ro';
import { PaymentPaidDTO } from '../dto/payment-paid.dto';

@Injectable({
  providedIn: 'root'
})
export class PaymentPaidService {

  private dbPath = '/paymentsPaid';

  paymentsPaidRef: AngularFireList<PaymentPaidRO | PaymentPaidDTO> = null;

  constructor(
    private db: AngularFireDatabase
  ) {
    this.paymentsPaidRef = db.list(this.dbPath);
  }

  getAll(): AngularFireList<PaymentPaidRO> {
    return this.paymentsPaidRef as AngularFireList<PaymentPaidRO>;
  }

  create(paymentPaidDTO: PaymentPaidDTO): any {
    return this.paymentsPaidRef.push(paymentPaidDTO);
  }

  update(key: string, value: PaymentPaidDTO): Promise<void> {
    return this.paymentsPaidRef.update(key, value);
  }
}
