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
}
