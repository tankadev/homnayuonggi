import { Dish } from '../ro/delivery-detail-now-api.ro';

/** True when a stored order line is an option/size variant rather than the plain
 *  menu dish. New lines carry `selectedOptions`; lines written before that field
 *  existed are recognised by their composite id (`<dishId>#<...>`). */
export function isOrderedVariant(dish: Dish | null | undefined): boolean {
  if (!dish) return false;
  if (dish.selectedOptions?.length) return true;
  return String(dish.id ?? '').includes('#');
}

/** What one portion of a stored order line is charged.
 *
 *  A variant's `price` was written deliberately at order time — base, minus any
 *  discount, plus the chosen surcharges — so it wins outright. Reapplying
 *  `discountPrice` on top would undo the surcharge; that mismatch is why the cart
 *  and the bill could disagree on discounted sized dishes.
 *
 *  A plain line keeps the original discount-first rule. */
export function orderedUnitPrice(dish: Dish | null | undefined): number {
  if (!dish) return 0;
  if (isOrderedVariant(dish)) return Number(dish.price?.value || 0);
  return Number(dish.discountPrice?.value || dish.price?.value || 0);
}
