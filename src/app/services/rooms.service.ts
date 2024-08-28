import { Injectable } from '@angular/core';
import { Database, ref, push, update, set, onValue, DataSnapshot } from '@angular/fire/database';
import { RoomDTO } from '../dto/room.dto';
import { RoomRO } from '../ro/room.ro';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RoomsService {

  private dbPath = '/rooms';
  private roomsRef = ref(this.db, this.dbPath);

  constructor(private db: Database) {}

  getAll(): Observable<RoomRO[]> {
    return new Observable(observer => {
      const usersRef = ref(this.db, this.dbPath);

      onValue(usersRef, (snapshot: DataSnapshot) => {
        const users: RoomRO[] = [];

        snapshot.forEach(childSnapshot => {
          const user: RoomRO = {
            key: childSnapshot.key,
            ...childSnapshot.val()
          };
          users.push(user);
        });

        observer.next(users);
      }, error => {
        observer.error(error);
      });
    });
  }

  create(roomDTO: RoomDTO): Promise<void> {
    const newRoomRef = push(this.roomsRef);
    return set(newRoomRef, roomDTO);
  }

  update(key: string, value: RoomDTO): Promise<void> {
    const roomRef = ref(this.db, `${this.dbPath}/${key}`);
    return update(roomRef, value);
  }
}
