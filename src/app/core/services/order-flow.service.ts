import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { take, timeout } from 'rxjs/operators';

import { DeliveryService } from './delivery.service';
import { DeliveryDTO } from '../dto/delivery.dto';
import { DeliveryDetailNowAPI } from '../ro/delivery-detail-now-api.ro';

export interface ExtractFromUrlArgs {
  url: string;
}

export interface ExtractFromImagesArgs {
  files: File[];
}

export interface CommitDeliveryArgs {
  scraped: DeliveryDetailNowAPI;
  menuPhotos?: string[];
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

  /** Scrape menu data from a ShopeeFood URL. Throws on failure so the caller keeps the lock. */
  async extractFromUrl(args: ExtractFromUrlArgs): Promise<DeliveryDetailNowAPI> {
    let data: any;
    try {
      data = await firstValueFrom(
        this.deliveryService.getDetailDeliveryFromShopeeFoodApi(args.url).pipe(
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

  /** Send compressed menu images to the AI extractor. Throws on failure. */
  async extractFromImages(args: ExtractFromImagesArgs): Promise<DeliveryDetailNowAPI> {
    let data: any;
    try {
      data = await firstValueFrom(
        this.deliveryService.getDetailDeliveryFromImagesApi(args.files).pipe(
          take(1),
          timeout(90000),
        ),
      );
    } catch {
      throw new Error(
        'Không kết nối được API trích xuất menu từ ảnh. Kiểm tra mạng hoặc bấm "Tải lại APIURL" rồi thử lại.',
      );
    }
    if (!data || typeof data !== 'object' || data.result !== 'success') {
      throw new Error(
        'Không nhận dạng được menu từ ảnh. Vui lòng chụp rõ hơn hoặc thử ảnh khác.',
      );
    }
    return data as DeliveryDetailNowAPI;
  }

  /**
   * Promote the editing lock into a real, active order using a scraped payload that the
   * orderer has already reviewed/edited. Caller is responsible for showing the review UI
   * between extract() and commitDelivery().
   */
  async commitDelivery(deliveryKey: string, args: CommitDeliveryArgs): Promise<void> {
    const patch: Partial<DeliveryDTO> = {
      isEdit: false,
      isCreate: true,
      isCompleted: false,
      assignUserId: args.ordererKey,
      remainingTime: args.minutes * 60 * 1000,
      createDateTime: new Date().toISOString(),
      delivery: args.scraped,
    };
    if (args.menuPhotos && args.menuPhotos.length) patch.menuPhotos = args.menuPhotos;
    await this.deliveryService.update(deliveryKey, patch);
  }
}
