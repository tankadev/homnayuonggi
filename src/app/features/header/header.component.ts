import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';
import { animate, keyframes, style, transition, trigger } from '@angular/animations';
import { combineLatest, Subscription } from 'rxjs';

import { UserRO } from '../../core/ro/user.ro';
import { RoomRO } from '../../core/ro/room.ro';
import { LocalStorageService } from '../../core/services/localstorage.service';
import { PaymentPaidService } from '../../core/services/payment-paid.service';
import { DeliveryService } from '../../core/services/delivery.service';

export type HeaderMode = 'welcome' | 'rooms' | 'create-order' | 'place-order' | 'payment-review' | 'history';

@Component({
  selector: 'app-header',
  standalone: false,
  templateUrl: './header.component.html',
  styleUrls: ['./header.component.scss'],
  animations: [
    trigger('bump', [
      transition('* => *', [
        animate('480ms cubic-bezier(.34, 1.56, .64, 1)', keyframes([
          style({ transform: 'scale(1)', offset: 0 }),
          style({ transform: 'scale(1.45)', offset: 0.35 }),
          style({ transform: 'scale(0.92)', offset: 0.7 }),
          style({ transform: 'scale(1)', offset: 1 }),
        ])),
      ]),
    ]),
  ],
})
export class HeaderComponent implements OnInit, OnChanges, OnDestroy {
  @Input() user: UserRO | null = null;
  @Input() room: RoomRO | null = null;
  @Input() mode: HeaderMode = 'rooms';

  @Output() leaveRoom = new EventEmitter<void>();
  @Output() logout = new EventEmitter<void>();
  @Output() editRoom = new EventEmitter<void>();
  @Output() login = new EventEmitter<void>();
  @Output() openHistory = new EventEmitter<void>();
  @Output() backToRooms = new EventEmitter<void>();

  unpaidCount = 0;
  /** Increments each time the count goes up — drives the bump animation key. */
  bumpKey = 0;
  private prevCount = 0;
  private sub?: Subscription;

  constructor(
    private storage: LocalStorageService,
    private paymentPaidService: PaymentPaidService,
    private deliveryService: DeliveryService,
  ) {}

  ngOnInit(): void {
    this.subscribeUnpaid();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['user']) this.subscribeUnpaid();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private subscribeUnpaid(): void {
    this.sub?.unsubscribe();
    const meKey = this.user?.key;
    if (!meKey) {
      this.setCount(0);
      return;
    }
    this.sub = combineLatest([
      this.paymentPaidService.getAll(),
      this.deliveryService.getAll(),
    ]).subscribe(([payments, deliveries]) => {
      /* Exclude payments whose delivery is still in payment-review — same rule as
         the history list, otherwise the badge would flash a count for an order
         that isn't even visible in history yet. */
      const inReview = new Set(
        deliveries.filter((d) => d.isCompleted === true).map((d) => d.key),
      );
      const count = payments.filter((p) => {
        if (inReview.has(p.deliveryId)) return false;
        if (p.userOrderId === meKey) {
          /* I'm the orderer — count if anyone other than me hasn't paid. */
          return (p.usersPaid || []).some((u) => u.userId !== meKey && !u.isPaid);
        }
        /* I'm a payer — count if my own row is still unpaid. */
        return (p.usersPaid || []).some((u) => u.userId === meKey && !u.isPaid);
      }).length;
      this.setCount(count);
    });
  }

  private setCount(n: number): void {
    if (n > this.prevCount) this.bumpKey++;
    this.prevCount = n;
    this.unpaidCount = n;
  }

  onLeaveRoom(): void {
    this.storage.quitRoom();
    this.leaveRoom.emit();
  }

  onLogout(): void {
    this.storage.removeAll();
    this.logout.emit();
  }

  get roomName(): string {
    return this.room?.name ?? 'Chưa chọn phòng';
  }

  get isPrivate(): boolean {
    return !!this.room?.isPrivate;
  }

  get canEditRoom(): boolean {
    return !!this.user && !!this.room && this.room.createUser === this.user.key;
  }

  get isLoggedIn(): boolean {
    return !!this.user;
  }

  /** History mode is cross-room — bypass the room pill and show a personal subtitle. */
  get isHistory(): boolean {
    return this.mode === 'history';
  }

  get brandSubtitle(): string {
    if (this.isHistory) return 'Lịch sử thanh toán · cá nhân';
    return 'Nguồn dữ liệu · ShopeeFood';
  }
}
