import { MAST, type Derived, type StadiumParams } from "../core/params";
import { track, type Manifold } from "../shared/kernel";
import { box, mUnion } from "../shared/shapes";
import { at, extrudeX } from "./frames";

/**
 * One floodlight in its own frame: standing on z = 0, the mast centred on the
 * origin, its lamp face towards +X (the field once it is placed). With
 * "separate" lights a peg hangs below z = 0 for the socket in the base.
 *
 * The head is a flat plate as deep as the mast (no cantilever), widening from
 * the mast at 45° so nothing overhangs, with a grid of raised lamp squares on
 * its face. Printed lying on its back the layers run along the mast, which is
 * far stronger than printing it standing.
 */
export interface Floodlight {
  mast: Manifold;
  head: Manifold;
  lamps: Manifold;
  /** Mast height above its base, peg length below it, and the overall length. */
  height: number;
  peg: number;
  length: number;
}

export function buildFloodlight(p: StadiumParams, d: Derived): Floodlight {
  const H = d.lightHeight;
  const hx = MAST.depth / 2, hy = MAST.width / 2;
  const peg = p.lights === "separate" ? MAST.pegLength : 0;
  // The head sits exactly on top of the mast and the lamps exactly on the head: parts touch, never overlap.
  let mast = box(-hx, -hy, 0, hx, hy, H - MAST.headHeight);
  if (peg > 0) mast = mUnion([mast, box(-MAST.pegDepth / 2, -MAST.pegWidth / 2, -peg, MAST.pegDepth / 2, MAST.pegWidth / 2, 0.5)]);

  // Head plate in the Y–Z plane: mast width at the bottom, 45° shoulders out to the full width, flat top.
  const w = MAST.headWidth / 2, sh = Math.min(MAST.shoulder, w - hy), z0 = H - MAST.headHeight;
  const head = extrudeX([[[-hy, z0], [hy, z0], [w, z0 + sh], [w, H], [-w, H], [-w, z0 + sh]]], -hx, hx);

  // Lamp squares on the +X face, a grid that fits the flat part of the head.
  const pitch = MAST.lamp + MAST.lampGap;
  const cols = Math.max(1, Math.floor((2 * w - 2 * MAST.lampGap + MAST.lampGap) / pitch));
  const flatH = MAST.headHeight - sh;
  const rows = Math.max(1, Math.floor((flatH - MAST.lampGap) / pitch));
  const gridW = cols * pitch - MAST.lampGap, gridH = rows * pitch - MAST.lampGap;
  const lampList: Manifold[] = [];
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const y = -gridW / 2 + c * pitch, z = z0 + sh + (flatH - gridH) / 2 + r * pitch;
      lampList.push(box(hx, y, z, hx + MAST.lampRaise, y + MAST.lamp, z + MAST.lamp));
    }
  return { mast, head, lamps: mUnion(lampList), height: H, peg, length: H + peg };
}

/** The floodlight placed in its plinth: turned so the lamps face the field, standing on the plinth top. */
export function placeStanding(f: Floodlight, angleDeg: number, radius: number, zTop: number): Floodlight {
  const put = (m: Manifold) => at(track(m.rotate([0, 0, angleDeg + 180])), radius * Math.cos((angleDeg * Math.PI) / 180), radius * Math.sin((angleDeg * Math.PI) / 180), zTop);
  return { ...f, mast: put(f.mast), head: put(f.head), lamps: put(f.lamps) };
}

/** The floodlight lying on its back on the bed, lamps up, the mast along −X, centred on (cx, cy). */
export function placeFlat(f: Floodlight, cx: number, cy: number): Floodlight {
  const hx = MAST.depth / 2;
  // Rotate −90° about Y: (x, y, z) → (−z, y, x). The mast then spans x ∈ [−height, peg]; shift its middle to cx
  // and lift the back face (now at z = −hx) onto the bed.
  const dx = cx + (f.height - f.peg) / 2;
  const put = (m: Manifold) => at(track(m.rotate([0, -90, 0])), dx, cy, hx);
  return { ...f, mast: put(f.mast), head: put(f.head), lamps: put(f.lamps) };
}
