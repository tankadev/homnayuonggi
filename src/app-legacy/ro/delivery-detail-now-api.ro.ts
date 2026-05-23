export class DeliveryDetailNowAPI {
  name?: string;
  address?: string;
  rating?: number;
  displayTotalReview?: string;
  url?: string;
  voucher?: any[];
  photos?: Photo[];
  menus?: MenuInfo[];
  result: string;
}

export class Photo {
  height: number;
  width: number;
  value: string;
}

export class MenuInfo {
  id: number;
  name: string;
  dishes: Dish[]
}

export class Dish {
  id: number;
  name: string;
  photos: Photo[];
  description: string;
  discountPrice: { text: string; unit: string; value: number };
  price: { text: string; unit: string; value: number };
  options: any[];
  totalLike: string;
  isActive: boolean;
  isAvailable: boolean;
  isDelete: boolean;
}

export class Voucher {
  content: string;
  code: string;
  isPromotion: boolean;
  icon: string;
  expired: string;
}
