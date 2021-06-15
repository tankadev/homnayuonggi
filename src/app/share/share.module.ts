import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatNameTo2CharPipe } from './format-name-to-2-char.pipe';
import { DisplayNameUserPipe } from './display-name-user.pipe';
import { DisplayImagePipe } from './display-image.pipe';
import { DisplayOptionPipe } from './display-option.pipe';
import { ProcessTimePipe } from './process-time.pipe';

@NgModule({
  declarations: [
    FormatNameTo2CharPipe,
    DisplayNameUserPipe,
    DisplayImagePipe,
    DisplayOptionPipe,
    ProcessTimePipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FormatNameTo2CharPipe,
    DisplayNameUserPipe,
    DisplayImagePipe,
    DisplayOptionPipe,
    ProcessTimePipe
  ]
})
export class ShareModule { }
