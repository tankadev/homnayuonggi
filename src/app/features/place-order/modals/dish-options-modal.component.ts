import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';

import { MockDish, MockOptionChoice, MockOptionGroup } from '../mock-data';

export interface DishOptionsResult {
  /** Choice ids across all groups — becomes the cart line key. */
  choiceIds: string[];
  selections: { groupName: string; label: string; delta: number }[];
  /** Base price + every chosen surcharge, for one portion. */
  price: number;
  qty: number;
}

/** Option picker for a dish that ShopeeFood ships with option groups (size,
 *  sugar/ice level, toppings, combo slots). Enforces each group's min/max and
 *  shows the running total, so what lands in the cart is always orderable. */
@Component({
  selector: 'app-dish-options-modal',
  standalone: false,
  templateUrl: './dish-options-modal.component.html',
  styleUrls: ['./dish-options-modal.component.scss'],
})
export class DishOptionsModalComponent implements OnInit {
  @Input() dish!: MockDish;

  @Output() confirm = new EventEmitter<DishOptionsResult>();
  @Output() closed = new EventEmitter<void>();

  /** groupId → chosen choice ids. */
  picked: Record<string, string[]> = {};
  qty = 1;

  get groups(): MockOptionGroup[] {
    return this.dish.optionGroups || [];
  }

  ngOnInit(): void {
    /* Pre-select the shop's defaults. Every default we've seen upstream is a
       zero-surcharge choice, so this never quietly raises the price — and a
       required group without defaults simply stays empty and blocks the CTA. */
    for (const g of this.groups) {
      const defaults = g.choices.filter((c) => c.isDefault).slice(0, g.max);
      this.picked[g.id] = defaults.map((c) => c.id);
    }
  }

  isPicked(g: MockOptionGroup, c: MockOptionChoice): boolean {
    return (this.picked[g.id] || []).includes(c.id);
  }

  /** Disabled only for unpicked choices in a full multi-select group — the user
   *  should always be able to untick to make room. */
  isBlocked(g: MockOptionGroup, c: MockOptionChoice): boolean {
    if (!g.multi || this.isPicked(g, c)) return false;
    return (this.picked[g.id] || []).length >= g.max;
  }

  toggle(g: MockOptionGroup, c: MockOptionChoice): void {
    const cur = this.picked[g.id] || [];
    const has = cur.includes(c.id);

    if (!g.multi) {
      /* Single-select: tapping the picked choice clears it, but only when the
         group is optional (min 0) — otherwise it would leave the dish invalid. */
      this.picked[g.id] = has && !g.required ? [] : [c.id];
      return;
    }

    if (has) {
      this.picked[g.id] = cur.filter((id) => id !== c.id);
    } else if (cur.length < g.max) {
      this.picked[g.id] = [...cur, c.id];
    }
  }

  countFor(g: MockOptionGroup): number {
    return (this.picked[g.id] || []).length;
  }

  /** "Chọn 1", "Chọn tối đa 3", "Chọn đúng 3", … */
  ruleFor(g: MockOptionGroup): string {
    if (g.min === g.max) return g.min === 1 ? 'Chọn 1' : `Chọn đúng ${g.min}`;
    if (g.min === 0) return `Chọn tối đa ${g.max}`;
    return `Chọn ${g.min}–${g.max}`;
  }

  satisfied(g: MockOptionGroup): boolean {
    const n = this.countFor(g);
    return n >= g.min && n <= g.max;
  }

  get valid(): boolean {
    return this.groups.every((g) => this.satisfied(g));
  }

  /** First unsatisfied group — drives the CTA's helper text. */
  get missing(): MockOptionGroup | null {
    return this.groups.find((g) => !this.satisfied(g)) || null;
  }

  get selections(): { groupName: string; label: string; delta: number }[] {
    const out: { groupName: string; label: string; delta: number }[] = [];
    for (const g of this.groups) {
      for (const id of this.picked[g.id] || []) {
        const c = g.choices.find((x) => x.id === id);
        if (c) out.push({ groupName: g.name, label: c.label, delta: c.delta });
      }
    }
    return out;
  }

  get base(): number {
    return this.dish.basePrice ?? this.dish.price;
  }

  get surcharge(): number {
    return this.selections.reduce((s, x) => s + x.delta, 0);
  }

  get unitPrice(): number {
    return this.base + this.surcharge;
  }

  get total(): number {
    return this.unitPrice * this.qty;
  }

  setQty(n: number): void {
    this.qty = Math.min(20, Math.max(1, n));
  }

  submit(): void {
    if (!this.valid) return;
    const choiceIds = this.groups.flatMap((g) => this.picked[g.id] || []);
    this.confirm.emit({
      choiceIds,
      selections: this.selections,
      price: this.unitPrice,
      qty: this.qty,
    });
  }

  trackByGroup = (_: number, g: MockOptionGroup) => g.id;
  trackByChoice = (_: number, c: MockOptionChoice) => c.id;
}
