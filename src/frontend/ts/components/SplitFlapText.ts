/*
 * SplitFlapText — vanilla TypeScript port of the React Bits component.
 *
 * The original is a React hook component; this app is framework-free ES modules,
 * so we keep the exact same tile state machine + rAF animation logic and CSS,
 * but drive a plain DOM tree directly (build once, patch per tick) instead of
 * re-rendering through React. CSS lives in styles/split-flap.css.
 */

export type SplitFlapAlign = 'left' | 'center' | 'right';
export type SplitFlapOrder = 'left' | 'right' | 'center' | 'random';
export type SplitFlapTileStyle = 'board' | 'minimal';

export interface SplitFlapOptions {
  words?: string[];
  text?: string;
  flipDuration?: number;
  stagger?: number;
  cycleDelay?: number;
  charset?: 'alpha' | 'alphanumeric' | 'numeric' | (string & {});
  flipsPerChar?: number;
  tileColor?: string;
  textColor?: string;
  tileRadius?: number | string;
  gap?: number | string;
  fontSize?: number | string;
  loop?: boolean;
  padTo?: number;
  align?: SplitFlapAlign;
  intro?: boolean;
  glare?: number;
  depth?: number;
  order?: SplitFlapOrder;
  tileStyle?: SplitFlapTileStyle;
  className?: string;
  /** Fired once each time a phrase has fully finished flipping in. */
  onSettled?: (index: number, phrase: string) => void;
}

interface ResolvedOptions {
  words: string[];
  text?: string;
  flipDuration: number;
  stagger: number;
  cycleDelay: number;
  charset?: string;
  flipsPerChar: number;
  tileColor: string;
  textColor: string;
  tileRadius: number | string;
  gap: number | string;
  fontSize: number | string;
  loop: boolean;
  padTo: number;
  align: SplitFlapAlign;
  intro: boolean;
  glare: number;
  depth: number;
  order: SplitFlapOrder;
  tileStyle: SplitFlapTileStyle;
  className: string;
  onSettled?: (index: number, phrase: string) => void;
}

interface TileState {
  current: string;
  next: string;
  flipping: boolean;
}

interface AnimationPlan {
  index: number;
  from: string;
  target: string;
  sequence: string[];
  start: number;
  step: number;
  done: boolean;
}

interface Timing {
  flipMs: number;
  staggerMs: number;
  holdMs: number;
  flips: number;
  glyphs: string;
  order: SplitFlapOrder;
}

const DEFAULT_WORDS = ['LAUNCH READY', 'SYNC ONLINE', 'SIGNAL LIVE'];

const CHARSETS: Record<string, string> = {
  alpha: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  alphanumeric: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
  numeric: '0123456789'
};

const toCssUnit = (value: number | string): string =>
  typeof value === 'number' ? `${value}px` : value;

const resolveCharset = (charset?: string): string => {
  if (charset && CHARSETS[charset]) return CHARSETS[charset];
  return typeof charset === 'string' && charset.length > 0 ? charset : CHARSETS.alphanumeric;
};

const normalizePhrase = (phrase: string, width: number, align: SplitFlapAlign = 'left'): string => {
  const safe = String(phrase ?? '').slice(0, width);
  if (align === 'right') return safe.padStart(width, ' ');
  if (align === 'center') {
    return safe
      .padStart(safe.length + Math.floor((width - safe.length) / 2), ' ')
      .padEnd(width, ' ');
  }
  return safe.padEnd(width, ' ');
};

const createTiles = (phrase: string): TileState[] =>
  phrase.split('').map(char => ({ current: char, next: char, flipping: false }));

const sampleChar = (charset: string): string =>
  charset.charAt(Math.floor(Math.random() * charset.length)) || ' ';

const buildSequence = (target: string, flips: number, charset: string): string[] => {
  const steps: string[] = [];
  for (let i = 0; i < flips; i += 1) steps.push(sampleChar(charset));
  steps.push(target);
  return steps;
};

const toGlyph = (char: string): string => (char === ' ' ? ' ' : char);

const shuffleIndices = (count: number): number[] => {
  const list = Array.from({ length: count }, (_, index) => index);
  for (let i = count - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = list[i];
    list[i] = list[j];
    list[j] = tmp;
  }
  return list;
};

const cascadeStep = (
  index: number,
  width: number,
  order: SplitFlapOrder,
  randomOrder: number[] | null
): number => {
  if (order === 'right') return width - 1 - index;
  if (order === 'center') return Math.floor(Math.abs(index - (width - 1) / 2));
  if (order === 'random' && randomOrder) return randomOrder[index];
  return index;
};

const clampUnit = (value: number): number => Math.min(1, Math.max(0, Number(value) || 0));
const round = (value: number): number => Number(value.toFixed(3));

const getReducedMotion = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const el = (tag: string, className?: string): HTMLElement => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  return node;
};

export class SplitFlapText {
  private readonly container: HTMLElement;
  private readonly options: ResolvedOptions;

  private root: HTMLElement | null = null;
  private sr: HTMLElement | null = null;
  private tileEls: HTMLElement[] = [];
  private topChars: HTMLElement[] = [];
  private bottomChars: HTMLElement[] = [];

  private phrases: string[] = [];
  private normalizedPhrases: string[] = [];
  private width = 0;
  private timing: Timing = {
    flipMs: 120,
    staggerMs: 60,
    holdMs: 2400,
    flips: 8,
    glyphs: CHARSETS.alphanumeric,
    order: 'left'
  };

  private tiles: TileState[] = [];
  private index = 0;
  private activeIndex = 0;

  private raf: number | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private shown: string | null = null;

  private shaded = false;
  private prefersReduced = false;
  private mounted = false;
  private destroyed = false;

  constructor(container: HTMLElement, options: SplitFlapOptions = {}) {
    this.container = container;
    this.options = {
      words: options.words ?? DEFAULT_WORDS,
      text: options.text,
      flipDuration: options.flipDuration ?? 0.12,
      stagger: options.stagger ?? 0.06,
      cycleDelay: options.cycleDelay ?? 2400,
      charset: options.charset ?? 'alphanumeric',
      flipsPerChar: options.flipsPerChar ?? 8,
      tileColor: options.tileColor ?? '#111827',
      textColor: options.textColor ?? '#f8fafc',
      tileRadius: options.tileRadius ?? 8,
      gap: options.gap ?? 6,
      fontSize: options.fontSize ?? 52,
      loop: options.loop ?? true,
      padTo: options.padTo ?? 12,
      align: options.align ?? 'left',
      intro: options.intro ?? true,
      glare: options.glare ?? 0,
      depth: options.depth ?? 0.5,
      order: options.order ?? 'left',
      tileStyle: options.tileStyle ?? 'board',
      className: options.className ?? '',
      onSettled: options.onSettled
    };
  }

  mount(): void {
    if (this.mounted || this.destroyed) return;
    const o = this.options;

    const sourceWords = Array.isArray(o.words) && o.words.length > 0 ? o.words : DEFAULT_WORDS;
    const phrasesKey =
      typeof o.text === 'string' ? o.text : sourceWords.map(w => String(w ?? '')).join('\u001f');
    this.phrases = phrasesKey.split('\u001f');

    const longest = this.phrases.reduce((max, phrase) => Math.max(max, phrase.length), 1);
    this.width = Math.max(1, Math.ceil(Number(o.padTo) || 0), longest);
    this.normalizedPhrases = this.phrases.map(p => normalizePhrase(p, this.width, o.align));

    this.timing = {
      flipMs: Math.max(40, (Number(o.flipDuration) || 0.12) * 1000),
      staggerMs: Math.max(0, (Number(o.stagger) || 0) * 1000),
      holdMs: Math.max(400, Number(o.cycleDelay) || 2400),
      flips: Math.max(0, Math.floor(Number(o.flipsPerChar) || 0)),
      glyphs: resolveCharset(o.charset),
      order: o.order
    };

    this.prefersReduced = getReducedMotion();
    const level = clampUnit(Number(o.depth));
    this.shaded = o.tileStyle !== 'minimal' && Math.max(0, level - 0.5) * 2 > 0;

    this.buildRoot();
    this.buildTiles();
    this.mounted = true;

    // Initial state (intro starts blank and flips to the first phrase).
    this.index = 0;
    this.activeIndex = 0;
    this.shown = o.intro ? ' '.repeat(this.width) : this.normalizedPhrases[0];
    this.tiles = createTiles(this.shown);
    for (let i = 0; i < this.tiles.length; i += 1) this.paintTile(i);
    this.updateSr();

    let startDuration = 0;
    if (this.shown !== this.normalizedPhrases[0]) {
      startDuration = this.show(0);
    }

    if (this.normalizedPhrases.length > 1) {
      this.scheduleNext(this.timing.holdMs + startDuration);
    }
  }

  destroy(): void {
    this.destroyed = true;
    this.stopFrame();
    if (this.timer !== null) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.root && this.root.parentNode) this.root.parentNode.removeChild(this.root);
    this.root = null;
    this.sr = null;
    this.tileEls = [];
    this.topChars = [];
    this.bottomChars = [];
    this.tiles = [];
    this.mounted = false;
  }

  // ---- DOM construction -------------------------------------------------

  private buildRoot(): void {
    const o = this.options;
    const minimal = o.tileStyle === 'minimal';
    const level = clampUnit(Number(o.depth));
    const flat = Math.min(1, level * 2);
    const deep = Math.max(0, level - 0.5) * 2;
    const sheen = minimal ? 0 : clampUnit(Number(o.glare));

    const root = el('span', 'split-flap-text');
    if (minimal) root.classList.add('split-flap-text--minimal');
    if (sheen > 0) root.classList.add('split-flap-text--glare');
    if (o.className) root.classList.add(o.className);

    const vars: Record<string, string> = {
      '--split-flap-tile-color': o.tileColor,
      '--split-flap-text-color': o.textColor,
      '--split-flap-radius': toCssUnit(o.tileRadius),
      '--split-flap-gap': toCssUnit(o.gap),
      '--split-flap-font-size': toCssUnit(o.fontSize),
      '--split-flap-flip-duration': `${Math.max(0.04, Number(o.flipDuration) || 0.12)}s`,
      '--split-flap-front-from': String(round(1 + 0.08 * flat)),
      '--split-flap-front-to': String(round(1 - 0.48 * flat - 0.3 * deep)),
      '--split-flap-back-from': String(round(1 - 0.42 * flat - 0.3 * deep)),
      '--split-flap-hinge': `calc(1px + ${round(deep * 0.05)}em)`,
      '--split-flap-hinge-shade': String(round(0.25 + 0.39 * flat + 0.21 * deep)),
      '--split-flap-drop': String(round(0.28 * flat + 0.2 * deep)),
      '--split-flap-lift': String(round(0.4 + 0.6 * flat + 0.7 * deep)),
      '--split-flap-cast': String(round(deep * 0.62)),
      '--split-flap-edge': `${round(deep * 0.035)}em`,
      '--split-flap-split': `${round(0.015 + level * 0.06)}em`,
      '--split-flap-glare': String(round(sheen * 0.55))
    };
    Object.keys(vars).forEach(key => root.style.setProperty(key, vars[key]));

    const sr = el('span', 'split-flap-text__sr');
    root.appendChild(sr);

    this.sr = sr;
    this.root = root;
    this.container.appendChild(root);
  }

  private buildTiles(): void {
    const root = this.root;
    if (!root) return;
    this.tileEls = [];
    this.topChars = [];
    this.bottomChars = [];

    for (let i = 0; i < this.width; i += 1) {
      const tile = el('span', 'split-flap-text__tile');
      tile.setAttribute('aria-hidden', 'true');

      const top = el('span', 'split-flap-text__half split-flap-text__half--top');
      const topChar = el('span', 'split-flap-text__char');
      top.appendChild(topChar);

      const bottom = el('span', 'split-flap-text__half split-flap-text__half--bottom');
      const bottomChar = el('span', 'split-flap-text__char');
      bottom.appendChild(bottomChar);

      tile.appendChild(top);
      tile.appendChild(bottom);
      root.appendChild(tile);

      this.tileEls.push(tile);
      this.topChars.push(topChar);
      this.bottomChars.push(bottomChar);
    }
  }

  // ---- Rendering --------------------------------------------------------

  /** Paint a single tile; recreates the flap/shade nodes so CSS animations restart. */
  private paintTile(index: number): void {
    const tile = this.tiles[index];
    const tileEl = this.tileEls[index];
    if (!tile || !tileEl) return;

    const topChar = this.topChars[index];
    const bottomChar = this.bottomChars[index];
    if (topChar) topChar.textContent = toGlyph(tile.flipping ? tile.next : tile.current);
    if (bottomChar) bottomChar.textContent = toGlyph(tile.current);
    tileEl.classList.toggle('is-flipping', tile.flipping);

    // Drop any existing flap/shade nodes.
    const stale = tileEl.querySelectorAll(
      '.split-flap-text__flap, .split-flap-text__shade'
    );
    stale.forEach(node => {
      if (node.parentNode) node.parentNode.removeChild(node);
    });

    if (!tile.flipping) return;

    if (this.shaded) {
      tileEl.appendChild(el('span', 'split-flap-text__shade split-flap-text__shade--top'));
      tileEl.appendChild(el('span', 'split-flap-text__shade split-flap-text__shade--bottom'));
    }

    const front = el('span', 'split-flap-text__flap split-flap-text__flap--front');
    const frontChar = el('span', 'split-flap-text__char');
    frontChar.textContent = toGlyph(tile.current);
    front.appendChild(frontChar);

    const back = el('span', 'split-flap-text__flap split-flap-text__flap--back');
    const backChar = el('span', 'split-flap-text__char');
    backChar.textContent = toGlyph(tile.next);
    back.appendChild(backChar);

    tileEl.appendChild(front);
    tileEl.appendChild(back);
  }

  private updateSr(): void {
    if (!this.sr) return;
    const label = String(this.phrases[this.activeIndex] ?? this.phrases[0] ?? '').trim();
    this.sr.textContent = label;
  }

  // ---- Animation --------------------------------------------------------

  private stopFrame(): void {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  private animateTo(target: string): number {
    const { flipMs, staggerMs, flips, glyphs, order: cascade } = this.timing;
    const from = normalizePhrase(this.shown ?? target, target.length);
    const randomOrder = cascade === 'random' ? shuffleIndices(target.length) : null;

    this.stopFrame();
    this.shown = target;

    const plans: AnimationPlan[] = [];
    if (!this.prefersReduced) {
      for (let index = 0; index < target.length; index += 1) {
        if (from[index] === target[index]) continue;
        plans.push({
          index,
          from: from[index],
          target: target[index],
          sequence: buildSequence(target[index], flips, glyphs),
          start: cascadeStep(index, target.length, cascade, randomOrder) * staggerMs,
          step: -1,
          done: false
        });
      }
    }

    if (!plans.length) {
      this.tiles = createTiles(target);
      for (let i = 0; i < this.tiles.length; i += 1) this.paintTile(i);
      this.options.onSettled?.(this.activeIndex, target);
      return 0;
    }

    this.tiles = createTiles(from);
    for (let i = 0; i < this.tiles.length; i += 1) this.paintTile(i);

    const startedAt = performance.now();

    const tick = (now: number): void => {
      if (this.destroyed) return;
      const elapsed = now - startedAt;
      const changed: number[] = [];
      let running = false;

      plans.forEach(plan => {
        const localElapsed = elapsed - plan.start;
        if (localElapsed < 0) {
          running = true;
          return;
        }
        const step = Math.floor(localElapsed / flipMs);
        if (step < plan.sequence.length) {
          running = true;
          if (step !== plan.step) {
            plan.step = step;
            this.tiles[plan.index] = {
              current: step === 0 ? plan.from : plan.sequence[step - 1],
              next: plan.sequence[step],
              flipping: true
            };
            changed.push(plan.index);
          }
        } else if (!plan.done) {
          plan.done = true;
          this.tiles[plan.index] = {
            current: plan.target,
            next: plan.target,
            flipping: false
          };
          changed.push(plan.index);
        }
      });

      changed.forEach(index => this.paintTile(index));

      if (running) {
        this.raf = requestAnimationFrame(tick);
      } else {
        this.raf = null;
        this.options.onSettled?.(this.activeIndex, target);
      }
    };

    this.raf = requestAnimationFrame(tick);
    return plans.reduce(
      (max, plan) => Math.max(max, plan.start + plan.sequence.length * flipMs),
      0
    );
  }

  private show(index: number): number {
    this.index = index;
    this.activeIndex = index;
    this.updateSr();
    return this.animateTo(this.normalizedPhrases[index]);
  }

  private scheduleNext(delay: number): void {
    if (this.destroyed) return;
    this.timer = setTimeout(() => {
      if (this.destroyed) return;
      if (document.hidden) {
        this.scheduleNext(this.timing.holdMs);
        return;
      }
      const nextIndex = this.index + 1;
      if (nextIndex >= this.normalizedPhrases.length && !this.options.loop) return;
      const duration = this.show(nextIndex % this.normalizedPhrases.length);
      this.scheduleNext(this.timing.holdMs + duration);
    }, delay);
  }
}

export default SplitFlapText;
