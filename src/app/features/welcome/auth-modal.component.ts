import { AfterViewInit, Component, ElementRef, EventEmitter, Input, OnInit, OnDestroy, Output, ViewChild } from '@angular/core';

import { AuthError, AuthService } from '../../core/services/auth.service';
import { UserRO } from '../../core/ro/user.ro';

export type AuthMode = 'register' | 'login';

export interface AuthResult {
  mode: AuthMode;
  user: UserRO;
}

type Step = 1 | 2 | 3;
type StepDir = 'fwd' | 'back';

@Component({
  selector: 'app-auth-modal',
  standalone: false,
  templateUrl: './auth-modal.component.html',
  styleUrls: ['./auth-modal.component.scss'],
})
export class AuthModalComponent implements OnInit, AfterViewInit, OnDestroy {
  @Input() initialMode: AuthMode = 'register';
  @Output() done = new EventEmitter<AuthResult>();
  @Output() closed = new EventEmitter<void>();

  @ViewChild('userInput') userInput?: ElementRef<HTMLInputElement>;
  @ViewChild('nameInput') nameInput?: ElementRef<HTMLInputElement>;

  mode: AuthMode = 'register';
  step: Step = 1;
  stepDir: StepDir = 'fwd';
  username = '';
  displayName = '';
  touched = false;

  submitting = false;
  error: string | null = null;
  private user: UserRO | null = null;

  private prevOverflow = '';

  constructor(private auth: AuthService) {}

  ngOnInit(): void {
    this.mode = this.initialMode;
    this.prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.userInput?.nativeElement.focus(), 0);
  }

  ngOnDestroy(): void {
    document.body.style.overflow = this.prevOverflow;
  }

  get totalSteps(): number {
    return this.mode === 'register' ? 3 : 2;
  }

  get cleanUser(): string {
    return this.username.trim().toLowerCase().replace(/\s+/g, '');
  }

  get cleanName(): string {
    return this.displayName.trim();
  }

  get usernameLooksValid(): boolean {
    return /^[a-z0-9_]{3,32}$/.test(this.cleanUser);
  }

  get userErr(): boolean {
    return this.touched && this.step === 1 && !this.usernameLooksValid;
  }

  get nameErr(): boolean {
    return this.touched && this.step === 2 && !this.cleanName;
  }

  get finalName(): string {
    if (this.user?.displayName) return this.user.displayName;
    if (this.mode === 'register') return this.cleanName || 'Bạn ơi';
    if (!this.cleanUser) return 'Bạn ơi';
    return this.cleanUser[0].toUpperCase() + this.cleanUser.slice(1);
  }

  get initial(): string {
    return (this.finalName[0] || '?').toUpperCase();
  }

  get currentDisabled(): boolean {
    if (this.submitting) return true;
    if (this.step === 1) return !this.usernameLooksValid;
    if (this.step === 2) return !this.cleanName;
    return false;
  }

  get progress(): number[] {
    return Array.from({ length: this.totalSteps }, (_, i) => i);
  }

  progressClass(i: number): 'done' | 'active' | '' {
    if (i < this.step - 1) return 'done';
    if (i === this.step - 1) return 'active';
    return '';
  }

  setMode(m: AuthMode): void {
    if (this.submitting) return;
    this.mode = m;
    this.error = null;
  }

  onBackdrop(e: MouseEvent): void {
    if (this.submitting) return;
    if (e.target === e.currentTarget) this.closed.emit();
  }

  onEsc(e: KeyboardEvent): void {
    if (e.key === 'Escape' && !this.submitting) this.closed.emit();
  }

  async advance(): Promise<void> {
    if (this.submitting) return;
    this.touched = true;
    this.error = null;

    if (this.step === 1) {
      if (!this.usernameLooksValid) return;
      if (this.mode === 'register') {
        this.stepDir = 'fwd';
        this.step = 2;
        this.touched = false;
        setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
        return;
      }
      await this.runLogin();
      return;
    }

    if (this.step === 2) {
      if (!this.cleanName) return;
      await this.runRegister();
    }
  }

  private async runLogin(): Promise<void> {
    this.submitting = true;
    try {
      this.user = await this.auth.login(this.cleanUser);
      this.stepDir = 'fwd';
      this.step = 3;
      this.touched = false;
    } catch (e) {
      this.error = this.messageFor(e);
    } finally {
      this.submitting = false;
    }
  }

  private async runRegister(): Promise<void> {
    this.submitting = true;
    try {
      this.user = await this.auth.register(this.cleanUser, this.cleanName);
      this.stepDir = 'fwd';
      this.step = 3;
      this.touched = false;
    } catch (e) {
      this.error = this.messageFor(e);
      if (e instanceof AuthError && e.code === 'username_taken') {
        this.stepDir = 'back';
        this.step = 1;
      }
    } finally {
      this.submitting = false;
    }
  }

  back(): void {
    if (this.submitting) return;
    this.touched = false;
    this.error = null;
    this.stepDir = 'back';
    if (this.step === 2) this.step = 1;
    else if (this.step === 3) this.step = (this.mode === 'register' ? 2 : 1) as Step;
    if (this.step === 1) setTimeout(() => this.userInput?.nativeElement.focus(), 0);
    if (this.step === 2) setTimeout(() => this.nameInput?.nativeElement.focus(), 0);
  }

  finish(): void {
    if (!this.user) return;
    this.done.emit({ mode: this.mode, user: this.user });
  }

  private messageFor(e: unknown): string {
    if (e instanceof AuthError) return e.message;
    return 'Có lỗi xảy ra, vui lòng thử lại.';
  }
}
