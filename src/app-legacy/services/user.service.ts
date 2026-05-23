import { Injectable } from '@angular/core';
import { Database, ref, push, update, DatabaseReference, set, child, onValue, DataSnapshot } from '@angular/fire/database';
import { UserDTO } from '../dto/user.dto';
import { UserRO } from '../ro/user.ro';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private dbPath = '/users';
  private usersRef: DatabaseReference;

  constructor(private db: Database) {
    this.usersRef = ref(this.db, this.dbPath);
  }

  getAll(): Observable<UserRO[]> {
    return new Observable(observer => {
      const usersRef = ref(this.db, this.dbPath);

      onValue(usersRef, (snapshot: DataSnapshot) => {
        const users: UserRO[] = [];

        snapshot.forEach(childSnapshot => {
          const user: UserRO = {
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

  create(userDTO: UserDTO): Promise<void> {
    const newUserRef = push(this.usersRef);
    return set(newUserRef, userDTO);
  }

  update(key: string, value: UserDTO): Promise<void> {
    const userRef = child(this.usersRef, key);
    return update(userRef, value);
  }
}
