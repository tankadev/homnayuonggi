import { Component, Input, OnInit } from '@angular/core';

import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { Dish } from './../../../ro/delivery-detail-now-api.ro';
import { OrderDTO } from './../../../dto/order.dto';
import { LocalStorageService } from 'src/app/services/localstorage.service';
import { OrderService } from 'src/app/services/order.service';
import { OrderRO } from 'src/app/ro/order.ro';

@Component({
  selector: 'list-dish',
  templateUrl: './list-dish.component.html',
  styleUrls: ['./list-dish.component.scss']
})
export class ListDishComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;

  constructor(
    private orderService: OrderService,
    private localStorage: LocalStorageService
  ) { }

  ngOnInit(): void {
  }

  public onAddDish = (dish: Dish) => {

    // check dish exist
    const listOrdersLocal: OrderRO[] = this.localStorage.getOrdersList();
    const userId: string = this.localStorage.getUserInfo().key;
    const findDish = listOrdersLocal ? listOrdersLocal.find(order => order.dish.id === dish.id) : null;
    if (listOrdersLocal && listOrdersLocal.length > 0 && findDish) {
      const orderDto: OrderDTO = new OrderDTO();
      orderDto.quantity = findDish.quantity + 1;
      if (!(findDish.userNotes.find(note => note.userId === userId))) {
        orderDto.userNotes = [
          ...findDish.userNotes,
          {
            userId,
            content: ''
          }
        ];
      }
      this.orderService.updateOrder(findDish.key, orderDto);
    } else {
      const orderDto: OrderDTO = new OrderDTO();
      orderDto.dish = dish;
      orderDto.quantity = 1;
      orderDto.userNotes = [
        {
          userId,
          content: ''
        }
      ];
      this.orderService.addOrder(orderDto);
    }
  }

}
