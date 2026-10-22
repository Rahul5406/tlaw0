/*
 * FlipCard — vanilla TypeScript port of the React Bits component.
 *
 * The original depends on React + the `motion` library. Our app is framework-free
 * ES modules with no bundler, so we reimplement the physics-driven feel (springy
 * flip, cursor tilt, lift, glare sheen, drag-to-turn with flick velocity) using a
 * tiny damped-spring integrator driven by requestAnimationFrame. The CSS lives in
 * styles/flip-card.css and is copied verbatim.
 */

export type FlipCardAxis = 'x' | 'y';

export interface FlipCardOptions {
  /** Front-face content (HTML string or DOM node). */
  front?: string | Node;
  /** Back-face content (HTML string or DOM node). */
  back?: string | Node;
  /** Controlled state: true shows the back. Omit to let the card manage itself. */
  flipped?: boolean;
  defaultFlipped?: boolean;
  onFlipChange?: (flipped: boolean) => void;
  axis?: FlipCardAxis;
  flipOnClick?: boolean;
  draggable?: boolean;
  dragDistance?: number;
  tilt?: boolean;
  tiltMax?: number;
  glare?: boolean;
  glareOpacity?: number;
  hoverScale?: number;
  perspective?: number;
  stiffness?: number;
  damping?: number;
  width?: number;
  height?: number;
  radius?: number;
  background?: string;
  color?: string;
  shadow?: boolean;
  shadowColor?: string;
  shadowOpacity?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
}

interface Grip {
  id: number;
  x: number;
  y: number;
  base: number;
  moved: boolean;
  slop: number;
  hist: { t: number; v: number }[];
}

interface SpringConfig {
  stiffness: number;
  damping: number;
  mass?: number;
  restDelta?: number;
}

/** A damped harmonic oscillator (semi-implicit Euler, sub-stepped for stability). */
class SpringValue {
  value: number;
  target: number;
  velocity = 0;
  private readonly stiffness: number;
  private readonly damping: number;
  private readonly mass: number;
  private readonly restDelta: number;

  constructor(value: number, cfg: SpringConfig) {
    this.value = value;
    this.target = value;
    this.stiffness = cfg.stiffness;
    this.damping = cfg.damping;
    this.mass = cfg.mass ?? 1;
    this.restDelta = cfg.restDelta ?? 0.01;
  }

  set(target: number): void {
    this.target = target;
  }

  jump(value: number): void {
    this.value = value;
    this.target = value;
    this.velocity = 0;
  }

  /** Advance by dt seconds. Returns true when the spring has settled at rest. */
  step(dt: number): boolean {
    // Clamp large deltas (e.g. tab was hidden) and sub-step for stability.
    let remaining = Math.min(dt, 0.05);
    const maxStep = 1 / 120;
    while (remaining > 0) {
      const h = Math.min(maxStep, remaining);
      const acc =
        (-this.stiffness * (this.value - this.target) - this.damping * this.velocity) / this.mass;
      this.velocity += acc * h;
      this.value += this.velocity * h;
      remaining -= h;
    }
    return (
      Math.abs(this.value - this.target) < this.restDelta && Math.abs(this.velocity) < this.restDelta
    );
  }
}

const SLOP = { fine: 4, coarse: 8 };
const TILT_SPRING: SpringConfig = { stiffness: 240, damping: 24, mass: 0.6 };
const LIFT_SPRING: SpringConfig = { stiffness: 320, damping: 26 };
const FLING = 0.16;
const HISTORY_MS = 90;

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const snap = (deg: number) => Math.round(deg / 180) * 180;
const isBack = (deg: number) => Math.abs(Math.round(deg / 180)) % 2 === 1;

const prefersReduced = (): boolean =>
  typeof window !== 'undefined' &&
  Boolean(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

const setContent = (el: HTMLElement, content: string | Node | null | undefined): void => {
  if (content == null) return;
  if (typeof content === 'string') {
    el.innerHTML = content;
  } else {
    el.appendChild(content);
  }
};

export class FlipCard {
  private readonly root: HTMLElement;
  private readonly rotor: HTMLElement;
  private readonly frontFace: HTMLElement;
  private readonly backFace: HTMLElement;
  private readonly shadowEl: HTMLElement | null;

  private readonly axis: FlipCardAxis;
  private readonly perspective: number;
  private readonly hoverScale: number;
  private readonly tiltMax: number;
  private readonly tiltEnabled: boolean;
  private readonly glareEnabled: boolean;
  private readonly draggable: boolean;
  private readonly flipOnClick: boolean;
  private readonly dragDistance: number;
  private readonly width: number;
  private readonly height: number;
  private readonly controlled: boolean;
  private readonly onFlipChange?: (flipped: boolean) => void;

  private readonly reduce: boolean;
  private shown: boolean;
  private disabled: boolean;
  private dragging = false;

  // Springs
  private readonly turn: SpringValue;
  private readonly tiltX: SpringValue;
  private readonly tiltY: SpringValue;
  private readonly lift: SpringValue;
  private readonly sheen: SpringValue;

  // Glare position (direct, not sprung).
  private gx = 50;
  private gy = 50;

  private grip: Grip | null = null;
  private targetAngle: number;
  private raf: number | null = null;
  private lastTime: number | null = null;

  constructor(container: HTMLElement, options: FlipCardOptions = {}) {
    this.reduce = prefersReduced();
    this.controlled = options.flipped !== undefined;
    this.shown = options.flipped ?? options.defaultFlipped ?? false;
    this.disabled = options.disabled ?? false;
    this.onFlipChange = options.onFlipChange;

    this.axis = options.axis ?? 'y';
    this.perspective = options.perspective ?? 1100;
    this.hoverScale = options.hoverScale ?? 1.03;
    this.tiltMax = options.tiltMax ?? 12;
    this.tiltEnabled = options.tilt ?? true;
    this.glareEnabled = options.glare ?? true;
    this.draggable = options.draggable ?? true;
    this.flipOnClick = options.flipOnClick ?? true;
    this.dragDistance = options.dragDistance ?? 0;
    this.width = options.width ?? 300;
    this.height = options.height ?? 400;

    const stiffness = options.stiffness ?? 170;
    const damping = options.damping ?? 20;
    this.turn = new SpringValue(this.shown ? 180 : 0, { stiffness, damping, restDelta: 0.05 });
    this.tiltX = new SpringValue(0, TILT_SPRING);
    this.tiltY = new SpringValue(0, TILT_SPRING);
    this.lift = new SpringValue(1, LIFT_SPRING);
    this.sheen = new SpringValue(0, LIFT_SPRING);
    this.targetAngle = this.shown ? 180 : 0;

    // --- Build DOM ---
    this.root = document.createElement('div');
    this.root.className = `flip-card${options.className ? ` ${options.className}` : ''}`;
    this.root.setAttribute('role', 'button');
    this.root.tabIndex = this.disabled ? -1 : 0;
    this.root.setAttribute('aria-pressed', String(this.shown));
    this.root.setAttribute('aria-label', options.ariaLabel ?? 'Flip card');
    if (this.disabled) this.root.setAttribute('aria-disabled', 'true');
    this.root.dataset.axis = this.axis;
    if (this.draggable && !this.disabled && !this.reduce) this.root.dataset.draggable = '';
    if (this.disabled) this.root.dataset.disabled = '';
    if (this.reduce) this.root.dataset.fade = this.shown ? 'back' : 'front';
    this.root.style.setProperty('--fc-w', `${this.width}px`);
    this.root.style.setProperty('--fc-h', `${this.height}px`);
    this.root.style.setProperty('--fc-radius', `${options.radius ?? 22}px`);
    this.root.style.setProperty('--fc-bg', options.background ?? '#27272a');
    this.root.style.setProperty('--fc-ink', options.color ?? '#f5f5f5');
    this.root.style.setProperty('--fc-shadow', options.shadowColor ?? '#000000');
    this.root.style.setProperty('--fc-shadow-o', String(options.shadowOpacity ?? 0.45));
    this.root.style.setProperty('--fc-glare', String(options.glareOpacity ?? 0.22));

    if (options.shadow ?? true) {
      this.shadowEl = document.createElement('span');
      this.shadowEl.className = 'flip-card__shadow';
      this.shadowEl.setAttribute('aria-hidden', 'true');
      this.root.appendChild(this.shadowEl);
    } else {
      this.shadowEl = null;
    }

    this.rotor = document.createElement('div');
    this.rotor.className = 'flip-card__rotor';

    this.frontFace = document.createElement('div');
    this.frontFace.className = 'flip-card__face flip-card__face--front';
    setContent(this.frontFace, options.front);
    if (this.glareEnabled) {
      const g = document.createElement('span');
      g.className = 'flip-card__glare';
      g.setAttribute('aria-hidden', 'true');
      this.frontFace.appendChild(g);
    }

    this.backFace = document.createElement('div');
    this.backFace.className = 'flip-card__face flip-card__face--back';
    setContent(this.backFace, options.back);
    if (this.glareEnabled) {
      const g = document.createElement('span');
      g.className = 'flip-card__glare';
      g.setAttribute('aria-hidden', 'true');
      this.backFace.appendChild(g);
    }

    this.rotor.appendChild(this.frontFace);
    this.rotor.appendChild(this.backFace);
    this.root.appendChild(this.rotor);
    container.appendChild(this.root);

    this.syncFaceState();
    this.attachEvents();
    this.apply();
  }

  // ---- Public API -------------------------------------------------------

  /** Flip to the other face (animated). */
  flip(): void {
    const base = snap(this.turn.value);
    this.settleTo(isBack(base) ? base - 180 : base + 180, 0);
  }

  /** Jump to a specific face without animating (used for reduced motion). */
  setFlipped(flipped: boolean): void {
    if (this.controlled) {
      // In controlled mode external code drives `flipped`; animate toward it.
      this.animateToFace(flipped);
      return;
    }
    this.showFace(flipped);
  }

  isFlipped(): boolean {
    return this.shown;
  }

  setDisabled(disabled: boolean): void {
    this.disabled = disabled;
    this.root.tabIndex = disabled ? -1 : 0;
    if (disabled) {
      this.root.setAttribute('aria-disabled', 'true');
      this.root.dataset.disabled = '';
      this.root.removeAttribute('data-draggable');
      this.rest();
    } else {
      this.root.removeAttribute('aria-disabled');
      delete this.root.dataset.disabled;
      if (this.draggable && !this.reduce) this.root.dataset.draggable = '';
    }
  }

  destroy(): void {
    this.stopLoop();
    this.detachEvents();
    if (this.root.parentNode) this.root.parentNode.removeChild(this.root);
  }

  get element(): HTMLElement {
    return this.root;
  }

  // ---- Flip / settle logic ---------------------------------------------

  private settleTo(to: number, velocity: number): void {
    this.targetAngle = to;
    if (this.reduce) {
      this.turn.jump(to);
      this.apply();
      this.commitFace(to);
      return;
    }
    this.turn.set(to);
    this.turn.velocity = velocity;
    this.commitFace(to);
    this.startLoop();
  }

  private animateToFace(flipped: boolean): void {
    const base = snap(this.turn.value);
    const to = flipped ? (isBack(base) ? base : base + 180) : isBack(base) ? base - 180 : base;
    this.settleTo(to, 0);
  }

  private showFace(flipped: boolean): void {
    this.shown = flipped;
    this.targetAngle = flipped ? 180 : 0;
    this.turn.jump(this.targetAngle);
    this.syncFaceState();
    this.apply();
    this.onFlipChange?.(flipped);
  }

  /** Update aria/inert state + fire onFlipChange if the visible face changed. */
  private commitFace(to: number): void {
    const next = isBack(to);
    if (next === this.shown) return;
    this.shown = next;
    this.syncFaceState();
    this.onFlipChange?.(next);
  }

  private syncFaceState(): void {
    this.root.setAttribute('aria-pressed', String(this.shown));
    this.frontFace.setAttribute('aria-hidden', String(this.shown));
    this.backFace.setAttribute('aria-hidden', String(!this.shown));
    this.setInert(this.frontFace, this.shown);
    this.setInert(this.backFace, !this.shown);
    if (this.reduce) this.root.dataset.fade = this.shown ? 'back' : 'front';
  }

  private setInert(el: HTMLElement, on: boolean): void {
    if (on) el.setAttribute('inert', '');
    else el.removeAttribute('inert');
  }

  private rest(): void {
    this.tiltX.set(0);
    this.tiltY.set(0);
    this.sheen.set(0);
    this.lift.set(1);
    this.startLoop();
  }

  // ---- Render loop ------------------------------------------------------

  private startLoop(): void {
    if (this.raf !== null || this.reduce) return;
    this.lastTime = null;
    this.raf = requestAnimationFrame(this.frame);
  }

  private stopLoop(): void {
    if (this.raf !== null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
    this.lastTime = null;
  }

  private readonly frame = (now: number): void => {
    if (this.lastTime === null) this.lastTime = now;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    const turnRest = this.turn.step(dt);
    const tiltXRest = this.tiltX.step(dt);
    const tiltYRest = this.tiltY.step(dt);
    const liftRest = this.lift.step(dt);
    const sheenRest = this.sheen.step(dt);
    this.apply();

    const active =
      this.dragging || !turnRest || !tiltXRest || !tiltYRest || !liftRest || !sheenRest;
    if (active) {
      this.raf = requestAnimationFrame(this.frame);
    } else {
      this.raf = null;
      this.lastTime = null;
    }
  };

  private apply(): void {
    const turnDeg = this.turn.value;
    const liftScale = this.lift.value;
    const tX = this.tiltX.value;
    const tY = this.tiltY.value;

    let transform: string;
    if (this.axis === 'x') {
      transform = `perspective(${this.perspective}px) scale(${liftScale}) rotateY(${tY}deg) rotateX(${
        turnDeg + tX
      }deg)`;
    } else {
      transform = `perspective(${this.perspective}px) scale(${liftScale}) rotateX(${tX}deg) rotateY(${
        turnDeg + tY
      }deg)`;
    }
    this.rotor.style.transform = transform;

    this.rotor.style.setProperty('--fc-gx', `${this.gx}%`);
    this.rotor.style.setProperty('--fc-gy', `${this.gy}%`);
    this.rotor.style.setProperty('--fc-sheen', String(this.sheen.value));

    if (this.shadowEl) {
      const facing = Math.abs(Math.cos((turnDeg * Math.PI) / 180));
      const spread = 0.08 + 0.92 * facing;
      const shade = 0.1 + 0.9 * facing * facing;
      this.shadowEl.style.transform =
        this.axis === 'x' ? `scaleY(${spread})` : `scaleX(${spread})`;
      this.shadowEl.style.opacity = String(shade);
    }
  }

  // ---- Interaction ------------------------------------------------------

  private readonly onPointerDown = (e: PointerEvent): void => {
    if (this.disabled || e.button !== 0 || this.grip) return;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.stopLoop();
    this.grip = {
      id: e.pointerId,
      x: e.clientX,
      y: e.clientY,
      base: this.turn.value,
      moved: false,
      slop: e.pointerType === 'touch' ? SLOP.coarse : SLOP.fine,
      hist: []
    };
    if (!this.reduce) {
      this.lift.set(this.hoverScale);
      this.startLoop();
    }
  };

  private readonly onPointerMove = (e: PointerEvent): void => {
    const g = this.grip;
    if (g && g.id === e.pointerId) {
      const rect = this.root.getBoundingClientRect();
      const span =
        this.dragDistance > 0
          ? this.dragDistance
          : this.axis === 'x'
            ? rect.height || this.height
            : rect.width || this.width;
      const d = this.axis === 'x' ? e.clientY - g.y : e.clientX - g.x;
      if (!g.moved) {
        if (Math.abs(d) < g.slop || !this.draggable || this.reduce) return;
        g.moved = true;
        this.dragging = true;
        this.root.dataset.dragging = '';
        this.tiltX.jump(0);
        this.tiltY.jump(0);
        this.sheen.jump(0);
      }
      const deg = g.base + (this.axis === 'x' ? -1 : 1) * (d / span) * 180;
      this.turn.jump(deg);
      const now = performance.now();
      g.hist.push({ t: now, v: deg });
      while (g.hist.length > 2 && now - g.hist[0].t > HISTORY_MS) g.hist.shift();
      this.apply();
      return;
    }

    // Hover tilt + glare (fine pointers only).
    if (!this.tiltEnabled || this.reduce || this.disabled || e.pointerType === 'touch') return;
    const rect = this.root.getBoundingClientRect();
    const px = clamp((e.clientX - rect.left) / rect.width, 0, 1);
    const py = clamp((e.clientY - rect.top) / rect.height, 0, 1);
    this.tiltX.set((0.5 - py) * 2 * this.tiltMax);
    this.tiltY.set((px - 0.5) * 2 * this.tiltMax);
    this.gx = px * 100;
    this.gy = py * 100;
    this.sheen.set(1);
    this.startLoop();
  };

  private readonly onPointerUp = (e: PointerEvent): void => this.release(e, false);
  private readonly onPointerCancel = (e: PointerEvent): void => this.release(e, true);
  private readonly onLostCapture = (e: PointerEvent): void => this.release(e, true);

  private release(e: PointerEvent, cancelled: boolean): void {
    const g = this.grip;
    if (!g || g.id !== e.pointerId) return;
    this.grip = null;
    try {
      const t = e.currentTarget as HTMLElement;
      if (t.hasPointerCapture(e.pointerId)) t.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    this.dragging = false;
    delete this.root.dataset.dragging;

    const hovered =
      typeof this.root.matches === 'function' && this.root.matches(':hover') === true;
    if (e.pointerType === 'touch' || !hovered) this.rest();

    if (!g.moved) {
      if (!cancelled && this.flipOnClick) this.flip();
      else this.settleTo(this.targetAngle, 0);
      return;
    }

    const here = this.turn.value;
    let velocity = 0;
    const a = g.hist[0];
    const b = g.hist[g.hist.length - 1];
    if (!cancelled && a && b && b.t > a.t && performance.now() - b.t < 60) {
      velocity = ((b.v - a.v) / (b.t - a.t)) * 1000;
    }
    const to = cancelled
      ? snap(g.base)
      : clamp(snap(here + velocity * FLING), snap(here) - 180, snap(here) + 180);
    this.settleTo(to, velocity);
  }

  private readonly onKeyDown = (e: KeyboardEvent): void => {
    if (this.disabled || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    if (!e.repeat) this.flip();
  };

  private readonly onClick = (e: MouseEvent): void => {
    if (!this.disabled && e.detail === 0) this.flip();
  };

  private readonly onPointerEnter = (e: PointerEvent): void => {
    if (!this.reduce && !this.disabled && e.pointerType !== 'touch') {
      this.lift.set(this.hoverScale);
      this.startLoop();
    }
  };

  private readonly onPointerLeave = (): void => {
    if (!this.grip) this.rest();
  };

  private readonly onDragStart = (e: DragEvent): void => e.preventDefault();

  private attachEvents(): void {
    this.root.addEventListener('pointerdown', this.onPointerDown);
    this.root.addEventListener('pointermove', this.onPointerMove);
    this.root.addEventListener('pointerup', this.onPointerUp);
    this.root.addEventListener('pointercancel', this.onPointerCancel);
    this.root.addEventListener('lostpointercapture', this.onLostCapture);
    this.root.addEventListener('pointerenter', this.onPointerEnter);
    this.root.addEventListener('pointerleave', this.onPointerLeave);
    this.root.addEventListener('keydown', this.onKeyDown);
    this.root.addEventListener('click', this.onClick);
    this.root.addEventListener('dragstart', this.onDragStart);
  }

  private detachEvents(): void {
    this.root.removeEventListener('pointerdown', this.onPointerDown);
    this.root.removeEventListener('pointermove', this.onPointerMove);
    this.root.removeEventListener('pointerup', this.onPointerUp);
    this.root.removeEventListener('pointercancel', this.onPointerCancel);
    this.root.removeEventListener('lostpointercapture', this.onLostCapture);
    this.root.removeEventListener('pointerenter', this.onPointerEnter);
    this.root.removeEventListener('pointerleave', this.onPointerLeave);
    this.root.removeEventListener('keydown', this.onKeyDown);
    this.root.removeEventListener('click', this.onClick);
    this.root.removeEventListener('dragstart', this.onDragStart);
  }
}

export default FlipCard;
