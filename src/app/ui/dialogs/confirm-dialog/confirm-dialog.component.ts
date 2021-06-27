import { Component, Input, OnInit } from '@angular/core';

import { NzModalRef } from 'ng-zorro-antd/modal';

@Component({
  selector: 'confirm-dialog',
  templateUrl: './confirm-dialog.component.html',
  styleUrls: ['./confirm-dialog.component.scss']
})
export class ConfirmDialogComponent implements OnInit {

  @Input() body: string;

  constructor(
    private modal: NzModalRef
  ) { }

  ngOnInit(): void {
  }

  public closeModal(value: boolean): void {
    this.modal.destroy(value);
  }

}
