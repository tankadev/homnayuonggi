import { DeliveryRO } from './ro/delivery.ro';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { MessagingService } from './services/messaging.service';
import { AppService } from './services/app.service';
import { UserRO } from './ro/user.ro';
import { LocalStorage } from './const/local-storage';
import { DeliveryService } from './services/delivery.service';
import { map } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  isDeliveryStatus: boolean = false;
  isLoginIn: boolean = false;
  deliveryInfo: DeliveryRO = new DeliveryRO();

  subDelivery$: Subscription;
  subLogin$: Subscription;

  constructor(
    private messagingService: MessagingService,
    private appService: AppService,
    private deliveryService: DeliveryService
  ) {
    this.subDelivery$ = this.appService.getDeliveryStatus().subscribe(status => {
      console.log(status);
      this.isDeliveryStatus = status;
    });

    this.subLogin$ = this.appService.getLoginStatus().subscribe(status => {
      this.isLoginIn = status;
    });
    const userInfo: UserRO = JSON.parse(localStorage.getItem(LocalStorage.USER_INFO));
    this.isLoginIn = userInfo ? true : false;
  }

  ngOnInit(): void {
    this.onListenDeliveryChangesFromFirebaseDB();
    this.messagingService.requestPermission();
    this.messagingService.receiveMessage();
    this.messagingService.currentMessage.subscribe(
      mess => {
        // console.log(mess);
      }
    );
  }

  ngOnDestroy(): void {
    // unsubscribe to ensure no memory leaks
    this.subDelivery$.unsubscribe();
    this.subLogin$.unsubscribe();
  }

  private onListenDeliveryChangesFromFirebaseDB(): void {
    this.deliveryService.getDetail().snapshotChanges().pipe(
      map(changes =>
        ({ key: changes.payload.key, ...changes.payload.val() })
      )
    ).subscribe(data => {
      console.log(data);
    });
  }
}
