import { Component, Inject, OnInit } from '@angular/core';

import { NzModalRef, NZ_MODAL_DATA } from 'ng-zorro-antd/modal';

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit {

  body: string;

  constructor(
    private modal: NzModalRef,
    @Inject(NZ_MODAL_DATA) data: { body: string }
  ) {
    this.body = data?.body;
  }

  ngOnInit(): void {
  }

  public closeModal(value: boolean): void {
    this.modal.destroy(value);
  }

}
