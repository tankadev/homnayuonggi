import { Component, Input } from '@angular/core';

import { PrOrder, PrShare } from './mock-data';

@Component({
  selector: 'app-you-pay-card',
  standalone: false,
  templateUrl: './you-pay-card.component.html',
  styleUrls: ['./you-pay-card.component.scss'],
})
export class YouPayCardComponent {
  @Input() me!: PrShare;
  @Input() myPaid = false;
  @Input() order!: PrOrder;
  @Input() grandTotal = 0;
  @Input() unpaidTotal = 0;
  @Input() totalPayers = 0;

  get isOwner(): boolean {
    return !!this.me?.owner;
  }
  get amountShown(): number {
    return this.isOwner ? this.grandTotal : this.me?.share ?? 0;
  }
  get amountLabel(): string {
    return this.isOwner ? 'Bạn ứng cho cả nhóm' : 'Số tiền của bạn';
  }
  get headerHint(): string {
    if (this.isOwner) return 'Bạn là người đặt đơn';
    if (this.myPaid) return 'Đã ghi nhận';
    return 'Chuyển trước 18:00';
  }
  get myDishCount(): number {
    return this.me?.items.reduce((s, it) => s + it.qty, 0) ?? 0;
  }
}
