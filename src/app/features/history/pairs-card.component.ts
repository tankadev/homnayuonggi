import { Component, Input } from '@angular/core';

import { HMember } from './mock-data';

export interface PairEntry {
  id: string;
  amt: number;
  member: HMember;
  unpaidOrders: number;
}

@Component({
  selector: 'app-h-pairs-card',
  standalone: false,
  templateUrl: './pairs-card.component.html',
  styleUrls: ['./pairs-card.component.scss'],
})
export class PairsCardComponent {
  @Input() title = '';
  @Input() icon: 'arrow-lr' | 'wallet' = 'arrow-lr';
  @Input() pairs: PairEntry[] = [];
  /** 'positive' = others owe me ; 'negative' = I owe them */
  @Input() direction: 'positive' | 'negative' = 'positive';
  @Input() emptyText = '';

  get isOwed(): boolean {
    return this.direction === 'positive';
  }

  /** Stable identity keeps the <li> (and the CountUpDirective inside it)
   *  alive across CD cycles. Without this, the parent's owedPairs getter
   *  returns a fresh array every tick and Angular destroys+recreates each
   *  row — restarting the count-up animation from 0 indefinitely. */
  trackByPair = (_: number, p: PairEntry) => p.id;
}
