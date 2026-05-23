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

  select(id: PaletteId): void {
    this.theme.set(id);
    this.open = false;
  }

  @HostListener('document:mousedown', ['$event'])
  onDocMouseDown(e: MouseEvent): void {
    if (!this.open) return;
    if (!this.host.nativeElement.contains(e.target as Node)) this.open = false;
  }
}
