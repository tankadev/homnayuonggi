import { Component, ElementRef, HostListener, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';

import { PALETTES, PaletteId, PaletteMeta, ThemeService } from '../../core/services/theme.service';

@Component({
  selector: 'app-theme-switcher',
  standalone: false,
  templateUrl: './theme-switcher.component.html',
  styleUrls: ['./theme-switcher.component.scss'],
})
export class ThemeSwitcherComponent implements OnInit, OnDestroy {
  open = false;
  current: PaletteMeta = PALETTES[0];
  readonly palettes = PALETTES;

  private sub?: Subscription;

  constructor(private theme: ThemeService, private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    this.sub = this.theme.observe().subscribe((id) => {
      this.current = this.theme.meta(id);
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  toggle(): void {
    this.open = !this.open;
  }

  select(id: PaletteId, meta: PaletteMeta, ev: MouseEvent): void {
    /* Skip the ripple if the same palette is re-selected. */
    if (id === this.current.id) {
      this.open = false;
      return;
    }
    this.runRipple(meta, ev);
    this.open = false;
  }

  /**
   * Paint a fixed full-screen overlay starting as a 0-radius circle at the click
   * point, expanding to cover the viewport. We swap the theme mid-animation so
   * the new palette is visible underneath as the overlay fades out.
   */
  private runRipple(meta: PaletteMeta, ev: MouseEvent): void {
    const x = ev.clientX;
    const y = ev.clientY;
    /* First swatch is the palette's signature/primary color — use it as the wash. */
    const color = meta.swatches[0];

    const overlay = document.createElement('div');
    overlay.className = 'theme-ripple';
    /* Translucent wash so the new theme is visible underneath as the ripple
       sweeps — feels like a soft glaze rather than a solid blot. */
    overlay.style.background = color;
    overlay.style.opacity = '0.4';
    overlay.style.clipPath = `circle(0px at ${x}px ${y}px)`;

    const maxRadius = this.distanceToFarthestCorner(x, y);
    document.body.appendChild(overlay);
    /* Force a layout flush so the transition fires from the initial clip-path. */
    overlay.getBoundingClientRect();
    overlay.style.transition = 'clip-path 600ms cubic-bezier(.2,.7,.2,1), opacity 360ms ease 420ms';
    overlay.style.clipPath = `circle(${maxRadius}px at ${x}px ${y}px)`;

    /* Swap the palette underneath while the wash is mostly covering the screen. */
    window.setTimeout(() => this.theme.set(meta.id), 260);

    /* Fade overlay out, then remove. */
    window.setTimeout(() => {
      overlay.style.opacity = '0';
    }, 420);
    window.setTimeout(() => {
      overlay.remove();
    }, 820);
  }

  private distanceToFarthestCorner(x: number, y: number): number {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const dx = Math.max(x, w - x);
    const dy = Math.max(y, h - y);
    return Math.ceil(Math.hypot(dx, dy));
  }

  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(e: MouseEvent): void {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(e.target as Node)) this.open = false;
  }
}
