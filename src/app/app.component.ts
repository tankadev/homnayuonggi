import { Component, OnDestroy, OnInit } from '@angular/core';

import { Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { MessagingService } from './services/messaging.service';
import { AppService } from './services/app.service';
import { UserRO } from './ro/user.ro';
import { DeliveryService } from './services/delivery.service';
import { LocalStorageService } from './services/localstorage.service';
import { RoomRO } from './ro/room.ro';
import { DeliveryRO } from './ro/delivery.ro';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  isDeliveryStatus: boolean = false;
  isLoginIn: boolean = false;
  isSelectedRoom: boolean = false;
  deliveriesList: DeliveryRO[] = [];
  userInfo: UserRO = new UserRO();
  room: RoomRO = new RoomRO();

  subDelivery$: Subscription;
  subLogin$: Subscription;
  subSelectedRoom$: Subscription;

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

    this.subSelectedRoom$ = this.appService.getSelectedRoomStatus().subscribe(status => {
      this.isSelectedRoom = status;
      this.room = this.storage.getSelectedRoom();
    });

    this.userInfo = this.storage.getUserInfo();
    this.deliveriesList = this.storage.getDeliveriesList();
    this.room = this.storage.getSelectedRoom();
    this.isLoginIn = this.userInfo ? true : false;
    this.isSelectedRoom = this.room ? true : false;
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
    this.subSelectedRoom$.unsubscribe();
  }

  private onListenDeliveryChangesFromFirebaseDB(): void {
    this.deliveryService.getAll().snapshotChanges().pipe(
      map(changes =>
        changes.map(c =>
          ({ key: c.payload.key, ...c.payload.val() })
        )
      )
    ).subscribe(data => {
      this.storage.setDeliveriesList(data);
      this.deliveriesList = data;
    });
  }
}
