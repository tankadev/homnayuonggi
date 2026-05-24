import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { take, timeout } from 'rxjs/operators';

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
   * Promote the editing lock into a real, active order. Throws if the scrape fails so
   * the caller can show an error and keep the lock — never commit a broken delivery.
   */
  async commitDelivery(deliveryKey: string, args: CommitDeliveryArgs): Promise<void> {
    const scraped = await this.scrapeOrThrow(args.url);
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

  private async scrapeOrThrow(url: string): Promise<DeliveryDetailNowAPI> {
    let data: any;
    try {
      data = await firstValueFrom(
        this.deliveryService.getDetailDeliveryFromShopeeFoodApi(url).pipe(
          take(1),
          timeout(15000),
        ),
      );
    } catch {
      throw new Error(
        'Không kết nối được API lấy menu. Kiểm tra mạng hoặc bấm "Tải lại APIURL" rồi thử lại.',
      );
    }
    if (!data || typeof data !== 'object' || data.result !== 'success') {
      throw new Error(
        'Không lấy được dữ liệu quán. Vui lòng kiểm tra lại link ShopeeFood của bạn.',
      );
    }
    return data as DeliveryDetailNowAPI;
  }
}
