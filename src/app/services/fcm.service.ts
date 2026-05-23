import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { ConfigService } from './config.service';
@Injectable({
  providedIn: 'root'
})
export class FcmService {

  constructor(
    private http: HttpClient,
    private config: ConfigService,
  ) { }

  sendNotificationWhenDeliverySuccess(listToken: string[]): Observable<any> {
    return this.http.post(`${this.config.getApiUrl()}/send-message-delivery-success`, listToken);
  }
}
