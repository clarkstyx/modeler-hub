import { derive, type BoxParams, type Derived } from "../core/params";
import type { Artwork, Issue, Part, Ring } from "../core/types";
import { layoutText, missingCharacters } from "../text/textShapes";
import { manifoldToMesh } from "./mesh";
import { type CrossSection, type Manifold, kernel, track } from "./kernel";
import {
  box, cs, csBounds, csIntersect, csOffset, csOpening, csRotate, csScale, csSubtract, csTranslate, csUnion,
  mIntersect, mSubtract, mTranslate, mUnion, prism, rect, rectRing,
} from "./shapes";

/** Gap between the box and the lid on the print bed. */
export const PLATE_GAP = 10;

export interface BuiltPart {
  name: string;
  object: string;
  hex: string;
  solid: Manifold;
}

export interface DecoRegion {
  hex: string;
  name: string;
  cs: CrossSection;
}

export interface BuildResult {
  parts: Part[];
  issues: Issue[];
  derived: Derived;
  /** Where the lid (built with its own corner at the origin) sits on the print bed. */
  lidPrintOffset: [number, number, number];
  /** Where the lid sits when closed on the box. */
  lidClosedOffset: [number, number, number];
  /** Final text cap height after fitting (mm), 0 when there is no text. */
  textSizeUsed: number;
  /** Final artwork width (mm), 0 when none. */
  artWidthUsed: number;
}

const colourName = (hex: string) => hex.replace("#", "").toUpperCase();

function toPart(b: BuiltPart): Part {
  return { name: b.name, object: b.object, hex: b.hex, mesh: manifoldToMesh(b.solid), volume: b.solid.volume() };
}

/** Outer shell minus cavity, rails and the front opening; dividers added. */
export function buildBody(p: BoxParams, d: Derived): Manifold {
  const w = p.wall;
  const r = d.cornerRadius;
  const gd = d.railDepth;
  const { outerL: L, outerW: W, outerH: H, railZ } = d;
  const outer = rect(0, 0, L, W, r);
  const inner = rect(w, w, L - w, W - w, Math.max(0, r - w));
  let body = mSubtract(prism(outer, 0, H), prism(inner, p.base, H + 1));

  // Rail: the cavity grown by the rail depth, cut from the lid's underside up to the lip,
  // plus a slot straight out through the front wall.
  const railCS = csUnion([
    rect(w - gd, w - gd, L - w + gd, W - w + gd, Math.max(0, r - w) + gd),
    rect(-1, w - gd, w + 0.01, W - w + gd, 0),
  ]);
  body = mSubtract(body, prism(railCS, railZ, railZ + p.lidThickness + p.clearance));
  // Front opening: remove the lip above the rail across the lid's width so the lid slides in.
  body = mSubtract(body, box(-1, w - gd, railZ, w + 0.01, W - w + gd, H + 1));

  // Dividers
  const cols = Math.max(1, Math.round(p.dividerCols));
  const rows = Math.max(1, Math.round(p.dividerRows));
  if (cols * rows > 1) {
    const dt = p.dividerThickness;
    const z0 = p.base - 0.05;
    const z1 = p.base + d.dividerHeight;
    const divs: Manifold[] = [];
    const cellL = (d.innerL - (cols - 1) * dt) / cols;
    for (let i = 1; i < cols; i++) {
      const x = w + i * cellL + (i - 1) * dt;
      divs.push(box(x, w - 0.05, z0, x + dt, W - w + 0.05, z1));
    }
    const cellW = (d.innerW - (rows - 1) * dt) / rows;
    for (let j = 1; j < rows; j++) {
      const y = w + j * cellW + (j - 1) * dt;
      divs.push(box(w - 0.05, y, z0, L - w + 0.05, y + dt, z1));
    }
    body = mUnion([body, ...divs]);
  }
  return body;
}

/** Lid footprint in lid-local coordinates: x along the slide, front edge at x = 0. */
export function lidFootprint(d: Derived): CrossSection {
  const f = d.lidFrontRadius;
  const b = d.lidBackRadius;
  return cs([rectRing(0, 0, d.lidL, d.lidW, [f, b, b, f])]);
}

interface DecoPlan {
  regions: DecoRegion[];
  textSizeUsed: number;
  artWidthUsed: number;
  issues: Issue[];
}

/** Lays the text and artwork out on the lid top (lid-local coordinates). */
export function planDecoration(p: BoxParams, d: Derived, art: Artwork | null): DecoPlan {
  const issues: Issue[] = [];
  const regions: DecoRegion[] = [];
  const text = p.text.trim();
  const hasArt = !!art && art.layers.some((l) => l.rings.length);
  if (!text && !hasArt) return { regions, textSizeUsed: 0, artWidthUsed: 0, issues };

  const gripZone = p.lidGrip === "none" ? 0 : 10;
  const x0 = Math.max(p.decoMargin, gripZone);
  const x1 = d.lidL - p.decoMargin;
  const y0 = p.decoMargin;
  const y1 = d.lidW - p.decoMargin;
  if (x1 - x0 < 4 || y1 - y0 < 4) {
    issues.push({ severity: "warning", message: "The lid is too small for text or artwork inside the margin; nothing was placed." });
    return { regions, textSizeUsed: 0, artWidthUsed: 0, issues };
  }
  const along = p.textDirection === "along";
  // Frame: reading direction = u, up = v.
  const availU = along ? x1 - x0 : y1 - y0;
  const availV = along ? y1 - y0 : x1 - x0;
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const place = (section: CrossSection): CrossSection => {
    const rotated = along ? section : csRotate(section, 90);
    return csTranslate(rotated, cx, cy);
  };

  // Text first at the requested size, shrunk to fit the frame width.
  let textSize = 0;
  let textBlock = text ? layoutText(text, p.font, p.textSize, p.letterSpacing, p.lineSpacing) : null;
  if (textBlock) {
    textSize = p.textSize;
    if (textBlock.width > availU) {
      textSize = Math.max(3, (p.textSize * availU) / textBlock.width);
      textBlock = layoutText(text, p.font, textSize, p.letterSpacing, p.lineSpacing);
    }
    const missing = missingCharacters(text, p.font);
    if (missing.length) issues.push({ severity: "warning", message: `This font has no outline for ${missing.join(" ")}; they print as "?".` });
  }

  // Artwork: width from the parameter (0 = fill), height follows; shrink to leave room for the text.
  let artSections: { hex: string; cs: CrossSection; name: string }[] = [];
  let artWidthUsed = 0;
  let artH = 0;
  if (hasArt && art) {
    const srcW = art.bounds.maxX - art.bounds.minX;
    const srcH = art.bounds.maxY - art.bounds.minY;
    if (srcW > 0 && srcH > 0) {
      let targetW = Math.min(p.artWidth > 0 ? p.artWidth : availU, availU);
      let scale = targetW / srcW;
      artH = srcH * scale;
      const textH = textBlock ? textBlock.height + p.artTextGap : 0;
      if (artH + textH > availV) {
        const room = availV - textH;
        if (room >= 4) {
          scale = room / srcH;
          targetW = srcW * scale;
          artH = room;
          issues.push({ severity: "info", message: `Artwork reduced to ${targetW.toFixed(1)} mm wide to fit above the text.` });
        } else {
          // Not enough room: shrink the text instead, then the art.
          if (textBlock && text) {
            textSize = Math.max(3, textSize * 0.6);
            textBlock = layoutText(text, p.font, textSize, p.letterSpacing, p.lineSpacing);
          }
          const room2 = Math.max(4, availV - (textBlock ? textBlock.height + p.artTextGap : 0));
          scale = Math.min(scale, room2 / srcH);
          targetW = srcW * scale;
          artH = srcH * scale;
          issues.push({ severity: "warning", message: "Lid is small for artwork and text together; both were shrunk." });
        }
      }
      artWidthUsed = targetW;
      const totalV = artH + (textBlock ? p.artTextGap + textBlock.height : 0);
      const artCenterV = totalV / 2 - artH / 2;
      const sx = -(art.bounds.minX + art.bounds.maxX) / 2;
      const sy = -(art.bounds.minY + art.bounds.maxY) / 2;
      // Painter order: later layers win, so earlier ones lose the overlap.
      const raw = art.layers.map((l) => csScale(csTranslate(cs(l.rings, "NonZero"), sx, sy), scale));
      for (let i = 0; i < raw.length; i++) {
        let section = raw[i];
        for (let j = i + 1; j < raw.length; j++) section = csSubtract(section, raw[j]);
        section = csTranslate(section, 0, artCenterV);
        if (section.isEmpty()) continue;
        const hex = (p.artColorOverride || art.layers[i].hex).toUpperCase();
        artSections.push({ hex, cs: section, name: `ART_${i + 1}_${colourName(hex)}` });
      }
      // Flip Y: SVG y points down, the lid frame's v points up.
      artSections = artSections.map((a) => ({ ...a, cs: track(a.cs.mirror([0, 1])) }));
      // mirror() reflected the vertical offset too; put the artwork back above the text.
      artSections = artSections.map((a) => ({ ...a, cs: csTranslate(a.cs, 0, 2 * artCenterV) }));
    }
  }

  let textSection: CrossSection | null = null;
  if (textBlock) {
    const totalV = (artH ? artH + p.artTextGap : 0) + textBlock.height;
    const textCenterV = -totalV / 2 + textBlock.height / 2;
    textSection = csTranslate(cs(textBlock.rings, "Positive"), 0, textCenterV);
    if (textSize < p.textSize - 1e-6) issues.push({ severity: "info", message: `Text shrunk to ${textSize.toFixed(1)} mm to fit the lid.` });
    if (textSize < 5) issues.push({ severity: "warning", message: `Letters are only ${textSize.toFixed(1)} mm tall; fine detail may not print well.` });
  }

  // Merge the same colours, keep text on top of artwork, never let two regions overlap.
  const byHex = new Map<string, CrossSection[]>();
  const push = (hex: string, section: CrossSection) => {
    const k = hex.toUpperCase();
    if (!byHex.has(k)) byHex.set(k, []);
    byHex.get(k)!.push(section);
  };
  if (textSection) push(p.textColor, textSection);
  for (const a of artSections) push(a.hex, textSection ? csSubtract(a.cs, textSection) : a.cs);

  const frame = rect(-availU / 2, -availV / 2, availU / 2, availV / 2, 0);
  let idx = 0;
  for (const [hex, list] of byHex) {
    let merged = csIntersect(csUnion(list), frame);
    merged = track(merged.simplify(0.002));
    if (merged.isEmpty()) continue;
    const name = hex === p.textColor.toUpperCase() && textSection ? "LID_TEXT" : `LID_ART_${++idx}_${colourName(hex)}`;
    regions.push({ hex, name, cs: place(merged) });
  }

  // Printability: strokes thinner than the nozzle vanish; thinner than two widths are weak.
  const all = csUnion(regions.map((r) => r.cs));
  if (!all.isEmpty()) {
    const area = all.area();
    const thin1 = csOpening(all, p.nozzle / 2).area();
    const thin2 = csOpening(all, p.nozzle).area();
    if (thin1 < area * 0.7) issues.push({ severity: "warning", message: `About ${Math.round((1 - thin1 / area) * 100)}% of the lid decoration is thinner than one nozzle width (${p.nozzle} mm) and will not print.` });
    else if (thin2 < area * 0.5) issues.push({ severity: "info", message: `Much of the decoration is thinner than two nozzle widths; use a bolder font or larger size for a crisper print.` });
  }
  return { regions, textSizeUsed: textSize, artWidthUsed, issues };
}

/** Lid solids in lid-local coordinates (corner at the origin, z from 0 to the lid thickness). */
export function buildLid(p: BoxParams, d: Derived, plan: DecoPlan): BuiltPart[] {
  const tl = p.lidThickness;
  let lid = prism(lidFootprint(d), 0, tl);
  const parts: BuiltPart[] = [];

  // Grip
  if (p.lidGrip === "thumbNotch") {
    const notchW = Math.min(24, d.lidW * 0.5);
    const notchL = 6;
    const notch = rect(3, d.lidW / 2 - notchW / 2, 3 + notchL, d.lidW / 2 + notchW / 2, Math.min(notchL, notchW) / 2 - 0.01);
    lid = mSubtract(lid, prism(notch, tl - p.gripDepth, tl + 1));
  } else if (p.lidGrip === "ridge") {
    const ridgeW = Math.min(24, d.lidW * 0.5);
    const ridge = rect(3, d.lidW / 2 - ridgeW / 2, 6, d.lidW / 2 + ridgeW / 2, 1.2);
    lid = mUnion([lid, prism(ridge, tl - 0.01, tl + p.gripDepth)]);
  }

  // Decoration
  if (plan.regions.length) {
    const all = csUnion(plan.regions.map((r) => r.cs));
    if (p.relief === "raised") {
      for (const r of plan.regions) parts.push({ name: r.name, object: "lid", hex: r.hex, solid: prism(r.cs, tl, tl + p.reliefDepth) });
    } else if (p.relief === "engraved") {
      lid = mSubtract(lid, prism(all, tl - p.reliefDepth, tl + 1));
    } else {
      lid = mSubtract(lid, prism(all, tl - p.reliefDepth, tl + 1));
      for (const r of plan.regions) parts.push({ name: r.name, object: "lid", hex: r.hex, solid: prism(r.cs, tl - p.reliefDepth, tl) });
    }
  }
  parts.unshift({ name: "LID", object: "lid", hex: p.lidColor.toUpperCase(), solid: lid });
  return parts;
}

/** Overlap check between parts of one printed object: boolean results must share no volume. */
export function overlapIssues(parts: BuiltPart[]): Issue[] {
  const issues: Issue[] = [];
  for (let i = 0; i < parts.length; i++)
    for (let j = i + 1; j < parts.length; j++) {
      if (parts[i].object !== parts[j].object) continue;
      const v = mIntersect(parts[i].solid, parts[j].solid).volume();
      if (v > 0.01) issues.push({ severity: "error", message: `${parts[i].name} and ${parts[j].name} overlap by ${v.toFixed(2)} mm³.` });
    }
  return issues;
}

/** Full box + lid in print layout: box at the origin, lid beside it in +Y. */
export function buildBox(p: BoxParams, art: Artwork | null): BuildResult {
  const d = derive(p);
  const issues: Issue[] = [];
  const body = buildBody(p, d);
  const plan = planDecoration(p, d, art);
  issues.push(...plan.issues);
  const lidPrintOffset: [number, number, number] = [0, d.outerW + PLATE_GAP, 0];
  const lidClosedOffset: [number, number, number] = [0, d.lidY0, d.railZ];
  const lidParts = buildLid(p, d, plan).map((b) => ({ ...b, solid: mTranslate(b.solid, ...lidPrintOffset) }));
  const built: BuiltPart[] = [{ name: "BOX", object: "box", hex: p.bodyColor.toUpperCase(), solid: body }, ...lidParts];
  issues.push(...overlapIssues(built));
  const parts = built.filter((b) => !b.solid.isEmpty()).map(toPart);
  const colours = new Set(parts.map((x) => x.hex));
  if (colours.size > 4) issues.push({ severity: "warning", message: `${colours.size} colours: more than the four slots of one AMS. Merge or recolour artwork colours.` });
  return { parts, issues, derived: d, lidPrintOffset, lidClosedOffset, textSizeUsed: plan.textSizeUsed, artWidthUsed: plan.artWidthUsed };
}

/**
 * Lid-fit calibration set: a short box section plus three lid stubs at the
 * chosen clearance ±0.1 mm, each labelled with its clearance. Print, try each
 * lid, and set Clearance to the one that slides without rattling.
 */
export function buildCalibration(p: BoxParams): BuildResult {
  const base: BoxParams = { ...p, sizeMode: "inner", length: 16, text: "", dividerCols: 1, dividerRows: 1, lidGrip: "none" };
  const d = derive(base);
  const parts: BuiltPart[] = [{ name: "BOX_SECTION", object: "calibration-box", hex: p.bodyColor.toUpperCase(), solid: buildBody(base, d) }];
  const clearances = [-0.1, 0, 0.1].map((dc) => Math.round(Math.max(0.1, p.clearance + dc) * 100) / 100);
  clearances.forEach((c, i) => {
    const lp: BoxParams = { ...base, clearance: c, relief: "engraved", reliefDepth: Math.min(0.6, p.lidThickness - 0.8), text: c.toFixed(2), textSize: 5, decoMargin: 1.5, textDirection: "across" };
    const ld = derive(lp);
    const plan = planDecoration(lp, ld, null);
    const dy = d.outerW + PLATE_GAP + i * (ld.lidW + PLATE_GAP);
    for (const b of buildLid(lp, ld, plan)) parts.push({ ...b, name: `LID_${c.toFixed(2)}`, object: `calibration-lid-${c.toFixed(2)}`, solid: mTranslate(b.solid, 0, dy, 0) });
  });
  const issues = overlapIssues(parts);
  return {
    parts: parts.map(toPart),
    issues,
    derived: d,
    lidPrintOffset: [0, d.outerW + PLATE_GAP, 0],
    lidClosedOffset: [0, d.lidY0, d.railZ],
    textSizeUsed: 0,
    artWidthUsed: 0,
  };
}

// Re-exported for tests that want to inspect raw rings.
export type { Ring };
export const _kernel = kernel;
export { csBounds, csOffset };
