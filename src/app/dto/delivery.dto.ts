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
  shippingFee?: number;
  serviceFee?: number;
  sponsorPrice? : number;
  splitMoney?: SplitMoneyDeliveryModel;
  deliveryStatus?: number; // 1: delivering, 2: received
  roomKey: string;
}
