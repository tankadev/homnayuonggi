import { Injectable } from '@angular/core';
import { Database, ref, push, set, remove, onValue, DataSnapshot } from '@angular/fire/database';
import { Observable } from 'rxjs';

import { WheelSpinDTO } from '../dto/wheel-spin.dto';
import { WheelSpinRO } from '../ro/wheel-spin.ro';

/**
 * Per-order lucky-wheel spin log. Every spin (including re-spins) is appended so
 * members can watch the result feed live — this is the anti-cheat trail. Entries
 * are wiped when a new order starts (see removeForDelivery).
 */
@Injectable({ providedIn: 'root' })
export class WheelSpinService {
  private dbPath = '/wheelSpins';
  private spinsRef = ref(this.db, this.dbPath);

  constructor(private db: Database) {}

  getAll(): Observable<WheelSpinRO[]> {
    return new Observable((observer) => {
      onValue(
        this.spinsRef,
        (snapshot: DataSnapshot) => {
          const items: WheelSpinRO[] = [];
          snapshot.forEach((child) => { items.push({ key: child.key, ...child.val() } as WheelSpinRO); });
          observer.next(items);
        },
        (error) => observer.error(error),
      );
    });
  }

  create(spin: WheelSpinDTO): Promise<void> {
    return set(push(this.spinsRef), spin);
  }

  removeOne(key: string): Promise<void> {
    return remove(ref(this.db, `${this.dbPath}/${key}`));
  }

  /** Wipe every spin for a delivery — called when the orderer starts a new order. */
  async removeForDelivery(deliveryId: string, spins: WheelSpinRO[]): Promise<void> {
    const targets = spins.filter((s) => s.deliveryId === deliveryId);
    await Promise.all(targets.map((s) => this.removeOne(s.key)));
  }
}
