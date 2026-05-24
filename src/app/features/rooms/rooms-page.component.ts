import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';

import { encryptPassword, mapRoom, RoomView } from './room-view';
import { RoomDraft } from '../place-order/modals/room-draft';
import { RoomsService } from '../../core/services/rooms.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { AuthService } from '../../core/services/auth.service';
import { LocalStorageService } from '../../core/services/localstorage.service';
import { RoomDTO } from '../../core/dto/room.dto';
import { RoomRO } from '../../core/ro/room.ro';
import { DeliveryRO } from '../../core/ro/delivery.ro';

type Filter = 'all' | 'live' | 'idle' | 'private';

@Component({
  selector: 'app-rooms-page',
  standalone: false,
  templateUrl: './rooms-page.component.html',
  styleUrls: ['./rooms-page.component.scss'],
})
export class RoomsPageComponent implements OnInit, OnDestroy {
  @Output() enter = new EventEmitter<RoomRO>();

  rooms: RoomView[] = [];
  /** Raw RoomRO list — kept so we can re-emit a real RoomRO on enter(). */
  private rawRooms: RoomRO[] = [];
  /** Most recent delivery per room (keyed by room.key) — used for live/idle status. */
  private deliveriesByRoom: Map<string, DeliveryRO> = new Map();

  loading = true;
  errorMsg: string | null = null;
  creating = false;

  filter: Filter = 'all';
  query = '';

  createOpen = false;
  joining: RoomView | null = null;

  private sub?: Subscription;

  constructor(
    private roomsService: RoomsService,
    private deliveryService: DeliveryService,
    private auth: AuthService,
    private storage: LocalStorageService,
  ) {}

  ngOnInit(): void {
    document.body.classList.add('rooms-body');

    /* Seed from the last cached snapshot so F5 paints the grid immediately instead of
       waiting for /rooms + /deliveries to roundtrip. The live subscription below will
       overwrite this as soon as it arrives. */
    const cachedRooms = this.safeReadRooms();
    const cachedDeliveries = this.safeReadDeliveries();
    if (cachedRooms.length) {
      this.applySnapshot(cachedRooms, cachedDeliveries);
    }

    this.sub = combineLatest([
      this.roomsService.getAll(),
      this.deliveryService.getAll(),
    ]).subscribe({
      next: ([rooms, deliveries]) => {
        this.applySnapshot(rooms, deliveries);
        this.storage.setRoomsList(rooms);
        this.storage.setDeliveriesList(deliveries);
      },
      error: (e) => {
        this.loading = false;
        this.errorMsg = e?.message || 'Không tải được danh sách phòng.';
      },
    });
  }

  private applySnapshot(rooms: RoomRO[], deliveries: DeliveryRO[]): void {
    this.rawRooms = rooms;
    this.deliveriesByRoom = new Map();
    for (const d of deliveries) {
      /* If a room has multiple deliveries, keep the latest active one. */
      const existing = this.deliveriesByRoom.get(d.roomKey);
      const isLater = !existing || (d.createDateTime || '') > (existing.createDateTime || '');
      if (isLater) this.deliveriesByRoom.set(d.roomKey, d);
    }
    const meKey = this.auth.currentUser?.key ?? null;
    this.rooms = rooms.map((r) => mapRoom(r, this.deliveriesByRoom.get(r.key), meKey));
    this.loading = false;
    this.errorMsg = null;
  }

  private safeReadRooms(): RoomRO[] {
    try {
      const r = this.storage.getRoomsList();
      return Array.isArray(r) ? r : [];
    } catch {
      return [];
    }
  }

  private safeReadDeliveries(): DeliveryRO[] {
    try {
      const d = this.storage.getDeliveriesList();
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }

  ngOnDestroy(): void {
    document.body.classList.remove('rooms-body');
    this.sub?.unsubscribe();
  }

  get stats(): { total: number; live: number; idle: number; private: number } {
    return {
      total: this.rooms.length,
      live: this.rooms.filter((r) => r.status === 'live' || r.status === 'editing').length,
      idle: this.rooms.filter((r) => r.status === 'idle').length,
      private: this.rooms.filter((r) => r.private).length,
    };
  }

  get filtered(): RoomView[] {
    const q = this.query.trim().toLowerCase();
    return this.rooms.filter((r) => {
      if (this.filter === 'live' && r.status === 'idle') return false;
      if (this.filter === 'idle' && r.status !== 'idle') return false;
      if (this.filter === 'private' && !r.private) return false;
      if (q) {
        const hay = `${r.name} ${r.desc} ${r.shop || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }

  setFilter(f: Filter): void {
    this.filter = f;
  }

  onJoin(room: RoomView): void {
    if (room.private) {
      this.joining = room;
    } else {
      this.emitEnter(room.key);
    }
  }

  onJoined(room: RoomView): void {
    this.joining = null;
    this.emitEnter(room.key);
  }

  openCreate(): void {
    this.createOpen = true;
  }

  async onCreate(draft: RoomDraft): Promise<void> {
    if (this.creating) return;
    const me = this.auth.currentUser;
    if (!me) {
      this.errorMsg = 'Bạn cần đăng nhập trước khi tạo phòng.';
      return;
    }
    this.creating = true;
    try {
      const dto: RoomDTO = {
        name: draft.name.trim(),
        description: (draft.desc || '').trim(),
        isPrivate: draft.private,
        createUser: me.key,
        password: draft.private && draft.password ? encryptPassword(draft.password) : '',
      };
      await this.roomsService.create(dto);
      this.createOpen = false;
      /* The realtime subscription will refresh `rooms` momentarily — no manual splice. */
    } catch (e: any) {
      this.errorMsg = e?.message || 'Không tạo được phòng. Thử lại?';
    } finally {
      this.creating = false;
    }
  }

  /** Resolve the raw RoomRO matching a clicked card and emit it up to AppComponent. */
  private emitEnter(key: string): void {
    const raw = this.rawRooms.find((r) => r.key === key);
    if (raw) this.enter.emit(raw);
  }

  /** Look up the live stored cipher for a room key — used to seed the join modal. */
  cipherFor(key: string): string {
    return this.rawRooms.find((r) => r.key === key)?.password || '';
  }
}
