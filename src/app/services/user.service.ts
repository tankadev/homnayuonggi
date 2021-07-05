import { Injectable } from '@angular/core';

import { AngularFireDatabase, AngularFireList } from '@angular/fire/database';

import { UserDTO } from '../dto/user.dto';
import { UserRO } from '../ro/user.ro';

@Injectable({
  providedIn: 'root'
})
export class UserService {

  private dbPath = '/users';

  usersRef: AngularFireList<UserRO | UserDTO> = null;
  constructor(
    private db: AngularFireDatabase
  ) {
    this.usersRef = db.list(this.dbPath);
  }

  getAll(): AngularFireList<UserRO> {
    return this.usersRef as AngularFireList<UserRO>;
  }

  create(userDTO: UserDTO): any {
    return this.usersRef.push(userDTO);
  }

  update(key: string, value: UserDTO): Promise<void> {
    return this.usersRef.update(key, value);
  }
}
