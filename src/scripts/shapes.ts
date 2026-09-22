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

/** Spiral galaxy with a quasar core: bright bulge, two winding arms, a faint disc and thin polar jets. */
function galaxy(n: number): Shape {
  const ARMS = 2;
  const TURNS = 1.3;
  const R_MAX = 1.3;
  const CORE_R = 0.22;
  return make(n, () => {
    const u = Math.random();
    if (u < 0.14) return ball([0, 0, 0], CORE_R);
    if (u < 0.19) {
      // Polar jets: narrow cones along the spin axis, densest near the core.
      const t = Math.random() ** 1.5;
      const dir = Math.random() < 0.5 ? 1 : -1;
      const spread = 0.02 + t * 0.06;
      return [rnd() * spread, dir * (CORE_R * 0.6 + t * 1.0), rnd() * spread];
    }
    if (u < 0.34) {
      // Diffuse disc halo between the arms.
      const r = Math.sqrt(Math.random()) * R_MAX;
      const a = Math.random() * TAU;
      return [Math.cos(a) * r, rnd() * 0.04 * (1 - r / R_MAX) + rnd() * 0.01, Math.sin(a) * r];
    }
    // Spiral arms: logarithmic-ish sweep, wider and fainter toward the rim, thin in y.
    const arm = Math.floor(Math.random() * ARMS);
    const t = Math.random();
    const r = 0.12 + t * (R_MAX - 0.12);
    const a = (arm / ARMS) * TAU + t * TURNS * TAU;
    const spread = 0.04 + t * 0.14;
    const x = Math.cos(a) * r + rnd() * spread;
    const z = Math.sin(a) * r + rnd() * spread;
    return [x, rnd() * 0.035 * (1 - t * 0.6), z];
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

/** Every shape a section can rest on. Each section names its own via `data-shape`. */
const builders = { cloud, sphere, orbits, helix, wave, layers, galaxy } satisfies Record<
  string,
  (n: number) => Shape
>;

export type ShapeName = keyof typeof builders;

export const isShapeName = (v: unknown): v is ShapeName =>
  typeof v === 'string' && Object.hasOwn(builders, v);

export interface ShapeSet {
  /** One target shape per content section, in order. */
  shapes: Shape[];
  scatter: Shape;
  seeds: Shape;
}

export function buildShapes(n: number, names: readonly ShapeName[]): ShapeSet {
  return {
    shapes: names.map((name) => builders[name](n)),
    scatter: scatter(n),
    seeds: make(n, () => [Math.random(), Math.random(), Math.random()]),
  };
}
