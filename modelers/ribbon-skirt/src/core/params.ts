/**
 * Parametric ribbon skirt ornament. Every length is in millimetres.
 *
 * Frame: the skirt stands on the bed, hem down, centred on the z axis; z is up.
 * Parts: a hollow pleated skirt (pleats deepest at the hem, fading to nothing
 * where they gather into the waistband), a ribbed waistband with a solid top
 * whose underside is a 45° cone (no supports), and a hanging loop. The ribbon
 * bands are horizontal slices cut out of the body as separate parts, one per
 * colour, so each lands on its own filament slot.
 */
export interface SkirtParams {
  /** Body height from the hem to the top of the waistband (the loop comes on top). */
  height: number;
  /** Widest diameter at the hem, pleat tips included. */
  bottomDiameter: number;
  /** Waistband diameter (where the pleats gather). */
  topDiameter: number;
  /** Profile: 1 = straight cone, above 1 = flares out more towards the hem. */
  flare: number;
  /** Number of pleats around. */
  pleats: number;
  /** How far a pleat stands out at the hem (half its in-out swing). */
  pleatDepth: number;
  /** How far up the pleats stay deep: 1 = they fade evenly, higher = deep longer, gathering just under the waistband. */
  pleatReach: number;
  /** Horizontal wall thickness (what the slicer sees on every layer). */
  wall: number;

  waistHeight: number;
  /** Small gathers around the waistband (0 = smooth). */
  waistRibs: number;
  waistRibDepth: number;

  loopDiameter: number;
  loopHole: number;
  loopThickness: number;

  // --- colours
  /** Skirt colour (everything that is not a ribbon). */
  baseColor: string;
  /** Ribbon colours from the hem up, comma-separated hex: "#FF5A36,#A23CFF,#1E78FF". */
  ribbons: string;
  /** Skirt colour below the first ribbon. */
  hemHeight: number;
  ribbonWidth: number;
  /** Skirt colour showing between ribbons. */
  ribbonGap: number;

  // --- print settings the checks are made against
  nozzle: number;
  layerHeight: number;
  bedSize: number;
}

export const DEFAULT_PARAMS: SkirtParams = {
  height: 70,
  bottomDiameter: 70,
  topDiameter: 24,
  flare: 1.25,
  pleats: 12,
  pleatDepth: 3.5,
  pleatReach: 2,
  wall: 1.6,
  waistHeight: 10,
  waistRibs: 28,
  waistRibDepth: 0.8,
  loopDiameter: 14,
  loopHole: 6,
  loopThickness: 4,
  baseColor: "#151515",
  ribbons: "#FF5A36,#A23CFF,#1E78FF",
  hemHeight: 3,
  ribbonWidth: 9,
  ribbonGap: 3,
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
};

export const LIMITS = {
  height: { min: 25, max: 250, step: 0.5 },
  bottomDiameter: { min: 25, max: 250, step: 0.5 },
  topDiameter: { min: 10, max: 120, step: 0.5 },
  flare: { min: 1, max: 2.5, step: 0.05 },
  pleats: { min: 0, max: 36, step: 1 },
  pleatDepth: { min: 0, max: 12, step: 0.1 },
  pleatReach: { min: 1, max: 6, step: 0.1 },
  wall: { min: 0.8, max: 4, step: 0.1 },
  waistHeight: { min: 3, max: 40, step: 0.5 },
  waistRibs: { min: 0, max: 72, step: 1 },
  waistRibDepth: { min: 0, max: 2.5, step: 0.1 },
  loopDiameter: { min: 6, max: 40, step: 0.5 },
  loopHole: { min: 2, max: 30, step: 0.5 },
  loopThickness: { min: 2, max: 10, step: 0.5 },
  hemHeight: { min: 0, max: 40, step: 0.5 },
  ribbonWidth: { min: 0.6, max: 80, step: 0.2 },
  ribbonGap: { min: 0, max: 30, step: 0.2 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.32, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
} as const;

/** Most ribbons the UI offers. One AMS has four slots and the skirt colour takes one. */
export const MAX_RIBBONS = 8;
/** Solid material above the waistband's 45° inner cone. */
export const CAP_THICKNESS = 2;
/** How far the loop sinks into the top so it is fused, not just touching. */
export const LOOP_EMBED = 1.5;

export const ribbonList = (p: SkirtParams): string[] =>
  p.ribbons.split(",").map((s) => s.trim().toUpperCase()).filter((s) => /^#[0-9A-F]{6}$/.test(s)).slice(0, MAX_RIBBONS);

/** Everything derived from the parameters that the geometry and the UI both need. */
export interface Derived {
  /** Height of the pleated skirt (hem to waistband). */
  skirtHeight: number;
  /** Waistband height actually used (raised so the inner cone fits under a solid top). */
  waistHeight: number;
  /** Top of the body (waistband), where the loop sits. */
  bodyTop: number;
  /** Mean skirt radius at the hem (pleat tips stand out by pleatDepth more). */
  bottomRadius: number;
  topRadius: number;
  /** Inner radius at the skirt's top = base of the 45° inner cone. */
  innerTopRadius: number;
  /** Highest point, top of the loop. */
  totalHeight: number;
  /** Ribbon z ranges from the hem up, clipped to the body. */
  ribbons: { hex: string; z0: number; z1: number }[];
}

export function derive(p: SkirtParams): Derived {
  const topRadius = p.topDiameter / 2;
  const innerTopRadius = Math.max(1, topRadius - p.wall);
  const waistHeight = Math.max(p.waistHeight, innerTopRadius + CAP_THICKNESS);
  const skirtHeight = Math.max(5, p.height - waistHeight);
  const bodyTop = skirtHeight + waistHeight;
  const ribbons: Derived["ribbons"] = [];
  let z = p.hemHeight;
  for (const hex of ribbonList(p)) {
    const z1 = Math.min(bodyTop, z + p.ribbonWidth);
    if (z1 - z > 0.05) ribbons.push({ hex, z0: z, z1 });
    z += p.ribbonWidth + p.ribbonGap;
  }
  return {
    skirtHeight,
    waistHeight,
    bodyTop,
    bottomRadius: p.bottomDiameter / 2 - (p.pleats > 0 ? p.pleatDepth : 0),
    topRadius,
    innerTopRadius,
    totalHeight: bodyTop - LOOP_EMBED + p.loopDiameter,
    ribbons,
  };
}

/** Mean skirt radius at height fraction u (0 = hem, 1 = waistband). */
export const profileRadius = (p: SkirtParams, d: Derived, u: number) =>
  d.topRadius + (d.bottomRadius - d.topRadius) * Math.pow(1 - u, p.flare);

/** Pleat swing at height fraction u: full at the hem, zero at the waistband, finite slope everywhere. */
export const pleatAmplitude = (p: SkirtParams, u: number) => (p.pleats > 0 ? p.pleatDepth * (1 - Math.pow(u, p.pleatReach)) : 0);

/**
 * Pleat shape across one pleat, from +1 at the fold to −1 at the crease: soft
 * rounded folds facing out and sharp creases facing in, like pleated fabric.
 * (The rounded folds are what the wall has to bend around, so they are kept wide.)
 */
export const pleatShape = (phase: number) => 2 * Math.abs(Math.cos(phase / 2)) - 1;

/** Outer skirt radius at angle θ and height fraction u. */
export const outerRadius = (p: SkirtParams, d: Derived, theta: number, u: number) =>
  profileRadius(p, d, u) + pleatAmplitude(p, u) * pleatShape(p.pleats * theta);
