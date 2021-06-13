import { DeliveryDetailNowAPI } from './delivery-detail-now-api.ro';

export class DeliveryRO {
  key: string;
  isEdit?: boolean;
  isCreate?: boolean;
  userCreate?: string;
  remainingTime?: number;
  createDateTime?: string;
  assignUserId?: string;
  delivery?: DeliveryDetailNowAPI;
}
