import { AfterViewInit, Component, ElementRef, EventEmitter, Output, ViewChild } from '@angular/core';

import { RoomDraft } from '../../place-order/modals/room-draft';

@Component({
  selector: 'app-create-room-modal',
  standalone: false,
  templateUrl: './create-room-modal.component.html',
})
export class CreateRoomModalComponent implements AfterViewInit {
  @Output() create = new EventEmitter<RoomDraft>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;

  name = '';
  desc = '';
  priv = false;
  pwd = '';
  showPwd = false;
  touched = false;

  readonly nameMax = 48;
  readonly descMax = 120;

  ngAfterViewInit(): void {
    setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
  }

  get nameError(): boolean {
    return this.touched && !this.name.trim();
  }
  get pwdError(): boolean {
    return this.touched && this.priv && !this.pwd.trim();
  }
  get canSubmit(): boolean {
    return !!this.name.trim() && (!this.priv || !!this.pwd.trim());
  }

  onSubmit(e?: Event): void {
    e?.preventDefault();
    this.touched = true;
    if (!this.canSubmit) return;
    this.create.emit({
      name: this.name.trim(),
      desc: this.desc.trim(),
      private: this.priv,
      password: this.priv ? this.pwd : '',
    });
  }
}
