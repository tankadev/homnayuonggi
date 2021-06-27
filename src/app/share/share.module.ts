import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormatNameTo2CharPipe } from './format-name-to-2-char.pipe';
import { DisplayNameUserPipe } from './display-name-user.pipe';
import { DisplayImagePipe } from './display-image.pipe';
import { DisplayOptionPipe } from './display-option.pipe';
import { ProcessTimePipe } from './process-time.pipe';
import { IsAllowDirective } from './is-allow.directive';
import { DishTotalQuantityPipe } from './dish-total-quantity.pipe';
import { IsAllowPipe } from './is-allow.pipe';
import { IsUserPermissionPipe } from './is-user-permission.pipe';
import { DisplayUserOrderPipe } from './display-user-order.pipe';

@NgModule({
  declarations: [
    FormatNameTo2CharPipe,
    DisplayNameUserPipe,
    DisplayImagePipe,
    DisplayOptionPipe,
    ProcessTimePipe,
    IsAllowDirective,
    DishTotalQuantityPipe,
    IsAllowPipe,
    IsUserPermissionPipe,
    DisplayUserOrderPipe
  ],
  imports: [
    CommonModule
  ],
  exports: [
    FormatNameTo2CharPipe,
    DisplayNameUserPipe,
    DisplayImagePipe,
    DisplayOptionPipe,
    ProcessTimePipe,
    DishTotalQuantityPipe,
    IsAllowDirective,
    IsAllowPipe,
    IsUserPermissionPipe,
    DisplayUserOrderPipe
  ],
  providers: [ DisplayNameUserPipe ]
})
export class ShareModule { }
