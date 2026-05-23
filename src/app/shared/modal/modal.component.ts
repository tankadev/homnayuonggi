import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnDestroy,
  OnInit,
  Output,
} from '@angular/core';

export type ModalSize = 'sm' | 'md' | 'lg';

@Component({
  selector: 'app-modal',
  standalone: false,
  template: `
    <div class="modal-backdrop" (mousedown)="onBackdrop($event)">
      <div class="modal" [class.modal-sm]="size === 'sm'" [class.modal-lg]="size === 'lg'" (mousedown)="$event.stopPropagation()">
        <ng-content></ng-content>
      </div>
    </div>
  `,
})
export class ModalComponent implements OnInit, OnDestroy {
  @Input() size: ModalSize = 'md';
  @Input() dismissable = true;
  @Output() closed = new EventEmitter<void>();

  private prevOverflow = '';

  ngOnInit(): void {
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.prevOverflow;
  }

  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.dismissable) this.closed.emit();
  }

  onBackdrop(e: MouseEvent): void {
    if (this.dismissable && e.target === e.currentTarget) this.closed.emit();
  }
}
