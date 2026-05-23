import { Component, EventEmitter, Input, Output } from '@angular/core';

import { RoomView } from './room-view';

@Component({
  selector: 'app-room-card',
  standalone: false,
  templateUrl: './room-card.component.html',
  styleUrls: ['./room-card.component.scss'],
})
export class RoomCardComponent {
  @Input() room!: RoomView;
  @Output() join = new EventEmitter<RoomView>();

  get isLive(): boolean {
    return this.room.status === 'live';
  }
  get isEditing(): boolean {
    return this.room.status === 'editing';
  }
  get isCompleted(): boolean {
    return this.room.status === 'completed';
  }
  get isIdle(): boolean {
    return this.room.status === 'idle';
  }
  get statusLabel(): string {
    if (this.isLive) return 'Đang chọn món';
    if (this.isEditing) return 'Đang chọn quán';
    if (this.isCompleted) return 'Chọn món xong';
    return 'Phòng trống';
  }
  get hasShop(): boolean {
    return !!this.room.shop;
  }
  get initial(): string {
    return this.room.initialLabel || (this.room.name[0] || '?');
  }
}
