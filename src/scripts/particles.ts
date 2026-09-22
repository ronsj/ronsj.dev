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
  private readonly color: string;
  private readonly reduced: boolean;
  private readonly set: ShapeSet;
  /** Index of the solar system section (-1 if no section uses it). */
  private readonly orbitsAt: number;
  /** Index of the hero cloud section (-1 if no section uses it). */
  private readonly cloudAt: number;
  private readonly px: Float32Array;
  private readonly py: Float32Array;
  private readonly pz: Float32Array;
  private readonly pf: Float32Array;
  private readonly order: Uint32Array;
  private w = 0;
  private h = 0;
  private dpr = 1;
  private t0 = performance.now();
  private raf = 0;

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
    this.pz = new Float32Array(this.n);
    this.pf = new Float32Array(this.n);
    this.order = new Uint32Array(this.n);
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
  }

  resize() {
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
  }

  start() {
    const loop = (now: number) => {
      this.raf = requestAnimationFrame(loop);
      this.draw(now);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
  }

  private weightsOf(i: number): Weights {
    return { cloud: i === this.cloudAt ? 1 : 0, orbits: i === this.orbitsAt ? 1 : 0, turn: i };
  }

  /** How far the current morph has got, eased, from 0 to 1. Reduced motion swaps shapes outright. */
  private morphT(now: number) {
    if (this.reduced) return 1;
    return smoothstep(clamp01((now - this.morphAt) / MORPH_MS));
  }

  private draw(now: number) {
    const { ctx, n, w: W, h: H, dpr, px, py, pz, pf, order } = this;
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
      pz[i] = z2;
      pf[i] = f;
      order[i] = i;
    }
    order.sort((a, b) => pz[a]! - pz[b]!);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = this.color;
    const size = wide ? 2.1 : 1.68;
    for (let j = 0; j < n; j++) {
      const i = order[j]!;
      const f = pf[i]!;
      ctx.globalAlpha = Math.max(0.15, Math.min(0.95, 0.25 + (f - 0.6) * 1.6)) * fade;
      ctx.beginPath();
      ctx.arc(px[i]!, py[i]!, Math.max(0.6, size * f), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
