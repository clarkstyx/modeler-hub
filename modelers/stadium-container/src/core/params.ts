import type { FontId } from "../shared/textShapes";
export type { FontId };

/**
 * Every setting of the stadium container, in millimetres. The stadium is a
 * miniature ballpark wrapped around an open round container: a baseball (about
 * 74 mm) sits in the default cavity. Everything below the seating is solid, so
 * the print has one flat base and no internal surfaces.
 *
 * Design targets for a 0.4 mm nozzle at 0.20 mm layers (see
 * docs/PRINT_VALIDATION.md in the hub): walls ≥ 2.0, floors ≥ 2.4, raised
 * details ≥ 0.6 tall, lettering strokes ≥ 0.8 wide, freestanding supports much
 * thicker than decoration. None of these fits is verified by a print yet.
 */
export type LightMode = "separate" | "attached" | "none";

export interface StadiumParams {
  // --- container
  /** Inside diameter of the round cavity. */
  innerDiameter: number;
  /** Usable depth from the rim down to the floor. */
  depth: number;
  /** Rim width: the ledge between the cavity and the first seating row. */
  wall: number;
  /** Solid material under the cavity. */
  floor: number;

  // --- seating
  rows: number;
  /** Height of each row. */
  rowRise: number;
  /** Depth of each row. */
  rowTread: number;
  /** Seating sections (stairs between them). */
  sections: number;
  /** Width of the stairs between sections. */
  aisleWidth: number;

  // --- building: a square with its corners cut off, long sides front/back/left/right, four short diagonal sides
  /** Size of the four short diagonal sides: 1 = a regular octagon, smaller = a squarer building with small corners. */
  cornerSize: number;
  /** Height of the exterior wall, measured from the bed. Raised automatically to at least the top row. */
  wallHeight: number;
  /** Thickness of the exterior wall. Thickened automatically so the floodlight legs fit into its top. */
  wallThickness: number;
  /** Extra base in front of the entrance, room for rocks and palms. */
  frontApron: number;
  /** Flat walkway between the top row and the exterior wall. */
  concourse: number;
  baseThickness: number;
  /** How far the base plate extends beyond the exterior wall. */
  baseMargin: number;

  // --- entrance and sign
  text: string;
  font: FontId;
  /** Height of the uploaded emblem on the sign (0 = size automatically). */
  emblemHeight: number;

  // --- floodlights
  lights: LightMode;
  /** Height of the floodlight towers above the wall top. */
  lightHeight: number;
  /** Gap per side between a floodlight peg and its socket. */
  pegClearance: number;

  // --- colours (at most four filaments)
  /** Base, seating steps, stairs, concourse, floodlight towers. */
  colorStructure: string;
  /** Exterior walls, columns, the entrance tower, sign letters, lamps. */
  colorFacade: string;
  /** Seat rows, awnings, the band along the top, the name banners. */
  colorAccent: string;
  /** Sign panel, doors, lamp heads. */
  colorSign: string;

  // --- printer
  nozzle: number;
  layerHeight: number;
  bedSize: number;
}

export const DEFAULT_PARAMS: StadiumParams = {
  innerDiameter: 76,
  depth: 28,
  wall: 2,
  floor: 2.4,
  rows: 5,
  rowRise: 2.5,
  rowTread: 3,
  sections: 8,
  aisleWidth: 2,
  cornerSize: 0.75,
  wallHeight: 44,
  wallThickness: 4,
  frontApron: 14,
  concourse: 2.5,
  baseThickness: 2.4,
  baseMargin: 6,
  text: "BALLPARK",
  font: "rounded",
  emblemHeight: 0,
  lights: "separate",
  lightHeight: 40,
  pegClearance: 0.15,
  colorStructure: "#8E9094",
  colorFacade: "#F1E6CE",
  colorAccent: "#C53B32",
  colorSign: "#223B6B",
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
};

export const LIMITS = {
  innerDiameter: { min: 30, max: 160, step: 1 },
  depth: { min: 8, max: 80, step: 1 },
  wall: { min: 1.6, max: 6, step: 0.2 },
  floor: { min: 1.2, max: 8, step: 0.2 },
  rows: { min: 1, max: 12, step: 1 },
  rowRise: { min: 1.2, max: 6, step: 0.1 },
  rowTread: { min: 2, max: 8, step: 0.5 },
  sections: { min: 4, max: 16, step: 1 },
  aisleWidth: { min: 1, max: 5, step: 0.5 },
  cornerSize: { min: 0.3, max: 1, step: 0.05 },
  wallHeight: { min: 10, max: 140, step: 1 },
  wallThickness: { min: 1.6, max: 8, step: 0.2 },
  frontApron: { min: 0, max: 50, step: 1 },
  concourse: { min: 1.5, max: 12, step: 0.5 },
  baseThickness: { min: 1.2, max: 8, step: 0.2 },
  baseMargin: { min: 2, max: 30, step: 0.5 },
  emblemHeight: { min: 0, max: 40, step: 1 },
  lightHeight: { min: 20, max: 160, step: 1 },
  pegClearance: { min: 0, max: 0.5, step: 0.05 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.4, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
} as const;

export const LIGHT_LABELS: Record<LightMode, string> = {
  separate: "Separate parts (legs plug into the wall top, print lying flat)",
  attached: "Printed in place, standing on the wall",
  none: "No floodlights",
};
export const FONT_LABELS: Record<FontId, string> = {
  rounded: "Rounded (Optimer)",
  sans: "Sans (Helvetiker)",
  serif: "Serif (Gentilis)",
  droidSans: "Droid Sans",
};

/** Design targets (mm) printed on the page and used for the checks. */
export const TARGETS = {
  wall: 2.0,
  floor: 2.4,
  detail: 0.6,
  stroke: 0.8,
} as const;

// --- fixed design dimensions (mm); not exposed, the parameters drive them
/** Pilasters stand this far out of the wall; corner columns a little more. */
export const PILASTER = { out: 1.0, width: 2.2, cornerWidth: 2.8, cornerOut: 0.8 };
/** Recessed doorway: width, height of the straight part (an arch sits on top), recess depth and the painted door skin. */
export const DOOR = { width: 8, height: 11, depth: 1.5, skin: 0.8 };
/** Awning over a door: how far it stands out (its underside climbs at 45°) and the lip on top. */
export const AWNING = { out: 2.2, lip: 0.8, extra: 2 };
/** Red band along the top of the wall: height and how far it stands out (in two half steps). */
export const TRIM = { height: 1.6, out: 0.6, skin: 0.8 };
/** Entrance tower: how far it stands out of the wall, how far it rises above it, and its width as a share of the side. */
export const TOWER = { out: 3, above: 8, widthShare: 0.5, minWidth: 26, maxWidth: 70 };
/** Sign panel on the tower: standoff, margins, raised artwork height. */
export const SIGN = { raise: 0.8, margin: 1.6, textRaise: 0.8, minCap: 3.5, maxCap: 9 };
/**
 * Floodlight tower: two legs with X bracing, a lamp head of 6 × 3 lamps. `depth` is radial (towards the
 * field), `legGap` the centre distance of the legs along the wall. Each leg ends in a peg that drops into a
 * socket in the wall top; the wall must be at least `pegDepth` + two walls of `wallAround` thick.
 */
export const MAST = {
  depth: 2, legWidth: 2.4, legGap: 8, brace: 1.3, pegDepth: 1.6, pegWidth: 2, pegLength: 4, wallAround: 1.2,
  headWidth: 16.4, headHeight: 12.4, lampCols: 6, lampRows: 3, lamp: 1.8, lampGap: 0.8, lampRaise: 0.6,
};
/** Seat rows: a raised slab on each tread, set back from the riser edge and the next riser. */
export const SEAT = { raise: 0.6, front: 0.6, back: 0.4, minWidth: 0.8 };
/** Recessed window bands on the facade: height, depth into the wall, gap under the top band and above the awnings. */
export const WINDOW = { height: 1.6, depth: 0.6, belowTop: 1.6, aboveAwning: 1.5 };
/** Lettering on the two wall faces beside the entrance tower. */
export const WING = { raise: 0.8, textRaise: 0.8, margin: 0.9, minCap: 3, maxCap: 8 };

/** One side of the building, seen from the centre. */
export interface Side {
  /** Direction of the side's centre, degrees (the front is −90). */
  angle: number;
  /** Centre to the middle of the side's outer face. */
  apothem: number;
  /** Length of the outer face. */
  length: number;
  kind: "front" | "side" | "back" | "short";
}

export interface Derived {
  /** Cavity radius. */
  ri: number;
  /** Floor top = cavity bottom. */
  zFloor: number;
  /** Rim height (top of the container wall). */
  zRim: number;
  /** Outer radius of the seating. */
  rSeats: number;
  /** Top of the last row = concourse level. */
  zSeatTop: number;
  /** Exterior wall thickness actually built. */
  wallThickness: number;
  /** Long sides (front, back, left, right): inner and outer apothem. */
  wallInner: number;
  wallOuter: number;
  /** Short diagonal sides: inner and outer apothem. */
  shortInner: number;
  shortOuter: number;
  /** Exterior wall height actually built (≥ the top row). */
  wallHeight: number;
  /** Base plate: long-side and short-side apothem, and the front terrace beyond. */
  baseOuter: number;
  baseShort: number;
  frontApron: number;
  /** Floodlight tower height actually built. */
  lightHeight: number;
  /** The eight sides, starting at the front and going counter-clockwise. */
  sides: Side[];
  /** The eight corners: direction and distance from the centre. */
  corners: { angle: number; radius: number }[];
  /** Stair aisles between the seating sections, degrees. */
  aisleAngles: number[];
  /** Entrance tower width, and its front face distance from the centre. */
  towerWidth: number;
  towerFront: number;
  towerTop: number;
  /** Floodlight positions: the centre of each short side, at the wall's centre line. */
  lightSpots: { angle: number; radius: number }[];
  /** Overall footprint (longest extent of the base) and the highest point incl. towers when attached. */
  footprint: number;
  height: number;
}

const DEG = 180 / Math.PI;
const SQRT2 = Math.SQRT2;

/** Short-side apothem for a long-side apothem `a` and corner size `s` (1 = regular octagon, 0 = square). */
export const shortApothem = (a: number, s: number) => a * (SQRT2 - s * (SQRT2 - 1));

/** Every dimension that follows from the parameters, with the automatic raises applied. */
export function derive(p: StadiumParams): Derived {
  const N = Math.round(p.sections);
  const ri = p.innerDiameter / 2;
  const zFloor = p.floor;
  const zRim = zFloor + p.depth;
  const rSeats = ri + p.wall + p.rows * p.rowTread;
  const zSeatTop = zRim + p.rows * p.rowRise;
  const wallThickness = p.lights === "none" ? p.wallThickness : Math.max(p.wallThickness, MAST.pegDepth + 2 * MAST.wallAround);
  const wallInner = rSeats + p.concourse;
  const wallOuter = wallInner + wallThickness;
  const shortOuter = shortApothem(wallOuter, p.cornerSize);
  const shortInner = shortOuter - wallThickness;
  const wallHeight = Math.max(p.wallHeight, zSeatTop + 0.4);
  // Corner of the octagon: a long side at distance a meets a diagonal at distance b at (a, c), c = b√2 − a.
  const c = shortOuter * SQRT2 - wallOuter;
  const longLength = 2 * c;
  const shortLength = SQRT2 * (wallOuter - c);
  const kinds: Side["kind"][] = ["front", "short", "side", "short", "back", "short", "side", "short"];
  const sides: Side[] = kinds.map((kind, k) => ({ kind, angle: norm(-90 + 45 * k), apothem: kind === "short" ? shortOuter : wallOuter, length: kind === "short" ? shortLength : longLength }));
  const cornerRadius = Math.hypot(wallOuter, c);
  const cornerHalf = Math.atan2(c, wallOuter) * DEG;
  const corners = sides.filter((s) => s.kind !== "short").flatMap((s) => [{ angle: norm(s.angle - cornerHalf), radius: cornerRadius }, { angle: norm(s.angle + cornerHalf), radius: cornerRadius }]);
  const aisleAngles = Array.from({ length: N }, (_, k) => norm(-90 + 180 / N + (360 * k) / N));
  const lightSpots = p.lights === "none" ? [] : sides.filter((s) => s.kind === "short").map((s) => ({ angle: s.angle, radius: shortOuter - wallThickness / 2 }));
  const baseOuter = wallOuter + p.baseMargin;
  const baseShort = shortOuter + p.baseMargin;
  const towerWidth = Math.max(TOWER.minWidth, Math.min(TOWER.maxWidth, longLength * TOWER.widthShare, longLength - 2 * PILASTER.cornerWidth - 2));
  const towerFront = wallOuter + TOWER.out;
  const towerTop = wallHeight + TOWER.above;
  const lightHeight = p.lights === "none" ? 0 : p.lightHeight;
  const footprint = Math.max(2 * baseOuter, 2 * baseOuter + p.frontApron, 2 * (baseShort * SQRT2 - baseOuter) + 2 * p.baseMargin);
  const height = Math.max(towerTop, p.lights === "attached" ? wallHeight + lightHeight : 0);
  return { ri, zFloor, zRim, rSeats, zSeatTop, wallThickness, wallInner, wallOuter, shortInner, shortOuter, wallHeight, baseOuter, baseShort, frontApron: p.frontApron, lightHeight, sides, corners, aisleAngles, towerWidth, towerFront, towerTop, lightSpots, footprint, height };
}

function norm(a: number): number {
  let v = ((a + 180) % 360 + 360) % 360 - 180;
  if (v <= -180) v += 360;
  return v;
}
export function angleDiff(a: number, b: number): number {
  return norm(a - b);
}
export const rad = (deg: number) => deg / DEG;

export const clamp = (v: number, lim: { min: number; max: number }) => Math.min(lim.max, Math.max(lim.min, v));
