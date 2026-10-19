import { SIGN, TARGETS, WING, type StadiumParams } from "../core/params";
import type { Artwork, Issue } from "../core/types";
import { type CrossSection } from "../shared/kernel";
import { cs, csBounds, csOffset, csOpening, csScale, csSimplify, csSubtract, csTranslate, csUnion } from "../shared/shapes";
import { layoutText, missingCharacters } from "../shared/textShapes";

/** Which of the four filaments a piece of artwork prints in. */
export type Palette = "structure" | "facade" | "accent" | "sign";

/** Raised artwork for the sign panel, laid out in the X–Z plane (x to the right, z up), centred on (0, 0). */
export interface SignArt {
  /** The text (facade colour), ready to extrude. Null when there is none. */
  section: CrossSection | null;
  /** Emblem pieces, one per filament colour, side by side (later SVG layers win where they overlap). */
  emblem: { colour: Palette; section: CrossSection }[];
  /** Size of the panel that holds it, margins included. */
  panelW: number;
  panelH: number;
  capHeight: number;
  emblemH: number;
}

/**
 * Fits the text (and the emblem above it) into a panel at most `maxW` wide
 * and `maxH` tall. Letters shrink to fit the width; strokes thinner than the
 * nozzle are reported, since they would print ragged or vanish.
 */
export function layoutSign(p: StadiumParams, art: Artwork | null, maxW: number, maxH: number, issues: Issue[], withText = true): SignArt {
  const text = withText ? p.text.replace(/\s+/g, " ").trim() : "";
  const innerW = maxW - 2 * SIGN.margin;
  const innerH = maxH - 2 * SIGN.margin;

  // --- emblem (optional): every SVG colour becomes its own raised piece in the nearest filament colour
  const emblemPieces: { colour: Palette; section: CrossSection }[] = [];
  let emblemH = 0;
  if (art) {
    const layers = art.layers.map((l) => ({ colour: nearestColour(l.hex, p), section: cs(l.rings.map((r) => r.map(([x, y]) => [x, -y] as [number, number]).reverse()), "NonZero") }));
    const all = csUnion(layers.map((l) => l.section));
    const b = csBounds(all);
    if (b.w > 0 && b.h > 0) {
      // Alone on the tower (the name is on the wings) the emblem fills the face, like a ballpark crest.
      const want = p.emblemHeight > 0 ? p.emblemHeight : text ? Math.min(innerW * 0.45, innerH * 0.5, 14) : Math.min(innerW * 0.85, innerH, 26);
      const roomH = text ? innerH - SIGN.minCap - 1.5 : innerH;
      emblemH = Math.max(0, Math.min(want, roomH, (innerW * b.h) / b.w));
      if (emblemH >= 2) {
        const sc = emblemH / b.h;
        const fit = (c: CrossSection) => csScale(csTranslate(c, -(b.minX + b.w / 2), -(b.minY + b.h / 2)), sc);
        let before = 0, after = 0;
        // Painter's order: a later layer covers the earlier ones, so each piece is what still shows.
        layers.forEach((l, i) => {
          const above = layers.slice(i + 1).map((x) => x.section);
          const visible = above.length ? csSubtract(l.section, csUnion(above)) : l.section;
          const scaled = fit(visible);
          before += scaled.area();
          // Closing then opening at half a nozzle: fills pinholes, drops hairlines, and rounds pixel staircases of a traced bitmap.
          const closed = csOffset(csOffset(scaled, p.nozzle / 2), -p.nozzle / 2);
          const clean = csSimplify(csOpening(closed, p.nozzle / 2), 0.01);
          after += clean.area();
          if (!clean.isEmpty()) emblemPieces.push({ colour: l.colour, section: clean });
        });
        const lost = before > 0 ? (before - after) / before : 1;
        if (lost > 0.12) issues.push({ severity: "warning", message: `Emblem: ${(lost * 100).toFixed(0)} % of the artwork is thinner than one nozzle width (${p.nozzle} mm) and was dropped. A bolder drawing or a taller emblem prints better.` });
        else if (lost > 0.01) issues.push({ severity: "info", message: `Emblem: hairlines under ${p.nozzle} mm were removed (${(lost * 100).toFixed(1)} % of the area).` });
        if (!emblemPieces.length) { emblemH = 0; issues.push({ severity: "warning", message: "Emblem: nothing printable is left of the artwork at this size." }); }
        const used = new Set(emblemPieces.map((e) => e.colour));
        if (art.layers.length > used.size) issues.push({ severity: "info", message: `Emblem: ${art.layers.length} colours in the SVG printed with ${used.size} of your four filaments (each mapped to the nearest).` });
      } else {
        emblemH = 0;
        issues.push({ severity: "warning", message: "Emblem: no room on the sign at this size; the text alone is shown." });
      }
    }
  }

  // --- text, shrunk to the width
  let textSection: CrossSection | null = null;
  let capHeight = 0;
  if (text) {
    const missing = missingCharacters(text, p.font);
    if (missing.length) issues.push({ severity: "warning", message: `The font has no ${missing.map((c) => `"${c}"`).join(", ")}; drawn as "?".` });
    const roomH = innerH - (emblemH > 0 ? emblemH + 1.5 : 0);
    capHeight = Math.min(SIGN.maxCap, roomH, Math.max(SIGN.minCap, maxW * 0.17));
    const probe = layoutText(text, p.font, 10, 0.06, 1.2);
    if (probe.width > 0) capHeight = Math.min(capHeight, (innerW * 10) / probe.width);
    if (capHeight < 2.5) {
      issues.push({ severity: "warning", message: `Sign text would be under 2.5 mm tall on a ${maxW.toFixed(0)} mm wide entrance; it was left off. Shorter text or more sections (a wider front) make room.` });
      capHeight = 0;
    } else {
      if (capHeight < SIGN.minCap) issues.push({ severity: "warning", message: `Sign letters are only ${capHeight.toFixed(1)} mm tall; strokes may print thinner than ${TARGETS.stroke} mm. Shorter text or a wider front helps.` });
      const block = layoutText(text, p.font, capHeight, 0.06, 1.2);
      const raw = cs(block.rings, "Positive");
      const before = raw.area();
      const clean = csSimplify(csOpening(raw, p.nozzle / 2), 0.01);
      const lost = before > 0 ? (before - clean.area()) / before : 0;
      if (lost > 0.03) issues.push({ severity: "warning", message: `Sign text: ${(lost * 100).toFixed(0)} % of the letter area is thinner than one nozzle width and would not print; use a bolder font or shorter text.` });
      textSection = clean;
    }
  }

  // --- stack: emblem above, text below, both centred
  const contentH = (emblemH > 0 ? emblemH : 0) + (capHeight > 0 && emblemH > 0 ? 1.5 : 0) + capHeight;
  let zTop = contentH / 2;
  let emblem: { colour: Palette; section: CrossSection }[] = [];
  if (emblemPieces.length && emblemH > 0) {
    emblem = emblemPieces.map((e) => ({ colour: e.colour, section: csTranslate(e.section, 0, zTop - emblemH / 2) }));
    zTop -= emblemH + (capHeight > 0 ? 1.5 : 0);
  }
  const section = textSection && capHeight > 0 ? csTranslate(textSection, 0, zTop - capHeight / 2) : null;
  const widths = [...emblem.map((e) => csBounds(e.section)), ...(section ? [csBounds(section)] : [])];
  const contentW = widths.length ? Math.max(...widths.map((w) => w.maxX)) - Math.min(...widths.map((w) => w.minX)) : 0;
  return {
    section,
    emblem,
    panelW: Math.min(maxW, Math.max(contentW + 2 * SIGN.margin, maxW * 0.7)),
    panelH: Math.min(maxH, Math.max(contentH + 2 * SIGN.margin, 5)),
    capHeight,
    emblemH,
  };
}

/** The filament whose colour is closest to an SVG fill (plain RGB distance). */
export function nearestColour(hex: string, p: StadiumParams): Palette {
  const rgb = (h: string) => {
    const m = h.replace("#", "");
    const v = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.padEnd(6, "0");
    return [parseInt(v.slice(0, 2), 16), parseInt(v.slice(2, 4), 16), parseInt(v.slice(4, 6), 16)];
  };
  const target = rgb(hex);
  const options: [Palette, string][] = [["structure", p.colorStructure], ["facade", p.colorFacade], ["accent", p.colorAccent], ["sign", p.colorSign]];
  let best: Palette = "facade", bestD = Infinity;
  for (const [name, c] of options) {
    const o = rgb(c);
    const dd = (o[0] - target[0]) ** 2 + (o[1] - target[1]) ** 2 + (o[2] - target[2]) ** 2;
    if (dd < bestD) { bestD = dd; best = name; }
  }
  return best;
}

/** The sign text alone, fitted into `maxW` × `maxH` for the wall faces beside the tower; null when it would be under 3 mm. */
export function layoutWingText(p: StadiumParams, maxW: number, maxH: number, issues: Issue[]): { section: CrossSection; capHeight: number } | null {
  const text = p.text.replace(/\s+/g, " ").trim();
  if (!text || maxW < 8 || maxH < WING.minCap) return null;
  const probe = layoutText(text, p.font, 10, 0.06, 1.2);
  if (probe.width <= 0) return null;
  const capHeight = Math.min(WING.maxCap, maxH, (maxW * 10) / probe.width);
  if (capHeight < WING.minCap) {
    issues.push({ severity: "info", message: `No room for the name banners beside the entrance (letters would be ${capHeight.toFixed(1)} mm tall); the name stays on the tower only.` });
    return null;
  }
  const raw = cs(layoutText(text, p.font, capHeight, 0.06, 1.2).rings, "Positive");
  const clean = csSimplify(csOpening(raw, p.nozzle / 2), 0.01);
  return clean.isEmpty() ? null : { section: clean, capHeight };
}
