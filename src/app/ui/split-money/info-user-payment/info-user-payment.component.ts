import { Component, Input, OnInit } from '@angular/core';
import { map } from 'rxjs/operators';

import { DeliveryRO } from 'src/app/ro/delivery.ro';
import { UserRO } from 'src/app/ro/user.ro';
import { UserService } from 'src/app/services/user.service';

@Component({
  selector: 'info-user-payment',
  templateUrl: './info-user-payment.component.html',
  styleUrls: ['./info-user-payment.component.scss']
})
export class InfoUserPaymentComponent implements OnInit {

  @Input() deliveryInfo: DeliveryRO;
  userList: UserRO[] = [];

  constructor(
    private userService: UserService
  ) { }

  ngOnInit(): void {
    this.onListenUsersChangesFromFirebaseDB();
  }

  private onListenUsersChangesFromFirebaseDB(): void {
    this.userService.getAll().subscribe(data => {
      if (data.length > 0) {
        this.userList = data;
      }
    });
  }

}
