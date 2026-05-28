import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnDestroy,
  Output,
  ViewChild,
} from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

import { HMember, HOrder, HPayer, MyRole, OrderStatus, classifyMyRole, orderStatus } from './mock-data';
import { PaymentLine } from '../../core/utils/payment-info';

interface PayRow extends HPayer {
  isOwnerRow: boolean;
}

@Component({
  selector: 'app-h-order-card',
  standalone: false,
  templateUrl: './order-card.component.html',
  styleUrls: ['./order-card.component.scss'],
  animations: [
    /* Body expand/collapse — animates height between 0 and auto via
       max-height interpolation, plus opacity for a softer reveal. */
    trigger('expand', [
      transition(':enter', [
        style({ height: 0, opacity: 0, overflow: 'hidden' }),
        animate('260ms cubic-bezier(.4, 0, .2, 1)', style({ height: '*', opacity: 1 })),
      ]),
      transition(':leave', [
        style({ height: '*', opacity: 1, overflow: 'hidden' }),
        animate('220ms cubic-bezier(.4, 0, .2, 1)', style({ height: 0, opacity: 0 })),
      ]),
    ]),
  ],
})
export class OrderCardComponent implements AfterViewInit, OnDestroy {
  @Input() order!: HOrder;
  @Input() meId = 'me';
  @Input() open = false;
  /** Live member dictionary (Firebase users keyed by uid) — passed in by history-page. */
  @Input() members: Record<string, HMember> = {};

  @Output() toggleOpen = new EventEmitter<string>();
  @Output() togglePaid = new EventEmitter<{ orderId: string; memberId: string; paid: boolean }>();
  /** Orderer confirms everyone paid → parent deletes /paymentsPaid record. */
  @Output() confirmFullyPaid = new EventEmitter<string>();

  /** Flips to true once this card has scrolled into the viewport — drives the
      fade-up enter animation. Starts false so the card mounts invisible. */
  entered = false;
  /** Used as a stagger source so multiple cards entering simultaneously
      don't all animate in the same frame. */
  enterDelay = 0;
  /** Ref to the `<article>` itself — the host has `display: contents` so
   *  IntersectionObserver can't track it (no layout box). */
  @ViewChild('cardEl', { static: true }) cardEl?: ElementRef<HTMLElement>;

  private observer?: IntersectionObserver;
  private static burstCounter = 0;
  private static lastEnterAt = 0;

  ngAfterViewInit(): void {
    const target = this.cardEl?.nativeElement;
    /* If IO isn't available OR we couldn't locate the article, reveal now. */
    if (typeof IntersectionObserver === 'undefined' || !target) {
      this.entered = true;
      return;
    }
    this.observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !this.entered) this.revealWithStagger();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
    );
    this.observer.observe(target);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  /** Reveal this card with a stagger delay shared across cards arriving in
   *  the same burst. The counter resets after a ~250ms idle gap so unrelated
   *  reveals later (e.g., the user scrolls down) start at delay 0 again. */
  private revealWithStagger(): void {
    const now = performance.now();
    if (now - OrderCardComponent.lastEnterAt > 250) OrderCardComponent.burstCounter = 0;
    OrderCardComponent.lastEnterAt = now;
    this.enterDelay = (OrderCardComponent.burstCounter % 10) * 50;
    OrderCardComponent.burstCounter++;
    this.entered = true;
    this.observer?.disconnect();
    this.observer = undefined;
  }

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

  /** Orderer's payment methods (how to pay them). */
  get payTo(): PaymentLine[] {
    return this.owner?.payments || [];
  }
  /** Show the "how to pay" panel only to non-orderers — the orderer is the one collecting. */
  get showPayTo(): boolean {
    return !this.isOwnerMe && this.payTo.length > 0;
  }

  /** Tracks the last copied token so the button can flash a confirmation. */
  copied = '';
  private copyTimer?: ReturnType<typeof setTimeout>;

  async copy(text: string, event: Event): Promise<void> {
    event.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      this.copied = text;
      clearTimeout(this.copyTimer);
      this.copyTimer = setTimeout(() => {
        if (this.copied === text) this.copied = '';
      }, 1600);
    } catch {
      /* clipboard unavailable (insecure context / denied) — silently no-op */
    }
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
