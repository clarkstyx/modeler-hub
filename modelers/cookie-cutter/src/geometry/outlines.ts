import type { CutterParams, ShapeId } from "../core/params";
import type { Artwork, Issue, Ring } from "../core/types";
import { layoutText, missingCharacters } from "../shared/textShapes";
import { track, type CrossSection } from "../shared/kernel";
import { cs, csBounds, csOffset, csOpening, csScale, csSimplify, csTranslate, csUnion } from "../shared/shapes";

export const OUTLINE_TOLERANCE = 0.01;
/** Closing radius that fuses points where an outline touches itself. */
export const PINCH_FUSE = 0.05;

/** One cutting outline: the dough is cut along its boundary. */
export interface Outline {
  /** Shown in messages and the manifest, e.g. HEART, A, "i (lower case)". */
  label: string;
  /** Stem of the slicer object name, e.g. HEART, A, I_LOWER. */
  stem: string;
  section: CrossSection;
}

const TAU = Math.PI * 2;
const around = (n: number, f: (t: number) => [number, number]): Ring => Array.from({ length: n }, (_, i) => f((i / n) * TAU));

/** Built-in shapes at an arbitrary scale; they are fitted to the size afterwards. */
export function shapeSection(id: ShapeId): CrossSection {
  switch (id) {
    case "circle":
      return cs([around(160, (t) => [Math.cos(t), Math.sin(t)])]);
    case "scalloped": {
      // A disc with 12 round scallops around its rim.
      const n = 12, R = 0.86, r = 0.2;
      return csUnion([
        cs([around(160, (t) => [R * Math.cos(t), R * Math.sin(t)])]),
        ...Array.from({ length: n }, (_, k) => cs([around(64, (t) => [R * Math.cos((k / n) * TAU) + r * Math.cos(t), R * Math.sin((k / n) * TAU) + r * Math.sin(t)])])),
      ]);
    }
    case "heart":
      // The classic heart curve (x = 16 sin³t, y = 13 cos t − 5 cos 2t − 2 cos 3t − cos 4t).
      return cs([around(240, (t) => [16 * Math.sin(t) ** 3, 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)]).reverse()]);
    case "star":
      return cs([Array.from({ length: 10 }, (_, i) => {
        const a = Math.PI / 2 + (i / 10) * TAU;
        const r = i % 2 ? 0.45 : 1;
        return [r * Math.cos(a), r * Math.sin(a)] as [number, number];
      })]);
    case "square": {
      const r = 0.18, ring: Ring = [];
      for (const [cx, cy, a0] of [[1 - r, 1 - r, 0], [-1 + r, 1 - r, 90], [-1 + r, -1 + r, 180], [1 - r, -1 + r, 270]] as const)
        for (let k = 0; k <= 12; k++) { const a = ((a0 + (k / 12) * 90) * Math.PI) / 180; ring.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]); }
      return cs([ring]);
    }
    case "egg":
      // Wider at the bottom, narrower at the top.
      return cs([around(160, (t) => [0.74 * Math.cos(t) * (1 - 0.14 * Math.sin(t)), Math.sin(t)])]);
  }
}

/** Keeps only outer contours: letter counters and SVG holes are filled (a cutter follows the outside). */
export function fillHoles(section: CrossSection): CrossSection {
  const outers = section.toPolygons().filter((ring) => signedArea(ring as Ring) > 0) as Ring[];
  return cs(outers, "Positive");
}

function signedArea(r: Ring): number {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a / 2;
}

/** Centres a section on the origin and scales it so its longest side is `size`. */
export function fitTo(section: CrossSection, size: number): CrossSection {
  const b = csBounds(section);
  const s = size / Math.max(b.w, b.h);
  return csScale(csTranslate(section, -(b.minX + b.w / 2), -(b.minY + b.h / 2)), s);
}

/**
 * Joins separate islands (the dot of an i, the pieces of an SVG) into one
 * outline by closing gaps with the smallest radius that does it, so the
 * cutter is one piece. Returns the section and the radius used (0 if none).
 */
export function joinIslands(section: CrossSection, maxRadius: number): { section: CrossSection; radius: number } {
  const pieces = (c: CrossSection) => c.decompose().map(track).length;
  if (pieces(section) <= 1) return { section, radius: 0 };
  for (let r = 0.5; r <= maxRadius; r *= 1.5) {
    const closed = fillHoles(csOffset(csOffset(section, r), -r));
    if (pieces(closed) <= 1) return { section: closed, radius: r };
  }
  return { section, radius: -1 };
}

/** Smoothing and printability notes for one outline. */
export function cleanOutline(label: string, raw: CrossSection, p: CutterParams, issues: Issue[]): CrossSection {
  let section = fillHoles(raw);
  if (p.smoothing > 0) {
    const before = section.area();
    section = csOffset(csOffset(csOpening(section, p.smoothing), p.smoothing), -p.smoothing);
    const lost = Math.abs(before - section.area()) / before;
    if (lost > 0.003) issues.push({ severity: "info", message: `${label}: smoothing rounded off details narrower than ${(2 * p.smoothing).toFixed(1)} mm (${(lost * 100).toFixed(1)} % of the area).` });
  }
  // Drop sub-0.01 mm wiggles from font and offset curves (they only add
  // near-duplicate vertices), then fuse places where the outline touches
  // itself at a point (a serif "a" bowl meeting its stem once the counter is
  // filled): a wall cannot meet itself at a point. Refill any hole that left.
  section = fillHoles(csOffset(csOffset(csSimplify(section, OUTLINE_TOLERANCE), PINCH_FUSE), -PINCH_FUSE));
  const jb = csBounds(section);
  const joined = joinIslands(section, Math.max(4, Math.max(jb.w, jb.h) * 0.2));
  if (joined.radius > 0) issues.push({ severity: "warning", message: `${label}: separate pieces were joined into one outline (gaps up to ${(2 * joined.radius).toFixed(1)} mm bridged) so the cutter is one piece.` });
  if (joined.radius < 0) issues.push({ severity: "warning", message: `${label}: the outline has pieces too far apart to join; they print as separate cutters.` });
  section = joined.section;
  const thin = csOpening(section, 1.5);
  const thinLost = (section.area() - thin.area()) / section.area();
  if (thinLost > 0.02) issues.push({ severity: "warning", message: `${label}: parts of the shape are under 3 mm wide; those bits of cookie will be fragile.` });
  return section;
}

/** All cutting outlines for the current settings, cleaned and sized. */
export function buildOutlines(p: CutterParams, art: Artwork | null, issues: Issue[]): Outline[] {
  const clean = (label: string, raw: CrossSection, stem = label) => ({ label, stem, section: cleanOutline(label, raw, p, issues) });
  // Shapes, words and SVGs are re-fitted after cleaning so the cookie is exactly `size` (smoothing trims tips).
  const cleanFit = (label: string, raw: CrossSection) => ({ label, stem: label, section: fitTo(cleanOutline(label, raw, p, issues), p.size) });
  if (p.source === "shape") return [cleanFit(p.shape.toUpperCase(), fitTo(shapeSection(p.shape), p.size))];
  if (p.source === "svg") {
    if (!art) { issues.push({ severity: "info", message: "Upload an SVG with filled shapes to use your own outline." }); return []; }
    const rings = art.layers.flatMap((l) => l.rings).map((r) => r.map(([x, y]) => [x, -y] as [number, number]).reverse());
    return [cleanFit(art.name.replace(/\.svg$/i, "").toUpperCase() || "SVG", fitTo(fillHoles(cs(rings, "NonZero")), p.size))];
  }
  const missing = missingCharacters(p.text, p.font);
  if (missing.length) issues.push({ severity: "warning", message: `The font has no ${missing.map((c) => `"${c}"`).join(", ")}; ${missing.length === 1 ? "it is" : "they are"} drawn as "?".` });
  if (p.source === "letters") {
    return Array.from(p.text).filter((ch) => ch.trim()).map((ch) => {
      const block = layoutText(ch, p.font, p.size, 0, 1);
      const lower = ch.toUpperCase() !== ch;
      return clean(lower ? `${ch} (lower case)` : ch, cs(block.rings, "Positive"), lower ? `${ch}_lower` : ch);
    });
  }
  // Word: a puffy outline at wordMargin around the whole text, sized so the outline's longest side is `size`.
  const probe = layoutText(p.text, p.font, 10, 0.02, 1.1);
  const scale = (p.size - 2 * p.wordMargin) / Math.max(probe.width, probe.height);
  if (scale <= 0) { issues.push({ severity: "error", message: "The word margin leaves no room for the text at this size." }); return []; }
  const block = layoutText(p.text, p.font, 10 * scale, 0.02, 1.1);
  const outline = csOffset(cs(block.rings, "Positive"), p.wordMargin);
  return [cleanFit(p.text.replace(/\s+/g, " ").trim().toUpperCase(), outline)];
}
