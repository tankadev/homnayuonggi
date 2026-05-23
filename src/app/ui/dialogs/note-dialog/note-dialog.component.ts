import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup } from '@angular/forms';
import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';

@Component({
  selector: 'note-dialog',
  templateUrl: './note-dialog.component.html',
  styleUrls: ['./note-dialog.component.scss']
})
export class NoteDialogComponent implements OnInit {

  note?: string;

  noteForm: FormGroup;

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    @Inject(NZ_MODAL_DATA) data: { note?: string }
  ) {
    this.note = data?.note;
  }

  ngOnInit(): void {
    this.noteForm = this.fb.group({
      note: [null, []]
    });

    if (this.note) {
      this.noteForm.controls.note.setValue(this.note);
    }
  }

  public submitNoteForm(): void {
    this.closeModal(this.noteForm.value.note ? this.noteForm.value.note : 'empty');
  }

  public closeModal(data?: any): void {
    this.modal.destroy(data ? { noteContent: data } : null);
  }

}
