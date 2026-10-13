/**
 * Parametric model of a sliding-lid box. Every length is in millimetres.
 *
 * Coordinate frame: the box sits on the bed with its outer corner at the
 * origin. X runs along the LENGTH (the lid slides along X and enters from the
 * front face at x = 0), Y runs along the WIDTH, Z is up.
 */

export type SizeMode = "inner" | "outer";
export type ReliefMode = "raised" | "engraved" | "inlay";
export type TextDirection = "along" | "across";
export type FontId = "sans" | "rounded" | "serif" | "droidSans";
export type LidGrip = "none" | "thumbNotch" | "ridge";

export interface BoxParams {
  /** Whether length/width/height describe the inside (what fits) or the outside. */
  sizeMode: SizeMode;
  length: number;
  width: number;
  height: number;
  wall: number;
  base: number;
  cornerRadius: number;

  // --- sliding lid
  lidThickness: number;
  /** How far the lid rail cuts into the side and back walls. */
  railDepth: number;
  /** Material left above the rail (keeps the lid captive). */
  railLip: number;
  /** Gap on every side of the lid inside its rail; tune with the calibration set. */
  clearance: number;
  lidGrip: LidGrip;
  gripDepth: number;

  // --- dividers (sorting-tray mode)
  dividerCols: number;
  dividerRows: number;
  dividerThickness: number;
  /** Divider height as a fraction (0–1) of the inside height. */
  dividerHeightPct: number;

  // --- lid decoration
  text: string;
  font: FontId;
  /** Capital-letter height. Shrinks automatically to fit the lid. */
  textSize: number;
  textDirection: TextDirection;
  /** Extra space between letters as a fraction of the text size. */
  letterSpacing: number;
  lineSpacing: number;
  relief: ReliefMode;
  reliefDepth: number;
  /** Clear lid border the decoration stays inside. */
  decoMargin: number;
  /** Artwork width on the lid (0 = fit to the lid). */
  artWidth: number;
  /** Text is placed below the artwork; this is the gap between them. */
  artTextGap: number;

  // --- colours
  bodyColor: string;
  lidColor: string;
  textColor: string;
  /** Artwork colours that are not overridden keep their own hex. */
  artColorOverride: string;

  // --- print settings the checks are made against
  nozzle: number;
  layerHeight: number;
  bedSize: number;
}

export const DEFAULT_PARAMS: BoxParams = {
  sizeMode: "inner",
  length: 100,
  width: 65,
  height: 25,
  wall: 2,
  base: 1.6,
  cornerRadius: 6,
  lidThickness: 2,
  railDepth: 1,
  railLip: 1.2,
  clearance: 0.25,
  lidGrip: "thumbNotch",
  gripDepth: 0.8,
  dividerCols: 1,
  dividerRows: 1,
  dividerThickness: 1.2,
  dividerHeightPct: 0.9,
  text: "",
  font: "rounded",
  textSize: 10,
  textDirection: "along",
  letterSpacing: 0.05,
  lineSpacing: 1.25,
  relief: "raised",
  reliefDepth: 0.8,
  decoMargin: 5,
  artWidth: 0,
  artTextGap: 2,
  bodyColor: "#2F6F8F",
  lidColor: "#F4F1EC",
  textColor: "#2F6F8F",
  artColorOverride: "",
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
};

export const LIMITS = {
  length: { min: 20, max: 250, step: 0.5 },
  width: { min: 15, max: 250, step: 0.5 },
  height: { min: 6, max: 150, step: 0.5 },
  wall: { min: 1.2, max: 5, step: 0.1 },
  base: { min: 0.8, max: 5, step: 0.1 },
  cornerRadius: { min: 0, max: 30, step: 0.5 },
  lidThickness: { min: 1, max: 5, step: 0.1 },
  railDepth: { min: 0.6, max: 3, step: 0.1 },
  railLip: { min: 0.8, max: 4, step: 0.1 },
  clearance: { min: 0.1, max: 0.6, step: 0.05 },
  gripDepth: { min: 0.4, max: 2, step: 0.1 },
  dividerCols: { min: 1, max: 12, step: 1 },
  dividerRows: { min: 1, max: 12, step: 1 },
  dividerThickness: { min: 0.8, max: 4, step: 0.1 },
  dividerHeightPct: { min: 0.2, max: 1, step: 0.05 },
  textSize: { min: 3, max: 60, step: 0.5 },
  letterSpacing: { min: -0.1, max: 0.5, step: 0.01 },
  lineSpacing: { min: 0.9, max: 2, step: 0.05 },
  reliefDepth: { min: 0.2, max: 3, step: 0.1 },
  decoMargin: { min: 0, max: 30, step: 0.5 },
  artWidth: { min: 0, max: 240, step: 0.5 },
  artTextGap: { min: 0, max: 20, step: 0.5 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.32, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
} as const;

export const FONT_LABELS: Record<FontId, string> = {
  rounded: "Rounded Bold",
  sans: "Sans Bold",
  serif: "Serif Bold",
  droidSans: "Droid Sans Bold",
};

/** Everything derived from the parameters that the geometry and the UI both need. */
export interface Derived {
  outerL: number;
  outerW: number;
  outerH: number;
  innerL: number;
  innerW: number;
  innerH: number;
  /** Z of the inside floor = top of the base. */
  floorZ: number;
  /** Z of the lid underside when closed = top of the inside cavity and of the front wall. */
  railZ: number;
  /** Lid outline. */
  lidL: number;
  lidW: number;
  /** Where the lid's Y range starts when closed. */
  lidY0: number;
  /** Radius of the lid's two front corners (follows the box corners). */
  lidFrontRadius: number;
  /** Radius of the lid's back corners (follows the rail's rounded back corners). */
  lidBackRadius: number;
  /** Rail depth actually cut. */
  railDepth: number;
  /** Outer corner radius actually used. */
  cornerRadius: number;
  dividerHeight: number;
}

/** Rail depth actually cut: capped so the wall outside the rail keeps two nozzle widths. */
export function effectiveRailDepth(p: BoxParams): number {
  return Math.max(0.4, Math.min(p.railDepth, p.wall - 2 * p.nozzle));
}

export function derive(p: BoxParams): Derived {
  const w = p.wall;
  const railDepth = effectiveRailDepth(p);
  const railHeight = p.lidThickness + p.clearance;
  const extraH = railHeight + p.railLip;
  let innerL: number, innerW: number, innerH: number;
  if (p.sizeMode === "inner") {
    innerL = p.length;
    innerW = p.width;
    innerH = p.height;
  } else {
    innerL = Math.max(5, p.length - 2 * w);
    innerW = Math.max(5, p.width - 2 * w);
    innerH = Math.max(3, p.height - p.base - extraH);
  }
  const outerL = innerL + 2 * w;
  const outerW = innerW + 2 * w;
  const outerH = p.base + innerH + extraH;
  const railZ = p.base + innerH;
  const r = Math.min(p.cornerRadius, Math.min(outerL, outerW) / 2 - 0.01);
  const lidL = outerL - w + railDepth - p.clearance;
  const lidW = innerW + 2 * railDepth - p.clearance;
  const lidY0 = w - railDepth + p.clearance / 2;
  const lidFrontRadius = Math.max(0, r - (w - railDepth) - p.clearance / 2);
  const lidBackRadius = Math.max(0, r - w + railDepth - p.clearance / 2);
  return {
    outerL,
    outerW,
    outerH,
    innerL,
    innerW,
    innerH,
    floorZ: p.base,
    railZ,
    lidL,
    lidW,
    lidY0,
    lidFrontRadius,
    lidBackRadius,
    railDepth,
    cornerRadius: r,
    dividerHeight: Math.min(innerH - 0.4, Math.max(1, innerH * p.dividerHeightPct)),
  };
}

export const clamp = (v: number, lim: { min: number; max: number }) => Math.min(lim.max, Math.max(lim.min, v));
