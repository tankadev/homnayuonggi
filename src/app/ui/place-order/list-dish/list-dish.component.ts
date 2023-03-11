import { OrderHistoryDTO } from './../../../dto/order-history.dto';
import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { Dish } from './../../../ro/delivery-detail-now-api.ro';
import { OrderDTO } from './../../../dto/order.dto';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderService } from 'src/app/services/order.service';
import { OrderRO } from 'src/app/ro/order.ro';
import { OrderHistoryService } from 'src/app/services/order-history.service';
import { RoomRO } from 'src/app/ro/room.ro';

@Component({
  selector: 'list-dish',
  templateUrl: './list-dish.component.html',
  styleUrls: ['./list-dish.component.scss']
})
export class ListDishComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  room: RoomRO = this.localStorage.getSelectedRoom();

  constructor(
    private orderService: OrderService,
    private orderHistoryService: OrderHistoryService,
    private localStorage: LocalStorageService
  ) { }

  ngOnInit(): void {
  }

  public onAddDish = (dish: Dish) => {
    // check dish exist
    const listOrdersLocal: OrderRO[] = this.localStorage.getOrdersList();
    const userId: string = this.localStorage.getUserInfo().key;
    const findDish = listOrdersLocal ? listOrdersLocal.find(order => order.dish.id === dish.id && order.roomKey == this.room.key) : null;
    if (listOrdersLocal && listOrdersLocal.length > 0 && findDish) {
      const orderDto: OrderDTO = new OrderDTO();
      const userNoteIndex = findDish.userNotes.findIndex(note => note.userId === userId);
      if (userNoteIndex === -1) {
        orderDto.userNotes = [
          ...findDish.userNotes,
          {
            userId,
            content: '',
            quantity: 1
          }
        ];
      } else {
        orderDto.userNotes = findDish.userNotes.map(
          (note, index) => {
            if (index === userNoteIndex) {
              return {
                userId,
                content: '',
                quantity: note.quantity + 1
              };
            }
            return note;
          }
        );
      }
      orderDto.roomKey = this.room.key;
      this.orderService.updateOrder(findDish.key, orderDto).then(
        () => {
          // console.log('update success');
        }
      );
    } else {
      const orderDto: OrderDTO = new OrderDTO();
      orderDto.dish = dish;
      orderDto.userNotes = [
        {
          userId,
          content: '',
          quantity: 1
        }
      ];
      orderDto.roomKey = this.room.key;
      this.orderService.addOrder(orderDto).then(
        () => {
          // console.log('create success');
        }
      );
    }

    const orderHistory = new OrderHistoryDTO();
    orderHistory.action = 0;
    orderHistory.userId = userId;
    orderHistory.dishName = dish.name;
    orderHistory.createAt = new Date().toISOString();
    orderHistory.roomKey = this.room.key;
    this.orderHistoryService.create(orderHistory);
  }

}
