import { Component, EventEmitter, Input, Output } from '@angular/core';

import { HMember } from './mock-data';

export type RangeFilter = '7d' | '30d' | 'all';

@Component({
  selector: 'app-h-filters-card',
  standalone: false,
  templateUrl: './filters-card.component.html',
  styleUrls: ['./filters-card.component.scss'],
})
export class FiltersCardComponent {
  @Input() range: RangeFilter = '7d';
  @Input() memberFilter = 'all';
  @Input() roomFilter = 'all';
  @Input() shopFilter = 'all';
  @Input() members: HMember[] = [];
  @Input() rooms: string[] = [];
  @Input() shops: string[] = [];

  @Output() rangeChange = new EventEmitter<RangeFilter>();
  @Output() memberFilterChange = new EventEmitter<string>();
  @Output() roomFilterChange = new EventEmitter<string>();
  @Output() shopFilterChange = new EventEmitter<string>();
}
