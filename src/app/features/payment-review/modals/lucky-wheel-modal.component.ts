import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';

import { PrMember } from '../mock-data';

/** One rendered pie slice on the wheel. */
export interface WheelSeg {
  member: PrMember;
  /** SVG path `d` for the slice. */
  path: string;
  /** Fill color (theme-var based). */
  color: string;
  /** Label x/y in viewBox units. */
  lx: number;
  ly: number;
  /** Already drawn as a winner — dimmed + ticked. */
  won: boolean;
}

const VIEW = 100; // viewBox is 0..100
const CX = 50;
const CY = 50;
const R = 48;
const LABEL_R = 30; // label distance from center
const SPIN_MS = 4200; // keep in sync with .wheel-rot transition in scss

/* Slice palette — leans on the active theme's tokens so it recolors per palette. */
const WHEEL_COLORS = [
  'var(--primary)',
  'var(--amber)',
  'var(--accent, var(--primary))',
  'var(--rose, var(--primary))',
  'color-mix(in oklab, var(--primary) 55%, var(--amber))',
  'color-mix(in oklab, var(--accent, var(--primary)) 65%, var(--surface))',
  'color-mix(in oklab, var(--amber) 60%, var(--rose, var(--primary)))',
  'color-mix(in oklab, var(--primary) 45%, var(--accent, var(--primary)))',
];

@Component({
  selector: 'app-lucky-wheel-modal',
  standalone: false,
  templateUrl: './lucky-wheel-modal.component.html',
  styleUrls: ['./lucky-wheel-modal.component.scss'],
})
export class LuckyWheelModalComponent implements OnInit, OnChanges, OnDestroy {
  /** Everyone in the order (orderer included). */
  @Input() members: PrMember[] = [];
  /** Orderer / chủ đơn id, used for the "exclude owner" toggle. */
  @Input() ordererId = '';

  @Output() closed = new EventEmitter<void>();

  /** Drop the orderer from the wheel when true. */
  excludeOwner = false;
  /** How many people the spin should pick. */
  winnerCount = 1;

  /** Members actually on the wheel (frozen between rebuilds). */
  wheelMembers: PrMember[] = [];
  winners: PrMember[] = [];

  rotation = 0;
  spinning = false;

  private spinTimer?: number;

  ngOnInit(): void {
    this.rebuild();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['members']) this.rebuild();
  }

  ngOnDestroy(): void {
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
  }

  /** Rebuild the candidate list from the current config and reset spin state. */
  private rebuild(): void {
    this.wheelMembers = this.members.filter((m) => !(this.excludeOwner && m.id === this.ordererId));
    this.winners = [];
    this.rotation = 0;
    this.spinning = false;
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
    this.winnerCount = Math.min(Math.max(1, this.winnerCount), this.maxWinners);
  }

  get hasOwner(): boolean {
    return this.members.some((m) => m.id === this.ordererId);
  }
  get maxWinners(): number {
    return Math.max(1, this.wheelMembers.length);
  }
  get isDone(): boolean {
    return this.winners.length >= this.winnerCount || this.winners.length >= this.wheelMembers.length;
  }
  get canSpin(): boolean {
    return !this.spinning && !this.isDone && this.wheelMembers.length > 0;
  }
  get configLocked(): boolean {
    return this.spinning || this.winners.length > 0;
  }

  /** Pie slices for the SVG, recomputed from wheelMembers + winners. */
  get segs(): WheelSeg[] {
    const n = this.wheelMembers.length;
    if (!n) return [];
    const step = 360 / n;
    return this.wheelMembers.map((m, i) => {
      const start = step * i;
      const end = start + step;
      const mid = start + step / 2;
      return {
        member: m,
        path: this.arcPath(start, end, n),
        color: WHEEL_COLORS[i % WHEEL_COLORS.length],
        lx: CX + LABEL_R * Math.sin((mid * Math.PI) / 180),
        ly: CY - LABEL_R * Math.cos((mid * Math.PI) / 180),
        won: this.winners.some((w) => w.id === m.id),
      };
    });
  }

  /** SVG slice path. Angles measured from 12 o'clock, clockwise. */
  private arcPath(startDeg: number, endDeg: number, n: number): string {
    if (n === 1) {
      // Full circle — two half-arcs so a single slice still renders.
      return `M ${CX} ${CY - R} A ${R} ${R} 0 1 1 ${CX - 0.01} ${CY - R} Z`;
    }
    const p1 = this.point(startDeg);
    const p2 = this.point(endDeg);
    const large = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${CX} ${CY} L ${p1.x} ${p1.y} A ${R} ${R} 0 ${large} 1 ${p2.x} ${p2.y} Z`;
  }

  private point(deg: number): { x: number; y: number } {
    const rad = (deg * Math.PI) / 180;
    return { x: CX + R * Math.sin(rad), y: CY - R * Math.cos(rad) };
  }

  toggleExclude(): void {
    if (this.configLocked) return;
    this.excludeOwner = !this.excludeOwner;
    this.rebuild();
  }

  incWinner(): void {
    if (this.configLocked) return;
    this.winnerCount = Math.min(this.maxWinners, this.winnerCount + 1);
  }
  decWinner(): void {
    if (this.configLocked) return;
    this.winnerCount = Math.max(1, this.winnerCount - 1);
  }

  spin(): void {
    if (!this.canSpin) return;
    const remaining = this.wheelMembers.filter((m) => !this.winners.some((w) => w.id === m.id));
    if (!remaining.length) return;

    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    const idx = this.wheelMembers.indexOf(pick);
    const n = this.wheelMembers.length;
    const step = 360 / n;
    const center = idx * step + step / 2;
    /* Land somewhere inside the slice (not always dead-center) for a natural finish. */
    const jitter = (Math.random() - 0.5) * step * 0.6;

    /* Wheel rotated by R puts a slice at angle a onto a+R. Pointer sits at top (0),
       so we need center + R ≡ 0 (mod 360). Always rotate forward ≥5 full turns. */
    let target = -(center + jitter);
    const minTarget = this.rotation + 360 * 5;
    target += Math.ceil((minTarget - target) / 360) * 360;

    this.spinning = true;
    this.rotation = target;
    this.spinTimer = window.setTimeout(() => {
      this.winners = [...this.winners, pick];
      this.spinning = false;
    }, SPIN_MS + 80);
  }

  reset(): void {
    this.winners = [];
    this.rotation = 0;
    this.spinning = false;
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
  }

  trackSeg = (_: number, s: WheelSeg) => s.member.id;
  trackWinner = (_: number, m: PrMember) => m.id;
}
