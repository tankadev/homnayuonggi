import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { combineLatest, Subscription } from 'rxjs';

import { UserService } from '../../core/services/user.service';
import { DeliveryService } from '../../core/services/delivery.service';
import { AuthService } from '../../core/services/auth.service';
import { ConfigService } from '../../core/services/config.service';
import { OrderFlowService } from '../../core/services/order-flow.service';
import { RoomRO } from '../../core/ro/room.ro';
import { UserRO } from '../../core/ro/user.ro';
import { DeliveryRO } from '../../core/ro/delivery.ro';

export interface CreateOrderMember {
  id: string;
  name: string;
  initial: string;
  me?: boolean;
}

type WhoMode = 'me' | 'other';
type View = 'empty' | 'form' | 'locked';
type UrlState = 'ok' | 'warn' | 'err' | null;

const TIME_PRESETS = [5, 10, 15, 30, 60];

@Component({
  selector: 'app-create-order-page',
  standalone: false,
  templateUrl: './create-order-page.component.html',
  styleUrls: ['./create-order-page.component.scss'],
})
export class CreateOrderPageComponent implements OnInit, OnDestroy {
  @Input() room: RoomRO | null = null;
  @Output() created = new EventEmitter<void>();

  readonly presets = TIME_PRESETS;

  members: CreateOrderMember[] = [];
  view: View = 'empty';

  url = '';
  minutes = 10;
  whoMode: WhoMode = 'me';
  pickedId: string | null = null;
  touched = false;

  submitting = false;
  errorMsg: string | null = null;

  refreshingApi = false;
  apiRefreshedAt: number | null = null;

  toast: { ordererName: string; ordererIsMe: boolean; minutes: number } | null = null;
  private toastTimer?: number;

  /** Delivery key we're currently editing — set on cup-click, cleared on cancel/submit. */
  private myDeliveryKey: string | null = null;
  /** Delivery currently in progress for this room (could be ours or someone else's). */
  private currentDelivery: DeliveryRO | null = null;
  /** Map userId → display name for the "X đang tạo bình chọn" overlay. */
  private userNameMap: Record<string, string> = {};

  private sub?: Subscription;

  constructor(
    private userService: UserService,
    private deliveryService: DeliveryService,
    private auth: AuthService,
    private flow: OrderFlowService,
    private config: ConfigService,
  ) {}

  async onRefreshApi(): Promise<void> {
    if (this.refreshingApi) return;
    this.refreshingApi = true;
    try {
      await this.config.refresh();
      this.apiRefreshedAt = Date.now();
    } finally {
      this.refreshingApi = false;
    }
  }

  ngOnInit(): void {
    this.sub = combineLatest([
      this.userService.getAll(),
      this.deliveryService.getAll(),
    ]).subscribe({
      next: ([users, deliveries]) => {
        this.userNameMap = {};
        for (const u of users) this.userNameMap[u.key] = u.displayName || u.username || '?';
        this.members = this.toMemberList(users);
        if (this.whoMode === 'other' && !this.pickedId) {
          this.pickedId = this.others[0]?.id || null;
        }
        this.applyDelivery(deliveries);
      },
      error: () => {
        this.members = this.toMemberList([]);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    /* If we navigate away while still editing, release the lock so the room isn't blocked. */
    if (this.myDeliveryKey) {
      const key = this.myDeliveryKey;
      this.myDeliveryKey = null;
      this.flow.releaseEdit(key).catch(() => {});
    }
    this.sub?.unsubscribe();
  }

  get roomName(): string {
    return this.room?.name || '';
  }

  get me(): CreateOrderMember {
    return this.members.find((m) => m.me) || this.members[0];
  }

  get others(): CreateOrderMember[] {
    return this.members.filter((m) => !m.me);
  }

  get pickedMember(): CreateOrderMember | undefined {
    return this.others.find((m) => m.id === this.pickedId);
  }

  get selectAvatarLabel(): string {
    return this.pickedMember?.initial || '?';
  }

  get urlState(): UrlState {
    if (!this.url.trim()) return null;
    try {
      const u = new URL(this.url.trim());
      if (u.hostname.includes('shopeefood') || u.hostname.includes('foody')) return 'ok';
      return 'warn';
    } catch {
      return 'err';
    }
  }

  get orderer(): CreateOrderMember | null {
    if (this.whoMode === 'me') return this.me;
    return this.pickedMember || null;
  }

  get canSubmit(): boolean {
    return (
      !!this.url.trim() &&
      this.urlState !== 'err' &&
      this.minutes >= 1 &&
      this.minutes <= 180 &&
      !!this.orderer &&
      !this.submitting
    );
  }

  /** Name of whoever else is currently editing (for the locked overlay). */
  get lockOwnerName(): string {
    if (!this.currentDelivery?.userCreate) return 'Một thành viên';
    return this.userNameMap[this.currentDelivery.userCreate] || 'Một thành viên';
  }

  /* ── view transitions ─────────────────────────────────────── */

  /** Cup click — claim the editing lock, then open the form. */
  async openForm(): Promise<void> {
    if (this.submitting) return;
    if (this.view === 'locked') return;
    /* Already locked by ourselves (e.g. coming back from a transient state) → just open. */
    if (this.myDeliveryKey) {
      this.view = 'form';
      this.errorMsg = null;
      return;
    }
    if (!this.room) {
      this.errorMsg = 'Chưa chọn phòng — vui lòng quay lại danh sách phòng.';
      return;
    }
    const creator = this.auth.currentUser;
    if (!creator) {
      this.errorMsg = 'Phiên đăng nhập đã hết — vui lòng đăng nhập lại.';
      return;
    }
    this.submitting = true;
    try {
      const key = await this.flow.claimEdit(this.room.key, creator.key);
      this.myDeliveryKey = key;
      this.view = 'form';
      this.errorMsg = null;
    } catch (e: any) {
      this.errorMsg = e?.message || 'Không thể tạo bình chọn ngay lúc này. Thử lại?';
    } finally {
      this.submitting = false;
    }
  }

  /** Cancel form — release the lock and return to empty state. */
  async cancelForm(): Promise<void> {
    if (this.submitting) return;
    const key = this.myDeliveryKey;
    this.myDeliveryKey = null;
    this.view = 'empty';
    this.touched = false;
    this.errorMsg = null;
    if (key) {
      try {
        await this.flow.releaseEdit(key);
      } catch {
        /* swallow */
      }
    }
  }

  /* ── field handlers ───────────────────────────────────────── */
  setWhoMode(m: WhoMode): void {
    this.whoMode = m;
    if (m === 'me') {
      this.pickedId = null;
    } else if (!this.pickedId) {
      this.pickedId = this.others[0]?.id || null;
    }
  }

  setMinutes(value: number | string): void {
    const n = Math.max(0, Math.min(180, Number(value) || 0));
    this.minutes = n;
  }

  setPreset(p: number): void {
    this.minutes = p;
  }

  clearUrl(): void {
    this.url = '';
  }

  async submit(): Promise<void> {
    this.touched = true;
    this.errorMsg = null;
    if (!this.canSubmit) return;
    if (!this.room) {
      this.errorMsg = 'Chưa chọn phòng — vui lòng quay lại danh sách phòng.';
      return;
    }
    if (!this.myDeliveryKey) {
      this.errorMsg = 'Đã mất phiên tạo bình chọn. Vui lòng đóng và mở lại.';
      return;
    }
    const orderer = this.orderer!;

    /* Detach the key BEFORE awaiting commit. Firebase will broadcast the update to
       AppComponent's deliverySub, which can destroy this component mid-await — if
       myDeliveryKey is still set when ngOnDestroy runs, it would release (delete) the
       freshly-committed delivery and bounce us back to the create-order screen. */
    const key = this.myDeliveryKey;
    this.myDeliveryKey = null;

    this.submitting = true;
    try {
      await this.flow.commitDelivery(key, {
        url: this.url.trim(),
        minutes: this.minutes,
        ordererKey: orderer.id,
      });
      this.showToast(orderer.name, !!orderer.me, this.minutes);
      this.view = 'empty';
      this.created.emit();
    } catch (e: any) {
      /* Restore the key so cancel/retry still releases the lock cleanly. */
      this.myDeliveryKey = key;
      this.errorMsg = e?.message || 'Không tạo được bình chọn. Thử lại?';
    } finally {
      this.submitting = false;
    }
  }

  /* ── live delivery state ───────────────────────────────────── */

  /** Decide view state from the latest deliveries snapshot. */
  private applyDelivery(all: DeliveryRO[]): void {
    if (!this.room) {
      this.currentDelivery = null;
      return;
    }
    const me = this.auth.currentUser?.key ?? null;
    const forRoom = all.filter((d) => d.roomKey === this.room!.key);
    /* Editing record (someone clicked the cup but hasn't committed yet). */
    const editing = forRoom.find((d) => d.isEdit === true && d.isCreate !== true);
    this.currentDelivery = editing || null;

    if (!editing) {
      /* Lock released by whoever held it. If we were locked-out, return to empty. */
      if (this.view === 'locked') this.view = 'empty';
      return;
    }

    /* Someone is editing — is it us? */
    if (editing.userCreate === me) {
      /* Our own lock — if we just rebooted and reopened the page, restore the form view. */
      this.myDeliveryKey = editing.key;
      if (this.view === 'empty') this.view = 'form';
      return;
    }

    /* Locked by someone else. */
    this.view = 'locked';
  }

  /* ── toast ─────────────────────────────────────────────────── */
  private showToast(name: string, isMe: boolean, minutes: number): void {
    this.toast = { ordererName: name, ordererIsMe: isMe, minutes };
    if (this.toastTimer !== undefined) window.clearTimeout(this.toastTimer);
    this.toastTimer = window.setTimeout(() => (this.toast = null), 3200);
  }

  /* ── helpers ───────────────────────────────────────────────── */
  private toMemberList(users: UserRO[]): CreateOrderMember[] {
    const me = this.auth.currentUser;
    const list: CreateOrderMember[] = [];
    if (me) {
      list.push({
        id: me.key,
        name: me.displayName || me.username || 'Bạn',
        initial: (me.displayName || me.username || '?').charAt(0).toUpperCase(),
        me: true,
      });
    }
    for (const u of users) {
      if (me && u.key === me.key) continue;
      list.push({
        id: u.key,
        name: u.displayName || u.username || '(không tên)',
        initial: (u.displayName || u.username || '?').charAt(0).toUpperCase(),
      });
    }
    return list;
  }

  trackByMember = (_: number, m: CreateOrderMember) => m.id;
}
