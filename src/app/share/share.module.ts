import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatNameTo2CharPipe } from './format-name-to-2-char.pipe';

@NgModule({
  declarations: [
    FormatNameTo2CharPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FormatNameTo2CharPipe
  ]
})
export class ShareModule { }
