import { buildShapes, type ShapeName, type ShapeSet } from './shapes';

export interface ParticleOptions {
  /** The resting shape of each section, in page order. */
  shapes: readonly ShapeName[];
  /** The section the field rests on to begin with. */
  section?: number;
  count?: number;
  rotationSpeed?: number;
  color?: string;
  reducedMotion?: boolean;
}

/** Per-section amounts that morph alongside the particles. */
interface Weights {
  /** How much of the hero cloud is showing; it's bigger than the other shapes, so the view zooms out. */
  cloud: number;
  /** How much of the solar system is showing; it's drawn tilted on its axis. */
  orbits: number;
  /** Section index, which adds a little extra spin as the page goes on. */
  turn: number;
}

/** Roll applied to the solar system after it spins, so it turns about its own tilted axis (radians). */
const ORBITS_ROLL = -0.42;
/** How long a morph from one section's shape to another takes. */
const MORPH_MS = 1400;
/**
 * Cursor interaction. Particles near the pointer are pushed straight away from it, then spring back
 * once it's gone. All in screen pixels and seconds.
 */
const POINTER = {
  /** Radius of the pointer's influence, as a multiple of the field's scale (one shape unit in px). */
  radius: 0.45,
  minRadius: 60,
  maxRadius: 150,
  /** Push on a particle right under a resting pointer (px/s²); it tails off to zero at the radius. */
  push: 2600,
  /** Extra push per px/s of pointer speed, so a quick sweep flings particles further than a slow pass. */
  speedGain: 7,
  /** Fastest pointer speed the push responds to (px/s); anything faster counts the same. */
  maxSpeed: 2400,
  /** How much of the pointer's own velocity particles pick up as it passes through them (per second). */
  drag: 2.2,
  /** Spring stiffness pulling each particle back to its spot (1/s²), and the damping on that spring (1/s). */
  stiffness: 40,
  damping: 4.5,
  /** Offsets and velocities below this (px, px/s) count as at rest, so the simulation can sleep. */
  rest: 0.05,
};
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));
const smoothstep = (t: number) => t * t * (3 - 2 * t);
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
/** Each particle sets off a little after the one before it, so the morph ripples instead of snapping. */
const stagger = (t: number, seed: number) => clamp01(t * 1.25 - seed * 0.25);

/**
 * Particle field that rests on one section's shape at a time. `setSection` morphs it to another section's
 * shape over MORPH_MS; a change of section mid-morph carries on from wherever the particles are.
 */
export class ParticleField {
  private section: number;
  /** Where each particle is morphing from: a copy of a section's shape, or a snapshot taken mid-morph. */
  private readonly from: Float32Array;
  private to: Float32Array;
  private fromW: Weights;
  private toW: Weights;
  /** When the current morph began; -Infinity means it's finished. */
  private morphAt = -Infinity;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly n: number;
  private readonly spin: number;
  private color: string;
  private readonly reduced: boolean;
  private readonly set: ShapeSet;
  /** Index of the solar system section (-1 if no section uses it). */
  private readonly orbitsAt: number;
  /** Index of the hero cloud section (-1 if no section uses it). */
  private readonly cloudAt: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pf: Float32Array;
  /** Screen-space displacement of each particle from where the shape puts it, and its velocity. */
  private readonly ox: Float32Array;
  private readonly oy: Float32Array;
  private readonly vx: Float32Array;
  private readonly vy: Float32Array;
  /** Whether the pointer is over the page, and where (canvas px). */
  private hasPointer = false;
  private pointerX = 0;
  private pointerY = 0;
  /** Where the pointer was on the previous frame, for working out its speed; NaN until there is one. */
  private prevX = NaN;
  private prevY = NaN;
  /** Smoothed pointer velocity (px/s), capped at POINTER.maxSpeed. */
  private pvx = 0;
  private pvy = 0;
  /** The canvas's viewport offset; it's position: fixed, so this only changes on resize. */
  private left = 0;
  private top = 0;
  /**
   * True while nothing is displaced and the pointer is away or out of reach of every particle, so the
   * physics can be skipped. The pointer moving wakes it, as does the spin carrying a particle into reach.
   */
  private settled = true;
  private lastFrame = 0;
  private frame = 0;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t0 = performance.now();
  private raf = 0;
  private started = false;

  constructor(
    private readonly canvas: HTMLCanvasElement,
    opts: ParticleOptions,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('2D canvas unavailable');
    this.ctx = ctx;
    this.n = Math.max(500, Math.min(12000, opts.count ?? 5000));
    this.spin = opts.rotationSpeed ?? 1;
    this.color = opts.color ?? '#2f6fdd';
    this.reduced = opts.reducedMotion ?? false;
    this.set = buildShapes(this.n, opts.shapes);
    this.orbitsAt = opts.shapes.indexOf('orbits');
    this.cloudAt = opts.shapes.indexOf('cloud');
    this.section = Math.max(0, Math.min(opts.shapes.length - 1, opts.section ?? 0));
    this.to = this.set.shapes[this.section]!;
    this.from = new Float32Array(this.to);
    this.fromW = this.toW = this.weightsOf(this.section);
    this.px = new Float32Array(this.n);
    this.py = new Float32Array(this.n);
    this.pf = new Float32Array(this.n);
    this.ox = new Float32Array(this.n);
    this.oy = new Float32Array(this.n);
    this.vx = new Float32Array(this.n);
    this.vy = new Float32Array(this.n);
    this.resize();
  }

  /** Morph to the shape of section `i`. */
  setSection(i: number) {
    if (i === this.section || !this.set.shapes[i]) return;
    const now = performance.now();
    const t = this.morphT(now);
    const { from, to, n } = this;
    const { seeds } = this.set;
    if (t < 1) {
      // Mid-morph: freeze the particles where they are and set off again from there.
      for (let k = 0; k < n * 3; k += 3) {
        const tt = stagger(t, seeds[k]!);
        from[k] = mix(from[k]!, to[k]!, tt);
        from[k + 1] = mix(from[k + 1]!, to[k + 1]!, tt);
        from[k + 2] = mix(from[k + 2]!, to[k + 2]!, tt);
      }
      this.fromW = {
        cloud: mix(this.fromW.cloud, this.toW.cloud, t),
        orbits: mix(this.fromW.orbits, this.toW.orbits, t),
        turn: mix(this.fromW.turn, this.toW.turn, t),
      };
    } else {
      from.set(to);
      this.fromW = this.toW;
    }
    this.section = i;
    this.to = this.set.shapes[i]!;
    this.toW = this.weightsOf(i);
    this.morphAt = now;
    this.drawOnce();
  }

  /** Recolour the dots, e.g. when the theme changes. */
  setColor(color: string) {
    this.color = color;
    this.drawOnce();
  }

  /**
   * Tell the field where the pointer is, in viewport coordinates. Particles near it are pushed out of
   * the way, harder the faster it's moving, and drift back with a little bounce once it's gone.
   */
  setPointer(clientX: number, clientY: number) {
    if (this.reduced) return;
    this.hasPointer = true;
    this.pointerX = clientX - this.left;
    this.pointerY = clientY - this.top;
    this.settled = false;
  }

  /** The pointer has left the page; the particles spring back to their places. */
  clearPointer() {
    this.hasPointer = false;
    this.prevX = this.prevY = NaN;
    this.pvx = this.pvy = 0;
    this.settled = false;
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.canvas.getBoundingClientRect();
    this.left = r.left;
    this.top = r.top;
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.drawOnce();
  }

  start() {
    this.started = true;
    if (this.reduced) {
      this.drawOnce();
      return;
    }
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.draw(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    this.started = false;
    cancelAnimationFrame(this.raf);
  }

  /**
   * With reduced motion nothing moves between changes, so instead of a frame loop the field is drawn
   * once when it starts and again after each change of section or size.
   */
  private drawOnce() {
    if (!this.reduced || !this.started) return;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame((now) => this.draw(now));
  }

  private weightsOf(i: number): Weights {
    return { cloud: i === this.cloudAt ? 1 : 0, orbits: i === this.orbitsAt ? 1 : 0, turn: i };
  }

  /** How far the current morph has got, eased, from 0 to 1. Reduced motion swaps shapes outright. */
  private morphT(now: number) {
    if (this.reduced) return 1;
    return smoothstep(clamp01((now - this.morphAt) / MORPH_MS));
  }

  /**
   * One step of the pointer physics: push the particles within reach of the pointer away from it, then
   * let every displaced particle spring back toward its spot. Runs on the projected screen positions, so
   * the displacement rides along with the shape's spin.
   */
  private nudge(dt: number, scale: number) {
    const { n, px, py, ox, oy, vx, vy, hasPointer, pointerX: cx, pointerY: cy } = this;
    const P = POINTER;
    let speed = 0;
    if (hasPointer) {
      // Pointer velocity, smoothed so a single jittery event doesn't spike the push, and capped so a
      // stalled frame (or a stale previous position) can't fling the particles off the page.
      const hasPrev = !Number.isNaN(this.prevX);
      const ivx = hasPrev && dt > 0 ? (cx - this.prevX) / dt : 0;
      const ivy = hasPrev && dt > 0 ? (cy - this.prevY) / dt : 0;
      const k = Math.min(1, dt * 25);
      this.pvx += (ivx - this.pvx) * k;
      this.pvy += (ivy - this.pvy) * k;
      speed = Math.hypot(this.pvx, this.pvy);
      if (speed > P.maxSpeed) {
        this.pvx *= P.maxSpeed / speed;
        this.pvy *= P.maxSpeed / speed;
        speed = P.maxSpeed;
      }
      this.prevX = cx;
      this.prevY = cy;
    }
    const R = this.reach(scale);
    const R2 = R * R;
    const push = (P.push + P.speedGain * speed) * dt;
    const dragX = this.pvx * P.drag * dt;
    const dragY = this.pvy * P.drag * dt;
    const spring = P.stiffness * dt;
    const damp = Math.max(0, 1 - P.damping * dt);

    /** Whether any particle is displaced or still moving. */
    let awake = false;
    /** Whether any particle is within the pointer's reach. */
    let touched = false;
    for (let i = 0; i < n; i++) {
      let sx = ox[i]!;
      let sy = oy[i]!;
      let ux = vx[i]!;
      let uy = vy[i]!;
      if (hasPointer) {
        const dx = px[i]! + sx - cx;
        const dy = py[i]! + sy - cy;
        const d2 = dx * dx + dy * dy;
        if (d2 < R2) {
          touched = true;
          const d = Math.sqrt(d2) || 1e-3;
          // Strongest right under the pointer, fading smoothly to nothing at the edge of its reach.
          let g = 1 - d / R;
          g *= g;
          ux += (dx / d) * push * g + dragX * g;
          uy += (dy / d) * push * g + dragY * g;
        }
      }
      // Spring back to rest; damping is applied after the step so a full displacement can't blow up.
      ux = (ux - sx * spring) * damp;
      uy = (uy - sy * spring) * damp;
      sx += ux * dt;
      sy += uy * dt;
      ox[i] = sx;
      oy[i] = sy;
      vx[i] = ux;
      vy[i] = uy;
      px[i] = px[i]! + sx;
      py[i] = py[i]! + sy;
      if (
        !awake &&
        (Math.abs(sx) > P.rest ||
          Math.abs(sy) > P.rest ||
          Math.abs(ux) > P.rest ||
          Math.abs(uy) > P.rest)
      )
        awake = true;
    }
    if (!touched && !awake) {
      ox.fill(0);
      oy.fill(0);
      vx.fill(0);
      vy.fill(0);
      this.settled = true;
    }
  }

  /** Radius of the pointer's influence in px, for the current size of the shape. */
  private reach(scale: number) {
    return Math.max(POINTER.minRadius, Math.min(POINTER.maxRadius, scale * POINTER.radius));
  }

  /** Whether a resting pointer has any particle within reach (the spin can carry one into it). */
  private inReach(scale: number) {
    const { n, px, py, pointerX: cx, pointerY: cy } = this;
    const R2 = this.reach(scale) ** 2;
    for (let i = 0; i < n; i++) {
      const dx = px[i]! - cx;
      const dy = py[i]! - cy;
      if (dx * dx + dy * dy < R2) return true;
    }
    return false;
  }

  private draw(now: number) {
    const { ctx, n, w: W, h: H, dpr, px, py, pf } = this;
    const { scatter: S, seeds } = this.set;
    const A = this.from;
    const B = this.to;
    const t = this.morphT(now);
    const cloudW = mix(this.fromW.cloud, this.toW.cloud, t);
    const rollW = mix(this.fromW.orbits, this.toW.orbits, t);
    const turn = mix(this.fromW.turn, this.toW.turn, t);

    const time = this.reduced ? 0 : (now - this.t0) / 1000;
    const intro = this.reduced ? 1 : clamp01((time - 0.2) / 2.8);
    const ay = time * 0.25 * this.spin + turn * 0.9;
    const ax = 0.35 + Math.sin(time * 0.3) * 0.08;

    const c1 = Math.cos(ay);
    const s1 = Math.sin(ay);
    const c2 = Math.cos(ax);
    const s2 = Math.sin(ax);
    // Ease the tilt in and out as the solar system morphs from and into its neighbours.
    const c3 = Math.cos(ORBITS_ROLL * rollW);
    const s3 = Math.sin(ORBITS_ROLL * rollW);

    // Wide screens: centre the shape in the space right of the text column.
    // Narrow: push it to the top-right corner (partly off-screen is fine) and fade it so text stays readable.
    const wide = W > 900;
    const textEdge = Math.min(W, 600) + 24;
    const cxs = wide ? (textEdge + W) / 2 : W * 0.8;
    const cys = wide ? H * 0.5 : H * 0.28;
    // Particle opacity by device class: phones, tablets (≥768px), desktops (≥1024px).
    const fade = W >= 1024 ? 0.6 : W >= 768 ? 0.4 : 0.2;
    // The hero cloud is bigger than the other shapes, so zoom out in proportion to how much of it is showing.
    const cloudR = 1.1 + cloudW;
    const half = wide ? (W - textEdge) / 2 - 24 : W * 0.46;
    const fit = Math.max(1.3, cloudR);
    const scale = Math.min(half / fit, (H * 0.36) / fit) * 1.38;
    // The resting cloud drifts more than the solid shapes; blend rather than switch.
    const drift = this.reduced ? 0 : 0.012 + 0.038 * cloudW;

    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const tt = stagger(t, seeds[k]!);
      let x = A[k]! + (B[k]! - A[k]!) * tt + Math.sin(time * 0.8 + seeds[k]! * 9) * drift;
      let y =
        A[k + 1]! + (B[k + 1]! - A[k + 1]!) * tt + Math.cos(time * 0.7 + seeds[k + 1]! * 9) * drift;
      let z =
        A[k + 2]! + (B[k + 2]! - A[k + 2]!) * tt + Math.sin(time * 0.9 + seeds[k + 2]! * 9) * drift;
      if (intro < 1) {
        let e = clamp01(intro * 1.3 - seeds[k + 1]! * 0.3);
        e = e < 0.5 ? 4 * e * e * e : 1 - (-2 * e + 2) ** 3 / 2;
        x = S[k]! + (x - S[k]!) * e;
        y = S[k + 1]! + (y - S[k + 1]!) * e;
        z = S[k + 2]! + (z - S[k + 2]!) * e;
      }
      const x1 = x * c1 + z * s1;
      const z1 = -x * s1 + z * c1;
      const y1 = y * c2 - z1 * s2;
      const z2 = y * s2 + z1 * c2;
      const x2 = x1 * c3 - y1 * s3;
      const y2 = x1 * s3 + y1 * c3;
      const f = 3.2 / (3.2 + z2);
      px[i] = cxs + x2 * f * scale;
      py[i] = cys - y2 * f * scale;
      pf[i] = f;
    }

    const dt = Math.min(0.05, Math.max(0, (now - this.lastFrame) / 1000));
    this.lastFrame = now;
    // A pointer parked out of reach lets the physics sleep; check now and then whether the spin has
    // brought a particle to it, since no pointer event will.
    if (this.settled && this.hasPointer && ++this.frame % 12 === 0 && this.inReach(scale))
      this.settled = false;
    if (!this.settled) this.nudge(dt, scale);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.color;
    const size = wide ? 2.1 : 1.68;
    // Every dot is the same colour, so with source-over blending the paint order can't change the picture
    // and there's no need to sort by depth.
    for (let i = 0; i < n; i++) {
      const f = pf[i]!;
      ctx.globalAlpha = Math.max(0.15, Math.min(0.95, 0.25 + (f - 0.6) * 1.6)) * fade;
      ctx.beginPath();
      ctx.arc(px[i]!, py[i]!, Math.max(0.6, size * f), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
