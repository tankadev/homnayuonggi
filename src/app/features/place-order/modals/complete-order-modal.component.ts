import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { MockCartLine, MockDish, MockMember } from '../mock-data';

type PayMethod = 'bank' | 'momo';
type SplitMode = 'equal' | 'sponsor';

interface PaymentInfo {
  method: PayMethod;
  holder: string;
  momoPhone: string;
  bankName: string;
  bankAccount: string;
}

export interface CompleteOrderResult {
  shipping: number;
  serviceFee: number;
  discount: number;
  splitMode: SplitMode;
  total: number;
  payment: PaymentInfo;
}

const STORAGE_KEY = 'tug-payment-info';
const BANKS = [
  'Vietcombank', 'Techcombank', 'BIDV', 'VietinBank', 'MB Bank',
  'ACB', 'Sacombank', 'TPBank', 'VPBank', 'VIB',
  'Agribank', 'HDBank', 'OCB', 'SHB', 'SeABank',
];

@Component({
  selector: 'app-complete-order-modal',
  standalone: false,
  templateUrl: './complete-order-modal.component.html',
  styleUrls: ['./complete-order-modal.component.scss'],
})
export class CompleteOrderModalComponent implements OnInit {
  @Input() cart: MockCartLine[] = [];
  @Input() dishMap: Record<string, MockDish> = {};
  @Input() memberMap: Record<string, MockMember> = {};
  @Input() subtotal = 0;

  @Output() done = new EventEmitter<CompleteOrderResult>();
  @Output() closed = new EventEmitter<void>();

  readonly banks = BANKS;

  step: 1 | 2 = 1;
  shipping = 0;
  serviceFee = 0;
  discount = 0;
  splitMode: SplitMode = 'equal';
  isDone = false;
  orderCode = '';

  pay: PaymentInfo = {
    method: 'bank',
    holder: 'Chick',
    momoPhone: '',
    bankName: '',
    bankAccount: '',
  };

  ngOnInit(): void {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      this.pay = {
        method: saved.method || 'bank',
        holder: saved.holder || this.memberMap['me']?.name || 'Chick',
        momoPhone: saved.momoPhone || '',
        bankName: saved.bankName || '',
        bankAccount: saved.bankAccount || '',
      };
    } catch {
      /* keep defaults */
    }
    this.orderCode = String(Math.floor(Math.random() * 900000 + 100000));
  }

  get itemCount(): number {
    return this.cart.reduce((n, c) => n + c.qty, 0);
  }
  get dishCount(): number {
    return new Set(this.cart.map((c) => c.dishId)).size;
  }
  get memberIds(): string[] {
    return Array.from(new Set(this.cart.map((c) => c.memberId)));
  }
  get total(): number {
    return Math.max(0, this.subtotal + this.shipping + this.serviceFee - this.discount);
  }

  setMethod(m: PayMethod): void {
    this.pay = { ...this.pay, method: m };
    this.persist();
  }

  /** Sanitize numeric input (digits + spaces) and persist. */
  onPayInput(key: keyof PaymentInfo, value: string): void {
    let next = value;
    if (key === 'bankAccount' || key === 'momoPhone') {
      next = value.replace(/[^\d ]/g, '');
    } else if (key === 'holder') {
      next = value.toUpperCase();
    }
    this.pay = { ...this.pay, [key]: next };
    this.persist();
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pay));
    } catch {
      /* localStorage may be unavailable */
    }
  }

  setFee(key: 'shipping' | 'serviceFee' | 'discount', value: string | number): void {
    const n = Math.max(0, Number(value) || 0);
    this[key] = n;
  }

  next(): void {
    this.step = 2;
  }
  back(): void {
    this.step = 1;
  }

  finish(): void {
    this.isDone = true;
  }

  acknowledgeDone(): void {
    this.done.emit({
      shipping: this.shipping,
      serviceFee: this.serviceFee,
      discount: this.discount,
      splitMode: this.splitMode,
      total: this.total,
      payment: { ...this.pay },
    });
  }
}
