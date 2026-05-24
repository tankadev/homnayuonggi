import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export type ToastVariant = 'info' | 'success' | 'warning' | 'error';

export interface Toast {
  id: number;
  message: string;
  variant: ToastVariant;
  /** ms until auto-dismiss. */
  duration: number;
}

/**
 * Lightweight in-memory toast queue. Components inject the service and call
 * show(); a global <app-toast-container> in app.component renders the queue.
 *
 * Toasts auto-dismiss after `duration` ms; manual dismiss is also available
 * for an explicit close button or programmatic clear.
 */
@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  private toasts$ = new BehaviorSubject<Toast[]>([]);

  show(message: string, opts: { variant?: ToastVariant; duration?: number } = {}): number {
    const toast: Toast = {
      id: ++this.nextId,
      message,
      variant: opts.variant ?? 'info',
      duration: opts.duration ?? 3500,
    };
    this.toasts$.next([...this.toasts$.value, toast]);
    /* Auto-dismiss is purely time-based — the toast container also drives a
       progress-bar countdown bound to the same duration so the visual matches. */
    window.setTimeout(() => this.dismiss(toast.id), toast.duration);
    return toast.id;
  }

  success(message: string, duration?: number): number {
    return this.show(message, { variant: 'success', duration });
  }
  error(message: string, duration?: number): number {
    return this.show(message, { variant: 'error', duration });
  }
  warn(message: string, duration?: number): number {
    return this.show(message, { variant: 'warning', duration });
  }
  info(message: string, duration?: number): number {
    return this.show(message, { variant: 'info', duration });
  }

  dismiss(id: number): void {
    this.toasts$.next(this.toasts$.value.filter((t) => t.id !== id));
  }

  observe(): Observable<Toast[]> {
    return this.toasts$.asObservable();
  }
}
