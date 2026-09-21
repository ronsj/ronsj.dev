import { buildShapes, type ShapeName, type ShapeSet } from './shapes';

export interface ParticleOptions {
  /** The resting shape of each stage, in scroll order. */
  shapes: readonly ShapeName[];
  count?: number;
  rotationSpeed?: number;
  color?: string;
  reducedMotion?: boolean;
}

/** Roll applied to the solar system after it spins, so it turns about its own tilted axis (radians). */
const ORBITS_ROLL = -0.42;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * Scroll-driven particle field. `progress` runs from 0 to shapes.length - 1;
 * integer values are the resting shapes, fractions morph between neighbours.
 */
export class ParticleField {
  progress = 0;
  /** Set while a nav link smooth-scrolls across several stages, so we morph straight to the target. */
  private jump: { from: number; to: number } | null = null;

  private readonly ctx: CanvasRenderingContext2D;
  private readonly n: number;
  private readonly spin: number;
  private readonly color: string;
  private readonly reduced: boolean;
  private readonly set: ShapeSet;
  /** Index of the solar system, which is shown tilted on its axis (-1 if no stage uses it). */
  private readonly orbitsAt: number;
  /** Index of the hero cloud, which is bigger than the other shapes (-1 if no stage uses it). */
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
    this.px = new Float32Array(this.n);
    this.py = new Float32Array(this.n);
    this.pz = new Float32Array(this.n);
    this.pf = new Float32Array(this.n);
    this.order = new Uint32Array(this.n);
    this.resize();
  }

  jumpTo(to: number) {
    if (Math.abs(this.progress - to) > 0.02) this.jump = { from: this.progress, to };
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

  private draw(now: number) {
    const { ctx, n, w: W, h: H, dpr, px, py, pz, pf, order } = this;
    const { shapes, scatter: S, seeds } = this.set;
    const last = shapes.length - 1;
    const p = this.progress;

    let i0 = Math.floor(p);
    let i1 = Math.min(last, i0 + 1);
    let t = p - i0;
    if (this.jump) {
      const J = this.jump;
      const span = J.to - J.from;
      const u = span === 0 ? 1 : (p - J.from) / span;
      if (u >= 0.995) this.jump = null;
      else {
        i0 = Math.round(J.from);
        i1 = J.to;
        t = clamp01(u);
      }
    }
    // Hold each shape for a beat at either end of the scroll segment, then smoothstep.
    t = clamp01((t - 0.12) / 0.76);
    t = t * t * (3 - 2 * t);

    const A = shapes[i0]!;
    const B = shapes[i1]!;
    const time = this.reduced ? 0 : (now - this.t0) / 1000;
    const intro = this.reduced ? 1 : clamp01((time - 0.2) / 2.8);
    const ay = time * 0.25 * this.spin + p * 0.9;
    const ax = 0.35 + Math.sin(time * 0.3) * 0.08;

    const c1 = Math.cos(ay);
    const s1 = Math.sin(ay);
    const c2 = Math.cos(ax);
    const s2 = Math.sin(ax);
    // Ease the tilt in and out as the solar system morphs from and into its neighbours.
    const rollW = i0 === this.orbitsAt ? 1 - t : i1 === this.orbitsAt ? t : 0;
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
    // The hero cloud is bigger than the other shapes, so zoom out in proportion to how much of it is
    // on screen. This stays continuous whichever direction we morph, including nav jumps.
    const cloudW = (i0 === this.cloudAt ? 1 - t : 0) + (i1 === this.cloudAt ? t : 0);
    const cloudR = 1.1 + cloudW;
    const half = wide ? (W - textEdge) / 2 - 24 : W * 0.46;
    const fit = Math.max(1.3, cloudR);
    const scale = Math.min(half / fit, (H * 0.36) / fit) * 1.38;
    // The resting cloud drifts more than the solid shapes; blend rather than switch.
    const drift = this.reduced ? 0 : 0.012 + 0.038 * cloudW;

    for (let i = 0; i < n; i++) {
      const k = i * 3;
      const tt = clamp01(t * 1.25 - seeds[k]! * 0.25);
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
