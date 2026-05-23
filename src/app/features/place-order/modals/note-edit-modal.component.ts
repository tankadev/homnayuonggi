import { Component, EventEmitter, Input, OnInit, Output, ViewChild, ElementRef, AfterViewInit } from '@angular/core';

import { MockCartLine, MockDish } from '../mock-data';

@Component({
  selector: 'app-note-edit-modal',
  standalone: false,
  templateUrl: './note-edit-modal.component.html',
  styleUrls: ['./note-edit-modal.component.scss'],
})
export class NoteEditModalComponent implements OnInit, AfterViewInit {
  @Input() dish!: MockDish;
  @Input() line!: MockCartLine;
  @Output() save = new EventEmitter<string>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('input') input?: ElementRef<HTMLInputElement>;

  note = '';
  readonly quick = ['Ít đá', 'Ít đường', 'Không hành', 'Không cay', 'Cay nhiều', 'Mang về'];
  readonly maxLen = 120;

  ngOnInit(): void {
    this.note = this.line.note || '';
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.input?.nativeElement.focus();
      this.input?.nativeElement.select();
    }, 0);
  }

  addQuick(q: string): void {
    const lower = q.toLowerCase();
    this.note = this.note ? `${this.note}, ${lower}` : q;
  }

  onSubmit(e?: Event): void {
    e?.preventDefault();
    this.save.emit(this.note);
  }
}
