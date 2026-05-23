import { Injectable } from '@angular/core';
import { Database, ref, push, update, set, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { RoomDTO } from '../dto/room.dto';
import { RoomRO } from '../ro/room.ro';

@Injectable({ providedIn: 'root' })
export class RoomsService {
  private dbPath = '/rooms';
  private roomsRef = ref(this.db, this.dbPath);

  constructor(private db: Database) {}

  getAll(): Observable<RoomRO[]> {
    return new Observable((observer) => {
      onValue(
        ref(this.db, this.dbPath),
        (snapshot: DataSnapshot) => {
          const items: RoomRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as RoomRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  create(dto: RoomDTO): Promise<void> {
    return set(push(this.roomsRef), dto);
  }

  update(key: string, value: Partial<RoomDTO>): Promise<void> {
    return update(ref(this.db, `${this.dbPath}/${key}`), value);
  }
}
