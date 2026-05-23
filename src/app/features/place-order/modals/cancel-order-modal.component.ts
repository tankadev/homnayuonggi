import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MockCartLine } from '../mock-data';

@Component({
  selector: 'app-cancel-order-modal',
  standalone: false,
  templateUrl: './cancel-order-modal.component.html',
  styleUrls: ['./cancel-order-modal.component.scss'],
})
export class CancelOrderModalComponent {
  @Input() cart: MockCartLine[] = [];
  @Output() confirm = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();

  get dishCount(): number {
    return new Set(this.cart.map((c) => c.dishId)).size;
  }
  get partCount(): number {
    return this.cart.reduce((n, c) => n + c.qty, 0);
  }
  get peopleCount(): number {
    return new Set(this.cart.map((c) => c.memberId)).size;
  }
}
