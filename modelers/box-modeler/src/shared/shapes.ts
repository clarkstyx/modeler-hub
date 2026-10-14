// GENERATED from packages/geometry/src/shapes.ts by `npm run sync-shared` in the hub. Edit the source there, not this copy.
import type { Ring, Vec2 } from "./types";
import { kernel, track, type CrossSection, type Manifold } from "./kernel";

/** Segment count giving ≈0.01 mm chord error, clamped to a sane range. */
export function segmentsFor(radius: number): number {
  if (radius <= 0) return 8;
  const n = Math.ceil(Math.PI / Math.acos(Math.max(-1, 1 - 0.01 / Math.max(radius, 0.1))));
  return Math.max(16, Math.min(256, n));
}

function arcPoints(cx: number, cy: number, r: number, a0: number, a1: number, out: Ring) {
  const n = Math.max(2, Math.ceil(segmentsFor(r) * Math.abs(a1 - a0) / (2 * Math.PI)));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    out.push([cx + r * Math.cos(a), cy + r * Math.sin(a)]);
  }
}

/**
 * Rectangle from (x0,y0) to (x1,y1) with an individual radius per corner,
 * listed counter-clockwise from the bottom-left: [bl, br, tr, tl].
 */
export function rectRing(x0: number, y0: number, x1: number, y1: number, radii: [number, number, number, number]): Ring {
  const w = x1 - x0;
  const h = y1 - y0;
  const cap = Math.min(w, h) / 2 - 0.01;
  const [bl, br, tr, tl] = radii.map((r) => Math.max(0, Math.min(r, cap)));
  const ring: Ring = [];
  const corner = (cx: number, cy: number, r: number, a0: number, px: number, py: number) => {
    if (r <= 0) ring.push([px, py]);
    else arcPoints(cx, cy, r, a0, a0 + Math.PI / 2, ring);
  };
  corner(x0 + bl, y0 + bl, bl, Math.PI, x0, y0);
  corner(x1 - br, y0 + br, br, -Math.PI / 2, x1, y0);
  corner(x1 - tr, y1 - tr, tr, 0, x1, y1);
  corner(x0 + tl, y1 - tl, tl, Math.PI / 2, x0, y1);
  return dedupe(ring);
}

function dedupe(r: Ring): Ring {
  const out: Ring = [];
  for (const p of r) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-6) out.push(p);
  }
  if (out.length > 1) {
    const a = out[0];
    const b = out[out.length - 1];
    if (Math.hypot(a[0] - b[0], a[1] - b[1]) <= 1e-6) out.pop();
  }
  return out;
}

export function rect(x0: number, y0: number, x1: number, y1: number, radius = 0): CrossSection {
  return cs([rectRing(x0, y0, x1, y1, [radius, radius, radius, radius])]);
}

export function cs(rings: Ring[], fillRule: "EvenOdd" | "NonZero" | "Positive" = "Positive"): CrossSection {
  if (!rings.length) return track(new (kernel().CrossSection)([[]] as Vec2[][]));
  return track(new (kernel().CrossSection)(rings, fillRule));
}

export function csUnion(list: CrossSection[]): CrossSection {
  if (!list.length) return cs([]);
  if (list.length === 1) return list[0];
  return track(kernel().CrossSection.union(list));
}
export const csSubtract = (a: CrossSection, b: CrossSection) => track(a.subtract(b));
export const csIntersect = (a: CrossSection, b: CrossSection) => track(a.intersect(b));
export const csOffset = (a: CrossSection, d: number) => (d === 0 ? a : track(a.offset(d, "Round")));
export const csTranslate = (a: CrossSection, x: number, y: number) => track(a.translate([x, y]));
export const csScale = (a: CrossSection, s: number) => track(a.scale([s, s]));
export const csRotate = (a: CrossSection, deg: number) => track(a.rotate(deg));
export const csSimplify = (a: CrossSection, eps: number) => track(a.simplify(eps));
export function csBounds(a: CrossSection) {
  const b = a.bounds();
  return { minX: b.min[0], minY: b.min[1], maxX: b.max[0], maxY: b.max[1], w: b.max[0] - b.min[0], h: b.max[1] - b.min[1] };
}

/** Morphological opening: what survives has every stroke at least 2r wide. */
export function csOpening(a: CrossSection, r: number): CrossSection {
  return csOffset(csOffset(a, -r), r);
}

/** An empty solid (a zero-size cube). */
export function emptyManifold(): Manifold {
  return track(kernel().Manifold.cube([0, 0, 0]));
}

/** Prism from z0 to z1. */
export function prism(section: CrossSection, z0: number, z1: number): Manifold {
  const h = z1 - z0;
  if (h <= 0 || section.isEmpty()) return emptyManifold();
  const m = track(kernel().Manifold.extrude(section, h));
  return z0 !== 0 ? track(m.translate([0, 0, z0])) : m;
}

export function box(x0: number, y0: number, z0: number, x1: number, y1: number, z1: number): Manifold {
  return track(track(kernel().Manifold.cube([x1 - x0, y1 - y0, z1 - z0])).translate([x0, y0, z0]));
}

export const mUnion = (list: Manifold[]) => {
  const live = list.filter((m) => !m.isEmpty());
  if (!live.length) return emptyManifold();
  return live.length === 1 ? live[0] : track(kernel().Manifold.union(live));
};
export const mSubtract = (a: Manifold, b: Manifold) => (b.isEmpty() ? a : track(a.subtract(b)));
export const mIntersect = (a: Manifold, b: Manifold) => track(a.intersect(b));
export const mTranslate = (a: Manifold, x: number, y: number, z: number) => track(a.translate([x, y, z]));
