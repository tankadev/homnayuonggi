import { NgModule } from '@angular/core';
import { CommonModule, DecimalPipe } from '@angular/common';
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
import { TotalOrderPipe } from './total-order.pipe';
import { DisplayUserInfoPipe } from './display-user-info.pipe';
import { DeliveryDetailPipe } from './delivery-detail.pipe';
import { FindRoomInOrdersPipe } from './find-room-in-orders.pipe';
import { FirstCharOfEachWordPipe } from './first-char-of-each-word.pipe';
import { PaymentPaidByRoomPipe } from './payment-paid-by-room.pipe';
import { UnPaidListByRoomPipe } from './unpaid-list-by-room.pipe';
import { UnPaidListSortPipe } from './unpaid-list-sort.pipe';
import { DisplayTabNameUnPaidPipe } from './display-tab-name-unpaid.pipe';
import { UnPaidUserListPipe } from './unpaid-user-list.pipe';

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
    DisplayUserOrderPipe,
    TotalOrderPipe,
    DisplayUserInfoPipe,
    DeliveryDetailPipe,
    FindRoomInOrdersPipe,
    FirstCharOfEachWordPipe,
    PaymentPaidByRoomPipe,
    UnPaidListByRoomPipe,
    UnPaidListSortPipe,
    DisplayTabNameUnPaidPipe,
    UnPaidUserListPipe
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
    DisplayUserOrderPipe,
    TotalOrderPipe,
    DisplayUserInfoPipe,
    DeliveryDetailPipe,
    FindRoomInOrdersPipe,
    FirstCharOfEachWordPipe,
    PaymentPaidByRoomPipe,
    UnPaidListByRoomPipe,
    UnPaidListSortPipe,
    DisplayTabNameUnPaidPipe,
    UnPaidUserListPipe
  ],
  providers: [ DisplayNameUserPipe, DishTotalQuantityPipe, DecimalPipe, DisplayImagePipe, DisplayUserOrderPipe, DeliveryDetailPipe, FindRoomInOrdersPipe, TotalOrderPipe ]
})
export class ShareModule { }
