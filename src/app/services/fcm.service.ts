import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class FcmService {

  constructor(
    private http: HttpClient
  ) { }

  sendNotificationWhenDeliverySuccess(listToken: string[]): Observable<any> {
    return this.http.post(`https://todayuonggi-be.herokuapp.com/send-message-delivery-success`, listToken);
  }
}
