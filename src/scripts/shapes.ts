/** Flat xyz buffer: particle i lives at [i*3, i*3+1, i*3+2]. */
export type Shape = Float32Array;
type Vec3 = [number, number, number];

const TAU = Math.PI * 2;
const rnd = () => Math.random() * 2 - 1;

function make(n: number, fn: (i: number) => Vec3): Shape {
  const a = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const p = fn(i);
    a[i * 3] = p[0];
    a[i * 3 + 1] = p[1];
    a[i * 3 + 2] = p[2];
  }
  return a;
}

function cloud(n: number): Shape {
  return make(n, () => {
    let v: Vec3;
    do v = [rnd(), rnd(), rnd()];
    while (v[0] ** 2 + v[1] ** 2 + v[2] ** 2 > 1);
    const s = 1.5 + Math.random() * 0.3;
    return [v[0] * s, v[1] * s, v[2] * s];
  });
}

/** Fibonacci sphere. */
function sphere(n: number): Shape {
  return make(n, (i) => {
    const k = i + 0.5;
    const phi = Math.acos(1 - (2 * k) / n);
    const th = Math.PI * (1 + Math.sqrt(5)) * k;
    return [Math.cos(th) * Math.sin(phi), Math.sin(th) * Math.sin(phi), Math.cos(phi)];
  });
}

/** Three stacked square planes with dense edges. */
function layers(n: number): Shape {
  const s = 1.05;
  return make(n, () => {
    const y = (Math.floor(Math.random() * 3) - 1) * 0.5;
    if (Math.random() < 0.45) {
      const t = rnd() * s;
      const edges: [number, number][] = [
        [t, s],
        [t, -s],
        [s, t],
        [-s, t],
      ];
      const p = edges[Math.floor(Math.random() * 4)]!;
      return [p[0] + rnd() * 0.012, y + rnd() * 0.012, p[1] + rnd() * 0.012];
    }
    return [rnd() * s, y + rnd() * 0.008, rnd() * s];
  });
}

function cube(n: number): Shape {
  const s = 0.8;
  return make(n, () => {
    const u = rnd() * 0.8;
    const v = rnd() * 0.8;
    const faces: Vec3[] = [
      [s, u, v],
      [-s, u, v],
      [u, s, v],
      [u, -s, v],
      [u, v, s],
      [u, v, -s],
    ];
    return faces[Math.floor(Math.random() * 6)]!;
  });
}

/** DNA: two thick backbone strands (70%) + discrete base-pair rungs (30%). */
function helix(n: number): Shape {
  const RUNGS = 22;
  const RAD = 0.5;
  const HGT = 2.6;
  const TURNS = 2.5;
  return make(n, () => {
    if (Math.random() < 0.7) {
      const t = Math.random();
      const strand = Math.random() < 0.5 ? 0 : Math.PI;
      const a = t * TAU * TURNS + strand;
      const r = RAD + rnd() * 0.035;
      return [Math.cos(a) * r, (t - 0.5) * HGT + rnd() * 0.02, Math.sin(a) * r];
    }
    const t = (Math.floor(Math.random() * RUNGS) + 0.5) / RUNGS;
    const a = t * TAU * TURNS;
    const s = rnd() * 0.92;
    return [
      Math.cos(a) * RAD * s + rnd() * 0.015,
      (t - 0.5) * HGT + rnd() * 0.015,
      Math.sin(a) * RAD * s + rnd() * 0.015,
    ];
  });
}

function wave(n: number): Shape {
  const cols = Math.ceil(Math.sqrt(n));
  return make(n, (i) => {
    const x = ((i % cols) / cols) * 3.4 - 1.7;
    const z = (Math.floor(i / cols) / cols) * 3.4 - 1.7;
    return [x, Math.sin(x * 2.2) * 0.3 + Math.cos(z * 2.2) * 0.3, z];
  });
}

/** Chat bubble: wide ellipse + tail at bottom-left, three dots punched out. Sampled from a 2D canvas. */
function chatBubble(n: number): Shape {
  const W = 360;
  const H = 320;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d", { willReadFrequently: true });
  const pts: [number, number][] = [];
  if (x) {
    x.fillStyle = "#000";
    x.beginPath();
    x.ellipse(180, 140, 160, 120, 0, 0, TAU);
    x.fill();
    x.beginPath();
    x.moveTo(60, 200);
    x.quadraticCurveTo(66, 262, 30, 300);
    x.quadraticCurveTo(100, 292, 132, 250);
    x.closePath();
    x.fill();
    x.globalCompositeOperation = "destination-out";
    for (const dx of [-72, 0, 72]) {
      x.beginPath();
      x.arc(180 + dx, 140, 22, 0, TAU);
      x.fill();
    }
    const d = x.getImageData(0, 0, W, H).data;
    for (let py = 0; py < H; py += 2)
      for (let px = 0; px < W; px += 2)
        if (d[(py * W + px) * 4 + 3]! > 128) pts.push([(px - 180) / 140, -(py - 160) / 140]);
  }
  return make(n, () => {
    const p = pts.length ? pts[Math.floor(Math.random() * pts.length)]! : [0, 0];
    return [p[0] + rnd() * 0.01, p[1] + rnd() * 0.01, rnd() * 0.12];
  });
}

/** Random shell the particles fly in from on first load. */
function scatter(n: number): Shape {
  return make(n, () => {
    const v: Vec3 = [rnd(), rnd(), rnd()];
    const l = Math.hypot(...v) || 1;
    const s = 2.6 + Math.random() * 2.2;
    return [(v[0] / l) * s, (v[1] / l) * s, (v[2] / l) * s];
  });
}

export interface ShapeSet {
  /** One target shape per content stage, in order. */
  shapes: Shape[];
  scatter: Shape;
  seeds: Shape;
}

export function buildShapes(n: number): ShapeSet {
  return {
    shapes: [cloud(n), sphere(n), layers(n), cube(n), helix(n), wave(n), chatBubble(n)],
    scatter: scatter(n),
    seeds: make(n, () => [Math.random(), Math.random(), Math.random()]),
  };
}
