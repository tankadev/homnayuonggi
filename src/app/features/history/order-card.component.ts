import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HMember, HOrder, HPayer, MyRole, OrderStatus, classifyMyRole, orderStatus } from './mock-data';

interface PayRow extends HPayer {
  isOwnerRow: boolean;
}

@Component({
  selector: 'app-h-order-card',
  standalone: false,
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.scss'],
})
export class OrderCardComponent {
  @Input() order!: HOrder;
  @Input() meId = 'me';
  @Input() open = false;
  /** Live member dictionary (Firebase users keyed by uid) — passed in by history-page. */
  @Input() members: Record<string, HMember> = {};

  @Output() toggleOpen = new EventEmitter<string>();
  @Output() togglePaid = new EventEmitter<{ orderId: string; memberId: string; paid: boolean }>();
  /** Orderer confirms everyone paid → parent deletes /paymentsPaid record. */
  @Output() confirmFullyPaid = new EventEmitter<string>();

  get status(): OrderStatus {
    return orderStatus(this.order);
  }
  get owner() {
    return this.members[this.order.ownerId];
  }
  get isOwnerMe(): boolean {
    return this.order.ownerId === this.meId;
  }
  get myRole(): MyRole {
    return classifyMyRole(this.order, this.meId);
  }
  get collectedAmt(): number {
    return this.order.payers.filter((p) => p.paid).reduce((s, p) => s + p.share, 0);
  }
  get payerTotal(): number {
    return this.order.payers.reduce((s, p) => s + p.share, 0);
  }
  get pct(): number {
    return this.payerTotal === 0 ? 0 : Math.round((this.collectedAmt / this.payerTotal) * 100);
  }

  /** Owner row first, then me, then unpaid, then paid. */
  get rows(): PayRow[] {
    const ownerRow: PayRow = {
      memberId: this.order.ownerId,
      share: this.order.total,
      paid: true,
      isOwnerRow: true,
    };
    const sorted = [...this.order.payers].sort((a, b) => {
      if ((a.memberId === this.meId) !== (b.memberId === this.meId)) {
        return a.memberId === this.meId ? -1 : 1;
      }
      if (a.paid !== b.paid) return a.paid ? 1 : -1;
      return 0;
    });
    return [ownerRow, ...sorted.map((p) => ({ ...p, isOwnerRow: false }))];
  }

  memberFor(id: string) {
    return this.members[id] || { id, name: id, initial: '?' };
  }

  isMe(id: string): boolean {
    return id === this.meId;
  }

  onToggle(): void {
    this.toggleOpen.emit(this.order.id);
  }

  onTogglePaid(row: PayRow, paid: boolean, event: Event): void {
    event.stopPropagation();
    if (row.isOwnerRow) return;
    this.togglePaid.emit({ orderId: this.order.id, memberId: row.memberId, paid });
  }

  /** Visible only when orderer is current user AND every non-orderer is marked paid. */
  get canConfirmFullyPaid(): boolean {
    return this.isOwnerMe && this.status.tag === 'settled' && this.order.payers.length > 0;
  }

  onConfirmFullyPaid(event: Event): void {
    event.stopPropagation();
    this.confirmFullyPaid.emit(this.order.id);
  }

  trackByRow = (_: number, row: PayRow) => row.memberId + (row.isOwnerRow ? ':owner' : '');
}
