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

/** Uniform point inside a ball of radius r centred on c. */
function ball(c: Vec3, r: number): Vec3 {
  const v: Vec3 = [rnd(), rnd(), rnd()];
  const s = (Math.cbrt(Math.random()) * r) / (Math.hypot(...v) || 1);
  return [c[0] + v[0] * s, c[1] + v[1] * s, c[2] + v[2] * s];
}

interface Ring {
  r: number;
  tiltX: number;
  tiltZ: number;
  planetAngle: number;
  planetR: number;
}

/** A point on a ring in the x–z plane, tilted about x then z. */
function onRing(ring: Ring, angle: number, radius: number): Vec3 {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  const y1 = -z * Math.sin(ring.tiltX);
  const z1 = z * Math.cos(ring.tiltX);
  return [
    x * Math.cos(ring.tiltZ) - y1 * Math.sin(ring.tiltZ),
    x * Math.sin(ring.tiltZ) + y1 * Math.cos(ring.tiltZ),
    z1,
  ];
}

/** Solar system: a sun at the centre, thin orbit rings around it, and a small planet on each ring. */
function orbits(n: number): Shape {
  const SUN_R = 0.22;
  const ORBITS = [0.45, 0.65, 0.85, 1.05, 1.25];
  // Each orbit is tilted slightly out of the shared plane, and its planet sits at a random angle on it.
  const rings: Ring[] = ORBITS.map((r) => ({
    r,
    tiltX: rnd() * 0.14,
    tiltZ: rnd() * 0.14,
    planetAngle: Math.random() * TAU,
    planetR: 0.05 + Math.random() * 0.05,
  }));
  const total = ORBITS.reduce((s, r) => s + r, 0);
  return make(n, () => {
    const u = Math.random();
    if (u < 0.12) return ball([0, 0, 0], SUN_R);
    if (u < 0.34) {
      const ring = rings[Math.floor(Math.random() * rings.length)]!;
      return ball(onRing(ring, ring.planetAngle, ring.r), ring.planetR);
    }
    // Orbit rings, weighted by circumference so the particle density is even along each.
    let pick = Math.random() * total;
    let ring = rings[rings.length - 1]!;
    for (const candidate of rings) {
      if (pick < candidate.r) {
        ring = candidate;
        break;
      }
      pick -= candidate.r;
    }
    const p = onRing(ring, Math.random() * TAU, ring.r + rnd() * 0.012);
    return [p[0], p[1] + rnd() * 0.012, p[2]];
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
  // The story opens and closes on the same cloud.
  const hero = cloud(n);
  return {
    shapes: [hero, sphere(n), layers(n), orbits(n), helix(n), wave(n), hero],
    scatter: scatter(n),
    seeds: make(n, () => [Math.random(), Math.random(), Math.random()]),
  };
}
