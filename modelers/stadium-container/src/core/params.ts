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
  /** Seating sections; also the number of sides of the stadium. */
  sections: number;
  /** Width of the stairs between sections. */
  aisleWidth: number;

  // --- building
  /** Height of the exterior wall, measured from the bed. Raised automatically to at least the top row. */
  wallHeight: number;
  /** Thickness of the exterior wall. */
  wallThickness: number;
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
  /** Height of the floodlight masts above their plinths. */
  lightHeight: number;
  /** Gap per side between a floodlight peg and its socket. */
  pegClearance: number;

  // --- colours (at most four filaments)
  /** Base, seating steps, stairs, concourse, masts. */
  colorStructure: string;
  /** Exterior walls, columns, the entrance tower, sign letters, lamps. */
  colorFacade: string;
  /** Seat rows, awnings, the band along the top, wing lettering. */
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
  wallHeight: 44,
  wallThickness: 2,
  concourse: 2.5,
  baseThickness: 2.4,
  baseMargin: 8,
  text: "BALLPARK",
  font: "rounded",
  emblemHeight: 0,
  lights: "separate",
  lightHeight: 70,
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
  wallHeight: { min: 10, max: 140, step: 1 },
  wallThickness: { min: 1.6, max: 5, step: 0.2 },
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
  separate: "Separate parts (peg into the base, print lying flat)",
  attached: "Printed in place, standing on the base",
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
export const TOWER = { out: 3, above: 7, widthShare: 0.72, minWidth: 26, maxWidth: 64 };
/** Sign panel on the tower: standoff, margins, raised artwork height. */
export const SIGN = { raise: 0.8, margin: 1.6, textRaise: 0.8, minCap: 3.5, maxCap: 9 };
/** Floodlight mast (radial × tangential), peg below it, head plate, lamp bumps. */
export const MAST = { depth: 3, width: 5, pegDepth: 2.2, pegWidth: 3.2, pegLength: 3, headWidth: 14, headHeight: 13, shoulder: 4, lamp: 1.8, lampGap: 0.8, lampRaise: 0.6 };
/** Seat rows: a raised slab on each tread, set back from the riser edge and the next riser. */
export const SEAT = { raise: 0.6, front: 0.6, back: 0.4, minWidth: 0.8 };
/** Lettering on the two wall faces beside the entrance tower. */
export const WING = { raise: 0.8, minCap: 3, maxCap: 8 };
/** Plinth the mast pegs into: footprint, height above the base, socket depth below its top. */
export const PLINTH = { size: 7, height: 4, socketDepth: 3.2 };

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
  /** Exterior wall: inner and outer apothem (centre to the middle of a side). */
  wallInner: number;
  wallOuter: number;
  /** Centre to a corner of the exterior wall. */
  wallCorner: number;
  /** Exterior wall height actually built (≥ the concourse + a parapet). */
  wallHeight: number;
  /** Base plate apothem and corner radius. */
  baseApothem: number;
  baseCorner: number;
  /** Base margin actually built (raised to fit the floodlight plinths). */
  baseMargin: number;
  /** Floodlight mast height actually built. */
  lightHeight: number;
  /** Length of one side of the exterior wall at its outer face. */
  sideLength: number;
  /** Entrance tower width, and its front face distance from the centre. */
  towerWidth: number;
  towerFront: number;
  towerTop: number;
  /** Angles (degrees) of the side centres; the front is −90. */
  sideAngles: number[];
  /** Angles (degrees) of the corners. */
  cornerAngles: number[];
  /** Floodlight positions: angle and radius of each plinth centre. */
  lightSpots: { angle: number; radius: number }[];
  /** Overall footprint across corners, and the highest point incl. lights when attached. */
  footprint: number;
  height: number;
}

const DEG = 180 / Math.PI;
const PLINTH_HALF = PLINTH.size / 2;

/** Every dimension that follows from the parameters, with the automatic raises applied. */
export function derive(p: StadiumParams): Derived {
  const N = Math.round(p.sections);
  const ri = p.innerDiameter / 2;
  const zFloor = p.floor;
  const zRim = zFloor + p.depth;
  const rSeats = ri + p.wall + p.rows * p.rowTread;
  const zSeatTop = zRim + p.rows * p.rowRise;
  const wallInner = rSeats + p.concourse;
  const wallOuter = wallInner + p.wallThickness;
  const cosHalf = Math.cos(Math.PI / N);
  const tanHalf = Math.tan(Math.PI / N);
  const wallCorner = wallOuter / cosHalf;
  // The top row may sit almost level with the wall top (the upper deck shows from outside, like the reference).
  const wallHeight = Math.max(p.wallHeight, zSeatTop + 0.4);
  const sideLength = 2 * wallOuter * tanHalf;
  const sideAngles = Array.from({ length: N }, (_, k) => norm(-90 + (360 * k) / N));
  const cornerAngles = Array.from({ length: N }, (_, k) => norm(-90 + 180 / N + (360 * k) / N));

  // Floodlights stand at the corners nearest the four diagonals, on the base margin outside the wall.
  let baseMargin = p.baseMargin;
  const lightSpots: { angle: number; radius: number }[] = [];
  if (p.lights !== "none") {
    const needCorner = wallCorner - 2 + PLINTH_HALF + PLINTH_HALF * (1 + tanHalf); // innermost plinth still on the base
    baseMargin = Math.max(baseMargin, needCorner * cosHalf - wallOuter);
    const baseCorner = (wallOuter + baseMargin) / cosHalf;
    const radius = Math.min(wallCorner + 2.5, baseCorner - PLINTH_HALF * (1 + tanHalf));
    for (const d of [-45, -135, 45, 135]) {
      let best = cornerAngles[0], bestGap = 1e9;
      for (const a of cornerAngles) {
        const gap = Math.abs(angleDiff(a, d));
        // Ties (an octagon) go to the corner further from the front, so the sign side stays clear.
        if (gap < bestGap - 1e-9 || (Math.abs(gap - bestGap) < 1e-9 && Math.abs(angleDiff(a, -90)) > Math.abs(angleDiff(best, -90)))) { best = a; bestGap = gap; }
      }
      if (!lightSpots.some((s) => Math.abs(angleDiff(s.angle, best)) < 1e-6)) lightSpots.push({ angle: best, radius });
    }
  }
  const baseApothem = wallOuter + baseMargin;
  const baseCorner = baseApothem / cosHalf;
  const towerWidth = Math.max(TOWER.minWidth, Math.min(TOWER.maxWidth, sideLength * TOWER.widthShare, sideLength - 2 * PILASTER.cornerWidth - 2));
  const towerFront = wallOuter + TOWER.out;
  const towerTop = wallHeight + TOWER.above;
  const lightHeight = p.lights === "none" ? 0 : Math.max(p.lightHeight, wallHeight + 8);
  const footprint = 2 * Math.max(baseCorner, towerFront + AWNING.out + 0.5);
  // Attached masts sit 1 mm into their plinth so the two fuse.
  const height = Math.max(towerTop, p.lights === "attached" ? p.baseThickness + PLINTH.height - 1 + lightHeight : 0);
  return { ri, zFloor, zRim, rSeats, zSeatTop, wallInner, wallOuter, wallCorner, wallHeight, baseApothem, baseCorner, baseMargin, lightHeight, sideLength, towerWidth, towerFront, towerTop, sideAngles, cornerAngles, lightSpots, footprint, height };
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
