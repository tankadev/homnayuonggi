import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { PrShare, SplitMode } from './mock-data';

@Component({
  selector: 'app-pr-member-card',
  standalone: false,
  templateUrl: './member-card.component.html',
  styleUrls: ['./member-card.component.scss'],
})
export class MemberCardComponent implements OnChanges {
  @Input() member!: PrShare;
  @Input() splitMode: SplitMode = 'items';
  @Input() paid = false;
  @Input() isOwner = false;

  @Output() togglePaid = new EventEmitter<string>();

  /** Transient flag set ONLY on a false→true `paid` transition. Drives the
   *  one-shot row flash. Prevents the flash firing on initial mount of an
   *  already-paid row. */
  justPaid = false;
  private flashTimer = 0;

  ngOnChanges(changes: SimpleChanges): void {
    const c = changes['paid'];
    if (!c || c.firstChange) return;
    if (c.previousValue === false && c.currentValue === true) {
      this.justPaid = true;
      if (this.flashTimer) window.clearTimeout(this.flashTimer);
      this.flashTimer = window.setTimeout(() => (this.justPaid = false), 750);
    }
  }

  get totalQty(): number {
    return this.member.items.reduce((s, it) => s + it.qty, 0);
  }
}
