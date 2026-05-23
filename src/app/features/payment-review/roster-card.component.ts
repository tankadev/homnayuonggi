import { Component, Input } from '@angular/core';

import { PrShare } from './mock-data';

@Component({
  selector: 'app-roster-card',
  standalone: false,
  templateUrl: './roster-card.component.html',
  styleUrls: ['./roster-card.component.scss'],
})
export class RosterCardComponent {
  @Input() payers: PrShare[] = [];
  @Input() paidMap: Record<string, boolean> = {};

  get paidCount(): number {
    return this.payers.filter((p) => this.paidMap[p.id]).length;
  }

  isPaid(id: string): boolean {
    return !!this.paidMap[id];
  }
}
