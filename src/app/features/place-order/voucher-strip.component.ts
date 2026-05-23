import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  NgZone,
  OnDestroy,
  ViewChild,
} from '@angular/core';

import { MockVoucher } from './mock-data';

@Component({
  selector: 'app-voucher-strip',
  standalone: false,
  templateUrl: './voucher-strip.component.html',
  styleUrls: ['./voucher-strip.component.scss'],
})
export class VoucherStripComponent implements AfterViewInit, OnDestroy {
  @Input() vouchers: MockVoucher[] = [];

  @ViewChild('chipsScroll') chipsRef?: ElementRef<HTMLDivElement>;

  atStart = true;
  atEnd = true;
  overflows = false;

  private resizeObs?: ResizeObserver;
  private mutObs?: MutationObserver;
  private scrollHandler = () => this.updateEdges();

  constructor(private zone: NgZone) {}

  ngAfterViewInit(): void {
    const el = this.chipsRef?.nativeElement;
    if (!el) return;
    el.addEventListener('scroll', this.scrollHandler, { passive: true });

    /* Re-check overflow whenever the strip's box or its contents change. */
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObs = new ResizeObserver(() => this.zone.run(() => this.updateEdges()));
      this.resizeObs.observe(el);
    }
    if (typeof MutationObserver !== 'undefined') {
      this.mutObs = new MutationObserver(() => this.updateEdges());
      this.mutObs.observe(el, { childList: true, subtree: true });
    }
    queueMicrotask(() => this.updateEdges());
  }

  ngOnDestroy(): void {
    this.chipsRef?.nativeElement.removeEventListener('scroll', this.scrollHandler);
    this.resizeObs?.disconnect();
    this.mutObs?.disconnect();
  }

  scroll(dir: -1 | 1): void {
    const el = this.chipsRef?.nativeElement;
    if (!el) return;
    /* Page by ~80% of the visible width. */
    el.scrollBy({ left: dir * Math.max(160, el.clientWidth * 0.8), behavior: 'smooth' });
  }

  private updateEdges(): void {
    const el = this.chipsRef?.nativeElement;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    this.overflows = max > 1;
    this.atStart = el.scrollLeft <= 1;
    this.atEnd = el.scrollLeft >= max - 1;
  }
}
