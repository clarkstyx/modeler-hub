import { DOVETAIL, HANDLE, STOP, deriveRack, type BoxParams, type RackDerived } from "../core/params";
import type { Issue, Part } from "../core/types";
import { manifoldToMesh } from "../shared/mesh";
import { kernel, track, type CrossSection, type Manifold } from "../shared/kernel";
import { box, cs, csUnion, mSubtract, mTranslate, mUnion, prism, rect } from "../shared/shapes";
import { overlapIssues, type BuiltPart } from "./buildBox";

/**
 * Enclosure rack: one open-front cube per enclosure, a drawer tray that slides
 * out until a floor stop catches it, and bowtie keys that join cubes side by
 * side and on top of each other through dovetail grooves on every outer face.
 *
 * Print orientation:
 * - the cube lies on its back (vented back panel on the bed, open front up), so
 *   every wall, groove and vent hole is vertical: no supports, no bridges;
 * - the tray prints as used, flat, with its stop channel open to the bed;
 * - keys lie on a wide face; their flanks overhang only by the dovetail angle.
 */

/** Gap between objects on the print bed. */
export const RACK_PLATE_GAP = 10;

/** One placement of a printed object in the assembled view: a row-major 4×4 matrix from print to world. */
export interface Placement {
  object: string;
  matrix: number[];
}

/** A see-through box drawn in the assembled view (the enclosure that sits in each cube). */
export interface Ghost {
  min: [number, number, number];
  max: [number, number, number];
}

export interface RackBuild {
  parts: Part[];
  issues: Issue[];
  rack: RackDerived;
  assembly: Placement[];
  ghosts: Ghost[];
}

const rad = (deg: number) => (deg * Math.PI) / 180;
const translation = (x: number, y: number, z: number) => [1, 0, 0, x, 0, 1, 0, y, 0, 0, 1, z, 0, 0, 0, 1];
function mul(a: number[], b: number[]): number[] {
  const out = new Array(16).fill(0);
  for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) for (let k = 0; k < 4; k++) out[r * 4 + c] += a[r * 4 + k] * b[k * 4 + c];
  return out;
}

/** Cube print frame → world: px = x, py = z (height), pz = D − y (depth measured from the back). */
const cubeToWorld = (D: number) => [1, 0, 0, 0, 0, 0, -1, D, 0, 1, 0, 0, 0, 0, 0, 1];

/**
 * Dovetail groove section on a face, centred at `c` along the face, cut
 * DOVETAIL.depth into the wall. `along` and `into` say which print axis (x or y) runs along the
 * face (`alongX`) and which way is into the wall (`inward`); the face itself is at `face`.
 */
function grooveSection(c: number, face: number, alongX: boolean, inward: 1 | -1): CrossSection {
  const a = DOVETAIL.neck / 2;
  const b = a + DOVETAIL.depth * Math.tan(rad(DOVETAIL.angleDeg));
  const d = DOVETAIL.depth;
  // (along, into) pairs: narrow at the face (with a little overcut outside it), wide inside.
  const pts: [number, number][] = [[c - a, -0.5], [c + a, -0.5], [c + a, 0], [c + b, d], [c - b, d], [c - a, 0]];
  const ring = pts.map(([u, v]) => {
    const depth = face + inward * v;
    return (alongX ? [u, depth] : [depth, u]) as [number, number];
  });
  // NonZero fills the ring whichever way mirroring and axis swaps left its winding.
  return cs([ring], "NonZero");
}

/** Groove centres along a face of length `len`: two, a quarter in from each end. */
const grooveCentres = (len: number) => [len * 0.25, len * 0.75];

/** The cube in its print frame (lying on its back). */
export function buildCube(p: BoxParams, r: RackDerived): Manifold {
  const { W, H, D, wall: w } = r;
  let cube = mSubtract(prism(rect(0, 0, W, H), 0, D), prism(rect(w, w, W - w, H - w), w, D + 1));

  // Dovetail grooves on all four outer faces, running the full depth.
  const grooves: CrossSection[] = [];
  for (const c of grooveCentres(W)) grooves.push(grooveSection(c, 0, true, 1), grooveSection(c, H, true, -1));
  for (const c of grooveCentres(H)) grooves.push(grooveSection(c, 0, false, 1), grooveSection(c, W, false, -1));
  cube = mSubtract(cube, prism(csUnion(grooves), -1, D + 1));

  // Vent holes through the back panel (on the bed, so they print as plain vertical holes).
  if (p.ventHole > 0) {
    const m = Math.max(6, p.ventHole);
    const holes: CrossSection[] = [];
    const span = (lo: number, hi: number) => {
      const n = Math.max(0, Math.floor((hi - lo) / p.ventSpacing)) + 1;
      const start = (lo + hi) / 2 - ((n - 1) * p.ventSpacing) / 2;
      return Array.from({ length: n }, (_, i) => start + i * p.ventSpacing);
    };
    const rr = p.ventHole / 2;
    for (const x of span(w + m, W - w - m)) for (const y of span(w + m, H - w - m)) holes.push(rect(x - rr, y - rr, x + rr, y + rr, rr));
    if (holes.length) cube = mSubtract(cube, prism(csUnion(holes), -1, w + 1));
  }

  // Floor stop: a ramp the tray rides over going in, with a steep face that catches it coming out.
  // Built as a hull of its six corners, in the print frame (floor top at py = w, pz = D − y).
  const x0 = W / 2 - STOP.width / 2;
  const x1 = W / 2 + STOP.width / 2;
  const zSteep = D - r.stopY1;
  const zFlush = D - r.stopY0;
  const pts: [number, number, number][] = [];
  for (const x of [x0, x1]) pts.push([x, w - 0.01, zSteep], [x, w + STOP.height, zSteep], [x, w - 0.01, zFlush]);
  const bump = track(kernel().Manifold.hull(pts));
  return mUnion([cube, bump]);
}

/** The tray as used and as printed: front edge at y = 0, the D-handle in front of it, z up. */
export function buildTray(r: RackDerived): Manifold {
  let tray = box(0, 0, 0, r.trayW, r.trayL, r.trayH);
  // Recess the enclosure sits in.
  if (r.trayH - r.encZ > 0.01) tray = mSubtract(tray, box(r.pocketX0, r.pocketY0, r.encZ, r.pocketX0 + r.pocketW, r.pocketY0 + r.pocketD, r.trayH + 1));
  // Channel on the underside for the floor stop, closed at both ends.
  const cx = r.trayW / 2;
  tray = mSubtract(tray, box(cx - r.channelW / 2, r.channelY0, -1, cx + r.channelW / 2, r.channelY1, r.channelDepth));
  // D-handle: a loop you hook a finger through.
  const hw = Math.min(HANDLE.width, r.trayW * 0.5) / 2;
  const hh = Math.min(r.trayH, 8);
  const outer = rect(cx - hw, -HANDLE.depth, cx + hw, 0.5, 3);
  const hole = rect(cx - hw + HANDLE.side, -HANDLE.depth + HANDLE.bar, cx + hw - HANDLE.side, 0.01, 1.5);
  const handle = mSubtract(prism(outer, 0, hh), prism(hole, -1, hh + 1));
  return mUnion([tray, handle]);
}

/** Bowtie key section: x = height above the bed, y across; extruded along z, then laid along x. */
function keySection(clearance: number): CrossSection {
  const a = DOVETAIL.neck / 2 - clearance;
  const e = DOVETAIL.depth - clearance;
  const b = a + e * Math.tan(rad(DOVETAIL.angleDeg));
  return cs([[[0, -b], [e, -a], [2 * e, -b], [2 * e, b], [e, a], [0, b]]], "NonZero");
}

/** One key lying on the bed: x from 0 to length, y centred on 0, z from 0 up. */
export function buildKey(length: number, clearance: number): Manifold {
  // Section in (x = height, y); extrude along z = length; rotate so z → x and x → z.
  const k = prism(keySection(clearance), 0, length);
  return mTranslate(track(k.rotate([0, -90, 0])), length, 0, 0);
}

export const keyWidth = (clearance: number) =>
  2 * (DOVETAIL.neck / 2 - clearance + (DOVETAIL.depth - clearance) * Math.tan(rad(DOVETAIL.angleDeg)));

/** Lays `count` keys of `length` in columns that stay inside the bed. Origin at the first key's corner. */
function keyGrid(count: number, length: number, clearance: number, bed: number): Manifold {
  const pitch = keyWidth(clearance) + 3;
  const perCol = Math.max(1, Math.floor((bed - 10) / pitch));
  const keys: Manifold[] = [];
  const one = buildKey(length, clearance);
  for (let i = 0; i < count; i++) {
    const col = Math.floor(i / perCol);
    const row = i % perCol;
    keys.push(mTranslate(one, col * (length + 5), row * pitch + pitch / 2, 0));
  }
  return mUnion(keys);
}

function toPart(b: BuiltPart): Part {
  return { name: b.name, object: b.object, hex: b.hex, mesh: manifoldToMesh(b.solid), volume: b.solid.volume() };
}

/** Cube, tray and the keys for the planned layout, in print layout, plus how they assemble. */
export function buildRack(p: BoxParams): RackBuild {
  const r = deriveRack(p);
  const issues: Issue[] = [];
  const cubeColour = p.bodyColor.toUpperCase();
  const trayColour = p.lidColor.toUpperCase();

  // Print layout: cube at the origin (footprint W × H, D tall), tray beside it in +x, keys beyond.
  const cube = buildCube(p, r);
  const trayAt: [number, number, number] = [r.W + RACK_PLATE_GAP, HANDLE.depth, 0];
  const tray = mTranslate(buildTray(r), ...trayAt);
  const built: BuiltPart[] = [
    { name: "CUBE", object: "cube", hex: cubeColour, solid: cube },
    { name: "TRAY", object: "tray", hex: trayColour, solid: tray },
  ];
  const keysAt: [number, number, number] = [0, r.H + RACK_PLATE_GAP, 0];
  if (r.keysNeeded > 0)
    built.push({ name: "KEYS", object: "keys", hex: cubeColour, solid: mTranslate(keyGrid(r.keysNeeded, r.keyLength, p.keyClearance, p.bedSize), ...keysAt) });
  issues.push(...overlapIssues(built));

  // Assembled view: every cube of the planned grid with its tray; the bottom-left tray pulled out to its stop.
  const cols = Math.max(1, Math.round(p.rackCols));
  const rows = Math.max(1, Math.round(p.rackRows));
  const assembly: Placement[] = [];
  const ghosts: Ghost[] = [];
  const cubeM = cubeToWorld(r.D);
  for (let j = 0; j < rows; j++)
    for (let i = 0; i < cols; i++) {
      const ox = i * r.W;
      const oz = j * r.H;
      assembly.push({ object: "cube", matrix: mul(translation(ox, 0, oz), cubeM) });
      const pull = i === 0 && j === 0 ? r.travel : 0;
      const tx = ox + r.wall + p.trayClearance;
      const ty = -pull;
      const tz = oz + r.wall;
      assembly.push({ object: "tray", matrix: mul(translation(tx, ty, tz), translation(-trayAt[0], -trayAt[1], -trayAt[2])) });
      const ex = tx + r.pocketX0 + (r.pocketW - p.encWidth) / 2;
      const ey = ty + r.pocketY0 + (r.pocketD - p.encDepth) / 2;
      const ez = tz + r.encZ;
      ghosts.push({ min: [ex, ey, ez], max: [ex + p.encWidth, ey + p.encDepth, ez + p.encHeight] });
    }

  const parts = built.filter((b) => !b.solid.isEmpty()).map(toPart);
  return { parts, issues, rack: r, assembly, ghosts };
}

/**
 * Key fit test: two short blocks with one groove each (put them groove to
 * groove) and three keys at the chosen clearance −0.05 / ±0 / +0.05 mm. The
 * key names in the slicer carry their clearance; the shortest is the tightest.
 */
export function buildRackCalibration(p: BoxParams): RackBuild {
  const r = deriveRack(p);
  const blockW = 30;
  const blockH = Math.max(DOVETAIL.depth + 3, 8);
  const depth = 20;
  const block = mSubtract(prism(rect(0, 0, blockW, blockH), 0, depth), prism(grooveSection(blockW / 2, blockH, true, -1), -1, depth + 1));
  const hex = p.bodyColor.toUpperCase();
  const built: BuiltPart[] = [
    { name: "BLOCK_A", object: "fit-block-a", hex, solid: block },
    { name: "BLOCK_B", object: "fit-block-b", hex, solid: mTranslate(block, blockW + RACK_PLATE_GAP, 0, 0) },
  ];
  const clearances = [-0.05, 0, 0.05].map((dc) => Math.round(Math.max(0.05, p.keyClearance + dc) * 100) / 100);
  clearances.forEach((c, i) => {
    const key = buildKey(16 + 4 * i, c);
    built.push({ name: `KEY_${c.toFixed(2)}`, object: `fit-key-${c.toFixed(2)}`, hex, solid: mTranslate(key, 0, blockH + RACK_PLATE_GAP + i * (keyWidth(c) + 6) + keyWidth(c) / 2, 0) });
  });
  const issues: Issue[] = [
    ...overlapIssues(built),
    { severity: "info", message: `Key fit test: keys ${clearances.map((c, i) => `${16 + 4 * i} mm long = ${c.toFixed(2)} mm`).join(", ")} clearance. Pick the one that slides in by hand without wobbling.` },
  ];
  return { parts: built.map(toPart), issues, rack: r, assembly: [], ghosts: [] };
}
