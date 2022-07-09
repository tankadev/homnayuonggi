import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';

import { RoomDTO } from '../dto/room.dto';
import { RoomRO } from '../ro/room.ro';

@Injectable({
  providedIn: 'root'
})
export class RoomsService {

  private dbPath = '/rooms';

  roomsRef: AngularFireList<RoomRO | RoomDTO> = null;

  constructor(
    private db: AngularFireDatabase
  ) {
    this.roomsRef = db.list(this.dbPath);
  }

  getAll(): AngularFireList<RoomRO> {
    return this.roomsRef as AngularFireList<RoomRO>;
  }

  create(roomDTO: RoomDTO): any {
    return this.roomsRef.push(roomDTO);
  }

  update(key: string, value: RoomDTO): Promise<void> {
    return this.roomsRef.update(key, value);
  }
}
