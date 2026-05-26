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
import {
  DeliveryDetailNowAPI,
  Dish,
  MenuInfo,
} from '../../core/ro/delivery-detail-now-api.ro';
import { compressImage } from '../../core/utils/image-compress';

export interface CreateOrderMember {
  id: string;
  name: string;
  initial: string;
  me?: boolean;
}

type WhoMode = 'me' | 'other';
type View = 'empty' | 'form' | 'extracting' | 'review' | 'locked';
type UrlState = 'ok' | 'warn' | 'err' | null;
type InputMode = 'url' | 'images';

interface PickedImage {
  file: File;
  previewUrl: string;
}

export interface EditChoice {
  uid: string;
  label: string;
  price: number;
}

export interface EditDish {
  uid: string;
  name: string;
  price: number;
  choices: EditChoice[];
  /** True if this dish has multiple size/variant choices the user can pick from. */
  hasChoices: boolean;
}

export interface EditSection {
  uid: string;
  name: string;
  dishes: EditDish[];
  collapsed?: boolean;
}

const TIME_PRESETS = [5, 10, 15, 30, 60];
const MAX_IMAGE_FILES = 8;
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

let UID_COUNTER = 1;
const nextUid = (prefix: string) => `${prefix}-${Date.now().toString(36)}-${UID_COUNTER++}`;

/** Fallback shop name when the extractor can't read a name off the menu —
 *  picks a Vietnamese meal label based on the local hour. */
export function defaultMealName(now: Date): string {
  const h = now.getHours();
  if (h >= 5 && h < 10) return 'Đặt đồ ăn sáng';
  if (h >= 10 && h < 13) return 'Đặt đồ ăn trưa';
  if (h >= 13 && h < 16) return 'Đặt ăn xế';
  if (h >= 16 && h < 18) return 'Đặt đồ ăn chiều';
  return 'Đặt đồ ăn tối';
}

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

  inputMode: InputMode = 'url';
  url = '';
  images: PickedImage[] = [];
  imageError: string | null = null;
  isDragging = false;
  minutes = 10;
  whoMode: WhoMode = 'me';
  pickedId: string | null = null;
  touched = false;

  submitting = false;
  errorMsg: string | null = null;

  refreshingApi = false;
  apiRefreshedAt: number | null = null;

  /* ── review-step state ────────────────────────────────────── */
  /** Loading sub-state shown while view === 'extracting'. */
  extractStage: 'compressing' | 'uploading' | 'analyzing' = 'analyzing';
  /** Editable shop name shown on review screen. */
  reviewShopName = '';
  reviewShopAddress = '';
  /** Editable menu sections — rebuilt every time the user goes back through extract. */
  reviewSections: EditSection[] = [];
  /** Compressed dataURLs of source images, used both for review preview and RTDB embed. */
  reviewMenuPhotos: string[] = [];
  /** Lightbox state for the review-step image strip. */
  reviewLightboxSrc: string | null = null;

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
    this.resetImages();
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
    const sourceReady =
      this.inputMode === 'url'
        ? !!this.url.trim() && this.urlState !== 'err'
        : this.images.length > 0;
    return (
      sourceReady &&
      this.minutes >= 1 &&
      this.minutes <= 180 &&
      !!this.orderer &&
      !this.submitting
    );
  }

  get maxImages(): number {
    return MAX_IMAGE_FILES;
  }

  get canCommit(): boolean {
    if (this.submitting) return false;
    if (!this.reviewShopName.trim()) return false;
    if (!this.reviewSections.length) return false;
    return this.reviewSections.some((s) => s.dishes.length > 0);
  }

  get reviewDishCount(): number {
    return this.reviewSections.reduce((n, s) => n + s.dishes.length, 0);
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
    this.resetImages();
    this.resetReview();
    this.url = '';
    this.inputMode = 'url';
    if (key) {
      try {
        await this.flow.releaseEdit(key);
      } catch {
        /* swallow */
      }
    }
  }

  /** Review screen "Quay lại" button — go back to the form, keep the lock. */
  backToForm(): void {
    if (this.submitting) return;
    this.view = 'form';
    this.errorMsg = null;
  }

  /* ── input mode + image handling ──────────────────────────── */
  setInputMode(m: InputMode): void {
    if (this.inputMode === m) return;
    this.inputMode = m;
    this.imageError = null;
    this.errorMsg = null;
  }

  onPickImages(ev: Event): void {
    const input = ev.target as HTMLInputElement;
    const list = input.files;
    if (list && list.length) this.addFiles(Array.from(list));
    input.value = '';
  }

  onDragOver(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging = true;
  }

  onDragLeave(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging = false;
  }

  onDropImages(ev: DragEvent): void {
    ev.preventDefault();
    this.isDragging = false;
    const list = ev.dataTransfer?.files;
    if (list && list.length) this.addFiles(Array.from(list));
  }

  removeImage(idx: number): void {
    const [removed] = this.images.splice(idx, 1);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
  }

  private addFiles(files: File[]): void {
    this.imageError = null;
    for (const f of files) {
      if (this.images.length >= MAX_IMAGE_FILES) {
        this.imageError = `Tối đa ${MAX_IMAGE_FILES} ảnh`;
        break;
      }
      if (!f.type.startsWith('image/')) {
        this.imageError = 'Chỉ chấp nhận tệp ảnh (JPG, PNG, …)';
        continue;
      }
      if (f.size > MAX_IMAGE_BYTES) {
        this.imageError = `Ảnh "${f.name}" vượt quá 10MB`;
        continue;
      }
      this.images.push({ file: f, previewUrl: URL.createObjectURL(f) });
    }
  }

  private resetImages(): void {
    for (const img of this.images) URL.revokeObjectURL(img.previewUrl);
    this.images = [];
    this.imageError = null;
    this.isDragging = false;
  }

  trackByImage = (i: number, img: PickedImage) => `${img.file.name}:${img.file.size}:${i}`;

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

  /** Form "Xác nhận" → URL flow commits straight from the scraper; images go through review. */
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

    this.submitting = true;
    this.view = 'extracting';
    try {
      if (this.inputMode === 'url') {
        this.extractStage = 'analyzing';
        const scraped = await this.flow.extractFromUrl({ url: this.url.trim() });
        await this.commitScrapedDirect(scraped);
        return;
      }
      /* Compress first so we POST smaller files AND save the dataURL for embed. */
      this.extractStage = 'compressing';
      const compressed = await Promise.all(this.images.map((p) => compressImage(p.file)));
      const photos = compressed.map((c) => c.dataUrl);
      this.extractStage = 'uploading';
      const scraped = await this.flow.extractFromImages({ files: compressed.map((c) => c.file) });
      this.populateReview(scraped, photos);
      this.view = 'review';
    } catch (e: any) {
      this.errorMsg = e?.message || 'Không trích xuất được menu. Thử lại?';
      this.view = 'form';
    } finally {
      this.submitting = false;
    }
  }

  /** URL flow: commit the scraped payload directly, skipping the review step. */
  private async commitScrapedDirect(scraped: DeliveryDetailNowAPI): Promise<void> {
    const orderer = this.orderer;
    if (!orderer) {
      this.errorMsg = 'Chưa chọn người đứng tên đặt hàng.';
      this.view = 'form';
      return;
    }
    const key = this.myDeliveryKey;
    if (!key) {
      this.errorMsg = 'Đã mất phiên tạo bình chọn. Vui lòng đóng và mở lại.';
      this.view = 'form';
      return;
    }
    this.myDeliveryKey = null;
    try {
      await this.flow.commitDelivery(key, {
        scraped,
        minutes: this.minutes,
        ordererKey: orderer.id,
      });
      this.showToast(orderer.name, !!orderer.me, this.minutes);
      this.resetImages();
      this.resetReview();
      this.url = '';
      this.inputMode = 'url';
      this.view = 'empty';
      this.created.emit();
    } catch (e: any) {
      this.myDeliveryKey = key;
      this.errorMsg = e?.message || 'Không tạo được bình chọn. Thử lại?';
      this.view = 'form';
    }
  }

  /** Review "Tạo bình chọn" → commit the edited menu + photos. */
  async confirmReview(): Promise<void> {
    this.errorMsg = null;
    if (!this.canCommit) {
      this.errorMsg = 'Vui lòng nhập tên quán và thêm ít nhất 1 món.';
      return;
    }
    if (!this.myDeliveryKey) {
      this.errorMsg = 'Đã mất phiên tạo bình chọn. Vui lòng đóng và mở lại.';
      return;
    }
    const orderer = this.orderer;
    if (!orderer) {
      this.errorMsg = 'Chưa chọn người đứng tên đặt hàng.';
      return;
    }

    /* Detach key BEFORE await — same reason as before: Firebase broadcasts the
       isCreate:true update and AppComponent can destroy this component mid-commit. */
    const key = this.myDeliveryKey;
    this.myDeliveryKey = null;

    this.submitting = true;
    try {
      await this.flow.commitDelivery(key, {
        scraped: this.buildScrapedFromReview(),
        menuPhotos: this.reviewMenuPhotos.length ? this.reviewMenuPhotos : undefined,
        minutes: this.minutes,
        ordererKey: orderer.id,
      });
      this.showToast(orderer.name, !!orderer.me, this.minutes);
      this.resetImages();
      this.resetReview();
      this.url = '';
      this.inputMode = 'url';
      this.view = 'empty';
      this.created.emit();
    } catch (e: any) {
      this.myDeliveryKey = key;
      this.errorMsg = e?.message || 'Không tạo được bình chọn. Thử lại?';
    } finally {
      this.submitting = false;
    }
  }

  /* ── review-step editors ──────────────────────────────────── */
  addSection(): void {
    this.reviewSections.push({
      uid: nextUid('sec'),
      name: 'Mục mới',
      dishes: [{ uid: nextUid('dish'), name: '', price: 0, choices: [], hasChoices: false }],
    });
  }

  removeSection(idx: number): void {
    this.reviewSections.splice(idx, 1);
  }

  toggleSection(s: EditSection): void {
    s.collapsed = !s.collapsed;
  }

  addDish(s: EditSection): void {
    s.dishes.push({ uid: nextUid('dish'), name: '', price: 0, choices: [], hasChoices: false });
    s.collapsed = false;
  }

  removeDish(s: EditSection, idx: number): void {
    s.dishes.splice(idx, 1);
  }

  toggleDishChoices(d: EditDish): void {
    d.hasChoices = !d.hasChoices;
    if (d.hasChoices && d.choices.length === 0) {
      d.choices = [
        { uid: nextUid('opt'), label: 'Nhỏ', price: d.price || 0 },
        { uid: nextUid('opt'), label: 'Lớn', price: d.price || 0 },
      ];
    }
  }

  addChoice(d: EditDish): void {
    d.choices.push({ uid: nextUid('opt'), label: '', price: d.price || 0 });
  }

  removeChoice(d: EditDish, idx: number): void {
    d.choices.splice(idx, 1);
    if (d.choices.length === 0) d.hasChoices = false;
  }

  openLightbox(src: string): void {
    this.reviewLightboxSrc = src;
  }

  closeLightbox(): void {
    this.reviewLightboxSrc = null;
  }

  trackBySection = (_: number, s: EditSection) => s.uid;
  trackByDish = (_: number, d: EditDish) => d.uid;
  trackByChoice = (_: number, c: EditChoice) => c.uid;
  trackByPhoto = (i: number, _: string) => i;

  /* ── review <-> API conversion ────────────────────────────── */

  /** Map a scraped API payload to the editable review state. */
  private populateReview(api: DeliveryDetailNowAPI, photos: string[]): void {
    this.reviewShopName = (api.name || '').trim() || defaultMealName(new Date());
    this.reviewShopAddress = api.address || '';
    this.reviewMenuPhotos = photos;
    this.reviewSections = (api.menus || []).map((m) => ({
      uid: nextUid('sec'),
      name: m.name || 'Thực đơn',
      dishes: (m.dishes || []).map((d) => this.toEditDish(d)),
    }));
    /* If the extractor gave us nothing usable, seed an empty section so the user has
       somewhere to start typing instead of staring at a blank screen. */
    if (!this.reviewSections.length) {
      this.reviewSections = [
        {
          uid: nextUid('sec'),
          name: 'Thực đơn',
          dishes: [
            { uid: nextUid('dish'), name: '', price: 0, choices: [], hasChoices: false },
          ],
        },
      ];
    }
  }

  private toEditDish(d: Dish): EditDish {
    const basePrice = this.dishBasePrice(d);
    const sizeGroup = this.findSizeOptionGroup(d);
    const choices: EditChoice[] = (sizeGroup?.choices || []).map((c: any) => ({
      uid: nextUid('opt'),
      label: String(c.label ?? c.name ?? ''),
      price: Number(c.absolutePrice ?? c.price ?? basePrice) || 0,
    }));
    return {
      uid: nextUid('dish'),
      name: d.name || '',
      price: basePrice,
      choices,
      hasChoices: choices.length > 0,
    };
  }

  private dishBasePrice(d: Dish): number {
    const p: any = d.price;
    if (!p) return 0;
    if (typeof p === 'number') return p;
    return Number(p.value ?? p.minValue ?? 0) || 0;
  }

  private findSizeOptionGroup(d: Dish): any | null {
    const opts: any[] = (d.options as any) || [];
    if (!Array.isArray(opts) || !opts.length) return null;
    return opts.find((o) => Array.isArray(o?.choices) && o.choices.length) || null;
  }

  /** Rebuild a DeliveryDetailNowAPI shape from the (edited) review state. */
  private buildScrapedFromReview(): DeliveryDetailNowAPI {
    let dishId = 1;
    const menus: MenuInfo[] = this.reviewSections
      .filter((s) => s.dishes.length > 0)
      .map((s, idx) => ({
        id: idx + 1,
        name: s.name.trim() || `Mục ${idx + 1}`,
        dishes: s.dishes.map((d) => this.buildDish(d, dishId++)),
      }));

    /* Build the payload by only setting optional fields when they have a value —
       Firebase RTDB rejects `undefined` anywhere in the write tree. */
    const scraped: any = {
      result: 'success',
      name: this.reviewShopName.trim(),
      menus,
      voucher: [],
      photos: [],
    };
    const address = this.reviewShopAddress.trim();
    if (address) scraped.address = address;
    return scraped as DeliveryDetailNowAPI;
  }

  private buildDish(d: EditDish, id: number): Dish {
    const hasChoices = d.hasChoices && d.choices.length > 0;
    const prices = hasChoices ? d.choices.map((c) => c.price || 0) : [d.price || 0];
    const minValue = Math.min(...prices);
    const maxValue = Math.max(...prices);
    const value = minValue;
    const text = minValue === maxValue ? `${minValue}` : `${minValue}-${maxValue}`;
    const dish: any = {
      id,
      name: d.name.trim() || `Món ${id}`,
      photos: [],
      description: null,
      discountPrice: null,
      price: { text, unit: 'VND', value, minValue: hasChoices ? minValue : null, maxValue: hasChoices ? maxValue : null },
      options: hasChoices
        ? [
            {
              name: 'Size',
              type: 'single',
              required: true,
              choices: d.choices.map((c) => ({
                label: c.label.trim() || 'Lựa chọn',
                priceDelta: null,
                absolutePrice: c.price || 0,
              })),
            },
          ]
        : [],
      hasSize: hasChoices,
      totalLike: null,
      isActive: null,
      isAvailable: null,
      isDelete: null,
      warnings: [],
    };
    return dish as Dish;
  }

  private resetReview(): void {
    this.reviewShopName = '';
    this.reviewShopAddress = '';
    this.reviewSections = [];
    this.reviewMenuPhotos = [];
    this.reviewLightboxSrc = null;
    this.extractStage = 'analyzing';
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
      if (this.view === 'locked') this.view = 'empty';
      return;
    }

    /* Someone is editing — is it us? */
    if (editing.userCreate === me) {
      this.myDeliveryKey = editing.key;
      /* Don't kick the orderer out of review/extracting back to form — only seed view
         when nothing meaningful is happening yet. */
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
