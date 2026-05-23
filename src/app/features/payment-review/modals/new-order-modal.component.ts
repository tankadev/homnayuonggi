import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-new-order-modal',
  standalone: false,
  templateUrl: './new-order-modal.component.html',
  styleUrls: ['./new-order-modal.component.scss'],
})
export class NewOrderModalComponent {
  @Input() roomName = '';
  @Input() memberCount = 0;
  @Input() shopName = '';
  @Input() previousTotal = 0;

  @Output() confirm = new EventEmitter<void>();
  @Output() closed = new EventEmitter<void>();
}
