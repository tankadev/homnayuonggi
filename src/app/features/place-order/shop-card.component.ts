import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-shop-card',
  standalone: false,
  templateUrl: './shop-card.component.html',
  styleUrls: ['./shop-card.component.scss'],
})
export class ShopCardComponent {
  @Input() name = '';
  @Input() rating = 0;
  @Input() reviews = '';
  @Input() address = '';
  @Input() url = '';
  @Input() avatarEmoji = '🍚';
  /** Shop photo URL — when present, the avatar shows the real image instead of the emoji. */
  @Input() photoUrl: string | null = null;

  /** Pick a shop-name size class that shrinks once the name gets long. */
  get nameSizeClass(): 'sm' | 'xs' | '' {
    const n = (this.name || '').length;
    if (n > 36) return 'xs';
    if (n > 22) return 'sm';
    return '';
  }

  get fullStars(): number[] {
    return Array.from({ length: Math.floor(this.rating) }, (_, i) => i);
  }
  get hasHalfStar(): boolean {
    return this.rating - Math.floor(this.rating) >= 0.5;
  }
  get emptyStars(): number[] {
    const total = 5;
    const filled = Math.floor(this.rating) + (this.hasHalfStar ? 1 : 0);
    return Array.from({ length: total - filled }, (_, i) => i);
  }

  /** Deterministic QR cell coordinates (21×21 grid, finder corners excluded). */
  get qrCells(): { x: number; y: number }[] {
    const cells: { x: number; y: number }[] = [];
    for (let y = 0; y < 21; y++) {
      for (let x = 0; x < 21; x++) {
        if ((x < 7 && y < 7) || (x > 13 && y < 7) || (x < 7 && y > 13)) continue;
        const v = (x * 23 + y * 19 + x * y * 5 + 11) % 13;
        if (v < 5) cells.push({ x, y });
      }
    }
    return cells;
  }

  readonly finders = [[0, 0], [14, 0], [0, 14]];
}
