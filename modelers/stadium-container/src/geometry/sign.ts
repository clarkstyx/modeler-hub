import { SIGN, TARGETS, type StadiumParams } from "../core/params";
import type { Artwork, Issue } from "../core/types";
import { type CrossSection } from "../shared/kernel";
import { cs, csBounds, csOpening, csScale, csSimplify, csTranslate, csUnion } from "../shared/shapes";
import { layoutText, missingCharacters } from "../shared/textShapes";

/** Raised artwork for the sign panel, laid out in the X–Z plane (x to the right, z up), centred on (0, 0). */
export interface SignArt {
  /** Text and emblem together, ready to extrude. Empty when there is nothing to show. */
  section: CrossSection | null;
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
export function layoutSign(p: StadiumParams, art: Artwork | null, maxW: number, maxH: number, issues: Issue[]): SignArt {
  const text = p.text.replace(/\s+/g, " ").trim();
  const innerW = maxW - 2 * SIGN.margin;
  const innerH = maxH - 2 * SIGN.margin;
  const pieces: CrossSection[] = [];

  // --- emblem (optional), one colour, printable strokes only
  let emblem: CrossSection | null = null;
  let emblemH = 0;
  if (art) {
    const rings = art.layers.flatMap((l) => l.rings).map((r) => r.map(([x, y]) => [x, -y] as [number, number]).reverse());
    const raw = cs(rings, "NonZero");
    const b = csBounds(raw);
    if (b.w > 0 && b.h > 0) {
      const want = p.emblemHeight > 0 ? p.emblemHeight : Math.min(innerW * 0.45, innerH * 0.5, 14);
      const roomH = text ? innerH - SIGN.minCap - 1.5 : innerH;
      emblemH = Math.max(0, Math.min(want, roomH, (innerW * b.h) / b.w));
      if (emblemH >= 2) {
        const s = emblemH / b.h;
        let fitted = csScale(csTranslate(raw, -(b.minX + b.w / 2), -(b.minY + b.h / 2)), s);
        const before = fitted.area();
        fitted = csSimplify(csOpening(fitted, p.nozzle / 2), 0.01);
        const lost = before > 0 ? (before - fitted.area()) / before : 1;
        if (lost > 0.12) issues.push({ severity: "warning", message: `Emblem: ${(lost * 100).toFixed(0)} % of the artwork is thinner than one nozzle width (${p.nozzle} mm) and was dropped. A bolder drawing or a taller emblem prints better.` });
        else if (lost > 0.01) issues.push({ severity: "info", message: `Emblem: hairlines under ${p.nozzle} mm were removed (${(lost * 100).toFixed(1)} % of the area).` });
        if (fitted.isEmpty()) { emblemH = 0; issues.push({ severity: "warning", message: "Emblem: nothing printable is left of the artwork at this size." }); }
        else emblem = fitted;
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
  if (emblem && emblemH > 0) {
    pieces.push(csTranslate(emblem, 0, zTop - emblemH / 2));
    zTop -= emblemH + (capHeight > 0 ? 1.5 : 0);
  }
  if (textSection && capHeight > 0) pieces.push(csTranslate(textSection, 0, zTop - capHeight / 2));
  const section = pieces.length ? csUnion(pieces) : null;
  const contentW = section ? csBounds(section).w : 0;
  return {
    section,
    panelW: Math.min(maxW, Math.max(contentW + 2 * SIGN.margin, maxW * 0.7)),
    panelH: Math.min(maxH, Math.max(contentH + 2 * SIGN.margin, 5)),
    capHeight,
    emblemH,
  };
}
