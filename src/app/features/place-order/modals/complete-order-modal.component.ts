import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { MockCartLine, MockDish, MockMember } from '../mock-data';
import { UserPaymentModel } from '../../../core/models/user-payment.model';

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
  /** Current user's saved payment list — source of truth, replaces previous global localStorage cache. */
  @Input() initialPayment: UserPaymentModel[] | undefined = undefined;
  /** Default account holder if profile doesn't yet have one. */
  @Input() defaultHolder = '';

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
    holder: '',
    momoPhone: '',
    bankName: '',
    bankAccount: '',
  };

  ngOnInit(): void {
    this.pay = parsePaymentList(this.initialPayment, this.defaultHolder);
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
  }

  /** Sanitize numeric input (digits + spaces). */
  onPayInput(key: keyof PaymentInfo, value: string): void {
    let next = value;
    if (key === 'bankAccount' || key === 'momoPhone') {
      next = value.replace(/[^\d ]/g, '');
    } else if (key === 'holder') {
      next = value.toUpperCase();
    }
    this.pay = { ...this.pay, [key]: next };
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

/**
 * Mirror image of paymentLookup() in payment-review.adapter.ts — turn a freeform
 * UserPaymentModel[] back into a typed PaymentInfo so the form can pre-fill. Labels
 * must match the same regexes the adapter uses, so write-then-read round-trips cleanly.
 */
function parsePaymentList(list: UserPaymentModel[] | undefined, defaultHolder: string): PaymentInfo {
  const find = (re: RegExp): UserPaymentModel | undefined =>
    (list || []).find((p) => re.test(p.label || ''));
  const valueOf = (p?: UserPaymentModel) => (p?.value || '').trim();
  const isActive = (p?: UserPaymentModel) => !!p && p.checked !== false && !p.disabled;

  const bankNameEntry = find(/ngân hàng|bank/i);
  const bankAccEntry = find(/(số tài khoản|stk|acc)/i);
  const holderEntry = find(/(chủ tài khoản|holder|tên)/i);
  const momoEntry = find(/momo|sđt|phone/i);

  const bankActive = isActive(bankAccEntry) || isActive(bankNameEntry);
  const momoActive = isActive(momoEntry) && !bankActive;
  const method: PayMethod = momoActive ? 'momo' : 'bank';

  return {
    method,
    holder: valueOf(holderEntry) || defaultHolder || '',
    momoPhone: valueOf(momoEntry),
    bankName: valueOf(bankNameEntry),
    bankAccount: valueOf(bankAccEntry),
  };
}

/** Inverse of parsePaymentList — only the active method's entries are checked=true,
 *  so payment-review's paymentLookup() picks the right method back out. */
export function paymentInfoToList(pay: PaymentInfo): UserPaymentModel[] {
  const isBank = pay.method === 'bank';
  return [
    { label: 'Ngân hàng', value: pay.bankName || '', checked: isBank },
    { label: 'STK', value: pay.bankAccount || '', checked: isBank },
    { label: 'Chủ tài khoản', value: pay.holder || '', checked: isBank },
    { label: 'MoMo', value: pay.momoPhone || '', checked: !isBank },
  ];
}
