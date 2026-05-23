import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';

import { RoomDraft } from './room-draft';

@Component({
  selector: 'app-edit-room-modal',
  standalone: false,
  templateUrl: './edit-room-modal.component.html',
})
export class EditRoomModalComponent implements OnInit, AfterViewInit {
  @Input() room!: RoomDraft;
  @Input() hasOrders = false;
  @Output() save = new EventEmitter<RoomDraft>();
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

  ngOnInit(): void {
    this.name = this.room.name;
    this.desc = this.room.desc || '';
    this.priv = !!this.room.private;
    this.pwd = this.room.password || '';
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
  }

  get nameError(): boolean {
    return this.touched && !this.name.trim();
  }
  get pwdError(): boolean {
    return this.touched && this.priv && !this.pwd.trim();
  }
  get changed(): boolean {
    return (
      this.name !== this.room.name ||
      this.desc !== (this.room.desc || '') ||
      this.priv !== !!this.room.private ||
      this.pwd !== (this.room.password || '')
    );
  }
  get canSubmit(): boolean {
    return !!this.name.trim() && (!this.priv || !!this.pwd.trim()) && this.changed;
  }

  togglePriv(): void {
    if (this.hasOrders) return;
    this.priv = !this.priv;
  }

  onSubmit(e?: Event): void {
    e?.preventDefault();
    this.touched = true;
    if (!this.name.trim() || (this.priv && !this.pwd.trim())) return;
    this.save.emit({
      name: this.name.trim(),
      desc: this.desc.trim(),
      private: this.priv,
      password: this.priv ? this.pwd : '',
    });
  }
}
