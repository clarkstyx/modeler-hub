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
import type { FontId } from "../shared/textShapes";
export type { FontId };
export type LidGrip = "none" | "thumbNotch" | "ridge";
/** "box" = sliding-lid box; "rack" = stackable enclosure-rack cube with a drawer tray. */
export type Product = "box" | "rack";
export type LengthUnit = "mm" | "in";

export interface BoxParams {
  product: Product;
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

  // --- enclosure rack (product "rack"): one stackable cube per enclosure
  /** Enclosure size: width seen from the front, depth front to back, height. */
  encWidth: number;
  encDepth: number;
  encHeight: number;
  /** Air gap between the enclosure and each side wall, and above it. */
  rackSideGap: number;
  rackTopGap: number;
  /** Space behind the tray for air and cables, in front of the vented back. */
  rackBackGap: number;
  rackWall: number;
  trayHeight: number;
  /** How deep the enclosure sits in the tray's recess. */
  trayPocket: number;
  /** Gap between the tray and each side wall. */
  trayClearance: number;
  /** How far the tray slides out before the stop catches, as a fraction of its length. */
  trayTravel: number;
  /** Back-panel vent hole diameter (0 = no vents) and centre-to-centre spacing. */
  ventHole: number;
  ventSpacing: number;
  /** Gap on every side of a joining key in its dovetail grooves. */
  keyClearance: number;
  /** Planned layout: decides how many joining keys to print. */
  rackCols: number;
  rackRows: number;
  /** Units the rack sizes are shown in (stored values are always mm). */
  rackUnits: LengthUnit;

  // --- print settings the checks are made against
  nozzle: number;
  layerHeight: number;
  bedSize: number;
}

export const DEFAULT_PARAMS: BoxParams = {
  product: "box",
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
  encWidth: 101.6,
  encDepth: 101.6,
  encHeight: 152.4,
  rackSideGap: 12.7,
  rackTopGap: 12.7,
  rackBackGap: 6,
  rackWall: 4,
  trayHeight: 8,
  trayPocket: 1.6,
  trayClearance: 0.5,
  trayTravel: 0.5,
  ventHole: 5,
  ventSpacing: 12,
  keyClearance: 0.2,
  rackCols: 3,
  rackRows: 2,
  rackUnits: "in",
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
  encWidth: { min: 30, max: 230, step: 0.5 },
  encDepth: { min: 30, max: 220, step: 0.5 },
  encHeight: { min: 30, max: 220, step: 0.5 },
  rackSideGap: { min: 2, max: 40, step: 0.5 },
  rackTopGap: { min: 3, max: 40, step: 0.5 },
  rackBackGap: { min: 0, max: 40, step: 0.5 },
  rackWall: { min: 3, max: 8, step: 0.1 },
  trayHeight: { min: 5, max: 20, step: 0.5 },
  trayPocket: { min: 0, max: 5, step: 0.1 },
  trayClearance: { min: 0.2, max: 1.5, step: 0.05 },
  trayTravel: { min: 0.2, max: 0.7, step: 0.05 },
  ventHole: { min: 0, max: 12, step: 0.5 },
  ventSpacing: { min: 6, max: 30, step: 0.5 },
  keyClearance: { min: 0.05, max: 0.5, step: 0.05 },
  rackCols: { min: 1, max: 8, step: 1 },
  rackRows: { min: 1, max: 6, step: 1 },
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

// ---------------------------------------------------------------- enclosure rack

/** Dovetail groove: width at the face, depth into the wall, flank angle from the wall normal. */
export const DOVETAIL = { neck: 6, depth: 2, angleDeg: 25 } as const;
/** Solid tray border around the enclosure recess, front and back. */
export const TRAY_RIM = 5;
/** Gap around the enclosure inside the tray recess. */
export const POCKET_CLEARANCE = 1;
/** Stop bump on the cube floor: height, width, ramp length, and where the ramp starts (from the front). */
export const STOP = { height: 1.5, width: 16, ramp: 8, from: 10 } as const;
/** D-handle on the tray front. */
export const HANDLE = { width: 44, depth: 14, bar: 4, side: 5 } as const;

/**
 * Everything derived for one rack cube. World frame: X across the front,
 * Y from the open front (y = 0) to the back, Z up; the cube's corner at the origin.
 */
export interface RackDerived {
  /** Cube outside. */
  W: number;
  H: number;
  D: number;
  wall: number;
  innerW: number;
  innerH: number;
  innerD: number;
  trayW: number;
  trayL: number;
  trayH: number;
  /** Tray underside channel the floor stop rides in (tray-local y, closed at both ends). */
  channelY0: number;
  channelY1: number;
  channelW: number;
  channelDepth: number;
  /** How far the tray actually slides out before the stop catches. */
  travel: number;
  /** Floor stop bump, world y: ramp from stopY0 (flush) rising to its steep face at stopY1. */
  stopY0: number;
  stopY1: number;
  /** Where the enclosure sits: tray-local recess and the enclosure's underside height above the floor. */
  pocketX0: number;
  pocketY0: number;
  pocketW: number;
  pocketD: number;
  encZ: number;
  /** Joining keys needed for the planned cols × rows layout (two per shared face). */
  keysNeeded: number;
  /** Key length: a touch shorter than the cube is deep. */
  keyLength: number;
}

export function deriveRack(p: BoxParams): RackDerived {
  const w = p.rackWall;
  const innerW = p.encWidth + 2 * p.rackSideGap;
  const trayH = p.trayHeight;
  const pocket = Math.min(p.trayPocket, trayH - 1);
  const innerH = trayH - pocket + p.encHeight + p.rackTopGap;
  const pocketD = p.encDepth + 2 * POCKET_CLEARANCE;
  const trayL = pocketD + 2 * TRAY_RIM;
  const innerD = trayL + p.trayClearance + p.rackBackGap;
  const trayW = innerW - 2 * p.trayClearance;
  const pocketW = p.encWidth + 2 * POCKET_CLEARANCE;
  const stopY0 = STOP.from;
  const stopY1 = STOP.from + STOP.ramp;
  const channelY0 = stopY0 - 4;
  const solidBack = 8;
  const channelY1 = Math.max(stopY1 + 1, Math.min(trayL - solidBack, stopY1 + p.trayTravel * trayL));
  const cols = Math.max(1, Math.round(p.rackCols));
  const rows = Math.max(1, Math.round(p.rackRows));
  const D = innerD + w;
  return {
    W: innerW + 2 * w,
    H: innerH + 2 * w,
    D,
    wall: w,
    innerW,
    innerH,
    innerD,
    trayW,
    trayL,
    trayH,
    channelY0,
    channelY1,
    channelW: STOP.width + 2,
    channelDepth: STOP.height + 0.6,
    travel: channelY1 - stopY1,
    stopY0,
    stopY1,
    pocketX0: (trayW - pocketW) / 2,
    pocketY0: TRAY_RIM,
    pocketW,
    pocketD,
    encZ: trayH - pocket,
    keysNeeded: 2 * ((cols - 1) * rows + cols * (rows - 1)),
    keyLength: D - 1,
  };
}
