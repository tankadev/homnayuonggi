import { DecimalPipe } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

import { NzModalRef } from 'ng-zorro-antd/modal';
import { FormHelper } from 'src/app/helper/form.help';

@Component({
  selector: 'place-order-dialog',
  templateUrl: './place-order-dialog.component.html',
  styleUrls: ['./place-order-dialog.component.scss']
})
export class PlaceOrderDialogComponent implements OnInit {

  placeOrderForm: FormGroup;

  constructor(
    private modal: NzModalRef,
    private fb: FormBuilder,
    private decimalPipe: DecimalPipe
  ) { }

  ngOnInit(): void {
    this.placeOrderForm = this.fb.group({
      lastPrice: [0, [Validators.required]]
    });
  }

  public submitPlaceOrderForm(): void {
    if (this.placeOrderForm.valid) {
      console.log(this.placeOrderForm.value);
    } else {
      FormHelper.validateAllFormFields(this.placeOrderForm);
    }
  }

  public closeModal(): void {
    this.modal.destroy();
  }

  public formatterPrice = (value: number) => value ? `${this.decimalPipe.transform(value)} vnđ` : '';

  public parserPrice = (value: string) => value.replace(' vnđ', '').replace(',', '');

}
