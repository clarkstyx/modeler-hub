/**
 * Parametric paracord knot bead: a short tube whose outside looks like a tied
 * knot (coil, twisted rope, round braid or a snake-knot chain), with a bore
 * for the cord. Every length is in millimetres.
 *
 * Frame: the bead stands on the bed, bore vertical, centred on the z axis.
 * The outside is r(θ, z) = core radius + pattern; the inside is the bore with
 * a chamfer at each end so the cord feeds in.
 */
export type Pattern = "coil" | "rope" | "braid" | "snake";

export const PATTERN_LABELS: Record<Pattern, string> = {
  snake: "Snake knot (chain of links)",
  rope: "Twisted rope",
  braid: "Round braid (woven)",
  coil: "Coil wrap (like the photo)",
};

export interface BeadParams {
  pattern: Pattern;
  height: number;
  /** Outside diameter over the ridges. */
  diameter: number;
  /** Hole for the cord. 550 paracord is about 4 mm; two strands need about 8 mm. */
  bore: number;
  /** Chamfer at each end of the bore so the cord feeds in. */
  boreChamfer: number;
  /** How far the pattern's ridges stand out (ridge top to valley). */
  ridgeDepth: number;
  /** Coil: height of one wrap. Snake: height of one link. */
  pitch: number;
  /** Rope and braid: strands around. */
  strands: number;
  /** Rope and braid: height of one full turn of a strand (more = steeper, straighter strands). */
  twist: number;
  /** The ridges flatten out over this height at each end, so the rims are plain and sturdy. */
  endFade: number;

  color: string;
  /** How many beads the 3MF holds (packed on plates). */
  count: number;

  // --- print settings the checks are made against
  nozzle: number;
  layerHeight: number;
  bedSize: number;
}

export const DEFAULT_PARAMS: BeadParams = {
  pattern: "snake",
  height: 16,
  diameter: 12,
  bore: 5.5,
  boreChamfer: 0.8,
  ridgeDepth: 1.3,
  pitch: 5,
  strands: 5,
  twist: 22,
  endFade: 1.2,
  color: "#F28BB6",
  count: 20,
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
};

export const LIMITS = {
  height: { min: 6, max: 60, step: 0.5 },
  diameter: { min: 6, max: 30, step: 0.5 },
  bore: { min: 2, max: 16, step: 0.1 },
  boreChamfer: { min: 0, max: 2, step: 0.1 },
  ridgeDepth: { min: 0, max: 3, step: 0.1 },
  pitch: { min: 1.5, max: 12, step: 0.1 },
  strands: { min: 2, max: 6, step: 1 },
  twist: { min: 6, max: 80, step: 1 },
  endFade: { min: 0, max: 4, step: 0.1 },
  count: { min: 1, max: 200, step: 1 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.32, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
} as const;

/** Gap between beads on the plate and clear border around it. */
export const PLATE_GAP = 4;
export const PLATE_BORDER = 6;

export interface Derived {
  /** Mean outside radius: ridges rise ridgeDepth/2 above it and valleys dip the same below. */
  coreRadius: number;
  /** Thinnest wall: valley of the pattern to the bore (chamfers aside). */
  minWall: number;
  /** Steepest overhang on the outside, as dr/dz (1 = 45°). */
  maxOverhang: number;
  overhangDeg: number;
}

const TAU = Math.PI * 2;
const smoothstep = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
/** Smooth maximum: like Math.max but with rounded corners where the two cross. */
const smax = (a: number, b: number, k: number) => {
  const h = Math.min(1, Math.max(0, 0.5 + (0.5 * (b - a)) / k));
  return b * h + a * (1 - h) + k * h * (1 - h);
};

/**
 * One round cord seen from outside, over one period of `x`: a rounded top at
 * x = 0 and a sharp crease at x = ±π where it meets the next strand. Its slope
 * is never more than a sine wave's, so it costs no extra overhang.
 */
const cord = (x: number) => 2 * Math.abs(Math.cos(x / 2)) - 1;

/**
 * Pattern height at angle θ and height z, from −1 (crease) to +1 (top of a
 * cord). All patterns are continuous with a finite slope everywhere.
 */
export function patternHeight(p: BeadParams, theta: number, z: number): number {
  switch (p.pattern) {
    case "coil":
      // One cord wrapped around the core: a helix with one turn per pitch.
      return cord((TAU * z) / p.pitch - theta);
    case "rope": {
      // `strands` cords twisted together, each a helix with one turn per `twist`.
      const n = Math.max(2, Math.round(p.strands));
      return cord(n * theta - (TAU * z) / p.twist);
    }
    case "braid": {
      // Two families of cords crossing; the higher one shows at every crossing, so it reads as woven.
      const n = Math.max(2, Math.round(p.strands));
      const a = cord(n * theta - (TAU * z) / p.twist);
      const b = cord(n * theta + (TAU * z) / p.twist);
      return smax(a, b, 0.5) * 0.8 - 0.2;
    }
    case "snake": {
      // A chain of links, each made of two cords side by side, turned 90° from the link below
      // and waisted at the joins, the way a snake knot stacks. The quarter turn is spread over the
      // whole link, so the cords lean diagonally like the bights of the real knot.
      const link = Math.floor(z / p.pitch);
      const u = z / p.pitch - link; // 0..1 inside the link
      const turn = smoothstep(0, 1, u); // each link twists a quarter turn into the next
      const phase = (Math.PI / 2) * (link + turn);
      const swell = 0.45 + 0.55 * Math.sin(Math.PI * u); // full mid-link, waisted at the joins
      const lobes = cord(2 * (theta - phase));
      return swell * (0.45 + 0.55 * lobes) * 2 - 1;
    }
  }
}

/** Outside radius at angle θ and height z. */
export function outerRadius(p: BeadParams, d: Derived, theta: number, z: number): number {
  const depth = p.ridgeDepth / 2;
  // The ridges fade to the mean radius at each end: plain rims, and no extra slope from a chamfer.
  const endIn = p.endFade > 0 ? smoothstep(0, 1, Math.min(1, z / p.endFade, (p.height - z) / p.endFade)) : 1;
  return d.coreRadius + endIn * depth * patternHeight(p, theta, z);
}

export function derive(p: BeadParams): Derived {
  const coreRadius = p.diameter / 2 - p.ridgeDepth / 2;
  const minWall = coreRadius - p.ridgeDepth / 2 - p.bore / 2;
  // Steepest outward slope of the pattern, sampled on a fine grid.
  const base: Derived = { coreRadius, minWall, maxOverhang: 0, overhangDeg: 0 };
  const dz = 0.1;
  let worst = 0;
  const N = 180;
  const M = Math.ceil(p.height / dz);
  for (let j = 0; j < N; j++) {
    const theta = (j / N) * TAU;
    let prev = outerRadius(p, base, theta, 0);
    for (let i = 1; i <= M; i++) {
      const r = outerRadius(p, base, theta, Math.min(p.height, i * dz));
      worst = Math.max(worst, (r - prev) / dz);
      prev = r;
    }
  }
  return { ...base, maxOverhang: worst, overhangDeg: (Math.atan(worst) * 180) / Math.PI };
}
