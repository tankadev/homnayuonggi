import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { getDatabase, provideDatabase } from '@angular/fire/database';
import { provideRemoteConfig, getRemoteConfig } from '@angular/fire/remote-config';

import { environment } from '../environments/environment';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { SharedModule } from './shared/shared.module';

import { HeaderComponent } from './features/header/header.component';
import { ThemeSwitcherComponent } from './features/header/theme-switcher.component';
import { PlaceOrderPageComponent } from './features/place-order/place-order-page.component';
import { ShopCardComponent } from './features/place-order/shop-card.component';
import { HistoryCardComponent } from './features/place-order/history-card.component';
import { VoucherStripComponent } from './features/place-order/voucher-strip.component';
import { DishMenuComponent } from './features/place-order/dish-menu.component';
import { CartPanelComponent } from './features/place-order/cart-panel.component';
import { NoteEditModalComponent } from './features/place-order/modals/note-edit-modal.component';
import { CancelOrderModalComponent } from './features/place-order/modals/cancel-order-modal.component';
import { EditRoomModalComponent } from './features/place-order/modals/edit-room-modal.component';
import { CompleteOrderModalComponent } from './features/place-order/modals/complete-order-modal.component';
import { RoomsPageComponent } from './features/rooms/rooms-page.component';
import { RoomCardComponent } from './features/rooms/room-card.component';
import { CreateRoomModalComponent } from './features/rooms/modals/create-room-modal.component';
import { JoinRoomModalComponent } from './features/rooms/modals/join-room-modal.component';
import { PaymentReviewPageComponent } from './features/payment-review/payment-review-page.component';
import { OrderInfoCardComponent } from './features/payment-review/order-info-card.component';
import { RosterCardComponent } from './features/payment-review/roster-card.component';
import { MemberCardComponent } from './features/payment-review/member-card.component';
import { YouPayCardComponent } from './features/payment-review/you-pay-card.component';
import { PaymentDetailComponent } from './features/payment-review/payment-detail.component';
import { NewOrderModalComponent } from './features/payment-review/modals/new-order-modal.component';
import { HistoryPageComponent } from './features/history/history-page.component';
import { SummaryCardComponent } from './features/history/summary-card.component';
import { FiltersCardComponent } from './features/history/filters-card.component';
import { OrderCardComponent } from './features/history/order-card.component';
import { PairsCardComponent } from './features/history/pairs-card.component';
import { CreateOrderPageComponent } from './features/create-order/create-order-page.component';
import { WelcomePageComponent } from './features/welcome/welcome-page.component';
import { AuthModalComponent } from './features/welcome/auth-modal.component';
import { PlaceholderPageComponent } from './features/placeholder/placeholder-page.component';

import { ThemeService } from './core/services/theme.service';

export function initTheme(theme: ThemeService) {
  return () => theme.init();
}

@NgModule({
  declarations: [
    AppComponent,
    HeaderComponent,
    ThemeSwitcherComponent,
    PlaceOrderPageComponent,
    ShopCardComponent,
    HistoryCardComponent,
    VoucherStripComponent,
    DishMenuComponent,
    CartPanelComponent,
    NoteEditModalComponent,
    CancelOrderModalComponent,
    EditRoomModalComponent,
    CompleteOrderModalComponent,
    RoomsPageComponent,
    RoomCardComponent,
    CreateRoomModalComponent,
    JoinRoomModalComponent,
    PaymentReviewPageComponent,
    OrderInfoCardComponent,
    RosterCardComponent,
    MemberCardComponent,
    YouPayCardComponent,
    PaymentDetailComponent,
    NewOrderModalComponent,
    HistoryPageComponent,
    SummaryCardComponent,
    FiltersCardComponent,
    OrderCardComponent,
    PairsCardComponent,
    CreateOrderPageComponent,
    WelcomePageComponent,
    AuthModalComponent,
    PlaceholderPageComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    SharedModule,
  ],
  providers: [
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideDatabase(() => getDatabase()),
    provideRemoteConfig(() => getRemoteConfig()),
    provideHttpClient(withInterceptorsFromDi()),
    {
      provide: APP_INITIALIZER,
      useFactory: initTheme,
      deps: [ThemeService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
