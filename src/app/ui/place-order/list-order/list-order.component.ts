import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';

import { DeliveryService } from 'src/app/services/delivery.service';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderService } from './../../../services/order.service';
import { OrderRO } from './../../../ro/order.ro';
import { OrderDTO, UserNote } from './../../../dto/order.dto';

@Component({
  selector: 'list-order',
  templateUrl: './list-order.component.html',
  styleUrls: ['./list-order.component.scss']
})
export class ListOrderComponent implements OnInit {

  @Input() remainingTime: number;
  @Input() createDate: string;

  timeout: boolean = false;
  listOrders: OrderRO[] = [];

  constructor(
    private deliveryService: DeliveryService,
    private orderService: OrderService,
    private localStorage: LocalStorageService,
    private cdr: ChangeDetectorRef
  ) {
    this.listOrders = this.localStorage.getOrdersList();
  }

  ngOnInit(): void {
    this.onListenListOrdersChangesFromFirebaseDB();
  }

  public cancelDelivery = (): void => {
    this.deliveryService.remove();
    this.orderService.deleteAllListOrders();
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

    if (orderDTO.userNotes.length > 0) {
      this.orderService.updateOrder(order.key, orderDTO);
    } else {
      this.orderService.deleteOrder(order.key);
    }

  }

  private onListenListOrdersChangesFromFirebaseDB(): void {
    this.orderService.getListOrders().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.localStorage.setOrdersList(data);
      this.listOrders = data;
    });
  }

}
