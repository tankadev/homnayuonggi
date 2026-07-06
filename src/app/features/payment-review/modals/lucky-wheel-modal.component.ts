import { Component, EventEmitter, Input, OnChanges, OnDestroy, OnInit, Output, SimpleChanges } from '@angular/core';

import { PrMember } from '../mock-data';
import { WheelSpinRO } from '../../../core/ro/wheel-spin.ro';
import { WaterHistoryRO } from '../../../core/ro/water-history.ro';
import { WaterWinner } from '../../../core/dto/water-history.dto';

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

/** Payload emitted after each spin lands, so the page can log it (anti-cheat). */
export interface WheelSpunEvent {
  winner: PrMember;
  candidateCount: number;
}

/** Payload emitted when the orderer confirms the final water-fetchers. */
export interface WheelConfirmEvent {
  winners: PrMember[];
  spinCount: number;
}

const VIEW = 100; // viewBox is 0..100
const CX = 50;
const CY = 50;
const R = 48;
const LABEL_R = 30; // label distance from center
const SPIN_MS = 4200; // keep in sync with .wheel-rot transition in scss

/* Race mode: N waypoint frames, each animated by the .lw-racer css transition.
   RACE_FRAMES * RACE_FRAME_MS must stay < SPIN_MS so the winner reaches the
   finish line before spin() commits the result. */
const RACE_FRAMES = 7;
const RACE_FRAME_MS = 580; // keep in sync with .lw-racer transition in scss

/** Which visual the orderer picked. Only the picking animation differs — the
    random winner selection in spin() is identical for all three. */
export type RaceMode = 'wheel' | 'duck' | 'boat';

/** One lane on the race track (duck/boat modes). */
export interface RaceLane {
  member: PrMember;
  color: string;
  won: boolean;
}

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

type Tab = 'wheel' | 'spins' | 'room';

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
  /** Only the orderer may spin / configure / confirm; others watch the result feed. */
  @Input() isOrderer = false;
  /** This order's spin log (anti-cheat), newest or oldest order — sorted here. */
  @Input() spins: WheelSpinRO[] = [];
  /** This room's long-lived "who fetched drinks" history (already capped at 20). */
  @Input() roomHistory: WaterHistoryRO[] = [];
  /** Confirmed winners for THIS delivery (if the orderer already chốt) — shown to viewers too. */
  @Input() confirmedWinners: WaterWinner[] = [];
  /** Visual the orderer broadcast (persisted on the delivery) so viewers mirror it. */
  @Input() sharedMode: RaceMode = 'wheel';

  @Output() closed = new EventEmitter<void>();
  @Output() spun = new EventEmitter<WheelSpunEvent>();
  @Output() confirmed = new EventEmitter<WheelConfirmEvent>();
  /** Orderer switched visual — the page persists it onto the delivery. */
  @Output() modeChange = new EventEmitter<RaceMode>();

  tab: Tab = 'wheel';

  /** Visual chosen by the orderer — wheel (default), duck race, or boat race.
      Local state only (like the spin animation) — not synced to viewers. */
  mode: RaceMode = 'wheel';

  /** Per-member position on the race track, 0 (start) → 100 (finish line). */
  lanePos: Record<string, number> = {};
  /** True for the instant we snap racers back to the start, so the css
      transition doesn't animate the reset backwards between races. */
  raceNoAnim = false;

  /** Members the orderer has ticked off the wheel (by id). */
  excludedIds = new Set<string>();
  /** How many people the spin should pick. */
  winnerCount = 1;

  /** Members actually on the wheel (frozen between rebuilds). */
  wheelMembers: PrMember[] = [];
  winners: PrMember[] = [];

  rotation = 0;
  spinning = false;
  /** Set once the orderer confirms, so the confirm button can't fire twice. */
  confirmedDone = false;

  private spinTimer?: number;
  /** Pending race-frame timers, cleared on reset / rebuild / destroy. */
  private raceTimers: number[] = [];
  /** id-signature of the last member set we rebuilt from — guards against the
      live subscription handing us a new array reference every snapshot (which
      would otherwise reset the wheel rotation right after a spin lands). */
  private membersSig = '';

  ngOnInit(): void {
    /* Start on the broadcast visual. The orderer then drives it locally (and
       re-broadcasts via modeChange); viewers keep mirroring sharedMode. */
    this.mode = this.sharedMode || 'wheel';
    this.membersSig = this.sigOf(this.members);
    this.rebuild();
  }

  ngOnChanges(changes: SimpleChanges): void {
    /* Viewers follow whatever visual the orderer picked. */
    if (changes['sharedMode'] && !this.isOrderer) {
      this.mode = this.sharedMode || 'wheel';
    }
    if (!changes['members']) return;
    const next = this.sigOf(this.members);
    /* Only rebuild when the candidate set actually changed — not on every
       incidental reference change from the RTDB stream. */
    if (next === this.membersSig) return;
    this.membersSig = next;
    this.rebuild();
  }

  private sigOf(list: PrMember[]): string {
    return list.map((m) => m.id).join(',');
  }

  ngOnDestroy(): void {
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
    this.clearRaceTimers();
  }

  private clearRaceTimers(): void {
    this.raceTimers.forEach((t) => window.clearTimeout(t));
    this.raceTimers = [];
  }

  /** Rebuild the candidate list from the current config and reset spin state. */
  private rebuild(): void {
    this.wheelMembers = this.members.filter((m) => !this.excludedIds.has(m.id));
    this.winners = [];
    this.rotation = 0;
    this.lanePos = {};
    this.spinning = false;
    this.confirmedDone = false;
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
    this.clearRaceTimers();
    this.winnerCount = Math.min(Math.max(1, this.winnerCount), this.maxWinners);
  }

  /** Switch visual — only before spinning / picking has started. */
  setMode(m: RaceMode): void {
    if (this.configLocked || this.mode === m) return;
    this.mode = m;
    this.lanePos = {};
    this.rotation = 0;
    this.modeChange.emit(m); // broadcast so viewers mirror the arena
  }
  get isRace(): boolean {
    return this.mode !== 'wheel';
  }
  get modeIcon(): string {
    return this.mode === 'duck' ? '🦆' : this.mode === 'boat' ? '🚤' : '🎡';
  }
  get modeTitle(): string {
    return this.mode === 'duck' ? 'Đua vịt' : this.mode === 'boat' ? 'Đua thuyền' : 'Vòng quay may mắn';
  }
  /** Footer verb — "Quay" for the wheel, "Đua" for the races. */
  get spinBtnLabel(): string {
    if (this.spinning) return this.isRace ? 'Đang đua…' : 'Đang quay…';
    if (this.isDone) return 'Đã xong 🎉';
    const verb = this.isRace ? 'Đua' : 'Quay';
    return this.winners.length ? `${verb} tiếp` : `${verb} ngay`;
  }
  get resetBtnLabel(): string {
    if (!this.winners.length) return 'Đóng';
    return this.isRace ? 'Đua lại' : 'Quay lại';
  }

  get hasOwner(): boolean {
    return this.members.some((m) => m.id === this.ordererId);
  }
  get excludeOwner(): boolean {
    return this.excludedIds.has(this.ordererId);
  }
  get maxWinners(): number {
    return Math.max(1, this.wheelMembers.length);
  }
  get isDone(): boolean {
    return this.winners.length >= this.winnerCount || this.winners.length >= this.wheelMembers.length;
  }
  get canSpin(): boolean {
    return this.isOrderer && !this.spinning && !this.isDone && this.wheelMembers.length > 0;
  }
  get canConfirm(): boolean {
    return this.isOrderer && !this.confirmedDone && this.isDone && this.winners.length > 0;
  }
  get configLocked(): boolean {
    return !this.isOrderer || this.spinning || this.winners.length > 0;
  }

  /** Spin log newest-first for display. */
  get spinLog(): WheelSpinRO[] {
    return [...this.spins].sort((a, b) => (b.createAt || '').localeCompare(a.createAt || ''));
  }
  /** Room history newest-first for display. */
  get roomLog(): WaterHistoryRO[] {
    return [...this.roomHistory].sort((a, b) => (b.createAt || '').localeCompare(a.createAt || ''));
  }

  isExcluded(id: string): boolean {
    return this.excludedIds.has(id);
  }

  /* ─── Result spotlight (shown on the wheel tab for everyone) ───
     Orderer sees their live spin session; viewers see the shared result — the
     confirmed set if the orderer chốt, otherwise the most recent spin. */
  get resultWinners(): { name: string; initial: string }[] {
    if (this.isOrderer && this.winners.length) {
      return this.winners.map((w) => ({ name: w.name, initial: w.initial }));
    }
    if (this.confirmedWinners.length) {
      return this.confirmedWinners.map((w) => ({ name: w.name, initial: (w.name || '?').charAt(0) }));
    }
    const latest = this.spinLog[0];
    return latest ? [{ name: latest.winnerName, initial: (latest.winnerName || '?').charAt(0) }] : [];
  }
  /** The spotlighted result is a final, confirmed pick. */
  get resultConfirmed(): boolean {
    return this.confirmedDone || this.confirmedWinners.length > 0;
  }
  /** Viewer is watching an unconfirmed live spin (orderer still spinning). */
  get resultIsLive(): boolean {
    return !this.isOrderer && !this.resultConfirmed && !!this.spinLog.length;
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

  /** Toggle any member off/on the wheel (orderer-only, before spinning starts). */
  toggleExclude(id: string): void {
    if (this.configLocked) return;
    if (this.excludedIds.has(id)) this.excludedIds.delete(id);
    else this.excludedIds.add(id);
    this.rebuild();
  }

  /** Convenience toggle for the "bỏ chủ đơn ra" switch. */
  toggleOwner(): void {
    if (!this.ordererId) return;
    this.toggleExclude(this.ordererId);
  }

  incWinner(): void {
    if (this.configLocked) return;
    this.winnerCount = Math.min(this.maxWinners, this.winnerCount + 1);
  }
  decWinner(): void {
    if (this.configLocked) return;
    this.winnerCount = Math.max(1, this.winnerCount - 1);
  }

  /* ─── Race track (duck / boat modes) ─── */
  /** Ids parked at the finish. Orderer: their live picks. Viewer: the shared
      result (confirmed set, else the latest logged spin) so they see who won. */
  get displayWonIds(): Set<string> {
    if (this.isOrderer) return new Set(this.winners.map((w) => w.id));
    const ids = new Set<string>();
    if (this.confirmedWinners.length) {
      this.confirmedWinners.forEach((w) => w.userId && ids.add(w.userId));
    } else if (this.spinLog.length) {
      const latest = this.spinLog[0];
      if (latest.winnerId) ids.add(latest.winnerId);
    }
    return ids;
  }
  /** All candidates as lanes; already-won ones are parked at the finish. */
  get laneList(): RaceLane[] {
    const won = this.displayWonIds;
    return this.wheelMembers.map((m, i) => ({
      member: m,
      color: WHEEL_COLORS[i % WHEEL_COLORS.length],
      won: won.has(m.id),
    }));
  }
  /** Current track position for a member (won → parked at the finish line). */
  lanePosOf(id: string): number {
    if (id in this.lanePos) return this.lanePos[id];
    return this.displayWonIds.has(id) ? 100 : 0;
  }
  /** Racer's left offset — travels within an inset rail so it never overflows
      the lane and its centre lands on the finish line at 100%. */
  laneLeft(id: string): string {
    return `calc(6px + (100% - 52px) * ${this.lanePosOf(id) / 100})`;
  }

  spin(): void {
    if (!this.canSpin) return;
    const remaining = this.wheelMembers.filter((m) => !this.winners.some((w) => w.id === m.id));
    if (!remaining.length) return;
    const candidateCount = this.wheelMembers.length;

    if (this.isRace) {
      /* Race modes: ONE race decides everyone — the winnerCount fastest racers
         cross the finish line together, no need to race again. */
      const k = Math.min(this.winnerCount, remaining.length);
      const pool = [...remaining];
      const picked: PrMember[] = [];
      for (let i = 0; i < k; i++) {
        picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
      }
      this.spinning = true;
      this.animateRace(new Set(picked.map((p) => p.id)), remaining);
      this.spinTimer = window.setTimeout(() => {
        this.winners = [...picked];
        this.spinning = false;
        /* Log each finisher so the trail + room history reflect them all. */
        picked.forEach((w) => this.spun.emit({ winner: w, candidateCount }));
      }, SPIN_MS + 80);
      return;
    }

    /* Wheel mode: one pick per spin, spin again for each extra winner. */
    const pick = remaining[Math.floor(Math.random() * remaining.length)];
    this.spinning = true;
    this.animateWheel(pick);
    this.spinTimer = window.setTimeout(() => {
      this.winners = [...this.winners, pick];
      this.spinning = false;
      this.spun.emit({ winner: pick, candidateCount });
    }, SPIN_MS + 80);
  }

  /** Rotate the wheel so the picked slice lands under the top pointer. */
  private animateWheel(pick: PrMember): void {
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
    this.rotation = target;
  }

  /** Race the lanes across the track. Every winner reaches the finish (100);
      losers cap short of it. Winners ease-in then burst so it looks like a
      pack surging to the line; the number of finishers === winnerCount. */
  private animateRace(winnerIds: Set<string>, remaining: PrMember[]): void {
    this.clearRaceTimers();

    /* Pre-compute each lane's per-frame targets. Losers cap short of the finish
       (55–88) so only the chosen winners ever reach 100. */
    const curves: Record<string, number[]> = {};
    for (const m of remaining) {
      const isWin = winnerIds.has(m.id);
      const end = isWin ? 100 : 55 + Math.random() * 33;
      /* Vary each winner's curve so they don't move in lockstep. */
      const exp = isWin ? 1.5 + Math.random() * 0.8 : 1;
      const frames: number[] = [];
      let prev = 0;
      for (let f = 1; f <= RACE_FRAMES; f++) {
        const t = f / RACE_FRAMES;
        /* Winners lag on an ease-in curve, then burst at the final frame. */
        const base = end * Math.pow(t, exp);
        const wobble = f < RACE_FRAMES ? (Math.random() - 0.5) * 16 : 0;
        let v = base + wobble;
        v = Math.max(prev, Math.min(isWin ? 100 : end + 4, v)); // never move backwards
        if (f === RACE_FRAMES) v = end; // land exactly on the computed end
        frames.push(v);
        prev = v;
      }
      curves[m.id] = frames;
    }

    /* Snap racers to the start with no animation, then run the frames. */
    this.raceNoAnim = true;
    remaining.forEach((m) => (this.lanePos[m.id] = 0));
    this.raceTimers.push(
      window.setTimeout(() => {
        this.raceNoAnim = false;
        let f = 0;
        const tick = () => {
          remaining.forEach((m) => (this.lanePos[m.id] = curves[m.id][f]));
          f++;
          if (f < RACE_FRAMES) this.raceTimers.push(window.setTimeout(tick, RACE_FRAME_MS));
        };
        this.raceTimers.push(window.setTimeout(tick, 20));
      }, 40),
    );
  }

  confirm(): void {
    if (!this.canConfirm) return;
    this.confirmedDone = true;
    this.confirmed.emit({ winners: [...this.winners], spinCount: this.spins.length });
  }

  reset(): void {
    if (!this.isOrderer) return;
    this.winners = [];
    this.rotation = 0;
    this.lanePos = {};
    this.spinning = false;
    this.confirmedDone = false;
    if (this.spinTimer) window.clearTimeout(this.spinTimer);
    this.clearRaceTimers();
  }

  trackSeg = (_: number, s: WheelSeg) => s.member.id;
  trackLane = (_: number, l: RaceLane) => l.member.id;
  trackWinner = (_: number, m: PrMember) => m.id;
  trackMember = (_: number, m: PrMember) => m.id;
  trackSpin = (_: number, s: WheelSpinRO) => s.key;
  trackRoom = (_: number, h: WaterHistoryRO) => h.key;
}
