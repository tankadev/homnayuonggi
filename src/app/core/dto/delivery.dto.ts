import { SplitMoneyDeliveryModel } from '../models/split-money.model';
import { DeliveryDetailNowAPI } from '../ro/delivery-detail-now-api.ro';

export class DeliveryDTO {
  isEdit?: boolean;
  isCreate?: boolean;
  isCompleted?: boolean;
  userCreate?: string;
  remainingTime?: number;
  createDateTime?: string;
  assignUserId?: string;
  delivery?: DeliveryDetailNowAPI;
  /** Compressed base64 dataURLs of the source images the orderer uploaded (image-mode only). */
  menuPhotos?: string[];
  shippingFee?: number;
  serviceFee?: number;
  sponsorPrice?: number;
  splitMoney?: SplitMoneyDeliveryModel;
  deliveryStatus?: number; // 1: delivering, 2: received
  /** Lucky-draw visual the orderer picked — shared so viewers see the same arena. */
  luckyMode?: 'wheel' | 'duck' | 'boat';
  roomKey: string;
}
