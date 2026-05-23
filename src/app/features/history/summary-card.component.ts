import { Component, Input } from '@angular/core';

import { Balance } from './mock-data';

@Component({
  selector: 'app-h-summary-card',
  standalone: false,
  templateUrl: './summary-card.component.html',
  styleUrls: ['./summary-card.component.scss'],
})
export class SummaryCardComponent {
  @Input() balance!: Balance;
  @Input() owedOrderCount = 0;
  @Input() oweOrderCount = 0;
}
