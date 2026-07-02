import { Injectable } from '@angular/core';
import { Database, ref, push, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { WaterHistoryDTO } from '../dto/water-history.dto';
import { WaterHistoryRO } from '../ro/water-history.ro';

/** Long-lived "who has fetched drinks" log, kept per room and capped at 20 records. */
@Injectable({ providedIn: 'root' })
export class WaterHistoryService {
  private dbPath = '/waterHistory';
  private historyRef = ref(this.db, this.dbPath);

  /** Keep at most this many records per room; oldest are trimmed on create. */
  static readonly MAX_PER_ROOM = 20;

  constructor(private db: Database) {}

  getAll(): Observable<WaterHistoryRO[]> {
    return new Observable((observer) => {
      onValue(
        this.historyRef,
        (snapshot: DataSnapshot) => {
          const items: WaterHistoryRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as WaterHistoryRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  removeOne(key: string): Promise<void> {
    return remove(ref(this.db, `${this.dbPath}/${key}`));
  }

  /**
   * Append a confirmed result, then trim the room back to MAX_PER_ROOM by dropping
   * the oldest entries. `existingForRoom` is the caller's live snapshot for this room.
   */
  async create(entry: WaterHistoryDTO, existingForRoom: WaterHistoryRO[]): Promise<void> {
    await set(push(this.historyRef), entry);
    const overflow = existingForRoom.length + 1 - WaterHistoryService.MAX_PER_ROOM;
    if (overflow > 0) {
      const oldest = [...existingForRoom]
        .sort((a, b) => (a.createAt || '').localeCompare(b.createAt || ''))
        .slice(0, overflow);
      await Promise.all(oldest.map((h) => this.removeOne(h.key)));
    }
  }

  /** Drop every record for a room (e.g. room deleted). */
  async removeForRoom(roomKey: string, history: WaterHistoryRO[]): Promise<void> {
    const targets = history.filter((h) => h.roomKey === roomKey);
    await Promise.all(targets.map((h) => this.removeOne(h.key)));
  }
}
