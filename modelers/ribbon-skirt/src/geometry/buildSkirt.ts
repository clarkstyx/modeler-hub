import { derive, outerRadius, waistRadius, CAP_THICKNESS, LOOP_EMBED, MAX_BRIDGE, type Derived, type SkirtParams } from "../core/params";
import type { Issue, Part } from "../core/types";
import { manifoldToMesh } from "../shared/mesh";
import { kernel, track, type CrossSection, type Manifold } from "../shared/kernel";
import { box, cs, mIntersect, mSubtract, mTranslate, mUnion, prism } from "../shared/shapes";

export interface BuildResult {
  parts: Part[];
  issues: Issue[];
  derived: Derived;
}

const TAU = Math.PI * 2;
const colourName = (hex: string) => hex.replace("#", "").toUpperCase();

/** Points around the skirt: enough for smooth pleats and smooth circles. */
function segmentsAround(p: SkirtParams): number {
  const perPleat = 24;
  const n = p.pleats > 0 ? p.pleats * perPleat : 180;
  return Math.max(180, Math.min(1080, n));
}

interface SkirtShell {
  solid: Manifold | null;
  issues: Issue[];
  /** Steepest overhang: outside leaning out or inside leaning in, as dr/dz (1 = 45°). */
  maxLean: number;
  /** Tightest bend of a pleat fold, mm. */
  minTipRadius: number;
}

type Ring = [number, number][];

/** Inner outline: the outer one moved inwards by `wall` along its 2D normal; also the tightest convex bend. */
function offsetInwards(ring: Ring, wall: number): { inner: Ring; tightest: number } {
  const N = ring.length;
  const inner: Ring = [];
  let tightest = Infinity;
  for (let j = 0; j < N; j++) {
    const a = ring[(j - 1 + N) % N], b = ring[j], c = ring[(j + 1) % N];
    const tx = c[0] - a[0], ty = c[1] - a[1];
    const len = Math.hypot(tx, ty) || 1;
    // Outward normal of a counter-clockwise ring.
    inner.push([b[0] - (wall * ty) / len, b[1] + (wall * tx) / len]);
    // Radius of curvature at convex points (pleat folds): below `wall` the inside folds over itself.
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (cross > 0) {
      const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
      tightest = Math.min(tightest, (ab * bc * ca) / (2 * Math.abs(cross)));
    }
  }
  return { inner, tightest };
}

/**
 * Skirt and waistband as one closed tube, built ring by ring from the hem up:
 * outer surface, inner surface, the hem ring at the bottom and the rim of the
 * waistband on top. On the skirt every layer is exactly `wall` thick (the inner
 * ring is the outer one offset inwards); the waistband keeps the skirt's inner
 * circle and puffs out on the outside.
 */
export function buildShell(p: SkirtParams, d: Derived): SkirtShell {
  const N = segmentsAround(p);
  const M = Math.max(40, Math.min(200, Math.ceil(d.skirtHeight / 0.8)));
  const W = Math.max(12, Math.ceil(d.waistHeight / 0.5));
  const issues: Issue[] = [];
  const angles = Array.from({ length: N }, (_, j) => (j / N) * TAU);
  const levels: { z: number; outer: Ring; inner: Ring }[] = [];
  let minTipRadius = Infinity;
  for (let i = 0; i <= M; i++) {
    const u = i / M;
    const outer: Ring = angles.map((t) => { const r = outerRadius(p, d, t, u); return [r * Math.cos(t), r * Math.sin(t)]; });
    const { inner, tightest } = offsetInwards(outer, p.wall);
    minTipRadius = Math.min(minTipRadius, tightest);
    levels.push({ z: u * d.skirtHeight, outer, inner });
  }
  const rin = d.innerTopRadius;
  const innerCircle: Ring = angles.map((t) => [rin * Math.cos(t), rin * Math.sin(t)]);
  for (let k = 1; k <= W; k++) {
    const t = k / W;
    const outer: Ring = angles.map((a) => { const r = waistRadius(p, d, a, t); return [r * Math.cos(a), r * Math.sin(a)]; });
    levels.push({ z: d.skirtHeight + t * d.waistHeight, outer, inner: innerCircle });
  }

  // Overhang: over 45° (dr/dz > 1) needs supports. Only a surface leaning out over air counts:
  // the outside moving outwards, or the inside moving inwards. Leaning the other way sits on
  // the layer below (the skirt narrowing, the waistband's rim rolling in).
  let maxLean = 0;
  const rad = (q: [number, number]) => Math.hypot(q[0], q[1]);
  for (let i = 0; i + 1 < levels.length; i++) {
    const dz = levels[i + 1].z - levels[i].z;
    for (let j = 0; j < N; j++) {
      const out = rad(levels[i + 1].outer[j]) - rad(levels[i].outer[j]);
      const inn = rad(levels[i].inner[j]) - rad(levels[i + 1].inner[j]);
      maxLean = Math.max(maxLean, out / dz, inn / dz);
    }
  }
  if (minTipRadius < p.wall * 1.02)
    issues.push({ severity: "error", message: `The pleat tips bend tighter (${minTipRadius.toFixed(2)} mm) than the wall is thick (${p.wall} mm), so the inside would fold over itself. Use fewer or shallower pleats, or a thinner wall.` });
  if (maxLean > 1.0001)
    issues.push({ severity: "error", message: `Part of the skirt or waistband leans ${((Math.atan(maxLean) * 180) / Math.PI).toFixed(0)}° from upright; over 45° needs supports. Make it taller, use less flare, shallower pleats or a smaller waist puff.` });
  if (issues.length) return { solid: null, issues, maxLean, minTipRadius };

  const L = levels.length;
  const verts = new Float32Array(2 * L * N * 3);
  const O = (i: number, j: number) => i * N + (j % N);
  const I = (i: number, j: number) => L * N + i * N + (j % N);
  const put = (k: number, xy: [number, number], z: number) => { verts[3 * k] = xy[0]; verts[3 * k + 1] = xy[1]; verts[3 * k + 2] = z; };
  levels.forEach((lv, i) => { for (let j = 0; j < N; j++) { put(O(i, j), lv.outer[j], lv.z); put(I(i, j), lv.inner[j], lv.z); } });
  const tris: number[] = [];
  for (let i = 0; i + 1 < L; i++)
    for (let j = 0; j < N; j++) {
      tris.push(O(i, j), O(i, j + 1), O(i + 1, j + 1), O(i, j), O(i + 1, j + 1), O(i + 1, j));
      tris.push(I(i, j), I(i + 1, j + 1), I(i, j + 1), I(i, j), I(i + 1, j), I(i + 1, j + 1));
    }
  const T = L - 1;
  for (let j = 0; j < N; j++) {
    tris.push(O(0, j), I(0, j), O(0, j + 1), I(0, j), I(0, j + 1), O(0, j + 1)); // hem, facing down
    tris.push(O(T, j), O(T, j + 1), I(T, j), I(T, j), O(T, j + 1), I(T, j + 1)); // rim, facing up
  }
  const K = kernel();
  const solid = track(new K.Manifold(new K.Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) })));
  return { solid, issues, maxLean, minTipRadius };
}

/**
 * Solid top inside the waistband that the loop stands on, `waistRecess` below
 * the rim. "flat": a 2 mm disc bridged straight across (hidden inside the
 * skirt). "cone": a 45° cone underneath, so nothing is bridged.
 */
export function buildCap(p: SkirtParams, d: Derived): Manifold {
  const K = kernel();
  const r = d.innerTopRadius + 0.3; // overlaps the inner wall so the two fuse
  const n = segmentsAround(p);
  if (p.ceiling === "flat") return mTranslate(track(K.Manifold.cylinder(CAP_THICKNESS, r, r, n)), 0, 0, d.capTop - CAP_THICKNESS);
  const z0 = d.capTop - CAP_THICKNESS - r;
  const plug = mTranslate(track(K.Manifold.cylinder(d.capTop - z0, r, r, n)), 0, 0, z0);
  const cone = mTranslate(track(K.Manifold.cylinder(r + 0.3, r + 0.3, 0, n)), 0, 0, z0 - 0.3);
  return mSubtract(plug, cone);
}

const circle = (r: number, n: number): CrossSection => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) pts.push([r * Math.cos((i / n) * TAU), r * Math.sin((i / n) * TAU)]);
  return cs([pts]);
};

/** Hanging loop standing upright on top, its hole pointed at the top (a teardrop) so it prints without supports. */
export function buildLoop(p: SkirtParams, d: Derived): Manifold {
  const ro = p.loopDiameter / 2;
  const ri = Math.min(p.loopHole / 2, ro - 1);
  const n = 96;
  const hole: [number, number][] = [];
  // Circle from 45° round the bottom to 135°, then up to the point of the drop.
  for (let i = 0; i <= n; i++) {
    const a = Math.PI * 0.75 + (i / n) * (TAU - Math.PI / 2);
    hole.push([ri * Math.cos(a), ri * Math.sin(a)]);
  }
  hole.push([0, ri * Math.SQRT2]);
  const section = track(circle(ro, n).subtract(cs([hole])));
  const flat = prism(section, -p.loopThickness / 2, p.loopThickness / 2);
  const upright = track(flat.rotate([90, 0, 0]));
  return mTranslate(upright, 0, 0, d.capTop - LOOP_EMBED + ro);
}

/** The whole ornament, centred on the bed, split into one part per colour. */
export function buildSkirt(p: SkirtParams): BuildResult {
  const d = derive(p);
  const issues: Issue[] = [];
  if (p.waistHeight < d.waistHeight - 1e-6)
    issues.push({ severity: "info", message: `Waistband raised to ${d.waistHeight.toFixed(1)} mm to fit ${p.ceiling === "cone" ? "the 45° cone inside" : "the solid top"} and the ${p.waistRecess} mm recess.` });
  if (p.ceiling === "flat" && 2 * d.innerTopRadius > MAX_BRIDGE)
    issues.push({ severity: "warning", message: `The flat top inside bridges ${(2 * d.innerTopRadius).toFixed(0)} mm; over ${MAX_BRIDGE} mm it may sag. Choose the 45° cone inside, or a narrower waist.` });
  const shell = buildShell(p, d);
  issues.push(...shell.issues);
  if (!shell.solid) return { parts: [], issues, derived: d };

  let body = mUnion([shell.solid, buildCap(p, d), buildLoop(p, d)]);
  const c = p.bedSize / 2;
  body = mTranslate(body, c, c, 0);

  // One part per colour: ribbons of the same colour share a part, the skirt colour takes the rest.
  const big = p.bedSize;
  const byHex = new Map<string, Manifold[]>();
  for (const r of d.ribbons) {
    const k = r.hex.toUpperCase();
    if (!byHex.has(k)) byHex.set(k, []);
    byHex.get(k)!.push(box(-big, -big, r.z0, 2 * big, 2 * big, r.z1));
  }
  const base = p.baseColor.toUpperCase();
  const built: { name: string; hex: string; solid: Manifold }[] = [];
  let rest = body;
  let idx = 0;
  for (const [hex, slabs] of byHex) {
    const slab = mUnion(slabs);
    rest = mSubtract(rest, slab);
    if (hex === base) continue; // stays in the skirt part
    const part = mIntersect(body, slab);
    if (!part.isEmpty()) built.push({ name: `RIBBON_${++idx}_${colourName(hex)}`, hex, solid: part });
  }
  built.unshift({ name: "SKIRT", hex: base, solid: rest });
  const parts: Part[] = built
    .filter((b) => !b.solid.isEmpty())
    .map((b) => ({ name: b.name, object: "ribbon-skirt", hex: b.hex, mesh: manifoldToMesh(b.solid), volume: b.solid.volume() }));

  if (d.ribbons.length < p.ribbons.split(",").filter((s) => s.trim()).length)
    issues.push({ severity: "warning", message: "Some ribbons start above the top of the skirt and were left out. Make the ribbons narrower or the skirt taller." });
  const colours = new Set(parts.map((x) => x.hex));
  if (colours.size > 4) issues.push({ severity: "warning", message: `${colours.size} colours: more than one AMS holds (4). Reuse a colour or print with two AMS units.` });
  return { parts, issues, derived: d };
}
