import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Database, ref, push, update, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { DeliveryDTO } from '../dto/delivery.dto';
import { DeliveryRO } from '../ro/delivery.ro';
import { ConfigService } from './config.service';

@Injectable({ providedIn: 'root' })
export class DeliveryService {
  private dbPath = '/deliveries';
  private deliveryRef = ref(this.db, this.dbPath);

  constructor(
    private db: Database,
    private http: HttpClient,
    private config: ConfigService,
  ) {}

  getDetailDeliveryFromShopeeFoodApi(param: string): Observable<any> {
    return this.http.get(`${this.config.getApiUrl()}/get-detail?url=${param}`);
  }

  getDetailDeliveryFromImagesApi(files: File[]): Observable<any> {
    const form = new FormData();
    for (const f of files) form.append('files', f, f.name);
    return this.http.post(`${this.config.getApiUrl()}/extract-from-image`, form);
  }

  getAll(): Observable<DeliveryRO[]> {
    return new Observable((observer) => {
      onValue(
        ref(this.db, this.dbPath),
        (snapshot: DataSnapshot) => {
          const items: DeliveryRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as DeliveryRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  create(delivery: DeliveryDTO): Promise<void> {
    const newRef = push(this.deliveryRef);
    return set(newRef, delivery);
  }

  /** Like create() but returns the auto-generated key so the caller can keep editing it. */
  async createAndGetKey(delivery: DeliveryDTO): Promise<string> {
    const newRef = push(this.deliveryRef);
    if (!newRef.key) throw new Error('Firebase did not return a push key');
    await set(newRef, delivery);
    return newRef.key;
  }

  update(key: string, value: Partial<DeliveryDTO>): Promise<void> {
    return update(ref(this.db, `${this.dbPath}/${key}`), value);
  }

  remove(key: string): Promise<void> {
    return remove(ref(this.db, `${this.dbPath}/${key}`));
  }
}
