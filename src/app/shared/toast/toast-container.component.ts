import { Component, OnDestroy, OnInit } from '@angular/core';
import { animate, style, transition, trigger } from '@angular/animations';
import { Subscription } from 'rxjs';

import { Toast, ToastService } from '../../core/services/toast.service';

/**
 * Global toast outlet rendered once in app.component. Subscribes to
 * ToastService and stacks active toasts at the top of the viewport.
 *
 * Each toast slides in from above on :enter and slides back out on :leave;
 * a progress bar at the bottom shrinks over the toast's duration so the
 * countdown is visible.
 */
@Component({
  selector: 'app-toast-container',
  standalone: false,
  template: `
    <div class="toasts" aria-live="polite">
      <div
        *ngFor="let t of toasts; trackBy: trackById"
        @toast
        class="toast"
        [class.toast-success]="t.variant === 'success'"
        [class.toast-error]="t.variant === 'error'"
        [class.toast-warning]="t.variant === 'warning'"
        role="status"
      >
        <span class="toast-msg">{{ t.message }}</span>
        <button type="button" class="toast-close" (click)="dismiss(t.id)" aria-label="Đóng">×</button>
        <span class="toast-progress" [style.animation-duration.ms]="t.duration"></span>
      </div>
    </div>
  `,
  styleUrls: ['./toast-container.component.scss'],
  animations: [
    trigger('toast', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(-12px) scale(0.96)' }),
        animate(
          '260ms cubic-bezier(.34, 1.56, .64, 1)',
          style({ opacity: 1, transform: 'translateY(0) scale(1)' }),
        ),
      ]),
      transition(':leave', [
        animate(
          '200ms cubic-bezier(.4, 0, 1, 1)',
          style({ opacity: 0, transform: 'translateY(-8px) scale(0.96)' }),
        ),
      ]),
    ]),
  ],
})
export class ToastContainerComponent implements OnInit, OnDestroy {
  toasts: Toast[] = [];
  private sub?: Subscription;

  constructor(private toast: ToastService) {}

  ngOnInit(): void {
    this.sub = this.toast.observe().subscribe((list) => (this.toasts = list));
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  dismiss(id: number): void {
    this.toast.dismiss(id);
  }

  trackById = (_: number, t: Toast) => t.id;
}
