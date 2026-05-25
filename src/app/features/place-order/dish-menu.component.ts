import { Component, EventEmitter, Input, Output } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

import { MockCartLine, MockDish, MockDishSize, MockMenuSection } from './mock-data';
import { dishLineKey } from './place-order.adapter';

export interface DishAddEvent {
  dishId: string;
  sizeLabel?: string;
  sizePrice?: number;
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

  /** Dish ids whose image finished loading — used to fade it in over the placeholder. */
  loaded: Record<string, boolean> = {};
  /** Dish ids whose image errored — hide the img so the placeholder shows through. */
  failed: Record<string, boolean> = {};

  get minPrice(): number {
    return Math.min(...this.section.items.map((d) => d.price));
  }

  /** Total qty across all sizes (or just this dish when sizes are absent). */
  qtyFor(d: MockDish): number {
    if (d.sizes && d.sizes.length) {
      return d.sizes.reduce((n, s) => n + this.qtyForSize(d, s), 0);
    }
    return this.myCart.filter((l) => l.dishId === d.id).reduce((n, l) => n + l.qty, 0);
  }

  qtyForSize(d: MockDish, s: MockDishSize): number {
    const key = dishLineKey(d.id, s.label);
    return this.myCart.filter((l) => l.dishId === key).reduce((n, l) => n + l.qty, 0);
  }

  emitAdd(d: MockDish, s?: MockDishSize): void {
    if (s) this.add.emit({ dishId: d.id, sizeLabel: s.label, sizePrice: s.price });
    else this.add.emit({ dishId: d.id });
  }

  emitMinus(d: MockDish, s?: MockDishSize): void {
    if (s) this.minus.emit({ dishId: d.id, sizeLabel: s.label, sizePrice: s.price });
    else this.minus.emit({ dishId: d.id });
  }

  /** "15k – 30k" when sized, or just the single price (template formats via pipe). */
  sizePriceRange(d: MockDish): { min: number; max: number } | null {
    if (!d.sizes || !d.sizes.length) return null;
    const prices = d.sizes.map((s) => s.price);
    return { min: Math.min(...prices), max: Math.max(...prices) };
  }

  trackBySize = (_: number, s: MockDishSize) => s.label;

  onImgLoaded(dishId: string): void {
    this.loaded[dishId] = true;
  }

  onImgError(dishId: string): void {
    this.failed[dishId] = true;
  }
}
