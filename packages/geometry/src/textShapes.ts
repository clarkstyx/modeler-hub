import { Font } from "three/examples/jsm/loaders/FontLoader.js";
import type { Ring } from "./types";

/** The bundled three.js typeface fonts (MIT / Apache 2.0, shipped with three). */
export type FontId = "sans" | "rounded" | "serif" | "droidSans";
// three.js typeface JSON fonts (MgOpen / Droid licences allow redistribution), so text works offline.
import rounded from "three/examples/fonts/optimer_bold.typeface.json";
import sans from "three/examples/fonts/helvetiker_bold.typeface.json";
import serif from "three/examples/fonts/gentilis_bold.typeface.json";
import droidSans from "three/examples/fonts/droid/droid_sans_bold.typeface.json";

const DATA: Record<FontId, unknown> = { rounded, sans, serif, droidSans };
const fonts = new Map<FontId, Font>();
const capRatio = new Map<FontId, number>();

function font(id: FontId): Font {
  let f = fonts.get(id);
  if (!f) {
    f = new Font(DATA[id] as ConstructorParameters<typeof Font>[0]);
    fonts.set(id, f);
  }
  return f;
}

function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a / 2;
}

/** Outlines CCW, holes CW, so the rings fill with the "Positive" rule. */
function glyphRings(f: Font, ch: string, size: number): Ring[] {
  const rings: Ring[] = [];
  for (const shape of f.generateShapes(ch, size)) {
    const { shape: outline, holes } = shape.extractPoints(8);
    const o: Ring = outline.map((p) => [p.x, p.y]);
    if (o.length >= 3) rings.push(signedArea(o) >= 0 ? o : o.reverse());
    for (const h of holes) {
      const r: Ring = h.map((p) => [p.x, p.y]);
      if (r.length >= 3) rings.push(signedArea(r) <= 0 ? r : r.reverse());
    }
  }
  return rings;
}

function capHeightRatio(id: FontId): number {
  let r = capRatio.get(id);
  if (r === undefined) {
    let minY = Infinity, maxY = -Infinity;
    for (const ring of glyphRings(font(id), "H", 100)) for (const [, y] of ring) { minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
    r = (maxY - minY) / 100;
    capRatio.set(id, r);
  }
  return r;
}

export interface TextBlock {
  /** Rings in mm, centred on (0,0): x is the reading direction, y up. */
  rings: Ring[];
  width: number;
  height: number;
  lines: number;
}

/** Characters the font has no outline for (they print as "?"). */
export function missingCharacters(text: string, fontId: FontId): string[] {
  const data = font(fontId).data as unknown as { glyphs: Record<string, unknown> };
  return [...new Set(Array.from(text).filter((ch) => ch.trim() && !data.glyphs[ch]))];
}

/**
 * Lays out one or more lines (split on \n) so capital letters are `capHeight`
 * mm tall, each line centred, the block centred on the origin.
 */
export function layoutText(text: string, fontId: FontId, capHeight: number, letterSpacing = 0.05, lineSpacing = 1.25): TextBlock {
  const f = font(fontId);
  const size = capHeight / capHeightRatio(fontId);
  const data = f.data as unknown as { resolution: number; glyphs: Record<string, { ha?: number }> };
  const scale = size / data.resolution;
  const tracking = letterSpacing * capHeight;
  const lines = text.replace(/\r/g, "").split("\n").map((l) => l.replace(/\s+$/, ""));
  const laid: { rings: Ring[]; width: number }[] = [];
  for (const line of lines) {
    const rings: Ring[] = [];
    let x = 0;
    const chars = Array.from(line);
    chars.forEach((ch, i) => {
      const g = data.glyphs[ch] ?? data.glyphs["?"];
      const advance = (g?.ha ?? data.resolution / 2) * scale;
      if (ch.trim()) for (const r of glyphRings(f, ch, size)) rings.push(r.map(([px, py]) => [px + x, py] as [number, number]));
      x += advance + (i < chars.length - 1 ? tracking : 0);
    });
    laid.push({ rings, width: x });
  }
  const pitch = capHeight * lineSpacing;
  const totalH = capHeight + (laid.length - 1) * pitch;
  const width = Math.max(0, ...laid.map((l) => l.width));
  const rings: Ring[] = [];
  laid.forEach((l, i) => {
    const dx = -l.width / 2;
    // first line at the top; baseline of line i
    const baseline = totalH / 2 - capHeight - i * pitch;
    for (const r of l.rings) rings.push(r.map(([x, y]) => [x + dx, y + baseline] as [number, number]));
  });
  return { rings, width, height: totalH, lines: laid.length };
}
