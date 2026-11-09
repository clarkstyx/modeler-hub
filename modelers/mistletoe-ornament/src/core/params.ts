import type { FontId } from "../shared/textShapes";
export type { FontId };

/**
 * Every setting of the mistletoe ornament, in millimetres. The ornament prints
 * flat on its back: a base plate with a hanger ring, then leaves, berries, the
 * bow and the name tag as raised colour layers. Up to five filaments.
 */
export type TextStyle = "raised" | "flush";

export interface OrnamentParams {
  name: string;
  font: FontId;
  /** Overall width of the sprig (leaf tip to leaf tip). */
  size: number;
  /** How many leaf pairs hang from the stem (2 or 3). */
  leafPairs: number;
  berries: number;
  /** Show the ribbon bow at the top. */
  bow: boolean;
  /** Show the name tag under the sprig (off when the name is empty). */
  tag: boolean;
  /** With an empty name, keep a blank tag (for typing the name in the slicer). */
  blankTag: boolean;
  textStyle: TextStyle;

  baseThickness: number;
  layerThickness: number;
  /** Border the base plate shows around every shape. */
  outline: number;
  holeDiameter: number;

  baseColor: string;
  leafColor: string;
  berryColor: string;
  ribbonColor: string;
  textColor: string;
}

export const DEFAULT_PARAMS: OrnamentParams = {
  name: "Noah",
  font: "rounded",
  size: 80,
  leafPairs: 2,
  berries: 5,
  bow: true,
  tag: true,
  blankTag: false,
  textStyle: "raised",
  baseThickness: 1.6,
  layerThickness: 1.0,
  outline: 1.2,
  holeDiameter: 3.5,
  baseColor: "#1F3A2A",
  leafColor: "#4F9A5C",
  berryColor: "#F4F1E6",
  ribbonColor: "#C8322B",
  textColor: "#F4F1E6",
};

export const LIMITS = {
  size: { min: 50, max: 120, step: 1 },
  leafPairs: { min: 1, max: 3, step: 1 },
  berries: { min: 0, max: 7, step: 1 },
  baseThickness: { min: 1.2, max: 3, step: 0.2 },
  layerThickness: { min: 0.6, max: 2, step: 0.2 },
  outline: { min: 0.8, max: 3, step: 0.2 },
  holeDiameter: { min: 2, max: 6, step: 0.5 },
} as const;

export const FONT_LABELS: Record<FontId, string> = { rounded: "Rounded", sans: "Sans", serif: "Serif", droidSans: "Droid Sans" };
export const TEXT_STYLE_LABELS: Record<TextStyle, string> = { raised: "Raised letters", flush: "Flush (inlaid) letters" };

/** Smallest letter height that still prints legibly with a 0.4 mm nozzle. */
export const MIN_CAP_HEIGHT = 4;
export const MAX_NAME_LENGTH = 16;
