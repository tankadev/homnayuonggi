import { Component, Input } from '@angular/core';

/**
 * Lightweight skeleton placeholder block used during RTDB roundtrip waits.
 * Drop it inline anywhere a real value will appear — sized via inputs to
 * roughly match the eventual content's footprint.
 *
 *   <app-skeleton width="60%" height="14px"></app-skeleton>
 *   <app-skeleton width="40px" height="40px" radius="50%"></app-skeleton>
 *
 * The shimmer keyframe is defined globally in styles/animations.scss.
 */
@Component({
  selector: 'app-skeleton',
  standalone: false,
  template: `<span
    class="sk-block"
    [style.width]="width"
    [style.height]="height"
    [style.borderRadius]="radius"
  ></span>`,
  styles: [
    `
      :host {
        display: inline-block;
        line-height: 0;
      }
      .sk-block {
        display: inline-block;
        background:
          linear-gradient(
            90deg,
            var(--surface-2) 0%,
            color-mix(in oklab, var(--surface-2) 55%, var(--line)) 50%,
            var(--surface-2) 100%
          );
        background-size: 200% 100%;
        animation: skeleton-shimmer 1.4s ease-in-out infinite;
      }
    `,
  ],
})
export class SkeletonComponent {
  @Input() width = '100%';
  @Input() height = '14px';
  @Input() radius = '6px';
}
