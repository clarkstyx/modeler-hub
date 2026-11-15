import { MIN_CAP_HEIGHT, type OrnamentParams } from "../core/params";
import type { Issue, Part } from "../core/types";
import { kernel, track, type CrossSection } from "../shared/kernel";
import { cs, csBounds, csIntersect, csOffset, csRotate, csScale, csSubtract, csTranslate, csUnion, prism, rect } from "../shared/shapes";
import { manifoldToMesh } from "../shared/mesh";
import { layoutText } from "../shared/textShapes";

/**
 * The ornament, printed flat on its back (base on the bed, colours on top):
 *
 *   z 0 … base            BASE plate: every shape plus an outline, the hanger ring, a stalk to the tag
 *   z base … +layer       LEAVES + stems, BERRIES, BOW, TAG   (one raised layer, colours side by side)
 *   z +layer … +2 layer   NAME (raised) — or flush: NAME sits in the TAG layer instead
 *
 * Where two colours meet on the same layer the one "in front" wins and the one
 * behind is cut back by GAP, so a thin line of the base shows between them and
 * every colour is one clean surface.
 */

/** Base colour showing between neighbouring colours on the same layer, in mm. */
export const GAP = 0.6;
/** Wall of the hanger ring around the hole, in mm. */
const RING_WALL = 2.4;
const STALK_W = 5;
const TAG_PAD = 4;
const OVERLAP = 1e-3;

export interface OrnamentInfo {
  width: number;
  height: number;
  thickness: number;
  capHeight: number;
  colours: number;
  /** Centre and diameter of the hanger hole, in mm. */
  hole: { x: number; y: number; d: number };
}
export interface BuildResult {
  parts: Part[];
  issues: Issue[];
  info: OrnamentInfo;
}

const circle = (r: number, x = 0, y = 0) => csTranslate(track(kernel().CrossSection.circle(r)), x, y);
const ellipse = (rx: number, ry: number, x: number, y: number, deg: number) => csTranslate(csRotate(track(track(kernel().CrossSection.circle(1, 64)).scale([rx, ry])), deg), x, y);
/** Rounded bar from the origin along angle `deg`, `len` long and `w` wide. */
const bar = (len: number, w: number, deg: number, x = 0, y = 0) => csTranslate(csRotate(rect(-w / 2, -w / 2, len + w / 2, w / 2, w / 2), deg), x, y);
const polar = (len: number, deg: number): [number, number] => [len * Math.cos((deg * Math.PI) / 180), len * Math.sin((deg * Math.PI) / 180)];

/** A leaf: a lens (two circle arcs) with rounded tips, centred on the origin, pointing along +x. */
export function leaf(len: number, wid: number): CrossSection {
  const tipR = wid * 0.2;
  const L = len - 2 * tipR, W = wid - 2 * tipR;
  const R = (W / 2 + (L * L) / (2 * W)) / 2;
  const d = R - W / 2;
  return csOffset(csIntersect(circle(R, 0, d), circle(R, 0, -d)), tipR);
}

/** Hex-ish cluster offsets for 1 to 7 berries, closest to the centre first. */
const BERRY_SPOTS: [number, number][] = [[0, 0], [7.2, -1.6], [-7.2, -1.6], [3.6, 4.6], [-3.6, 4.6], [3.6, -7.8], [-3.6, -7.8]];

/** The sprig in a nominal frame (about 80 mm wide at scale 1). Junction of stems at the origin. */
function sprig(p: OrnamentParams) {
  const leaves: CrossSection[] = [];
  const leafLen = 24, leafWid = 11, stemW = 2.4;
  for (let i = 0; i < p.leafPairs; i++) {
    const alpha = 28 + i * 32;            // angle from straight down
    const stemLen = 9 + i * 3;
    for (const side of [-1, 1]) {
      const deg = -90 + side * alpha;
      leaves.push(bar(stemLen, stemW, deg));
      const [cx, cy] = polar(stemLen + leafLen / 2 - 1.5, deg);
      leaves.push(csTranslate(csRotate(leaf(leafLen, leafWid), deg), cx, cy));
    }
  }
  const berries = csUnion(BERRY_SPOTS.slice(0, p.berries).map(([x, y]) => circle(3.4, x, y)));
  let bow = cs([]);
  if (p.bow) {
    const by = 12;
    bow = csUnion([
      rect(-3.2, by - 2.6, 3.2, by + 2.6, 1.4),                 // knot
      ellipse(8.2, 4.6, -8.4, by + 1.8, -16),                   // loops
      ellipse(8.2, 4.6, 8.4, by + 1.8, 16),
      bar(11, 4.4, -118, -1.5, by - 2),                         // tails
      bar(11, 4.4, -62, 1.5, by - 2),
    ]);
  }
  return { leaves: csUnion(leaves), berries, bow };
}

/** The name as rings, sized to fit the tag; cap height is clamped to what prints. */
function nameBlock(p: OrnamentParams, maxWidth: number, issues: Issue[]) {
  const name = p.name.trim();
  if (!p.tag || !name) return null;
  const probe = layoutText(name, p.font, 10);
  let capH = Math.min(8, 10 * Math.min(1, maxWidth / Math.max(probe.width, 1e-6)));
  if (capH < MIN_CAP_HEIGHT) {
    if (capH < 3) { issues.push({ severity: "error", message: `"${name}" does not fit on the tag: the letters would be under 3 mm. Shorten the name or enlarge the ornament.` }); return null; }
    issues.push({ severity: "warning", message: `The letters come out ${capH.toFixed(1)} mm tall (under ${MIN_CAP_HEIGHT} mm): small details may blur. Shorten the name or enlarge the ornament.` });
  }
  capH = Math.round(capH * 10) / 10;
  const block = layoutText(name, p.font, capH);
  return { block, capH, section: cs(block.rings) };
}

/** Builds every part for the current settings. Requires an open arena (withArena). */
export function buildOrnament(p: OrnamentParams): BuildResult {
  const issues: Issue[] = [];
  const nominal = sprig(p);
  const nominalAll = csUnion([nominal.leaves, nominal.berries, nominal.bow]);
  const w0 = csBounds(nominalAll).w;
  const s = p.size / Math.max(w0, 1);

  // Scale the sprig to the asked width; everything below is in real millimetres.
  let leaves = csScale(nominal.leaves, s);
  let berries = csScale(nominal.berries, s);
  let bow = csScale(nominal.bow, s);
  const sprigBounds = csBounds(csUnion([leaves, berries, bow]));

  // Tag with the name under the sprig.
  const tagMaxW = Math.min(p.size * 0.9, Math.max(24, p.size));
  const text = nameBlock(p, tagMaxW - 2 * TAG_PAD, issues);
  let tag = cs([]);
  let name = cs([]);
  let stalk = cs([]);
  if (text) {
    const tagW = Math.max(24, text.block.width + 2 * TAG_PAD);
    const tagH = text.capH + 2 * TAG_PAD;
    const tagCy = sprigBounds.minY - 1 - tagH / 2;
    tag = rect(-tagW / 2, tagCy - tagH / 2, tagW / 2, tagCy + tagH / 2, Math.min(4, tagH / 2 - 0.5));
    name = csTranslate(text.section, 0, tagCy);
    stalk = rect(-STALK_W / 2, tagCy, STALK_W / 2, 0, 0);
    if (p.textStyle === "flush") tag = csSubtract(tag, name);
  }

  // Front-to-back order on the colour layer: berries, bow, leaves, tag.
  const cut = (behind: CrossSection, ...front: CrossSection[]) => csSubtract(behind, csOffset(csUnion(front), GAP));
  bow = cut(bow, berries);
  leaves = cut(leaves, berries, bow);
  tag = cut(tag, leaves);

  // Hanger ring on the base, centred above the knot of the bow (or the top of
  // the sprig when the bow is off). "Top" is measured in a narrow strip around
  // x = 0, where the ring actually sits, not at the loops out to the sides.
  const ringR = p.holeDiameter / 2 + RING_WALL;
  const strip = rect(-2, sprigBounds.minY - 1, 2, sprigBounds.maxY + 1);
  const topY = csBounds(csIntersect(csUnion([leaves, berries, bow]), strip)).maxY;
  const ringCy = topY + ringR - 0.8;
  const ring = circle(ringR, 0, ringCy);
  const hole = circle(p.holeDiameter / 2, 0, ringCy);

  const colourLayer = csUnion([leaves, berries, bow, tag, name]);
  const base = csSubtract(csUnion([csOffset(csUnion([colourLayer, stalk]), p.outline), ring]), hole);
  const pieces = base.decompose().length;
  if (pieces !== 1) issues.push({ severity: "error", message: `The ornament is in ${pieces} separate pieces. Add leaves or berries, or make the outline wider.` });

  const z1 = p.baseThickness, z2 = z1 + p.layerThickness, z3 = z2 + p.layerThickness;
  const parts: Part[] = [];
  const add = (partName: string, section: CrossSection, hex: string, z0: number, zTop: number) => {
    const clean = csSubtract(section, hole);
    if (clean.isEmpty()) return;
    const solid = prism(clean, z0 - (z0 > 0 ? OVERLAP : 0), zTop);
    parts.push({ name: partName, object: "ornament", hex: hex.toUpperCase(), mesh: manifoldToMesh(solid), volume: solid.volume() });
  };
  add("BASE", base, p.baseColor, 0, z1);
  add("LEAVES", leaves, p.leafColor, z1, z2);
  add("BERRIES", berries, p.berryColor, z1, z2);
  add("BOW", bow, p.ribbonColor, z1, z2);
  add("TAG", tag, p.ribbonColor, z1, z2);
  if (text) {
    if (p.textStyle === "flush") add("NAME", name, p.textColor, z1, z2);
    else add("NAME", csIntersect(name, csOffset(tag, -0.2)), p.textColor, z2, z3);
  }

  const b = csBounds(base);
  const colours = new Set(parts.map((q) => q.hex)).size;
  const thickness = text && p.textStyle === "raised" ? z3 : z2;
  if (colours > 5) issues.push({ severity: "warning", message: `${colours} colours: more than most multi-colour printers load at once.` });
  return { parts, issues, info: { width: b.w, height: b.h, thickness, capHeight: text?.capH ?? 0, colours, hole: { x: 0, y: ringCy, d: p.holeDiameter } } };
}
