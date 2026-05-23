import { Injectable } from '@angular/core';
import { firstValueFrom, of } from 'rxjs';
import { catchError, take, timeout } from 'rxjs/operators';

import { DeliveryService } from './delivery.service';
import { DeliveryDTO } from '../dto/delivery.dto';
import { DeliveryDetailNowAPI } from '../ro/delivery-detail-now-api.ro';

export interface CommitDeliveryArgs {
  url: string;
  minutes: number;
  ordererKey: string;
}

@Injectable({ providedIn: 'root' })
export class OrderFlowService {
  constructor(private deliveryService: DeliveryService) {}

  /**
   * Reserve a delivery slot for the room (lock). Other clients seeing this record with
   * `isEdit:true` will know "someone is creating an order" and lock their own create button.
   * Returns the auto-generated delivery key so the caller can later commit/release it.
   */
  async claimEdit(roomKey: string, creatorKey: string): Promise<string> {
    const dto: DeliveryDTO = {
      roomKey,
      isEdit: true,
      isCreate: false,
      isCompleted: false,
      userCreate: creatorKey,
      createDateTime: new Date().toISOString(),
    };
    return this.deliveryService.createAndGetKey(dto);
  }

  /** Cancel the in-progress create (form Hủy). Removes the lock record. */
  releaseEdit(deliveryKey: string): Promise<void> {
    return this.deliveryService.remove(deliveryKey);
  }

  /**
   * Promote the editing lock into a real, active order. Best-effort scrape, then update
   * the existing delivery record (no new push) so other rooms see one consistent record.
   */
  async commitDelivery(deliveryKey: string, args: CommitDeliveryArgs): Promise<void> {
    const scraped = await this.tryScrape(args.url);
    await this.deliveryService.update(deliveryKey, {
      isEdit: false,
      isCreate: true,
      isCompleted: false,
      assignUserId: args.ordererKey,
      remainingTime: args.minutes * 60 * 1000,
      createDateTime: new Date().toISOString(),
      delivery: scraped,
    });
  }

  private async tryScrape(url: string): Promise<DeliveryDetailNowAPI> {
    try {
      const data = await firstValueFrom(
        this.deliveryService.getDetailDeliveryFromShopeeFoodApi(url).pipe(
          take(1),
          timeout(8000),
          catchError(() => of(null)),
        ),
      );
      if (data && typeof data === 'object') return data as DeliveryDetailNowAPI;
    } catch {
      /* swallow */
    }
    return { url, result: 'fallback' } as DeliveryDetailNowAPI;
  }
}
