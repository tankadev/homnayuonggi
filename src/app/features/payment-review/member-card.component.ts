import { Component, EventEmitter, Input, Output } from '@angular/core';

import { PrShare, SplitMode } from './mock-data';

@Component({
  selector: 'app-pr-member-card',
  standalone: false,
  templateUrl: './member-card.component.html',
  styleUrls: ['./member-card.component.scss'],
})
export class MemberCardComponent {
  @Input() member!: PrShare;
  @Input() splitMode: SplitMode = 'items';
  @Input() paid = false;
  @Input() paidAt: string | null = null;
  @Input() isOwner = false;

  @Output() togglePaid = new EventEmitter<string>();

  get totalQty(): number {
    return this.member.items.reduce((s, it) => s + it.qty, 0);
  }
}
