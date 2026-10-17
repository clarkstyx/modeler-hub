import { layoutTag } from "./layout";
import { MAX_TAGS, PLATE_BORDER, holeCentre, optionList, questionFor, tagNames, type TagParams } from "./params";
import type { Issue } from "./types";
import { missingCharacters } from "../shared/textShapes";

/** Parameter-level checks, before any geometry is built. Errors block export. */
export function validateParams(p: TagParams): Issue[] {
  const issues: Issue[] = [];
  const err = (message: string) => issues.push({ severity: "error", message });
  const warn = (message: string) => issues.push({ severity: "warning", message });
  const info = (message: string) => issues.push({ severity: "info", message });
  const opts = optionList(p);
  const names = tagNames(p);

  if (opts.length === 0) warn("No tick boxes: type labels like \"YES, NO\".");
  if (p.checked > opts.length) warn(`There is no box ${p.checked} to tick; only ${opts.length}.`);
  if (p.names.split(/[\n,]/).filter((s) => s.trim()).length > MAX_TAGS) warn(`Only the first ${MAX_TAGS} names are made.`);
  if (p.width > p.bedSize - 2 * PLATE_BORDER || p.height > p.bedSize - 2 * PLATE_BORDER) err("The tag is bigger than the bed.");

  const hole = holeCentre(p);
  if (hole && p.holeInset < p.holeDiameter / 2 + 1.5) err(`The hole is too close to the edge: keep its centre at least ${(p.holeDiameter / 2 + 1.5).toFixed(1)} mm in so the ring cannot tear out.`);
  if (p.cornerRadius > Math.min(p.width, p.height) / 2) info("The corner radius is more than half the tag; the ends are fully round.");

  const missing = new Set<string>();
  let smallest = Infinity;
  for (const name of names) {
    const l = layoutTag(p, name);
    if (!l.optionsFit) { err("The tick boxes and labels do not fit the tag: make the boxes or labels smaller, or the tag bigger."); break; }
    if (name === names[0] && l.optionsScale < 1) info(`The tick boxes and labels shrank to ${Math.round(l.optionsScale * 100)} % to fit across the tag.`);
    if (!l.textFits) err(`The question for ${name || "this tag"} does not fit even at ${l.textCap.toFixed(1)} mm letters. Shorten it, or make the tag bigger or the boxes smaller.`);
    if (l.question) smallest = Math.min(smallest, l.textCap);
    for (const ch of missingCharacters(questionFor(p, name), p.font)) missing.add(ch);
  }
  for (const o of opts) for (const ch of missingCharacters(o, p.font)) missing.add(ch);
  if (missing.size) warn(`This font has no ${[...missing].map((c) => `"${c}"`).join(", ")}; they print as "?".`);
  if (Number.isFinite(smallest) && smallest < p.textSize - 0.05) info(`The question shrank to ${smallest.toFixed(1)} mm letters to fit${names.length > 1 ? " (the longest name)" : ""}.`);
  if (Number.isFinite(smallest) && smallest < 3.5) warn(`Letters ${smallest.toFixed(1)} mm tall are fine on a 0.2 mm nozzle but blotchy on 0.4: shorten the question or make the tag bigger.`);
  if (p.labelSize < 3.5) warn("Labels under 3.5 mm tall get blotchy on a 0.4 mm nozzle.");
  if (p.boxStyle === "outline" && p.boxWall < 2 * p.nozzle) warn(`The box outline is thinner than two nozzle widths (${(2 * p.nozzle).toFixed(1)} mm); it may print patchy.`);
  if (p.relief < 2 * p.layerHeight) info("Raised details under two layers barely show; colour still changes.");
  if (p.thickness < 1.6) warn("A card under 1.6 mm thick bends easily in little hands.");
  return issues;
}

export const hasErrors = (issues: Issue[]) => issues.some((i) => i.severity === "error");
