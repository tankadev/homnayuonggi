import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';

import { MockCartLine, MockDish, MockMember } from './mock-data';

interface CartGroup {
  dish: MockDish;
  lines: MockCartLine[];
  qty: number;
  subtotal: number;
}

@Component({
  selector: 'app-cart-panel',
  standalone: false,
  templateUrl: './cart-panel.component.html',
  styleUrls: ['./cart-panel.component.scss'],
})
export class CartPanelComponent implements OnChanges {
  @Input() cart: MockCartLine[] = [];
  @Input() members: MockMember[] = [];
  @Input() dishes: MockDish[] = [];
  @Input() secondsLeft = 0;
  @Input() totalSeconds = 3600;
  /** True only when the logged-in user is the assigned orderer — gates cancel + finalize. */
  @Input() isOrderer = false;
  /** Display name of the orderer for the disabled-state tooltip. */
  @Input() ordererName = '';

  @Output() addItem = new EventEmitter<string>();
  @Output() minusItem = new EventEmitter<string>();
  @Output() editNote = new EventEmitter<MockCartLine>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();

  grouped: CartGroup[] = [];
  itemCount = 0;
  peopleCount = 0;
  total = 0;
  orderers: MockMember[] = [];
  /** Per-dish image load/error tracking for the cart thumb placeholder fade-in. */
  thumbLoaded: Record<string, boolean> = {};
  thumbFailed: Record<string, boolean> = {};

  private dishMap: Record<string, MockDish> = {};
  memberMap: Record<string, MockMember> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dishes']) {
      this.dishMap = Object.fromEntries(this.dishes.map((d) => [d.id, d]));
    }
    if (changes['members']) {
      this.memberMap = Object.fromEntries(this.members.map((m) => [m.id, m]));
    }
    if (changes['cart'] || changes['dishes'] || changes['members']) this.recompute();
  }

  private recompute(): void {
    const order: string[] = [];
    const groups: Record<string, MockCartLine[]> = {};
    for (const line of this.cart) {
      if (!groups[line.dishId]) {
        groups[line.dishId] = [];
        order.push(line.dishId);
      }
      groups[line.dishId].push(line);
    }
    this.grouped = order
      .map((id) => {
        const dish = this.dishMap[id];
        const lines = groups[id];
        if (!dish) return null;
        const qty = lines.reduce((n, l) => n + l.qty, 0);
        return { dish, lines, qty, subtotal: dish.price * qty };
      })
      .filter((g): g is CartGroup => !!g);

    this.itemCount = this.cart.reduce((n, l) => n + l.qty, 0);
    const orderIds = Array.from(new Set(this.cart.map((l) => l.memberId)));
    this.peopleCount = orderIds.length;
    this.orderers = orderIds.map((id) => this.memberMap[id]).filter(Boolean);
    this.total = this.grouped.reduce((s, g) => s + g.subtotal, 0);
  }

  get empty(): boolean {
    return this.cart.length === 0;
  }

  get hours(): number {
    return Math.floor(this.secondsLeft / 3600);
  }
  get minutes(): number {
    return Math.floor((this.secondsLeft % 3600) / 60);
  }
  get seconds(): number {
    return this.secondsLeft % 60;
  }
  get expired(): boolean {
    return this.totalSeconds > 0 && this.secondsLeft <= 0;
  }

  trackByDish = (_: number, g: CartGroup) => g.dish.id;
  trackByLine = (_: number, l: MockCartLine) => `${l.memberId}:${l.dishId}`;
}
