import { Component, Input } from '@angular/core';

import { PrOrder } from './mock-data';

@Component({
  selector: 'app-payment-detail',
  standalone: false,
  templateUrl: './payment-detail.component.html',
  styleUrls: ['./payment-detail.component.scss'],
})
export class PaymentDetailComponent {
  @Input() order!: PrOrder;

  copiedKey: string | null = null;
  private copiedTimer?: number;

  async copy(value: string, key: string): Promise<void> {
    const text = (value || '').trim();
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* Fallback for non-secure contexts. */
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); } catch { /* swallow */ }
      document.body.removeChild(ta);
    }
    this.copiedKey = key;
    if (this.copiedTimer !== undefined) window.clearTimeout(this.copiedTimer);
    this.copiedTimer = window.setTimeout(() => (this.copiedKey = null), 1400);
  }

  /** Deterministic QR cells (21×21 grid, finder corners excluded). */
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
