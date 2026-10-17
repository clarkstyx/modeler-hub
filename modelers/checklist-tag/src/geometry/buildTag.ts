import { layoutTag, type TagLayout, type TickBox } from "../core/layout";
import { PLATE_BORDER, PLATE_GAP, holeCentre, tagNames, type TagParams } from "../core/params";
import type { Issue, Part, Ring } from "../core/types";
import { objectSlug, shelfPack } from "../shared/batch";
import type { CrossSection, Manifold } from "../shared/kernel";
import { manifoldToMesh } from "../shared/mesh";
import { cs, csIntersect, csOffset, csSubtract, csTranslate, csUnion, mTranslate, prism, rect, segmentsFor } from "../shared/shapes";

const TAU = Math.PI * 2;

export interface PlacedTag {
  /** 1-based number in the batch. */
  index: number;
  name: string;
  object: string;
  /** Bottom-left corner on the plate. */
  x: number;
  y: number;
}

export interface Plate {
  index: number;
  tags: PlacedTag[];
  parts: Part[];
}

export interface BuildResult {
  plates: Plate[];
  issues: Issue[];
  /** The first tag, centred on the origin, for the preview. */
  tag: Part[];
  layout: TagLayout;
}

function circleRing(cx: number, cy: number, r: number): Ring {
  const n = segmentsFor(r);
  return Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * TAU), cy + r * Math.sin((i / n) * TAU)] as [number, number]);
}

/** A round-ended stroke through the points (fractions of the box, from its bottom-left). */
function stroke(points: [number, number][], width: number, b: TickBox): CrossSection {
  const pts = points.map(([u, v]) => [b.x + u * b.size, b.y + v * b.size] as [number, number]);
  const hw = width / 2;
  const pieces: CrossSection[] = pts.map(([x, y]) => cs([circleRing(x, y, hw)]));
  for (let i = 0; i + 1 < pts.length; i++) {
    const [ax, ay] = pts[i], [bx, by] = pts[i + 1];
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = (-(by - ay) / len) * hw, ny = ((bx - ax) / len) * hw;
    pieces.push(cs([[[ax + nx, ay + ny], [ax - nx, ay - ny], [bx - nx, by - ny], [bx + nx, by + ny]]], "NonZero"));
  }
  return csUnion(pieces);
}

/** The tick, cross or heart in a box. The tick reaches up past the box corner, like a hand-drawn one. */
function markShape(p: TagParams, b: TickBox): CrossSection {
  const s = b.size;
  if (p.checkStyle === "x") return csUnion([stroke([[0.22, 0.22], [0.78, 0.78]], 0.17 * s, b), stroke([[0.22, 0.78], [0.78, 0.22]], 0.17 * s, b)]);
  if (p.checkStyle === "heart") {
    const ring: Ring = [];
    const n = 96;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * TAU;
      const x = 16 * Math.sin(t) ** 3;
      const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      // The curve spans x ±16, y −17..12; fit it in 72 % of the box.
      ring.push([b.x + s / 2 + (x / 32) * 0.72 * s, b.y + s / 2 + ((y + 2.5) / 29) * 0.72 * s]);
    }
    return cs([ring], "NonZero");
  }
  return stroke([[0.2, 0.55], [0.42, 0.27], [0.92, 0.98]], 0.16 * s, b);
}

function boxShape(p: TagParams, b: TickBox): CrossSection {
  const r = 0.12 * b.size;
  const outer = rect(b.x, b.y, b.x + b.size, b.y + b.size, r);
  if (p.boxStyle === "filled") return outer;
  const w = Math.min(p.boxWall, b.size / 3);
  return csSubtract(outer, rect(b.x + w, b.y + w, b.x + b.size - w, b.y + b.size - w, Math.max(0, r - w)));
}

/** The card outline with the hanging hole cut out. */
export function cardShape(p: TagParams): CrossSection {
  const card = rect(0, 0, p.width, p.height, p.cornerRadius);
  const hole = holeCentre(p);
  return hole ? csSubtract(card, cs([circleRing(hole[0], hole[1], p.holeDiameter / 2)])) : card;
}

/** One tag's solids, card corner at the origin: card, raised text, boxes and the tick, none overlapping. */
function tagSolids(p: TagParams, layout: TagLayout): { name: string; hex: string; solid: Manifold }[] {
  const card = cardShape(p);
  // Raised details stay inside the card and clear of the hole.
  const inside = csOffset(card, -0.6);
  const top = p.thickness + p.relief;
  const textPieces: CrossSection[] = [];
  for (const t of [layout.question, ...layout.labels]) if (t && t.block.rings.length) textPieces.push(csTranslate(cs(t.block.rings), t.cx, t.cy));
  const marks = csUnion(layout.boxes.filter((b) => b.ticked).map((b) => markShape(p, b)));
  const mark = csIntersect(marks, inside);
  const boxes = csIntersect(csSubtract(csUnion(layout.boxes.map((b) => boxShape(p, b))), mark), inside);
  const text = csIntersect(csSubtract(csUnion(textPieces), csUnion([mark, boxes])), inside);

  const out = [{ name: "TAG", hex: p.baseColor, solid: prism(card, 0, p.thickness) }];
  if (!text.isEmpty()) out.push({ name: "TEXT", hex: p.textColor, solid: prism(text, p.thickness, top) });
  if (!boxes.isEmpty()) out.push({ name: "BOXES", hex: p.boxColor, solid: prism(boxes, p.thickness, top) });
  if (!mark.isEmpty()) out.push({ name: "CHECK", hex: p.checkColor, solid: prism(mark, p.thickness, top) });
  return out;
}

const toPart = (s: { name: string; hex: string; solid: Manifold }, object: string, dx: number, dy: number): Part => {
  const m = dx || dy ? mTranslate(s.solid, dx, dy, 0) : s.solid;
  return { name: s.name, object, hex: s.hex.toUpperCase(), mesh: manifoldToMesh(m), volume: m.volume() };
};

/** The whole batch: one tag per name, packed on plates that fit the bed. */
export function buildTags(p: TagParams): BuildResult {
  const issues: Issue[] = [];
  const names = tagNames(p);
  const placed = shelfPack(names.map(() => ({ w: p.width, h: p.height })), p.bedSize, PLATE_BORDER, PLATE_GAP);
  const plates = new Map<number, Plate>();
  let tag: Part[] = [];
  let firstLayout: TagLayout | null = null;
  names.forEach((name, k) => {
    const layout = layoutTag(p, name);
    firstLayout ??= layout;
    const solids = tagSolids(p, layout);
    if (k === 0) tag = solids.map((s) => toPart(s, "tag", -p.width / 2, -p.height / 2));
    const at = placed[k];
    if (!at) return;
    const index = k + 1;
    if (!plates.has(at.plate)) plates.set(at.plate, { index: at.plate + 1, tags: [], parts: [] });
    const plate = plates.get(at.plate)!;
    const object = `tag-${String(index).padStart(2, "0")}-${objectSlug(name, "tag", 16)}`;
    plate.tags.push({ index, name, object, x: at.x, y: at.y });
    for (const s of solids) plate.parts.push(toPart(s, object, at.x, at.y));
  });
  const list = [...plates.values()].sort((a, b) => a.index - b.index);
  if (list.length > 1) issues.push({ severity: "info", message: `${names.length} tags need ${list.length} plates on a ${p.bedSize} mm bed (${list[0].tags.length} per plate).` });
  return { plates: list, issues, tag, layout: firstLayout ?? layoutTag(p, names[0] ?? "") };
}
