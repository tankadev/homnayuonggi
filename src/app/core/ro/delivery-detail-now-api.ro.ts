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
  dishes: Dish[];
}

/** One selectable choice inside a `DishOption`.
 *  `/get-detail` sends `priceDelta` (ShopeeFood options are surcharges);
 *  `/extract-from-image` and the manual menu builder send `absolutePrice`
 *  (an OCR'd menu prints one full price per size). Exactly one is set. */
export class OptionChoice {
  id?: number;
  label: string;
  priceDelta?: number | null;
  absolutePrice?: number | null;
  isDefault?: boolean;
}

/** A group of choices attached to a dish — size, sugar level, toppings, … */
export class DishOption {
  id?: number;
  name: string;
  /** "multi" iff maxSelect > 1. */
  type?: 'single' | 'multi';
  required?: boolean;
  /** Selection bounds. Combos use minSelect === maxSelect === n, so `required`
   *  alone is never enough to validate a selection. */
  minSelect?: number;
  maxSelect?: number;
  choices: OptionChoice[];
}

/** One option the user actually picked, snapshotted onto the ordered variant so
 *  cart / history / payment-review can render it without the source menu. */
export class SelectedOption {
  groupName: string;
  label: string;
  /** Surcharge already included in the variant's `price.value`. */
  delta: number;
}

export class Dish {
  id: number | string;
  name: string;
  photos: Photo[];
  description: string;
  discountPrice: { text: string; unit: string; value: number };
  price: { text: string; unit: string; value: number };
  /** Older deliveries persisted in Firebase may still hold the raw ShopeeFood
   *  shape (`option_items: { items: [...] }`) — the adapter reads both. */
  options: DishOption[] | any[];
  hasSize?: boolean;
  /** Only set on ordered variants (see `buildOrderDish`), never on menu dishes.
   *  `name` on a variant carries the chosen labels so screens that only read the
   *  stored dish (payment-review, history) stay correct; `baseName` keeps the
   *  clean dish name for UI that renders the choices separately. */
  selectedOptions?: SelectedOption[];
  baseName?: string;
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
