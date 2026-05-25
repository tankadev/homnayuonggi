import { Component, Input, OnChanges } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';

export type IconName =
  | 'lock'
  | 'pencil'
  | 'refresh'
  | 'logout'
  | 'plus'
  | 'minus'
  | 'x'
  | 'star'
  | 'star-half'
  | 'pin'
  | 'link'
  | 'ticket'
  | 'cart'
  | 'check'
  | 'clock'
  | 'crown'
  | 'history'
  | 'heart'
  | 'palette'
  | 'chevron'
  | 'chevron-l'
  | 'chevron-r'
  | 'users'
  | 'user'
  | 'wallet'
  | 'trash'
  | 'send'
  | 'globe'
  | 'eye'
  | 'eye-off'
  | 'info'
  | 'copy'
  | 'search'
  | 'arrow-r'
  | 'arrow-l'
  | 'receipt'
  | 'phone'
  | 'truck'
  | 'sparkle'
  | 'card'
  | 'check-circle'
  | 'filter'
  | 'undo'
  | 'bell'
  | 'store'
  | 'arrow-lr'
  | 'calendar'
  | 'trend'
  | 'alert'
  | 'timer'
  | 'at'
  | 'bolt'
  | 'image'
  | 'upload';

const PATHS: Record<IconName, string> = {
  lock: '<rect x="4" y="11" width="16" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  pencil: '<path d="m14 4 6 6-10 10H4v-6Z"/><path d="m13 5 6 6"/>',
  refresh:
    '<path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M3 21v-5h5"/>',
  logout:
    '<path d="M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4"/><path d="m10 16-4-4 4-4"/><path d="M6 12h10"/>',
  plus: '<path d="M12 5v14"/><path d="M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  star: '<path d="M12 2.5l2.9 6.4 7 .7-5.3 4.8 1.6 6.9L12 17.8 5.8 21.3l1.6-6.9L2.1 9.6l7-.7Z"/>',
  'star-half':
    '<defs><linearGradient id="sh-half"><stop offset="50%" stop-color="currentColor"/><stop offset="50%" stop-color="currentColor" stop-opacity="0.18"/></linearGradient></defs><path fill="url(#sh-half)" d="M12 2.5l2.9 6.4 7 .7-5.3 4.8 1.6 6.9L12 17.8 5.8 21.3l1.6-6.9L2.1 9.6l7-.7Z"/>',
  pin: '<path d="M12 21s7-7.6 7-13a7 7 0 1 0-14 0c0 5.4 7 13 7 13Z"/><circle cx="12" cy="8" r="2.5"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1.3 1.3"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7L12.3 17"/>',
  ticket:
    '<path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 0 0 4v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-3a2 2 0 0 0 0-4Z"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="17" cy="20" r="1.5"/><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.3a2 2 0 0 0 2-1.5L20.5 8H6"/>',
  check: '<path d="m5 12 4 4 10-10"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  crown: '<path d="M5 16h14l1.5-9-5 4-3.5-7-3.5 7-5-4Z"/><path d="M5 17.5h14v2H5z"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 3v5h5"/><path d="M12 8v5l3 2"/>',
  heart:
    '<path d="M12 21s-7-4.5-9-9c-1-2 0-6 4-6 2 0 4 1 5 3 1-2 3-3 5-3 4 0 5 4 4 6-2 4.5-9 9-9 9Z"/>',
  palette:
    '<path d="M12 22a10 10 0 1 1 10-10c0 3-3 3-5 3-2 0-2 2-1 3 1 2-1 4-4 4Z"/><circle cx="7.5" cy="11" r="1" fill="currentColor"/><circle cx="12" cy="7" r="1" fill="currentColor"/><circle cx="16.5" cy="11" r="1" fill="currentColor"/>',
  chevron: '<path d="m6 9 6 6 6-6"/>',
  'chevron-l': '<path d="m15 6-6 6 6 6"/>',
  'chevron-r': '<path d="m9 6 6 6-6 6"/>',
  users:
    '<circle cx="8" cy="9" r="3.2"/><circle cx="16" cy="9" r="3.2"/><path d="M2 19c0-3 3-5 6-5s6 2 6 5"/><path d="M22 19c0-2.5-2-4.5-4.5-5"/>',
  user: '<circle cx="12" cy="8" r="3.5"/><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6Z"/>',
  wallet:
    '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="M3 10h18"/><circle cx="17" cy="15" r="1.2" fill="currentColor"/>',
  trash:
    '<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7v12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7"/><path d="M10 12v6M14 12v6"/>',
  send: '<path d="m22 2-11 11"/><path d="M22 2 15 22l-4-9-9-4Z"/>',
  globe:
    '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a13 13 0 0 1 0 18M12 3a13 13 0 0 0 0 18"/>',
  eye: '<path d="M1.5 12s4-7 10.5-7 10.5 7 10.5 7-4 7-10.5 7S1.5 12 1.5 12Z"/><circle cx="12" cy="12" r="3"/>',
  'eye-off':
    '<path d="m3 3 18 18"/><path d="M10.6 6.1A10.7 10.7 0 0 1 12 6c6.5 0 10.5 6 10.5 6a18 18 0 0 1-3.4 4.2"/><path d="M6.6 6.6C3.7 8.4 1.5 12 1.5 12s4 7 10.5 7c1.7 0 3.2-.4 4.6-1"/><path d="M14 14a3 3 0 0 1-4-4"/>',
  info: '<path d="M12 8v.01"/><path d="M11 12h1v5"/><circle cx="12" cy="12" r="9"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3-3"/>',
  'arrow-r': '<path d="M5 12h14"/><path d="m13 5 7 7-7 7"/>',
  'arrow-l': '<path d="M19 12H5"/><path d="m11 19-7-7 7-7"/>',
  receipt:
    '<path d="M5 21V4a1 1 0 0 1 1-1h12a1 1 0 0 1 1 1v17l-3-2-2 2-2-2-2 2-2-2-3 2Z"/><path d="M9 8h6"/><path d="M9 12h6"/><path d="M9 16h3"/>',
  phone: '<path d="M5 4h3l2 5-2 1a12 12 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2Z"/>',
  truck:
    '<path d="M2 8a1 1 0 0 1 1-1h11v10H3a1 1 0 0 1-1-1Z"/><path d="M14 10h4l3 3v4h-7"/><circle cx="7" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  sparkle: '<path d="M12 2l1.6 5.4L19 9l-5.4 1.6L12 16l-1.6-5.4L5 9l5.4-1.6Z"/>',
  card: '<rect x="2" y="6" width="20" height="13" rx="2"/><path d="M2 10h20"/><path d="M6 15h4"/>',
  'check-circle': '<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>',
  filter: '<path d="M3 6h18M6 12h12M10 18h4"/>',
  undo: '<path d="M3 7v6h6"/><path d="M3 13a9 9 0 1 0 3-7.7"/>',
  bell: '<path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z"/><path d="M9 21a3 3 0 0 0 6 0"/>',
  store:
    '<path d="M3 10 5 4h14l2 6"/><path d="M3 10v9a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1v-9"/><path d="M3 10c0 2 2 3 4 3s4-1 4-3M11 10c0 2 2 3 4 3s4-1 4-3"/>',
  'arrow-lr': '<path d="m13 6 5 6-5 6"/><path d="M18 12H4"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="M8 3v4M16 3v4"/>',
  trend: '<path d="m3 17 6-6 4 4 8-8"/>',
  alert: '<path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z"/>',
  timer: '<path d="M10 2h4"/><path d="M12 14V8"/><circle cx="12" cy="14" r="8"/>',
  at: '<circle cx="12" cy="12" r="4"/><path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 9-12h-7Z"/>',
  image:
    '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 17-5-5-9 9"/>',
  upload:
    '<path d="M12 16V4"/><path d="m6 10 6-6 6 6"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/>',
};

@Component({
  selector: 'app-icon',
  standalone: false,
  template: '<span class="icon-host" [innerHTML]="trusted"></span>',
  styles: [
    `
      :host { display: inline-flex; align-items: center; justify-content: center; line-height: 0; color: currentColor; }
      .icon-host { display: inline-flex; line-height: 0; }
      .icon-host > svg { display: block; }
    `,
  ],
})
export class IconComponent implements OnChanges {
  @Input() name: IconName = 'plus';
  @Input() size = 16;
  @Input() sw = 1.75;
  @Input() filled = false;

  trusted: SafeHtml = '';

  constructor(private sanitizer: DomSanitizer) {}

  ngOnChanges(): void {
    const body = PATHS[this.name] || '';
    const sw = this.filled ? 0 : this.sw;
    const fill = this.filled ? 'currentColor' : 'none';
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" width="${this.size}" height="${this.size}" ` +
      `viewBox="0 0 24 24" fill="${fill}" stroke="currentColor" stroke-width="${sw}" ` +
      `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`;
    this.trusted = this.sanitizer.bypassSecurityTrustHtml(svg);
  }
}
