import { Component, EventEmitter, Input, Output } from '@angular/core';

import { PrOrder, SplitMode } from './mock-data';

@Component({
  selector: 'app-order-info-card',
  standalone: false,
  templateUrl: './order-info-card.component.html',
  styleUrls: ['./order-info-card.component.scss'],
})
export class OrderInfoCardComponent {
  @Input() order!: PrOrder;
  @Input() subtotal = 0;
  @Input() grand = 0;
  @Input() participantCount = 0;
  @Input() splitMode: SplitMode = 'items';
  @Input() isOwner = false;

  @Output() splitChange = new EventEmitter<SplitMode>();

  get paymentLabel(): string {
    switch (this.order.paymentMethod) {
      case 'bank': return 'Chuyển khoản';
      case 'momo': return 'Ví MoMo';
      default: return 'Tiền mặt';
    }
  }

  setMode(m: SplitMode): void {
    if (!this.isOwner) return;
    this.splitChange.emit(m);
  }
}
