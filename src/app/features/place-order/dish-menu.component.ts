import { Component, EventEmitter, Input, Output } from '@angular/core';

import { MockCartLine, MockMenuSection } from './mock-data';

@Component({
  selector: 'app-dish-menu',
  standalone: false,
  templateUrl: './dish-menu.component.html',
  styleUrls: ['./dish-menu.component.scss'],
})
export class DishMenuComponent {
  @Input() section!: MockMenuSection;
  @Input() myCart: MockCartLine[] = [];

  @Output() add = new EventEmitter<string>();
  @Output() minus = new EventEmitter<string>();

  /** Dish ids whose image finished loading — used to fade it in over the placeholder. */
  loaded: Record<string, boolean> = {};
  /** Dish ids whose image errored — hide the img so the placeholder shows through. */
  failed: Record<string, boolean> = {};

  get minPrice(): number {
    return Math.min(...this.section.items.map((d) => d.price));
  }

  qtyFor(dishId: string): number {
    return this.myCart.filter((l) => l.dishId === dishId).reduce((n, l) => n + l.qty, 0);
  }

  onImgLoaded(dishId: string): void {
    this.loaded[dishId] = true;
  }

  onImgError(dishId: string): void {
    this.failed[dishId] = true;
  }
}
