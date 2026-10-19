import { rad } from "../core/params";
import type { Ring, Vec2 } from "../core/types";
import { kernel, track, type CrossSection, type Manifold } from "../shared/kernel";
import { cs, prism } from "../shared/shapes";

/**
 * Small geometry helpers for the stadium. Everything is built in one frame:
 * Z up, the bed at z = 0, the stadium centred on the origin and its FRONT
 * facing −Y (towards the viewer). Side features (doors, awnings, the tower)
 * are built for the front side and then spun to their side with `spin`.
 */

/** Regular N-gon as a ring, one side centred on −Y (the front), `apothem` from the centre to the middle of a side. */
export function polygonRing(n: number, apothem: number): Ring {
  const R = apothem / Math.cos(Math.PI / n);
  const ring: Ring = [];
  for (let k = 0; k < n; k++) {
    const a = rad(-90 + 180 / n + (360 * k) / n);
    ring.push([R * Math.cos(a), R * Math.sin(a)]);
  }
  return ring;
}
export const polygon = (n: number, apothem: number): CrossSection => cs([polygonRing(n, apothem)]);

/**
 * The building outline: a square with its corners cut off. `a` is the distance from the centre to the
 * long sides (front, back, left, right), `b` the distance to the four short diagonal sides. A regular
 * octagon has b = a; b = a·√2 is a plain square. Counter-clockwise, the front side at −Y.
 */
export function octagonRing(a: number, b: number): Ring {
  const c = Math.min(a, Math.max(0, b * Math.SQRT2 - a));
  return [[a, -c], [a, c], [c, a], [-c, a], [-a, c], [-a, -c], [-c, -a], [c, -a]];
}

/** Ring of `n` points on a circle. */
export function circleRing(r: number, n: number): Ring {
  const ring: Ring = [];
  for (let i = 0; i < n; i++) ring.push([r * Math.cos((2 * Math.PI * i) / n), r * Math.sin((2 * Math.PI * i) / n)]);
  return ring;
}
export const circle = (r: number, n: number): CrossSection => cs([circleRing(r, n)]);

/** Solid of revolution about Z from a profile of (r, z) points (counter-clockwise, r ≥ 0). */
export function revolve(profile: Vec2[] | Vec2[][], segments: number): Manifold {
  const rings = (Array.isArray(profile[0][0]) ? profile : [profile]) as Vec2[][];
  return track(kernel().Manifold.revolve(cs(rings.map(ccw)), segments));
}

/**
 * A shape drawn in the vertical X–Z plane (points are [x, z]) made solid
 * between y0 and y1. Used for everything on a wall face: doors, signs, letters.
 */
export function extrudeY(shape: Ring[] | CrossSection, y0: number, y1: number): Manifold {
  const section = Array.isArray(shape) ? cs(shape.map(ccw)) : shape;
  // Extrude along Z, then rotate +90° about X: (x, y, z) → (x, −z, y). A prism from z = −y1 to −y0 lands on y ∈ [y0, y1].
  return track(prism(section, -y1, -y0).rotate([90, 0, 0]));
}

/**
 * A shape drawn in the vertical Y–Z plane (points are [y, z]) made solid
 * between x0 and x1. Used for profiles that run along a wall: awnings, trim.
 */
export function extrudeX(shape: Ring[] | CrossSection, x0: number, x1: number): Manifold {
  const section = Array.isArray(shape) ? cs(shape.map(ccw)) : shape;
  // Extrude along Z, then rotate 90° about X and 90° about Z: (u, v, w) → (w, u, v).
  return track(prism(section, x0, x1).rotate([90, 0, 90]));
}

/** Turns a feature built for the front (side centre at −90°) to the side whose centre is at `angleDeg`. */
export const spin = (m: Manifold, angleDeg: number): Manifold => (Math.abs(angleDeg + 90) < 1e-9 ? m : track(m.rotate([0, 0, angleDeg + 90])));

/** Rotation about Z by `deg`. */
export const rotZ = (m: Manifold, deg: number): Manifold => (deg === 0 ? m : track(m.rotate([0, 0, deg])));

export const at = (m: Manifold, x: number, y: number, z: number): Manifold => track(m.translate([x, y, z]));

/** Arched doorway outline in the X–Z plane: a rectangle `w` wide and `h` tall with a semicircle on top, standing on z0. */
export function archRing(cx: number, z0: number, w: number, h: number): Ring {
  const r = w / 2;
  const ring: Ring = [[cx - r, z0], [cx + r, z0]];
  const n = 24;
  for (let i = 0; i <= n; i++) {
    const a = (Math.PI * i) / n; // up the right side, over the top, down the left
    ring.push([cx + r * Math.cos(a), z0 + h + r * Math.sin(a)]);
  }
  return dedupe(ring);
}

/** Outer rings must run counter-clockwise to fill; profiles drawn by hand are fixed up here. */
function ccw(r: Ring): Ring {
  let a = 0;
  for (let i = 0, j = r.length - 1; i < r.length; j = i++) a += (r[j][0] - r[i][0]) * (r[j][1] + r[i][1]);
  return a >= 0 ? r : r.slice().reverse();
}

function dedupe(r: Ring): Ring {
  const out: Ring = [];
  for (const p of r) {
    const q = out[out.length - 1];
    if (!q || Math.hypot(q[0] - p[0], q[1] - p[1]) > 1e-6) out.push(p);
  }
  if (out.length > 1 && Math.hypot(out[0][0] - out[out.length - 1][0], out[0][1] - out[out.length - 1][1]) <= 1e-6) out.pop();
  return out;
}

/** Axis-aligned rectangle ring from (x0, y0) to (x1, y1), counter-clockwise. */
export const rectRing = (x0: number, y0: number, x1: number, y1: number): Ring => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];

export function bbox(m: Manifold) {
  const b = m.boundingBox();
  return { min: b.min as [number, number, number], max: b.max as [number, number, number] };
}
