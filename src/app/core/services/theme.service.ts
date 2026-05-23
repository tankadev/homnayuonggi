import { Inject, Injectable, forwardRef, Optional } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

import { LocalStorage } from '../const/local-storage';
import { AuthService } from './auth.service';

export type PaletteId =
  | 'saigon'
  | 'hanoi'
  | 'dalat'
  | 'mango'
  | 'espresso'
  | 'matcha'
  | 'paper'
  | 'coral'
  | 'ocean'
  | 'midnight';

export interface PaletteMeta {
  id: PaletteId;
  name: string;
  sub: string;
  swatches: [string, string, string];
}

export const PALETTES: PaletteMeta[] = [
  { id: 'saigon',   name: 'Sài Gòn',  sub: 'Terracotta + rau thơm', swatches: ['#c95a37', '#5a7a3c', '#f9f1e2'] },
  { id: 'hanoi',    name: 'Hà Nội',   sub: 'Teal + amber',          swatches: ['#1e5566', '#d49328', '#f5f3ee'] },
  { id: 'dalat',    name: 'Đà Lạt',   sub: 'Thông + phấn hồng',     swatches: ['#2f5a3b', '#c87a82', '#f4f1ec'] },
  { id: 'mango',    name: 'Xoài',     sub: 'Xoài + cobalt',         swatches: ['#e6932b', '#3556a8', '#fff8eb'] },
  { id: 'espresso', name: 'Espresso', sub: 'Caramel đậm (dark)',    swatches: ['#d09954', '#1c1612', '#f3e8d4'] },
  { id: 'matcha',   name: 'Matcha',   sub: 'Sage + đất ấm',         swatches: ['#5a7a48', '#c48556', '#f1f0e9'] },
  { id: 'paper',    name: 'Paper',    sub: 'Kem + xanh',            swatches: ['#3a6a3d', '#c08838', '#f6f1e7'] },
  { id: 'coral',    name: 'Coral',    sub: 'Hồng cam ấm',           swatches: ['#c14e2b', '#d96a3c', '#fcefe6'] },
  { id: 'ocean',    name: 'Ocean',    sub: 'Xanh dương + ấm',       swatches: ['#2c5896', '#c46237', '#eef3f6'] },
  { id: 'midnight', name: 'Midnight', sub: 'Rừng xanh tối (dark)',  swatches: ['#3fc580', '#e89944', '#0f1113'] },
];

const VALID = new Set<string>(PALETTES.map((p) => p.id));
const DEFAULT_PALETTE: PaletteId = 'saigon';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private current$ = new BehaviorSubject<PaletteId>(DEFAULT_PALETTE);
  readonly palettes = PALETTES;

  /**
   * AuthService is injected lazily via forwardRef so its own constructor (which depends on
   * UserService / LocalStorageService) doesn't form a cycle with this service.
   */
  constructor(@Optional() @Inject(forwardRef(() => AuthService)) private auth: AuthService | null) {}

  init(): void {
    const saved = localStorage.getItem(LocalStorage.THEME);
    const next = saved && this.isValid(saved) ? (saved as PaletteId) : DEFAULT_PALETTE;
    this.apply(next);
    this.current$.next(next);
  }

  /** Apply the theme stored on a user record (called after login / session restore). */
  syncFromUser(theme: string | null | undefined): void {
    if (theme && this.isValid(theme)) {
      this.apply(theme as PaletteId);
      localStorage.setItem(LocalStorage.THEME, theme);
      this.current$.next(theme as PaletteId);
    }
  }

  set(id: PaletteId): void {
    if (!this.isValid(id)) return;
    this.apply(id);
    localStorage.setItem(LocalStorage.THEME, id);
    this.current$.next(id);

    /* Best-effort persist to the user's record; silent on failure. */
    if (this.auth?.currentUser) {
      this.auth.patch({ theme: id }).catch(() => {});
    }
  }

  observe(): Observable<PaletteId> {
    return this.current$.asObservable();
  }

  get value(): PaletteId {
    return this.current$.value;
  }

  meta(id: PaletteId): PaletteMeta {
    return PALETTES.find((p) => p.id === id) || PALETTES[0];
  }

  private isValid(id: string): id is PaletteId {
    return VALID.has(id);
  }

  private apply(id: PaletteId): void {
    const body = document.body;
    Array.from(body.classList)
      .filter((c) => c.startsWith('pal-'))
      .forEach((c) => body.classList.remove(c));
    body.classList.add(`pal-${id}`);
  }
}
