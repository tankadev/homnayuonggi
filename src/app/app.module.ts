import { NgModule } from '@angular/core';
import { AngularFireModule } from '@angular/fire';
import { BrowserModule } from '@angular/platform-browser';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { registerLocaleData } from '@angular/common';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import en from '@angular/common/locales/en';

import { NZ_I18N } from 'ng-zorro-antd/i18n';
import { en_US } from 'ng-zorro-antd/i18n';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { environment } from '../environments/environment';
import { ZoroAntdModule } from './zoro.module';
import { OrderContentComponent } from './components/order-content/order-content.component';
import { LoginDialogComponent } from './components/dialogs/login-dialog/login-dialog.component';
import { UserInfoDialogComponent } from './components/dialogs/user-info-dialog/user-info-dialog.component';
import { HeaderComponent } from './ui/header/header.component';
import { JoinToAppComponent } from './ui/dialogs/join-to-app/join-to-app.component';
import { ShareModule } from './share/share.module';
import { CreateDeliveryComponent } from './ui/create-delivery/create-delivery.component';
import { CreateDeliveryFormComponent } from './ui/create-delivery/create-delivery-form/create-delivery-form.component';
import { NeedLoginComponent } from './ui/need-login/need-login.component';
import { CatAnimateComponent } from './ui/cat-animate/cat-animate.component';
import { PlaceOrderComponent } from './ui/place-order/place-order.component';

registerLocaleData(en);

@NgModule({
  declarations: [
    AppComponent,
    CatAnimateComponent,
    OrderContentComponent,
    HeaderComponent,
    LoginDialogComponent,
    UserInfoDialogComponent,
    JoinToAppComponent,
    NeedLoginComponent,
    CreateDeliveryComponent,
    CreateDeliveryFormComponent,
    PlaceOrderComponent
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    ZoroAntdModule,
    AngularFireModule.initializeApp(environment.firebase),
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ShareModule
  ],
  providers: [
    { provide: NZ_I18N, useValue: en_US }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
