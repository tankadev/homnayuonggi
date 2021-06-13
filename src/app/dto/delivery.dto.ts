import { DeliveryDetailNowAPI } from '../ro/delivery-detail-now-api.ro';

export class DeliveryDTO {
  isEdit?: boolean;
  isCreate?: boolean;
  userCreate?: string;
  remainingTime?: number;
  createDateTime?: string;
  assignUserId?: string;
  delivery?: DeliveryDetailNowAPI;
}
