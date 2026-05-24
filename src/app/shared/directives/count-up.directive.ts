import { Directive, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChanges } from '@angular/core';

/**
 * Animates the host element's text content from the previous numeric value
 * to a new target over a short duration. Designed for balance / count
 * displays that want to "tick up" rather than snap to the final value.
 *
 * Usage:
 *   <span [appCountUp]="balance.totalOwedToMe"></span><span>đ</span>
 *
 * The host's text content is fully owned by the directive — don't combine
 * with Angular text interpolation on the same element.
 */
@Directive({ selector: '[appCountUp]', standalone: false })
export class CountUpDirective implements OnInit, OnChanges, OnDestroy {
  @Input('appCountUp') value: number | null | undefined = 0;
  @Input() countUpDuration = 600;

  private current = 0;
  private rafId = 0;

  constructor(private host: ElementRef<HTMLElement>) {}

  ngOnInit(): void {
    /* Paint "0" synchronously so the span reserves layout space before the
       first rAF tick — otherwise sibling text shifts as the span fills in. */
    this.current = 0;
    this.render();
    this.animateTo(this.numericValue());
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['value'] && !changes['value'].firstChange) {
      this.animateTo(this.numericValue());
    }
  }

  ngOnDestroy(): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
  }

  private numericValue(): number {
    return Number.isFinite(Number(this.value)) ? Number(this.value) : 0;
  }

  private animateTo(target: number): void {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    const start = this.current;
    const startTime = performance.now();
    const dur = Math.max(50, this.countUpDuration);
    const step = (now: number) => {
      const t = Math.min(1, (now - startTime) / dur);
      /* ease-out cubic — fast in, settles softly at the target. */
      const eased = 1 - Math.pow(1 - t, 3);
      this.current = start + (target - start) * eased;
      this.render();
      if (t < 1) this.rafId = requestAnimationFrame(step);
      else this.rafId = 0;
    };
    this.rafId = requestAnimationFrame(step);
  }

  private render(): void {
    this.host.nativeElement.textContent = Math.round(this.current).toLocaleString('vi-VN');
  }
}
