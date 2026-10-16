import { derive, outerRadius, LOOP_EMBED, type Derived, type SkirtParams } from "../core/params";
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
  /** Steepest lean of the outer or inner wall from vertical (rise over run as dr/dz). */
  maxLean: number;
  /** Tightest bend of a pleat tip, mm. */
  minTipRadius: number;
}

/**
 * The pleated skirt as one closed mesh: outer surface, inner surface (the outer
 * ring of each level offset inwards by the wall along its 2D normal, so every
 * layer the slicer sees is exactly `wall` thick), hem ring at the bottom and a
 * flat ring at the top where the waistband sits.
 */
export function buildSkirtShell(p: SkirtParams, d: Derived): SkirtShell {
  const N = segmentsAround(p);
  const M = Math.max(40, Math.min(200, Math.ceil(d.skirtHeight / 0.8)));
  const issues: Issue[] = [];
  const outer: [number, number][][] = [];
  const inner: [number, number][][] = [];
  let minTipRadius = Infinity;
  for (let i = 0; i <= M; i++) {
    const u = i / M;
    const ring: [number, number][] = [];
    for (let j = 0; j < N; j++) {
      const t = (j / N) * TAU;
      const r = outerRadius(p, d, t, u);
      ring.push([r * Math.cos(t), r * Math.sin(t)]);
    }
    const ins: [number, number][] = [];
    for (let j = 0; j < N; j++) {
      const a = ring[(j - 1 + N) % N], b = ring[j], c = ring[(j + 1) % N];
      const tx = c[0] - a[0], ty = c[1] - a[1];
      const len = Math.hypot(tx, ty) || 1;
      // Outward normal of a counter-clockwise ring.
      const nx = ty / len, ny = -tx / len;
      ins.push([b[0] - p.wall * nx, b[1] - p.wall * ny]);
      // Radius of curvature at convex points (pleat tips): the inner wall would fold over itself below `wall`.
      const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
      if (cross > 0) {
        const ab = Math.hypot(b[0] - a[0], b[1] - a[1]), bc = Math.hypot(c[0] - b[0], c[1] - b[1]), ca = Math.hypot(a[0] - c[0], a[1] - c[1]);
        const rc = (ab * bc * ca) / (2 * Math.abs(cross));
        if (rc < minTipRadius) minTipRadius = rc;
      }
    }
    outer.push(ring);
    inner.push(ins);
  }

  // Lean from vertical, outside and inside: over 45° (dr/dz > 1) needs supports.
  const dz = d.skirtHeight / M;
  let maxLean = 0;
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++)
      for (const rings of [outer, inner]) {
        const a = rings[i][j], b = rings[i + 1][j];
        maxLean = Math.max(maxLean, Math.hypot(b[0] - a[0], b[1] - a[1]) / dz);
      }

  if (minTipRadius < p.wall * 1.02)
    issues.push({ severity: "error", message: `The pleat tips bend tighter (${minTipRadius.toFixed(2)} mm) than the wall is thick (${p.wall} mm), so the inside would fold over itself. Use fewer or shallower pleats, or a thinner wall.` });
  if (maxLean > 1)
    issues.push({ severity: "error", message: `Part of the skirt leans ${((Math.atan(maxLean) * 180) / Math.PI).toFixed(0)}° from upright; over 45° needs supports. Make it taller, narrower at the hem, use less flare or shallower pleats.` });
  if (issues.length) return { solid: null, issues, maxLean, minTipRadius };

  // Mesh: outer rings, then inner rings.
  const verts = new Float32Array(2 * (M + 1) * N * 3);
  const put = (k: number, xy: [number, number], z: number) => { verts[3 * k] = xy[0]; verts[3 * k + 1] = xy[1]; verts[3 * k + 2] = z; };
  const O = (i: number, j: number) => i * N + (j % N);
  const I = (i: number, j: number) => (M + 1) * N + i * N + (j % N);
  for (let i = 0; i <= M; i++)
    for (let j = 0; j < N; j++) {
      put(O(i, j), outer[i][j], i * dz);
      put(I(i, j), inner[i][j], i * dz);
    }
  const tris: number[] = [];
  for (let i = 0; i < M; i++)
    for (let j = 0; j < N; j++) {
      tris.push(O(i, j), O(i, j + 1), O(i + 1, j + 1), O(i, j), O(i + 1, j + 1), O(i + 1, j));
      tris.push(I(i, j), I(i + 1, j + 1), I(i, j + 1), I(i, j), I(i + 1, j), I(i + 1, j + 1));
    }
  for (let j = 0; j < N; j++) {
    tris.push(O(0, j), I(0, j), O(0, j + 1), I(0, j), I(0, j + 1), O(0, j + 1)); // hem, facing down
    tris.push(O(M, j), O(M, j + 1), I(M, j), I(M, j), O(M, j + 1), I(M, j + 1)); // top ring, facing up
  }
  const K = kernel();
  const mesh = new K.Mesh({ numProp: 3, vertProperties: verts, triVerts: new Uint32Array(tris) });
  const solid = track(new K.Manifold(mesh));
  return { solid, issues, maxLean, minTipRadius };
}

const circle = (r: number, n: number): CrossSection => {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) pts.push([r * Math.cos((i / n) * TAU), r * Math.sin((i / n) * TAU)]);
  return cs([pts]);
};

/** Waistband: gathered ribs around a solid top whose underside is a 45° cone, so it prints without supports. */
export function buildWaistband(p: SkirtParams, d: Derived): Manifold {
  const K = kernel();
  const R = d.topRadius;
  const z0 = d.skirtHeight - 0.3; // a little overlap into the skirt so the two fuse
  const n = Math.max(180, p.waistRibs * 12);
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const t = (i / n) * TAU;
    const r = R + (p.waistRibs > 0 ? p.waistRibDepth * 0.5 * (1 + Math.cos(p.waistRibs * t)) : 0);
    pts.push([r * Math.cos(t), r * Math.sin(t)]);
  }
  let band = prism(cs([pts]), z0, d.bodyTop);
  // Ribs grow out at 45° from the skirt instead of starting with a ledge.
  const h = d.bodyTop - z0 + 1;
  band = mIntersect(band, mTranslate(track(K.Manifold.cylinder(h, R, R + h, n)), 0, 0, z0));
  // Hollow underneath: a 45° cone from the skirt's inner wall up to a point under the solid top.
  const rin = d.innerTopRadius + 0.3;
  const cone = mTranslate(track(K.Manifold.cylinder(rin, rin, 0, n)), 0, 0, z0);
  return mSubtract(band, cone);
}

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
  return mTranslate(upright, 0, 0, d.bodyTop - LOOP_EMBED + ro);
}

/** The whole ornament, centred on the bed, split into one part per colour. */
export function buildSkirt(p: SkirtParams): BuildResult {
  const d = derive(p);
  const issues: Issue[] = [];
  if (p.waistHeight < d.waistHeight - 1e-6)
    issues.push({ severity: "info", message: `Waistband raised to ${d.waistHeight.toFixed(1)} mm so its solid top sits on a 45° cone inside (no supports).` });
  const shell = buildSkirtShell(p, d);
  issues.push(...shell.issues);
  if (!shell.solid) return { parts: [], issues, derived: d };

  let body = mUnion([shell.solid, buildWaistband(p, d), buildLoop(p, d)]);
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
