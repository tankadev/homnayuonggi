import { DeliveryRO } from './ro/delivery.ro';
import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';

import { MessagingService } from './services/messaging.service';
import { AppService } from './services/app.service';
import { UserRO } from './ro/user.ro';
import { DeliveryService } from './services/delivery.service';
import { map } from 'rxjs/operators';
import { LocalStorageService } from './services/localstorage.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  isDeliveryStatus: boolean = false;
  isLoginIn: boolean = false;
  deliveryInfo: DeliveryRO = new DeliveryRO();
  userInfo: UserRO = new UserRO();

  subDelivery$: Subscription;
  subLogin$: Subscription;

  constructor(
    private messagingService: MessagingService,
    private appService: AppService,
    private deliveryService: DeliveryService,
    private storage: LocalStorageService
  ) {
    this.subDelivery$ = this.appService.getDeliveryStatus().subscribe(status => {
      this.isDeliveryStatus = status;
    });

    this.subLogin$ = this.appService.getLoginStatus().subscribe(status => {
      this.isLoginIn = status;
      this.userInfo = this.storage.getUserInfo();
    });
    this.userInfo = this.storage.getUserInfo();
    this.deliveryInfo = this.storage.getDelivery();
    this.isLoginIn = this.userInfo ? true : false;
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
      this.storage.setDelivery(data);
      this.deliveryInfo = data;
    });
  }
}
