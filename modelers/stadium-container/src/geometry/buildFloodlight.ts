import { MAST, type Derived, type StadiumParams } from "../core/params";
import { track, type Manifold } from "../shared/kernel";
import { box, mUnion } from "../shared/shapes";
import { at, extrudeX } from "./frames";

/**
 * One floodlight tower in its own frame: standing on z = 0 (the wall top),
 * centred on the origin, lamps towards +X (the field once it is placed).
 * Two legs along Y joined by X bracing and rungs, a lamp head of 6 × 3 lamps
 * widening from the legs at 45°, and with "separate" lights a peg under
 * each leg for the sockets in the wall.
 *
 * The whole tower is one flat plate `MAST.depth` thick (plus the lamp
 * bumps), so printed lying on its back nothing overhangs and the layers run
 * along the legs, which is far stronger than printing it standing.
 */
export interface Floodlight {
  mast: Manifold;
  head: Manifold;
  lamps: Manifold;
  /** Tower height above its base, peg length below it, and the overall length. */
  height: number;
  peg: number;
  length: number;
}

export function buildFloodlight(p: StadiumParams, d: Derived): Floodlight {
  const H = d.lightHeight;
  const hx = MAST.depth / 2;
  const g = MAST.legGap / 2, lw = MAST.legWidth / 2;
  const peg = p.lights === "separate" ? MAST.pegLength : 0;
  const legTop = H - MAST.headHeight;
  const pieces: Manifold[] = [box(-hx, -g - lw, 0, hx, -g + lw, legTop), box(-hx, g - lw, 0, hx, g + lw, legTop)];
  if (peg > 0)
    for (const y of [-g, g]) pieces.push(box(-MAST.pegDepth / 2, y - MAST.pegWidth / 2, -peg, MAST.pegDepth / 2, y + MAST.pegWidth / 2, 0.5));
  // X bracing between the legs, one panel per leg gap, a rung on top of each panel. The bars sit 0.15 mm back
  // from the legs' faces: coplanar faces would split the legs' edges into collinear points and leave flat triangles.
  const gi = g - lw + 0.2; // reach a little into the legs so the bars fuse
  const bx = hx - 0.15;
  const tb = MAST.brace;
  const z0 = 1.5, zEnd = legTop - 0.5;
  const pitch = MAST.legGap * 1.1;
  const panels = Math.max(1, Math.floor((zEnd - z0) / pitch));
  const ph = (zEnd - z0) / panels;
  for (let k = 0; k < panels; k++) {
    const za = z0 + k * ph, zb = za + ph - tb;
    pieces.push(extrudeX([[[-gi, za], [gi, zb], [gi, zb + tb], [-gi, za + tb]]], -bx, bx));
    pieces.push(extrudeX([[[gi, za], [gi, za + tb], [-gi, zb + tb], [-gi, zb]]], -bx, bx));
    // The rung reaches 0.2 mm past the bars' ends, so no bar edge lies exactly on a rung edge.
    pieces.push(box(-bx, -gi, zb - 0.2, bx, gi, zb + tb + 0.2));
  }
  const mast = track(mUnion(pieces).simplify(1e-4));

  // Head plate in the Y–Z plane: spans the legs at the bottom, 45° shoulders out to the full width, flat top.
  const w = MAST.headWidth / 2, legs = g + lw, sh = Math.max(0.5, w - legs);
  const head = extrudeX([[[-legs, legTop], [legs, legTop], [w, legTop + sh], [w, H], [-w, H], [-w, legTop + sh]]], -hx, hx);

  // Lamp squares on the +X face, centred on the flat part of the head.
  const pitchL = MAST.lamp + MAST.lampGap;
  const gridW = MAST.lampCols * pitchL - MAST.lampGap, gridH = MAST.lampRows * pitchL - MAST.lampGap;
  const flatH = MAST.headHeight - sh;
  const lampList: Manifold[] = [];
  for (let r = 0; r < MAST.lampRows; r++)
    for (let c = 0; c < MAST.lampCols; c++) {
      const y = -gridW / 2 + c * pitchL, z = legTop + sh + (flatH - gridH) / 2 + r * pitchL;
      lampList.push(box(hx, y, z, hx + MAST.lampRaise, y + MAST.lamp, z + MAST.lamp));
    }
  return { mast, head, lamps: mUnion(lampList), height: H, peg, length: H + peg };
}

/** The tower placed on the wall: turned so the lamps face the field, standing on the wall top at `zTop`. */
export function placeStanding(f: Floodlight, angleDeg: number, radius: number, zTop: number): Floodlight {
  const put = (m: Manifold) => at(track(m.rotate([0, 0, angleDeg + 180])), radius * Math.cos((angleDeg * Math.PI) / 180), radius * Math.sin((angleDeg * Math.PI) / 180), zTop);
  return { ...f, mast: put(f.mast), head: put(f.head), lamps: put(f.lamps) };
}

/** The tower lying on its back on the bed, lamps up, legs along −X, centred on (cx, cy). */
export function placeFlat(f: Floodlight, cx: number, cy: number): Floodlight {
  const hx = MAST.depth / 2;
  // Rotate −90° about Y: (x, y, z) → (−z, y, x). The tower then spans x ∈ [−height, peg]; shift its middle to cx
  // and lift the back face (now at z = −hx) onto the bed.
  const dx = cx + (f.height - f.peg) / 2;
  const put = (m: Manifold) => at(track(m.rotate([0, -90, 0])), dx, cy, hx);
  return { ...f, mast: put(f.mast), head: put(f.head), lamps: put(f.lamps) };
}

/** Socket for one tower's two pegs, in the "front" frame (wall centre line at y = −radius), cut from the wall top at `zTop`. */
export function socketBoxes(radius: number, zTop: number, clearance: number): Manifold[] {
  const g = MAST.legGap / 2, c = clearance;
  return [-g, g].map((y) => box(y - MAST.pegWidth / 2 - c, -radius - MAST.pegDepth / 2 - c, zTop - MAST.pegLength - 0.3, y + MAST.pegWidth / 2 + c, -radius + MAST.pegDepth / 2 + c, zTop + 1));
}
