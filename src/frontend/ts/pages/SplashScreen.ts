/*
 * SplashScreen — a one-shot, full-bleed welcome overlay that mounts the
 * SplitFlapText board with three crime/thriller phrases, then fades itself out
 * the moment the final phrase ("WELCOME INVESTIGATOR") finishes flipping in.
 *
 * Dismissal is event-driven (via the board's onSettled callback), not a fixed
 * timer, so all three phrases always play fully before the dashboard is shown.
 */

import { SplitFlapText } from '../components/SplitFlapText.js';

/** Crime-thriller welcome phrases shown in sequence on the departure board. */
const SPLASH_PHRASES = ['CASE TLA-026', 'CRIME UNRESOLVED', 'WELCOME INVESTIGATOR'];
const PAD_TO = 20;

/** Beat (ms) to let the final phrase sit readable before the fade-out starts. */
const FINAL_HOLD_MS = 420;

/** Failsafe cap (ms) — force-dismiss if onSettled somehow never fires. */
const MAX_SPLASH_MS = 9000;

export interface SplashScreenOptions {
  onDone?: () => void;
}

const prefersReduced = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

/** Pick a tile font size that keeps the board inside the viewport. */
const computeFontSize = (tileCount: number, gap: number): number => {
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1200;
  // Board width ~= tileCount * 0.78em (tile) + gaps, plus frame padding/margin.
  const usable = Math.min(vw, 900) - 150;
  const perEm = tileCount * 0.78;
  const fs = (usable - tileCount * gap) / perEm;
  return Math.round(Math.max(16, Math.min(46, fs)));
};

export class SplashScreen {
  private static instance: SplashScreen | null = null;

  private overlay: HTMLElement | null = null;
  private flap: SplitFlapText | null = null;
  private finalTimer: ReturnType<typeof setTimeout> | null = null;
  private capTimer: ReturnType<typeof setTimeout> | null = null;
  private removeTimer: ReturnType<typeof setTimeout> | null = null;
  private onDone?: () => void;
  private dismissed = false;

  static show(options: SplashScreenOptions = {}): SplashScreen | null {
    if (typeof document === 'undefined') return null;
    if (SplashScreen.instance) return SplashScreen.instance;
    const splash = new SplashScreen();
    splash.start(options);
    SplashScreen.instance = splash;
    return splash;
  }

  static dismiss(): void {
    SplashScreen.instance?.dismiss();
  }

  private start(options: SplashScreenOptions): void {
    this.onDone = options.onDone;
    const gap = 4;
    const fontSize = computeFontSize(PAD_TO, gap);

    // --- Overlay DOM ---
    const overlay = document.createElement('div');
    overlay.className = 'splash-screen';
    overlay.setAttribute('role', 'presentation');

    const scan = document.createElement('div');
    scan.className = 'splash-screen__scan';
    overlay.appendChild(scan);

    const sweep = document.createElement('div');
    sweep.className = 'splash-screen__sweep';
    overlay.appendChild(sweep);

    const content = document.createElement('div');
    content.className = 'splash-screen__content';

    const eyebrow = document.createElement('div');
    eyebrow.className = 'splash-screen__eyebrow';
    eyebrow.textContent = 'CYRA FORENSIC TERMINAL';
    content.appendChild(eyebrow);

    const rule = document.createElement('div');
    rule.className = 'splash-screen__rule';
    content.appendChild(rule);

    const board = document.createElement('div');
    board.className = 'splash-screen__board';
    content.appendChild(board);

    const status = document.createElement('div');
    status.className = 'splash-screen__status';
    const dot = document.createElement('span');
    dot.className = 'pulse-dot';
    dot.style.color = 'var(--forensic-emerald)';
    dot.style.background = 'var(--forensic-emerald)';
    status.appendChild(dot);
    const statusText = document.createElement('span');
    statusText.textContent = 'INITIALIZING SECURE INVESTIGATION';
    status.appendChild(statusText);
    content.appendChild(status);

    overlay.appendChild(content);
    document.body.appendChild(overlay);

    this.overlay = overlay;

    const lastIndex = SPLASH_PHRASES.length - 1;

    // --- Mount the split-flap board (fast, no loop) ---
    this.flap = new SplitFlapText(board, {
      words: SPLASH_PHRASES,
      padTo: PAD_TO,
      align: 'center',
      order: 'left',
      intro: true,
      loop: false,
      flipDuration: 0.055,
      stagger: 0.018,
      cycleDelay: 480,
      flipsPerChar: 3,
      charset: 'alphanumeric',
      tileStyle: 'board',
      tileColor: '#1b0d12',
      textColor: '#f3eaea',
      tileRadius: 6,
      gap,
      fontSize,
      glare: 0.15,
      depth: 0.55,
      onSettled: index => {
        // When the final phrase has fully landed, hold a beat then reveal the app.
        if (index === lastIndex) this.scheduleDismiss(FINAL_HOLD_MS);
      }
    });
    this.flap.mount();

    // Fade in on the next frame so the transition runs.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    });

    // --- Failsafe: never let the splash get stuck ---
    this.capTimer = setTimeout(() => this.dismiss(), MAX_SPLASH_MS);

    // Click anywhere or press Esc to skip early (no visible button).
    overlay.addEventListener('click', () => this.dismiss());
    document.addEventListener('keydown', this.handleKey);
  }

  private scheduleDismiss(delay: number): void {
    if (this.dismissed || this.finalTimer !== null) return;
    this.finalTimer = setTimeout(() => this.dismiss(), delay);
  }

  private readonly handleKey = (event: KeyboardEvent): void => {
    if (event.key === 'Escape' || event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      this.dismiss();
    }
  };

  dismiss(): void {
    if (this.dismissed) return;
    this.dismissed = true;

    document.removeEventListener('keydown', this.handleKey);
    if (this.finalTimer !== null) {
      clearTimeout(this.finalTimer);
      this.finalTimer = null;
    }
    if (this.capTimer !== null) {
      clearTimeout(this.capTimer);
      this.capTimer = null;
    }

    const overlay = this.overlay;
    if (overlay) {
      overlay.classList.remove('is-visible');
      overlay.classList.add('is-leaving');
      const reduced = prefersReduced();
      this.removeTimer = setTimeout(() => this.finalize(), reduced ? 0 : 640);
    } else {
      this.finalize();
    }
  }

  private finalize(): void {
    if (this.removeTimer !== null) {
      clearTimeout(this.removeTimer);
      this.removeTimer = null;
    }
    this.flap?.destroy();
    this.flap = null;
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }
    this.overlay = null;
    SplashScreen.instance = null;
    const cb = this.onDone;
    this.onDone = undefined;
    cb?.();
  }
}

export default SplashScreen;
