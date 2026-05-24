import { Component, EventEmitter, Input, Output } from '@angular/core';

import { UserRO } from '../../core/ro/user.ro';
import { RoomRO } from '../../core/ro/room.ro';
import { LocalStorageService } from '../../core/services/localstorage.service';

export type HeaderMode = 'welcome' | 'rooms' | 'create-order' | 'place-order' | 'payment-review' | 'history';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
})
export class HeaderComponent {
  @Input() user: UserRO | null = null;
  @Input() room: RoomRO | null = null;
  @Input() mode: HeaderMode = 'rooms';

  @Output() leaveRoom = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() editRoom = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() backToRooms = new EventEmitter<void>();

  constructor(private storage: LocalStorageService) {}

  onLeaveRoom(): void {
    this.storage.quitRoom();
    this.leaveRoom.emit();
  }

  onLogout(): void {
    this.storage.removeAll();
    this.logout.emit();
  }

  get roomName(): string {
    return this.room?.name ?? 'Chưa chọn phòng';
  }

  get isPrivate(): boolean {
    return !!this.room?.isPrivate;
  }

  get canEditRoom(): boolean {
    return !!this.user && !!this.room && this.room.createUser === this.user.key;
  }

  get isLoggedIn(): boolean {
    return !!this.user;
  }

  /** History mode is cross-room — bypass the room pill and show a personal subtitle. */
  get isHistory(): boolean {
    return this.mode === 'history';
  }

  get brandSubtitle(): string {
    if (this.isHistory) return 'Lịch sử thanh toán · cá nhân';
    return 'Nguồn dữ liệu · ShopeeFood';
  }
}
