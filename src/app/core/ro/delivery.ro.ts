import { SplitMoneyDeliveryModel } from '../models/split-money.model';
import { DeliveryDetailNowAPI } from './delivery-detail-now-api.ro';

export class DeliveryRO {
  key: string;
  isEdit?: boolean;
  isCreate?: boolean;
  isCompleted?: boolean;
  userCreate?: string;
  remainingTime?: number;
  createDateTime?: string;
  assignUserId?: string;
  delivery?: DeliveryDetailNowAPI;
  menuPhotos?: string[];
  shippingFee?: number;
  serviceFee?: number;
  sponsorPrice?: number;
  splitMoney?: SplitMoneyDeliveryModel;
  deliveryStatus?: number;
  /** Lucky-draw visual the orderer picked — shared so viewers see the same arena. */
  luckyMode?: 'wheel' | 'duck' | 'boat';
  roomKey: string;
}
