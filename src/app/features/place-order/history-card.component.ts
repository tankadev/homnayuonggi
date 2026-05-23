import { Component, Input } from '@angular/core';

import { MockHistoryEntry } from './mock-data';

@Component({
  selector: 'app-history-card',
  standalone: false,
  templateUrl: './history-card.component.html',
  styleUrls: ['./history-card.component.scss'],
})
export class HistoryCardComponent {
  @Input() entries: MockHistoryEntry[] = [];

  label(action: 'add' | 'remove' | 'edit'): string {
    return action === 'add' ? 'đã chọn' : action === 'remove' ? 'đã huỷ' : 'đã sửa';
  }
}
