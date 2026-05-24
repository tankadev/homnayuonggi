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
  currentWord = this.rotatingWords[0];
  private wordIdx = 0;
  private wordTimer?: number;

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
    this.wordTimer = window.setInterval(() => {
      this.wordIdx = (this.wordIdx + 1) % this.rotatingWords.length;
      this.currentWord = this.rotatingWords[this.wordIdx];
    }, 2400);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('welcome-screen');
    if (this.wordTimer !== undefined) window.clearInterval(this.wordTimer);
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
