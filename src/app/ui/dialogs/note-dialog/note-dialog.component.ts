import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'note-dialog',
  templateUrl: './note-dialog.component.html',
  styleUrls: ['./note-dialog.component.scss']
})
export class NoteDialogComponent implements OnInit {

  @Input() note?: string;

  noteForm: FormGroup;

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
  ) { }

  ngOnInit(): void {
    this.noteForm = this.fb.group({
      note: [null, []]
    });

    if (this.note) {
      this.noteForm.controls.note.setValue(this.note);
    }
  }

  public submitLoginForm(): void {
    this.closeModal(this.noteForm.value.note ? this.noteForm.value.note : 'empty');
  }

  public closeModal(data?: any): void {
    this.modal.destroy(data ? { noteContent: data } : null);
  }

}
