import type { FontId } from "../shared/textShapes";
export type { FontId };

/**
 * Every setting of the cookie cutter, in millimetres. The cutter defaults are
 * design choices (common for FDM-printed cutters), not a standard and not yet
 * tested on dough: see docs/PRINT_VALIDATION.md.
 */
export type Source = "shape" | "letters" | "word" | "svg";
export type ShapeId = "circle" | "scalloped" | "heart" | "star" | "square" | "egg";

export interface CutterParams {
  source: Source;
  shape: ShapeId;
  /** Letters: one cutter per character. Word: one cutter around the whole text. */
  text: string;
  font: FontId;
  /** Longest side of the cutting outline (shape, word, SVG), or the capital-letter height (letters). */
  size: number;
  /** Word mode: how far the outline stands off the letters. */
  wordMargin: number;
  /** Details smaller than this radius are rounded off (thin spikes and narrow notches cannot cut cleanly). */
  smoothing: number;

  height: number;
  wall: number;
  edge: number;
  /** Height of the thin top band, half of it a stepped taper from the wall to the edge. */
  edgeHeight: number;
  flange: number;
  flangeThickness: number;

  color: string;
  nozzle: number;
  layerHeight: number;
  bedSize: number;
  plateGap: number;
}

export const DEFAULT_PARAMS: CutterParams = {
  source: "shape",
  shape: "heart",
  text: "ABC",
  font: "rounded",
  size: 70,
  wordMargin: 3,
  smoothing: 0.6,
  height: 15,
  wall: 1.2,
  edge: 0.8,
  edgeHeight: 4,
  flange: 4,
  flangeThickness: 1.6,
  color: "#E05A8A",
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
  plateGap: 4,
};

export const LIMITS = {
  size: { min: 20, max: 200, step: 1 },
  wordMargin: { min: 1.5, max: 10, step: 0.5 },
  smoothing: { min: 0, max: 3, step: 0.1 },
  height: { min: 6, max: 40, step: 0.5 },
  wall: { min: 0.8, max: 4, step: 0.1 },
  edge: { min: 0.4, max: 2, step: 0.1 },
  edgeHeight: { min: 1, max: 10, step: 0.5 },
  flange: { min: 0, max: 10, step: 0.5 },
  flangeThickness: { min: 0.6, max: 4, step: 0.2 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.4, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
  plateGap: { min: 2, max: 20, step: 1 },
} as const;

export const SOURCE_LABELS: Record<Source, string> = {
  shape: "A shape",
  letters: "Letters (one cutter each)",
  word: "A word (one cutter around it)",
  svg: "My SVG outline",
};
export const SHAPE_LABELS: Record<ShapeId, string> = {
  circle: "Circle",
  scalloped: "Scalloped circle",
  heart: "Heart",
  star: "Star",
  square: "Rounded square",
  egg: "Egg",
};
export const FONT_LABELS: Record<FontId, string> = {
  rounded: "Rounded (Optimer)",
  sans: "Sans (Helvetiker)",
  serif: "Serif (Gentilis)",
  droidSans: "Droid Sans",
};

/** Printed on the page, in the README of every download and in the docs. No food-safety claim is made. */
export const FOOD_NOTE =
  "Food contact: Valencia Modelers makes no food-safety claim for printed cutters. Printed plastic has layer lines " +
  "that are hard to clean, and whether a filament, colour or nozzle is suitable for food depends on the material and " +
  "the printer, which this app cannot check. Decide for yourself before using a cutter with food, follow the filament " +
  "maker's guidance, and keep printed cutters out of the dishwasher and away from heat.";

export const clamp = (v: number, lim: { min: number; max: number }) => Math.min(lim.max, Math.max(lim.min, v));
