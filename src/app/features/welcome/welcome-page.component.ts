import { Component, EventEmitter, OnDestroy, OnInit, Output } from '@angular/core';

import { AuthMode, AuthResult } from './auth-modal.component';

interface ConfettiItem {
  emoji: string;
  left: string;
  top: string;
  rot: string;
  delay: string;
}

@Component({
  selector: 'app-welcome-page',
  standalone: false,
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss'],
})
export class WelcomePageComponent implements OnInit, OnDestroy {
  @Output() authenticated = new EventEmitter<AuthResult>();

  authOpen = false;
  authMode: AuthMode = 'login';

  rotatingWords = ['cà phê?', 'trà đào?', 'phở bò?', 'trà sữa?', 'cơm tấm?'];
  /** What's currently rendered — evolves character-by-character as the
   *  typewriter loop deletes the previous word and types the next. */
  displayedWord = this.rotatingWords[0];
  /** Source array splitting respects multi-byte Unicode (à, ở, ữ, …). */
  private targetChars: string[] = Array.from(this.rotatingWords[0]);
  private wordIdx = 0;
  private typeTimer?: number;
  private pauseTimer?: number;

  private static readonly TYPE_SPEED_MS = 75;
  private static readonly DELETE_SPEED_MS = 40;
  private static readonly HOLD_BEFORE_DELETE_MS = 1700;

  readonly confetti: ConfettiItem[] = [
    { emoji: '🍵', left: '8%',  top: '22%', rot: '-6deg', delay: '0s' },
    { emoji: '🥗', left: '12%', top: '72%', rot: '8deg',  delay: '1.2s' },
    { emoji: '🍲', left: '82%', top: '28%', rot: '4deg',  delay: '2.1s' },
    { emoji: '🥢', left: '88%', top: '70%', rot: '-10deg', delay: '0.6s' },
    { emoji: '🍡', left: '48%', top: '12%', rot: '12deg', delay: '1.8s' },
    { emoji: '🍩', left: '55%', top: '84%', rot: '-8deg', delay: '2.4s' },
  ];

  ngOnInit(): void {
    document.body.classList.add('welcome-screen');
    this.scheduleNextWord();
  }

  ngOnDestroy(): void {
    document.body.classList.remove('welcome-screen');
    this.clearTimers();
  }

  /** Hold the current word for a beat, then start deleting it. */
  private scheduleNextWord(): void {
    this.clearTimers();
    this.pauseTimer = window.setTimeout(
      () => this.startDeleting(),
      WelcomePageComponent.HOLD_BEFORE_DELETE_MS,
    );
  }

  /** Pop one character off the end of the displayed word. When empty, kick
   *  off the typing phase for the next word. */
  private startDeleting(): void {
    const chars = Array.from(this.displayedWord);
    if (chars.length === 0) {
      this.wordIdx = (this.wordIdx + 1) % this.rotatingWords.length;
      this.targetChars = Array.from(this.rotatingWords[this.wordIdx]);
      this.startTyping();
      return;
    }
    chars.pop();
    this.displayedWord = chars.join('');
    this.typeTimer = window.setTimeout(
      () => this.startDeleting(),
      WelcomePageComponent.DELETE_SPEED_MS,
    );
  }

  /** Append one character from the target. When complete, schedule the
   *  next word. */
  private startTyping(): void {
    const current = Array.from(this.displayedWord);
    if (current.length >= this.targetChars.length) {
      this.scheduleNextWord();
      return;
    }
    current.push(this.targetChars[current.length]);
    this.displayedWord = current.join('');
    this.typeTimer = window.setTimeout(
      () => this.startTyping(),
      WelcomePageComponent.TYPE_SPEED_MS,
    );
  }

  private clearTimers(): void {
    if (this.typeTimer !== undefined) {
      window.clearTimeout(this.typeTimer);
      this.typeTimer = undefined;
    }
    if (this.pauseTimer !== undefined) {
      window.clearTimeout(this.pauseTimer);
      this.pauseTimer = undefined;
    }
  }

  openAuth(mode: AuthMode = 'login'): void {
    this.authMode = mode;
    this.authOpen = true;
  }

  closeAuth(): void {
    this.authOpen = false;
  }

  onAuthDone(result: AuthResult): void {
    this.authOpen = false;
    this.authenticated.emit(result);
  }
}
