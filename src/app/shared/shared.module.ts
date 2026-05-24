import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IconComponent } from './icons/icon.component';
import { ModalComponent } from './modal/modal.component';
import { CurrencyVndPipe } from './pipes/currency-vnd.pipe';
import { PadZeroPipe } from './pipes/pad-zero.pipe';
import { InitialsPipe } from './pipes/initials.pipe';
import { AbsPipe } from './pipes/abs.pipe';
import { CountUpDirective } from './directives/count-up.directive';

const EXPORTS = [IconComponent, ModalComponent, CurrencyVndPipe, PadZeroPipe, InitialsPipe, AbsPipe, CountUpDirective];

@NgModule({
  declarations: EXPORTS,
  imports: [CommonModule, FormsModule],
  exports: [...EXPORTS, CommonModule, FormsModule],
})
export class SharedModule {}
