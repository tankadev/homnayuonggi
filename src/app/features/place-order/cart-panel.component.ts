import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';

import { MockCartLine, MockDish, MockMember, MockMenuSection } from './mock-data';

interface CartGroup {
  dish: MockDish;
  lines: MockCartLine[];
  qty: number;
  subtotal: number;
}

interface MenuGroup {
  section: MockMenuSection;
  groups: CartGroup[];
  qty: number;
  subtotal: number;
}

export type CartViewMode = 'flat' | 'menu';

@Component({
  selector: 'app-cart-panel',
  standalone: false,
  templateUrl: './cart-panel.component.html',
  styleUrls: ['./cart-panel.component.scss'],
  animations: [
    /* New cart-group entering: slide down from -10px while flashing the
       primary-tinted background, then settle to the resting surface-2 color. */
    trigger('groupEnter', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-10px)' }),
        animate('260ms cubic-bezier(.4, 0, .2, 1)', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
    /* Inline qty: increment rises from below, decrement drops from above. */
    trigger('countFlip', [
      transition(':increment', [
        style({ transform: 'translateY(100%)', opacity: 0 }),
        animate('200ms cubic-bezier(.4, 0, .2, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
      transition(':decrement', [
        style({ transform: 'translateY(-100%)', opacity: 0 }),
        animate('200ms cubic-bezier(.4, 0, .2, 1)', style({ transform: 'translateY(0)', opacity: 1 })),
      ]),
    ]),
  ],
})
export class CartPanelComponent implements OnChanges {
  @Input() cart: MockCartLine[] = [];
  @Input() members: MockMember[] = [];
  @Input() dishes: MockDish[] = [];
  /** Original menu sections — only needed for the "by menu" view mode. */
  @Input() menu: MockMenuSection[] = [];
  @Input() secondsLeft = 0;
  @Input() totalSeconds = 3600;
  /** True only when the logged-in user is the assigned orderer — gates cancel + finalize. */
  @Input() isOrderer = false;
  /** Display name of the orderer for the disabled-state tooltip. */
  @Input() ordererName = '';
  /** Cart-list grouping: 'flat' = one block per dish (default), 'menu' = group dishes
   *  under their original menu section. Persisted by the parent via LocalStorageService. */
  @Input() viewMode: CartViewMode = 'flat';

  @Output() addItem = new EventEmitter<string>();
  @Output() minusItem = new EventEmitter<string>();
  @Output() editNote = new EventEmitter<MockCartLine>();
  @Output() clearAll = new EventEmitter<void>();
  @Output() submit = new EventEmitter<void>();
  @Output() viewModeChange = new EventEmitter<CartViewMode>();

  grouped: CartGroup[] = [];
  groupedByMenu: MenuGroup[] = [];
  itemCount = 0;
  peopleCount = 0;
  total = 0;
  orderers: MockMember[] = [];
  /** Per-dish image load/error tracking for the cart thumb placeholder fade-in. */
  thumbLoaded: Record<string, boolean> = {};
  thumbFailed: Record<string, boolean> = {};

  private dishMap: Record<string, MockDish> = {};
  /** Reverse index: expanded dishId (e.g. `d1#Vừa`) → owning MockMenuSection. */
  private dishSection: Record<string, MockMenuSection> = {};
  memberMap: Record<string, MockMember> = {};

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dishes']) {
      this.dishMap = Object.fromEntries(this.dishes.map((d) => [d.id, d]));
    }
    if (changes['members']) {
      this.memberMap = Object.fromEntries(this.members.map((m) => [m.id, m]));
    }
    if (changes['menu']) {
      this.dishSection = {};
      for (const s of this.menu) {
        for (const d of s.items) {
          this.dishSection[d.id] = s;
          if (d.sizes?.length) {
            for (const sz of d.sizes) this.dishSection[`${d.id}#${sz.label}`] = s;
          }
        }
      }
    }
    if (changes['cart'] || changes['dishes'] || changes['members'] || changes['menu']) this.recompute();
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

    /* "By menu" view: bucket the flat groups under their original section. Sections with
       zero cart items are dropped so the cart never shows empty headers. Section order
       follows the menu's declared order; dish order within a section follows cart-add order. */
    const bySection = new Map<string, MenuGroup>();
    for (const g of this.grouped) {
      const section = this.dishSection[g.dish.id];
      if (!section) continue;
      let bucket = bySection.get(section.id);
      if (!bucket) {
        bucket = { section, groups: [], qty: 0, subtotal: 0 };
        bySection.set(section.id, bucket);
      }
      bucket.groups.push(g);
      bucket.qty += g.qty;
      bucket.subtotal += g.subtotal;
    }
    this.groupedByMenu = this.menu
      .map((s) => bySection.get(s.id))
      .filter((b): b is MenuGroup => !!b);
  }

  setViewMode(mode: CartViewMode): void {
    if (this.viewMode === mode) return;
    this.viewMode = mode;
    this.viewModeChange.emit(mode);
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
  trackBySection = (_: number, g: MenuGroup) => g.section.id;
}
