/**
 * Parametric model of a Gridfinity bin label and of a batch plate.
 * Every length is in millimetres.
 *
 * What is a published fact and what is not:
 * - GRID_PITCH = 42 mm is the Gridfinity grid unit (Zack Freedman's spec).
 * - Label slot sizes are NOT standard: they differ between bin designs
 *   (original, "refined", Pred's, Kenneth Hurley's …). Height, thickness and
 *   the end margin below are common starting values, flagged unverified in the
 *   UI; print the fit-test strip and measure your bins before a big batch.
 */

export const GRID_PITCH = 42;

export type ReliefMode = "raised" | "inlay" | "engraved";
import type { FontId } from "../shared/textShapes";
export type { FontId };
export type IconId = "none" | "screw" | "bolt" | "nut" | "washer" | "insert" | "custom";
export type WidthMode = "units" | "mm";

export interface LabelParams {
  /** Default label width in grid units when a batch line does not set its own. */
  units: number;
  widthMode: WidthMode;
  /** Used when widthMode is "mm". */
  widthMm: number;
  /** Total clearance left at the two ends of the slot (label = units × 42 − this). */
  endClearance: number;
  height: number;
  thickness: number;
  cornerRadius: number;
  /** Space between the label edge and the text / icon. */
  padding: number;

  font: FontId;
  /** Capital-letter height; shrinks to fit the label. 0 = as large as fits. */
  textSize: number;
  letterSpacing: number;
  /** Two lines are allowed with "\\n" in a batch line. */
  lineSpacing: number;
  align: "center" | "left";
  relief: ReliefMode;
  reliefDepth: number;

  /** Default icon when a batch line does not name one. */
  icon: IconId;
  iconGap: number;

  plateColor: string;
  textColor: string;
  iconColor: string;

  // print / plate
  nozzle: number;
  layerHeight: number;
  bedSize: number;
  plateGap: number;
}

export const DEFAULT_PARAMS: LabelParams = {
  units: 1,
  widthMode: "units",
  widthMm: 36,
  endClearance: 6,
  height: 12,
  thickness: 1.2,
  cornerRadius: 1,
  padding: 1.2,
  font: "sans",
  textSize: 0,
  letterSpacing: 0.04,
  lineSpacing: 1.2,
  align: "center",
  relief: "raised",
  reliefDepth: 0.6,
  icon: "none",
  iconGap: 1.5,
  plateColor: "#1E1E1E",
  textColor: "#F4F1EC",
  iconColor: "#F2C14E",
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
  plateGap: 3,
};

export const LIMITS = {
  units: { min: 1, max: 6, step: 1 },
  widthMm: { min: 15, max: 250, step: 0.5 },
  endClearance: { min: 0, max: 20, step: 0.5 },
  height: { min: 6, max: 40, step: 0.5 },
  thickness: { min: 0.8, max: 4, step: 0.1 },
  cornerRadius: { min: 0, max: 5, step: 0.25 },
  padding: { min: 0.4, max: 5, step: 0.1 },
  textSize: { min: 0, max: 30, step: 0.5 },
  letterSpacing: { min: -0.1, max: 0.5, step: 0.01 },
  lineSpacing: { min: 0.9, max: 2, step: 0.05 },
  reliefDepth: { min: 0.2, max: 2, step: 0.1 },
  iconGap: { min: 0, max: 6, step: 0.5 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.32, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
  plateGap: { min: 1, max: 15, step: 0.5 },
} as const;

export const FONT_LABELS: Record<FontId, string> = {
  sans: "Sans Bold",
  rounded: "Rounded Bold",
  serif: "Serif Bold",
  droidSans: "Droid Sans Bold",
};

export const ICON_LABELS: Record<IconId, string> = {
  none: "None",
  screw: "Screw",
  bolt: "Hex bolt",
  nut: "Hex nut",
  washer: "Washer",
  insert: "Heat-set insert",
  custom: "Uploaded SVG",
};

/** One label to make: what a batch line (or CSV row) turns into. */
export interface LabelSpec {
  /** 1-based source line, used in the manifest. */
  line: number;
  text: string;
  icon: IconId;
  /** Width in grid units, or null to use the default. */
  units: number | null;
  /** Free-form order reference carried through to the manifest (CSV "order" column). */
  order: string;
}

export function labelWidth(p: LabelParams, units: number | null): number {
  if (p.widthMode === "mm" && units === null) return p.widthMm;
  const u = units ?? p.units;
  return Math.max(LIMITS.widthMm.min, u * GRID_PITCH - p.endClearance);
}

export const clamp = (v: number, lim: { min: number; max: number }) => Math.min(lim.max, Math.max(lim.min, v));
