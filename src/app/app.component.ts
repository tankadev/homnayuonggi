import { Component, OnDestroy, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';

import { UserRO } from './core/ro/user.ro';
import { RoomRO } from './core/ro/room.ro';
import { DeliveryRO } from './core/ro/delivery.ro';
import { HeaderMode } from './features/header/header.component';
import { AuthResult } from './features/welcome/auth-modal.component';
import { AuthService } from './core/services/auth.service';
import { DeliveryService } from './core/services/delivery.service';
import { LocalStorageService } from './core/services/localstorage.service';
import { ThemeService } from './core/services/theme.service';

type AppMode = HeaderMode;

@Component({
  selector: 'app-root',
  standalone: false,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  animations: [
    /* Page-level fade + 8px slide-up — fires whenever the ngSwitch state
       changes. Old content is removed instantly (ngSwitch behavior); the
       fade-in masks the cut so the user perceives a smooth page change. */
    trigger('page', [
      transition('* => *', [
        style({ opacity: 0, transform: 'translateY(8px)' }),
        animate(
          '260ms cubic-bezier(.4, 0, .2, 1)',
          style({ opacity: 1, transform: 'translateY(0)' }),
        ),
      ]),
    ]),
  ],
})
export class AppComponent implements OnInit, OnDestroy {
  user: UserRO | null = null;
  room: RoomRO | null = null;
  mode: AppMode = 'welcome';

  editRoomTrigger = 0;
  placeOrderEpoch = 0;

  private authSub?: Subscription;
  private deliverySub?: Subscription;
  private latestDeliveries: DeliveryRO[] = [];

  constructor(
    private auth: AuthService,
    private theme: ThemeService,
    private deliveryService: DeliveryService,
    private storage: LocalStorageService,
  ) {}

  ngOnInit(): void {
    /* Restore session + last room from localStorage so F5 keeps the user in place. */
    const restored = this.auth.restore();
    if (restored?.theme) this.theme.syncFromUser(restored.theme);
    if (restored) {
      const savedRoom = this.safeReadRoom();
      if (savedRoom) {
        this.room = savedRoom;
        /* Seed from the last cached /deliveries snapshot so F5 lands on the right screen
           without flashing 'create-order' while waiting for Firebase to reply. */
        this.latestDeliveries = this.safeReadDeliveries();
        this.mode = 'create-order';
        this.deriveModeFromDeliveries();
      } else {
        this.mode = 'rooms';
      }
    }

    this.authSub = this.auth.observe().subscribe((u) => {
      this.user = u;
      if (u && this.mode === 'welcome') this.mode = 'rooms';
      if (!u) this.resetToWelcome();
    });

    /* Cache the live delivery list so enterRoom() can derive the correct mode on first
       click without waiting for the next /deliveries snapshot. Also persist to
       localStorage so the next F5 can render the correct screen before Firebase replies. */
    this.deliverySub = this.deliveryService.getAll().subscribe((deliveries) => {
      this.latestDeliveries = deliveries;
      this.storage.setDeliveriesList(deliveries);
      this.deriveModeFromDeliveries();
    });
  }

  private deriveModeFromDeliveries(): void {
    if (!this.room) return;
    if (this.mode === 'rooms' || this.mode === 'welcome' || this.mode === 'history') return;
    const forRoom = this.latestDeliveries.filter((d) => d.roomKey === this.room!.key);
    const active = forRoom.find((d) => d.isCreate === true);
    let next: AppMode = this.mode;
    if (active && active.isCompleted === true) next = 'payment-review';
    else if (active && active.isCreate === true) next = 'place-order';
    else next = 'create-order';
    if (next !== this.mode) {
      if (next === 'create-order' || next === 'place-order') this.placeOrderEpoch += 1;
      this.mode = next;
    }
  }

  ngOnDestroy(): void {
    this.authSub?.unsubscribe();
    this.deliverySub?.unsubscribe();
  }

  onAuthenticated(result: AuthResult): void {
    /* AuthService has already cached + emitted the user; this just navigates. */
    if (result.user.theme) this.theme.syncFromUser(result.user.theme);
    this.mode = 'rooms';
  }

  enterRoom(picked: RoomRO): void {
    this.room = picked;
    this.storage.setSelectedRoom(picked);
    /* Start at create-order, then immediately re-derive against the cached deliveries
       list so we jump straight to place-order / payment-review if one already exists. */
    this.mode = 'create-order';
    this.deriveModeFromDeliveries();
  }

  leaveRoom(): void {
    this.room = null;
    this.storage.setSelectedRoom(null as any);
    this.mode = 'rooms';
  }

  onCreateOrder(): void {
    this.placeOrderEpoch += 1;
    this.mode = 'place-order';
  }

  onOrderCompleted(): void {
    this.mode = 'payment-review';
  }

  onNewOrder(): void {
    this.placeOrderEpoch += 1;
    this.mode = 'create-order';
  }

  openHistory(): void {
    this.mode = 'history';
  }

  closeHistory(): void {
    this.mode = 'rooms';
    this.room = null;
    this.storage.setSelectedRoom(null as any);
  }

  openEditRoom(): void {
    this.editRoomTrigger += 1;
  }

  onRoomChanged(updated: RoomRO): void {
    this.room = updated;
    this.storage.setSelectedRoom(updated);
  }

  /** Read the persisted room safely — LocalStorageService.getSelectedRoom() can throw on bad JSON. */
  private safeReadRoom(): RoomRO | null {
    try {
      const r = this.storage.getSelectedRoom();
      return r && (r as RoomRO).key ? (r as RoomRO) : null;
    } catch {
      return null;
    }
  }

  private safeReadDeliveries(): DeliveryRO[] {
    try {
      const d = this.storage.getDeliveriesList();
      return Array.isArray(d) ? d : [];
    } catch {
      return [];
    }
  }

  logout(): void {
    this.auth.logout();
    /* observe() subscription above will resetToWelcome(). */
  }

  private resetToWelcome(): void {
    this.room = null;
    this.storage.setSelectedRoom(null as any);
    this.mode = 'welcome';
  }
}
