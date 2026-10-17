/**
 * Parametric checklist tag: a flat rounded card with a hanging hole, a raised
 * question ("IS KINSLEY ON THE NICE LIST?") and tick boxes with labels
 * ("YES" / "NO"), one of them ticked. Sized by default for an Elf on the
 * Shelf to hold. Every length is in millimetres.
 *
 * Frame: the tag lies flat on the bed, from (0,0) to (width,height), y up the
 * card. The card is `thickness` thick; text, boxes and the tick stand
 * `relief` above it, each its own colour.
 */
import type { FontId } from "../shared/textShapes";

export type HolePosition = "top-left" | "top-center" | "top-right" | "none";
export type CheckStyle = "check" | "x" | "heart";
export type BoxStyle = "filled" | "outline";
export type OptionsLayout = "rows" | "inline";

export const HOLE_LABELS: Record<HolePosition, string> = {
  "top-left": "Top left corner (like the photo)",
  "top-center": "Top centre",
  "top-right": "Top right corner",
  none: "No hole",
};
export const CHECK_LABELS: Record<CheckStyle, string> = { check: "Tick ✓", x: "Cross ✗", heart: "Heart ♥" };
export const BOX_LABELS: Record<BoxStyle, string> = { filled: "Filled square (like the photo)", outline: "Outline square" };
export const LAYOUT_LABELS: Record<OptionsLayout, string> = { rows: "One under the other", inline: "Side by side" };
export const FONT_LABELS: Record<FontId, string> = { sans: "Bold sans (like the photo)", rounded: "Rounded", serif: "Serif", droidSans: "Droid sans" };

export interface TagParams {
  width: number;
  height: number;
  thickness: number;
  cornerRadius: number;

  holePosition: HolePosition;
  holeDiameter: number;
  /** Hole centre from the top (and side) edge. */
  holeInset: number;

  /** The question; {name} is replaced by each name. Line breaks are kept, long lines wrap. */
  question: string;
  /** The name on a single tag. */
  name: string;
  /** Optional batch: one name per line (or comma separated) makes one tag each. Empty = just `name`. */
  names: string;
  font: FontId;
  /** Capital letter height of the question; it shrinks by itself if the question does not fit. */
  textSize: number;
  lineSpacing: number;

  /** Tick box labels, comma separated (2 to 4). */
  options: string;
  /** Which box is ticked: 1 = first, 2 = second…, 0 = none. */
  checked: number;
  checkStyle: CheckStyle;
  boxStyle: BoxStyle;
  boxSize: number;
  /** Outline boxes: width of the square's line. */
  boxWall: number;
  labelSize: number;
  optionsLayout: OptionsLayout;

  /** How far text, boxes and the tick stand above the card. */
  relief: number;
  /** Clear border inside the card edge. */
  margin: number;

  baseColor: string;
  textColor: string;
  boxColor: string;
  checkColor: string;

  // --- print settings the checks are made against
  nozzle: number;
  layerHeight: number;
  bedSize: number;
}

export const DEFAULT_PARAMS: TagParams = {
  width: 55,
  height: 75,
  thickness: 2,
  cornerRadius: 5,
  holePosition: "top-left",
  holeDiameter: 5,
  holeInset: 6,
  question: "IS {name} ON THE NICE LIST?",
  name: "KINSLEY",
  names: "",
  font: "sans",
  textSize: 6.5,
  lineSpacing: 1.3,
  options: "YES, NO",
  checked: 1,
  checkStyle: "check",
  boxStyle: "filled",
  boxSize: 9,
  boxWall: 1.2,
  labelSize: 6,
  optionsLayout: "rows",
  relief: 0.8,
  margin: 4,
  baseColor: "#C8102E",
  textColor: "#FFFFFF",
  boxColor: "#FFFFFF",
  checkColor: "#1E8E3E",
  nozzle: 0.4,
  layerHeight: 0.2,
  bedSize: 256,
};

export const LIMITS = {
  width: { min: 25, max: 200, step: 0.5 },
  height: { min: 25, max: 200, step: 0.5 },
  thickness: { min: 1, max: 6, step: 0.1 },
  cornerRadius: { min: 0, max: 20, step: 0.5 },
  holeDiameter: { min: 2, max: 12, step: 0.1 },
  holeInset: { min: 2, max: 20, step: 0.5 },
  textSize: { min: 2.5, max: 20, step: 0.1 },
  lineSpacing: { min: 1, max: 2, step: 0.05 },
  checked: { min: 0, max: 4, step: 1 },
  boxSize: { min: 4, max: 25, step: 0.5 },
  boxWall: { min: 0.6, max: 4, step: 0.1 },
  labelSize: { min: 2.5, max: 20, step: 0.1 },
  relief: { min: 0.2, max: 3, step: 0.1 },
  margin: { min: 1, max: 15, step: 0.5 },
  nozzle: { min: 0.2, max: 1, step: 0.05 },
  layerHeight: { min: 0.08, max: 0.32, step: 0.02 },
  bedSize: { min: 100, max: 400, step: 1 },
} as const;

/** Most tags one batch makes. */
export const MAX_TAGS = 60;
/** Smallest the question may shrink to before we refuse: smaller letters lose their holes on a 0.4 nozzle. */
export const MIN_TEXT = 2.5;
/** Gap between tags on the plate and clear border around it. */
export const PLATE_GAP = 5;
export const PLATE_BORDER = 6;

/** The tick box labels, trimmed, empty ones dropped. */
export const optionList = (p: TagParams) => p.options.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);

/** One name per tag: the batch list if there is one, else the single name. */
export function tagNames(p: TagParams): string[] {
  const list = p.names.split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  return (list.length ? list : [p.name.trim()]).slice(0, MAX_TAGS);
}

export const questionFor = (p: TagParams, name: string) => p.question.replace(/\{name\}/gi, name).trim();

/** Where the hanging hole's centre is, or null. */
export function holeCentre(p: TagParams): [number, number] | null {
  if (p.holePosition === "none") return null;
  const y = p.height - p.holeInset;
  if (p.holePosition === "top-left") return [p.holeInset, y];
  if (p.holePosition === "top-right") return [p.width - p.holeInset, y];
  return [p.width / 2, y];
}
