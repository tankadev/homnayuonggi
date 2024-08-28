import { ChangeDetectorRef, Component, Input, OnInit, ViewContainerRef } from '@angular/core';

import { map } from 'rxjs/operators';

import { NzModalService } from 'ng-zorro-antd/modal';

import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderService } from './../../../services/order.service';
import { OrderRO } from './../../../ro/order.ro';
import { OrderDTO, UserNote } from './../../../dto/order.dto';
import { OrderHistoryDTO } from 'src/app/dto/order-history.dto';
import { OrderHistoryService } from 'src/app/services/order-history.service';
import { NoteDialogComponent } from '../../dialogs/note-dialog/note-dialog.component';
import { ConfirmDialogComponent } from '../../dialogs/confirm-dialog/confirm-dialog.component';
import { PlaceOrderDialogComponent } from '../../dialogs/place-order-dialog/place-order-dialog.component';
import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { RoomRO } from 'src/app/ro/room.ro';

@Component({
  selector: 'list-order',
  templateUrl: './list-order.component.html',
  styleUrls: ['./list-order.component.scss']
})
export class ListOrderComponent implements OnInit {

  @Input() remainingTime: number;
  @Input() createDate: string;
  @Input() createUserId: string;
  @Input() assignUserId: string;
  @Input() deliveryInfo: DeliveryRO;

  timeout: boolean = false;
  listOrders: OrderRO[] = [];
  room: RoomRO = this.localStorage.getSelectedRoom();

  constructor(
    private modal: NzModalService,
    private viewContainerRef: ViewContainerRef,
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private localStorage: LocalStorageService,
    private orderHistoryService: OrderHistoryService,
    private cdr: ChangeDetectorRef
  ) {
    this.listOrders = this.localStorage.getOrdersList().filter(i => i.roomKey === this.room.key);
  }

  ngOnInit(): void {
    this.onListenListOrdersChangesFromFirebaseDB();
  }

  public cancelDelivery = (): void => {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: ConfirmDialogComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
      nzComponentParams: {
        body: 'Tất cả thông tin đặt món sẽ bị xóa, bạn có chắc chắn muốn hủy bình chọn quán này ?'
      }
    });
    modal.afterClose.subscribe(isAccept => {
      if (isAccept) {
        this.deliveryService.remove(this.deliveryInfo.key);
        this.orderService.deleteAllListOrders();
        this.orderHistoryService.removeAll();
      }
    });
  }

  public remainingTimeFinish = () => {
    this.timeout = true;
    this.cdr.detectChanges();
    console.log('finish');
  }

  public trackByIndex = (index: number): number => {
    return index;
  }

  public onAddDish(order: OrderRO, userId: string, position: number): void {
    const orderDTO: OrderDTO = new OrderDTO();
    orderDTO.roomKey = this.room.key;
    orderDTO.dish = order.dish;
    orderDTO.userNotes = order.userNotes.map((item, index) => {
      if (index === position && item.userId === userId) {
        const note: UserNote = new UserNote();
        note.userId = item.userId;
        note.content = item.content;
        note.quantity = item.quantity + 1;
        return note;
      }

      return item;
    });
    this.orderService.updateOrder(order.key, orderDTO);

    const orderHistory = new OrderHistoryDTO();
    orderHistory.action = 0;
    orderHistory.userId = userId;
    orderHistory.dishName = order.dish.name;
    orderHistory.createAt = new Date().toISOString();
    orderHistory.roomKey = this.room.key;
    this.orderHistoryService.create(orderHistory);
  }

  public onRemoveDish(order: OrderRO, userId: string, position: number): void {
    const orderDTO: OrderDTO = new OrderDTO();
    orderDTO.dish = order.dish;

    const userNotes: UserNote[] = [];
    order.userNotes.forEach((item, index) => {
      if (index === position && item.userId === userId) {
        const note: UserNote = new UserNote();
        note.userId = item.userId;
        note.content = item.content;
        note.quantity = item.quantity - 1;

        if (note.quantity > 0) {
          userNotes.push(note);
        }
      } else {
        userNotes.push(item);
      }
    });

    orderDTO.userNotes = userNotes;
    orderDTO.roomKey = this.room.key;

    if (orderDTO.userNotes.length > 0) {
      this.orderService.updateOrder(order.key, orderDTO);
    } else {
      this.orderService.deleteOrder(order.key);
    }

    const orderHistory = new OrderHistoryDTO();
    orderHistory.action = 1;
    orderHistory.userId = userId;
    orderHistory.dishName = order.dish.name;
    orderHistory.createAt = new Date().toISOString();
    orderHistory.roomKey = this.room.key;
    this.orderHistoryService.create(orderHistory);
  }

  public addNote(order: OrderRO, userId: string, position: number, noteContent: string) {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: NoteDialogComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
      nzComponentParams: {
        note: noteContent
      }
    });
    modal.afterClose.subscribe(data => {
      if (data) {
        const orderDTO: OrderDTO = new OrderDTO();
        orderDTO.dish = order.dish;
        orderDTO.userNotes = order.userNotes.map((item, index) => {
          if (index === position && item.userId === userId) {
            const note: UserNote = new UserNote();
            note.userId = item.userId;
            note.content = data.noteContent === 'empty' ? '' : data.noteContent;
            note.quantity = item.quantity;
            return note;
          }
          return item;
        });

        this.orderService.updateOrder(order.key, orderDTO);
      }
    });
  }

  public onPlaceOrders = () => {
    const modal = this.modal.create({
      nzTitle: null,
      nzContent: PlaceOrderDialogComponent,
      nzViewContainerRef: this.viewContainerRef,
      nzFooter: null,
      nzClosable: false,
      nzAutofocus: null,
      nzMaskClosable: false,
      nzComponentParams: {
        isSponsor: false,
        assignUserId: this.assignUserId,
        deliveryInfo: this.deliveryInfo,
        listOrders: this.listOrders
      }
    });
    modal.afterClose.subscribe(isConfirm => {
      if (isConfirm) {

      }
    });
  }

  private onListenListOrdersChangesFromFirebaseDB(): void {
    this.orderService.getListOrders().subscribe(data => {
      this.localStorage.setOrdersList(data);
      this.listOrders = data.filter(i => i.roomKey === this.room.key);
    });
  }

}
