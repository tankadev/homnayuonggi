import { Injectable } from '@angular/core';
import { Database, ref, push, update, set, child, onValue, DataSnapshot, DatabaseReference } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { UserDTO } from '../dto/user.dto';
import { UserRO } from '../ro/user.ro';

@Injectable({ providedIn: 'root' })
export class UserService {
  private dbPath = '/users';
  private usersRef: DatabaseReference;

  constructor(private db: Database) {
    this.usersRef = ref(this.db, this.dbPath);
  }

  getAll(): Observable<UserRO[]> {
    return new Observable((observer) => {
      onValue(
        ref(this.db, this.dbPath),
        (snapshot: DataSnapshot) => {
          const items: UserRO[] = [];
          snapshot.forEach((c) => { items.push({ key: c.key, ...c.val() } as UserRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  create(dto: UserDTO): Promise<void> {
    return set(push(this.usersRef), dto);
  }

  update(key: string, value: Partial<UserDTO>): Promise<void> {
    return update(child(this.usersRef, key), value);
  }
}
