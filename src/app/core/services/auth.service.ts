import { Injectable } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { take } from 'rxjs/operators';

import { UserRO } from '../ro/user.ro';
import { UserDTO } from '../dto/user.dto';
import { UserService } from './user.service';
import { LocalStorageService } from './localstorage.service';

export type AuthErrorCode =
  | 'username_invalid'
  | 'username_taken'
  | 'username_not_found'
  | 'display_name_required'
  | 'network';

export class AuthError extends Error {
  constructor(public code: AuthErrorCode, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private current$ = new BehaviorSubject<UserRO | null>(null);

  constructor(
    private userService: UserService,
    private storage: LocalStorageService,
  ) {}

  /** Re-emit the user that was cached in localStorage from the previous session. */
  restore(): UserRO | null {
    const saved = this.storage.getUserInfo();
    if (saved) this.current$.next(saved);
    return saved;
  }

  observe(): Observable<UserRO | null> {
    return this.current$.asObservable();
  }

  get currentUser(): UserRO | null {
    return this.current$.value;
  }

  async register(username: string, displayName: string): Promise<UserRO> {
    const u = this.normalize(username);
    if (!this.isValid(u)) {
      throw new AuthError('username_invalid', 'Tài khoản chỉ chứa chữ thường, số, dấu gạch dưới — tối thiểu 3 ký tự.');
    }
    const name = displayName.trim();
    if (!name) throw new AuthError('display_name_required', 'Vui lòng nhập tên hiển thị.');

    const list = await this.snapshot();
    if (list.some((x) => x.username === u)) {
      throw new AuthError('username_taken', `Tài khoản "@${u}" đã tồn tại — thử đăng nhập?`);
    }
    const dto: UserDTO = { username: u, displayName: name };
    await this.userService.create(dto);

    /* Re-fetch so we know the auto-generated key for the new record. */
    const refreshed = await this.snapshot();
    const created = refreshed.find((x) => x.username === u);
    if (!created) throw new AuthError('network', 'Không đọc được tài khoản vừa tạo. Thử lại?');

    this.persist(created);
    return created;
  }

  async login(username: string): Promise<UserRO> {
    const u = this.normalize(username);
    if (!this.isValid(u)) {
      throw new AuthError('username_invalid', 'Tài khoản không đúng định dạng.');
    }
    const list = await this.snapshot();
    const found = list.find((x) => x.username === u);
    if (!found) {
      throw new AuthError('username_not_found', `Không tìm thấy tài khoản "@${u}". Thử đăng ký?`);
    }
    this.persist(found);
    return found;
  }

  logout(): void {
    this.storage.removeAll();
    this.current$.next(null);
  }

  /** Patch the current user's record (e.g., theme). */
  async patch(fields: Partial<UserDTO>): Promise<void> {
    const cur = this.current$.value;
    if (!cur) return;
    await this.userService.update(cur.key, fields);
    const next = { ...cur, ...fields } as UserRO;
    this.persist(next);
  }

  private persist(user: UserRO): void {
    this.storage.setUser(user);
    this.current$.next(user);
  }

  /** One-shot read of /users so we can search by username. */
  private snapshot(): Promise<UserRO[]> {
    return firstValueFrom(this.userService.getAll().pipe(take(1)));
  }

  private normalize(raw: string): string {
    return raw.trim().toLowerCase().replace(/\s+/g, '');
  }

  private isValid(u: string): boolean {
    return /^[a-z0-9_]{3,32}$/.test(u);
  }
}
