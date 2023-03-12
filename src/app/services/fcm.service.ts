import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';
@Injectable({
  providedIn: 'root'
})
export class FcmService {

  constructor(
    private http: HttpClient
  ) { }

  sendNotificationWhenDeliverySuccess(listToken: string[]): Observable<any> {
    return this.http.post(`${environment.apiURL}/send-message-delivery-success`, listToken);
  }
}
