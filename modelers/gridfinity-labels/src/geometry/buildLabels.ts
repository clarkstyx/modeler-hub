import { labelWidth, type IconId, type LabelParams, type LabelSpec } from "../core/params";
import type { Artwork, Issue, Part } from "../core/types";
import { layoutText, missingCharacters } from "../shared/textShapes";
import { type CrossSection, type Manifold, kernel } from "../shared/kernel";
import { manifoldToMesh } from "../shared/mesh";
import { artworkIcon, builtinIcon } from "./icons";
import { objectSlug, shelfPack } from "../shared/batch";
import { cs, csBounds, csOpening, csTranslate, csUnion, mIntersect, mSubtract, mTranslate, prism, rect } from "../shared/shapes";

/** Clear border between the labels and the edge of the build plate. */
export const PLATE_BORDER = 5;

export interface PlacedLabel {
  /** Index across the whole batch, 1-based. */
  index: number;
  spec: LabelSpec;
  /** 3MF object name, e.g. L03_M3_X_8. */
  object: string;
  width: number;
  height: number;
  /** Lower-left corner on its plate. */
  x: number;
  y: number;
  textSize: number;
}

export interface Plate {
  index: number;
  labels: PlacedLabel[];
  parts: Part[];
}

export interface BuildResult {
  plates: Plate[];
  issues: Issue[];
}

interface LabelSolids {
  parts: { name: string; hex: string; solid: Manifold }[];
  textSize: number;
  issues: Issue[];
}

const slug = (s: string) => objectSlug(s, "LABEL");

/** Text block (rings centred on the origin) shrunk to fit `w` × `h`. */
function fitText(text: string, p: LabelParams, w: number, h: number): { section: CrossSection | null; size: number; blockW: number } {
  const probe = 10;
  const block = layoutText(text, p.font, probe, p.letterSpacing, p.lineSpacing);
  if (!block.rings.length || block.width <= 0) return { section: null, size: 0, blockW: 0 };
  const fit = Math.min((probe * w) / block.width, (probe * h) / block.height);
  const size = p.textSize > 0 ? Math.min(p.textSize, fit) : fit;
  const laid = layoutText(text, p.font, size, p.letterSpacing, p.lineSpacing);
  return { section: cs(laid.rings, "Positive"), size, blockW: laid.width };
}

/** One label in its own frame: lower-left corner at the origin, Z = 0 on the bed. */
export function buildLabel(spec: LabelSpec, p: LabelParams, art: Artwork | null): LabelSolids {
  const issues: Issue[] = [];
  const W = labelWidth(p, spec.units);
  const H = p.height;
  const T = p.thickness;
  const where = `Line ${spec.line} "${spec.text.replace(/\n/g, " / ")}"`;
  const inner = { x0: p.padding, y0: p.padding, x1: W - p.padding, y1: H - p.padding };
  const innerH = inner.y1 - inner.y0;

  // icon on the left, square, as tall as the inside of the label
  let icon: CrossSection | null = null;
  const iconId: IconId = spec.icon;
  if (iconId === "custom") {
    if (art) icon = artworkIcon(art, innerH);
    else issues.push({ severity: "warning", message: `${where}: asks for the uploaded SVG icon, but no SVG is loaded.` });
  } else if (iconId !== "none") icon = builtinIcon(iconId, innerH);
  let textX0 = inner.x0;
  if (icon) {
    icon = csTranslate(icon, inner.x0 + innerH / 2, H / 2);
    textX0 = inner.x0 + innerH + p.iconGap;
  }

  const availW = inner.x1 - textX0;
  let text: CrossSection | null = null;
  let size = 0;
  if (availW < 3) issues.push({ severity: "warning", message: `${where}: no room for text next to the icon; use a wider label.` });
  else {
    const fitted = fitText(spec.text, p, availW, innerH);
    size = fitted.size;
    if (fitted.section) {
      const cx = p.align === "left" ? textX0 + fitted.blockW / 2 : (textX0 + inner.x1) / 2;
      text = csTranslate(fitted.section, cx, H / 2);
    }
    const missing = missingCharacters(spec.text, p.font);
    if (missing.length) issues.push({ severity: "warning", message: `${where}: the font has no letter shape for ${missing.join(" ")}; it prints as "?".` });
    if (size > 0 && size < 3) issues.push({ severity: "warning", message: `${where}: letters are only ${size.toFixed(1)} mm tall; shorten the text or use a wider label.` });
  }

  // printability of strokes
  const deco = csUnion([text, icon].filter((x): x is CrossSection => !!x));
  if (!deco.isEmpty()) {
    const a = deco.area();
    const kept = csOpening(deco, p.nozzle / 2).area();
    if (kept < a * 0.75) issues.push({ severity: "warning", message: `${where}: about ${Math.round((1 - kept / a) * 100)}% of the text/icon is thinner than one nozzle width and will not print.` });
  }

  const outline = rect(0, 0, W, H, p.cornerRadius);
  let plate = prism(outline, 0, T);
  const parts: LabelSolids["parts"] = [];
  const zTop = p.relief === "raised" ? T + p.reliefDepth : T;
  const zBot = p.relief === "raised" ? T : T - p.reliefDepth;
  const decoParts: [string, string, CrossSection | null][] = [["TEXT", p.textColor, text], ["ICON", p.iconColor, icon]];
  if (p.relief !== "raised" && !deco.isEmpty()) plate = mSubtract(plate, prism(deco, zBot, T + 1));
  if (p.relief !== "engraved") {
    // Icon and text never overlap in 2D (icon sits left of the text column), but clip anyway.
    for (const [name, hex, section] of decoParts) {
      if (!section || section.isEmpty()) continue;
      parts.push({ name, hex: hex.toUpperCase(), solid: prism(section, zBot, zTop) });
    }
  }
  parts.unshift({ name: "PLATE", hex: p.plateColor.toUpperCase(), solid: plate });
  // overlap check inside this label
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      const v = mIntersect(parts[i].solid, parts[j].solid).volume();
      if (v > 0.01) issues.push({ severity: "error", message: `${where}: ${parts[i].name} and ${parts[j].name} overlap by ${v.toFixed(2)} mm³.` });
    }
  return { parts, textSize: size, issues };
}

/**
 * Shelf packing in batch order: labels fill a row left to right, rows stack
 * up the plate, and a new plate starts when the next row would not fit.
 * Order is kept so the manifest reads like the input list.
 */
export function layoutPlates(specs: LabelSpec[], p: LabelParams): { plates: Omit<PlacedLabel, "textSize">[][]; issues: Issue[] } {
  const issues: Issue[] = [];
  const plates: Omit<PlacedLabel, "textSize">[][] = [];
  const sizes = specs.map((spec) => ({ w: labelWidth(p, spec.units), h: p.height }));
  shelfPack(sizes, p.bedSize, PLATE_BORDER, p.plateGap).forEach((at, i) => {
    const spec = specs[i];
    const { w, h } = sizes[i];
    if (!at) {
      issues.push({ severity: "error", message: `Line ${spec.line}: a ${w.toFixed(0)} mm label does not fit a ${p.bedSize} mm bed.` });
      return;
    }
    const index = i + 1;
    (plates[at.plate] ??= []).push({ index, spec, object: `L${String(index).padStart(2, "0")}_${slug(spec.text)}`, width: w, height: h, x: at.x, y: at.y });
  });
  return { plates: plates.filter((pl) => pl?.length), issues };
}

/** Builds every label of a batch, placed on its plate. */
export function buildBatch(specs: LabelSpec[], p: LabelParams, art: Artwork | null): BuildResult {
  const { plates: layout, issues } = layoutPlates(specs, p);
  const plates: Plate[] = layout.map((labels, pi) => {
    const parts: Part[] = [];
    const placed: PlacedLabel[] = labels.map((l) => {
      const built = buildLabel(l.spec, p, art);
      issues.push(...built.issues);
      for (const part of built.parts) {
        const m = mTranslate(part.solid, l.x, l.y, 0);
        if (m.isEmpty()) continue;
        parts.push({ name: part.name, object: l.object, hex: part.hex, mesh: manifoldToMesh(m), volume: m.volume() });
      }
      return { ...l, textSize: built.textSize };
    });
    return { index: pi + 1, labels: placed, parts };
  });
  const colours = new Set(plates.flatMap((pl) => pl.parts.map((x) => x.hex)));
  if (colours.size > 4) issues.push({ severity: "warning", message: `${colours.size} colours: more than one AMS holds.` });
  return { plates, issues };
}

/**
 * Fit-test strip: three blank 1-unit labels at the chosen height −0.4 / 0 /
 * +0.4 mm, each engraved with its height. Slide them into a real bin and use
 * the one that fits; label slots differ between Gridfinity bin designs.
 */
export function fitTestSpecs(p: LabelParams): { specs: LabelSpec[]; params: LabelParams[] } {
  const heights = [-0.4, 0, 0.4].map((d) => Math.round((p.height + d) * 10) / 10);
  return {
    specs: heights.map((h, i) => ({ line: i + 1, text: `${h.toFixed(1)}`, icon: "none" as IconId, units: 1, order: "fit-test" })),
    params: heights.map((h) => ({ ...p, height: h, widthMode: "units", relief: "engraved", reliefDepth: Math.min(0.6, p.thickness - 0.6), textSize: Math.min(5, h * 0.5) })),
  };
}

export function buildFitTest(p: LabelParams): BuildResult {
  const { specs, params } = fitTestSpecs(p);
  const issues: Issue[] = [];
  const parts: Part[] = [];
  const labels: PlacedLabel[] = [];
  let y = PLATE_BORDER;
  specs.forEach((spec, i) => {
    const lp = params[i];
    const built = buildLabel(spec, lp, null);
    issues.push(...built.issues);
    const object = `FIT_${spec.text.replace(".", "_")}MM`;
    for (const part of built.parts) {
      const m = mTranslate(part.solid, PLATE_BORDER, y, 0);
      parts.push({ name: part.name, object, hex: part.hex, mesh: manifoldToMesh(m), volume: m.volume() });
    }
    labels.push({ index: i + 1, spec, object, width: labelWidth(lp, 1), height: lp.height, x: PLATE_BORDER, y, textSize: built.textSize });
    y += lp.height + p.plateGap;
  });
  return { plates: [{ index: 1, labels, parts }], issues };
}

export { csBounds, kernel };
