import { Component, EventEmitter, Input, Output } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

import { MockCartLine, MockDish, MockMenuSection } from './mock-data';
import { baseDishId } from './place-order.adapter';

export interface DishAddEvent {
  dishId: string;
}

@Component({
  selector: 'app-dish-menu',
  standalone: false,
  templateUrl: './dish-menu.component.html',
  styleUrls: ['./dish-menu.component.scss'],
  animations: [
    /* Number changes: increment rises from below, decrement drops from above —
       direction maps to value change for clearer feedback. */
    trigger('countFlip', [
      transition(':increment', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('220ms cubic-bezier(.4, 0, .2, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':decrement', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('220ms cubic-bezier(.4, 0, .2, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
    ]),
  ],
})
export class DishMenuComponent {
  @Input() section!: MockMenuSection;
  @Input() myCart: MockCartLine[] = [];

  @Output() add = new EventEmitter<DishAddEvent>();
  @Output() minus = new EventEmitter<DishAddEvent>();
  /** Dish has option groups — the parent opens the picker instead of adding. */
  @Output() pick = new EventEmitter<MockDish>();

  /** Dish ids whose image finished loading — used to fade it in over the placeholder. */
  loaded: Record<string, boolean> = {};
  /** Dish ids whose image errored — hide the img so the placeholder shows through. */
  failed: Record<string, boolean> = {};

  get minPrice(): number {
    return Math.min(...this.section.items.map((d) => d.price));
  }

  /** My portions of this dish. For an optioned dish that means every variant of
   *  it, since each combination of choices lives on its own cart line. */
  qtyFor(d: MockDish): number {
    return this.myCart
      .filter((l) => (d.optionGroups?.length ? baseDishId(l.dishId) === d.id : l.dishId === d.id))
      .reduce((n, l) => n + l.qty, 0);
  }

  /** How many distinct variants of this dish I have — "2 kiểu" on the card. */
  variantCount(d: MockDish): number {
    return new Set(
      this.myCart.filter((l) => baseDishId(l.dishId) === d.id).map((l) => l.dishId),
    ).size;
  }

  emitAdd(d: MockDish): void {
    this.add.emit({ dishId: d.id });
  }

  emitMinus(d: MockDish): void {
    this.minus.emit({ dishId: d.id });
  }

  /** Short "Size, Topping +2" line so the card says what's configurable. */
  optionSummary(d: MockDish): string {
    const groups = d.optionGroups || [];
    const names = groups.slice(0, 2).map((g) => g.name);
    const extra = groups.length - names.length;
    return extra > 0 ? `${names.join(' · ')} +${extra}` : names.join(' · ');
  }

  /** True when at least one group must be picked — the card says "chọn tùy chọn"
   *  rather than implying one tap is enough. */
  hasRequiredOption(d: MockDish): boolean {
    return (d.optionGroups || []).some((g) => g.required);
  }

  onImgLoaded(dishId: string): void {
    this.loaded[dishId] = true;
  }

  onImgError(dishId: string): void {
    this.failed[dishId] = true;
  }
}
