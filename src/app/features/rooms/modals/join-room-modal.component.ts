import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import * as CryptoJS from 'crypto-js';

import { encryptPassword, RoomView, verifyPassword } from '../room-view';
import { LocalStorageService } from '../../../core/services/localstorage.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-join-room-modal',
  standalone: false,
  templateUrl: './join-room-modal.component.html',
  styleUrls: ['./join-room-modal.component.scss'],
})
export class JoinRoomModalComponent implements OnInit, AfterViewInit {
  @Input() room!: RoomView;
  /** AES-encrypted password from the live RoomRO — passed in by rooms-page to avoid a refetch. */
  @Input() storedCipher = '';
  @Output() joined = new EventEmitter<RoomView>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('pwdInput') pwdInput?: ElementRef<HTMLInputElement>;

  pwd = '';
  showPwd = false;
  touched = false;
  error: string | null = null;
  submitting = false;

  constructor(private storage: LocalStorageService) {}

  ngOnInit(): void {
    /* If the user has joined this private room before, the cached password may match. */
    const cached = this.cachedPlaintext();
    if (cached) this.pwd = cached;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.pwdInput?.nativeElement.focus();
      this.pwdInput?.nativeElement.select();
    }, 0);
  }

  get hasShop(): boolean {
    return !!this.room.shop;
  }
  get initial(): string {
    return this.room.initialLabel || (this.room.name[0] || '?');
  }
  get pwdEmpty(): boolean {
    return this.touched && !this.pwd.trim();
  }

  onChange(value: string): void {
    this.pwd = value;
    this.error = null;
  }

  onSubmit(e?: Event): void {
    e?.preventDefault();
    if (this.submitting) return;
    this.touched = true;
    const typed = this.pwd.trim();
    if (!typed) return;

    this.submitting = true;
    try {
      const stored = (this.storedCipher || '').trim();
      if (!stored) {
        this.error = 'Phòng này chưa được đặt mật khẩu — vui lòng liên hệ chủ phòng.';
        return;
      }
      if (!verifyPassword(stored, typed)) {
        this.error = 'Mật khẩu phòng không đúng. Hãy thử lại.';
        this.pwdInput?.nativeElement.select();
        return;
      }
      /* Cache so the next visit is just a click. */
      this.cacheEncrypted(encryptPassword(typed));
      this.joined.emit(this.room);
    } catch {
      this.error = 'Không kiểm tra được mật khẩu. Thử lại nhé.';
    } finally {
      this.submitting = false;
    }
  }

  private cachedPlaintext(): string | null {
    const entry = this.storage.getMyRoomsPwd().find((x) => x.key === this.room.key);
    if (!entry) return null;
    try {
      const decoded = CryptoJS.AES.decrypt(entry.pwd.trim(), environment.pwd).toString(CryptoJS.enc.Utf8);
      return decoded || null;
    } catch {
      return null;
    }
  }

  private cacheEncrypted(cipher: string): void {
    /* Only append if not already cached. */
    const existing = this.storage.getMyRoomsPwd();
    if (existing.some((x) => x.key === this.room.key)) return;
    this.storage.setMyRoomsPwd({ key: this.room.key, pwd: cipher });
  }
}
