import { AWNING, DOOR, MAST, PILASTER, PLINTH, SEAT, SIGN, TRIM, WINDOW, WING, derive, rad, type Derived, type StadiumParams } from "../core/params";
import type { Artwork, Issue, Part } from "../core/types";
import { kernel, track, type Manifold } from "../shared/kernel";
import { manifoldToMesh } from "../shared/mesh";
import { box, mIntersect, mSubtract, mUnion, prism, segmentsFor } from "../shared/shapes";
import { buildFloodlight, placeFlat, placeStanding, type Floodlight } from "./buildFloodlight";
import { archRing, at, extrudeX, extrudeY, polygon, rectRing, revolve, rotZ, spin } from "./frames";
import { layoutSign, layoutWingText } from "./sign";

/** One printed object: the stadium, one floodlight, or the fit test. */
export interface Printed {
  object: string;
  parts: Part[];
}

/** A colour volume before meshing. */
export interface Solid {
  name: string;
  hex: string;
  solid: Manifold;
}

export interface BuildResult {
  /** The stadium with its floodlights in their sockets, as it will look on the shelf. */
  assembled: Part[];
  /** What goes on the bed: the stadium alone; the four floodlights lying flat; the peg fit test. */
  stadium: Printed[];
  floodlights: Printed[];
  fitTest: Printed[];
  /** The stadium's colour volumes as solids, for the overlap check in the tests. */
  stadiumSolids: Solid[];
  issues: Issue[];
  derived: Derived;
  /** Sign letters as built (0 = no text). */
  capHeight: number;
  /** Number of pieces the structure fell into (must be 1). */
  bodyPieces: number;
}

const OBJ = "stadium";
const big = 1e4;
const angleDiffDeg = (a: number, b: number) => ((((a - b) % 360) + 540) % 360) - 180;

/**
 * Booleans between solids that share a face can leave zero-volume shells of
 * a few triangles behind. They hold no material and would only break the
 * export, so solids are rebuilt from their real pieces where that can happen.
 */
function solidPieces(m: Manifold): Manifold[] {
  return m.decompose().map(track).filter((piece) => Math.abs(piece.volume()) > 1e-6);
}
function dropSlivers(m: Manifold): Manifold {
  const pieces = solidPieces(m);
  if (pieces.length === 0) return track(kernel().Manifold.cube([0, 0, 0]));
  return pieces.length === 1 ? pieces[0] : track(kernel().Manifold.compose(pieces));
}
/** Pieces with negative volume are sealed pockets inside the solid: never intended, so they are reported. */
const voidCount = (m: Manifold) => solidPieces(m).filter((piece) => piece.volume() < 0).length;

/** A box in the "front" frame (x across the side, y towards the viewer is negative), spun to a side or corner angle. */
const sideBox = (angle: number, x0: number, y0: number, z0: number, x1: number, y1: number, z1: number) => spin(box(x0, y0, z0, x1, y1, z1), angle);

/**
 * Door recess, painted door skin and awning for a doorway `w` wide centred on
 * x = 0 on a face `face` from the centre. The skin sits inside the wall behind
 * the recess; the awning stands on the face. Neither overlaps the structure.
 */
function doorway(face: number, w: number, h: number, angle: number, floorZ: number, depth: number) {
  const arch = archRing(0, floorZ, w, h);
  const recess = spin(extrudeY([arch], -face - 1, -face + depth), angle);
  // The skin reaches 0.2 mm into the recess, so recess and skin always cut one open pocket (a shared
  // face alone can drift apart by rounding once spun, leaving the skin's pocket as a sealed void).
  const skin = spin(extrudeY([arch], -face + depth - 0.2, -face + depth + DOOR.skin), angle);
  // Awning: its underside climbs away from the wall at 45°, so it prints without support.
  const z0 = floorZ + h + w / 2 + 0.6;
  const yf = -face;
  const profile: [number, number][] = [[yf, z0], [yf - AWNING.out, z0 + AWNING.out], [yf - AWNING.out, z0 + AWNING.out + AWNING.lip], [yf, z0 + AWNING.out + AWNING.lip + 0.4]];
  const half = w / 2 + AWNING.extra;
  const awning = spin(extrudeX([profile], -half, half), angle);
  return { recess, skin, awning, top: z0 + AWNING.out + AWNING.lip + 0.4 };
}

/** Everything for the current settings. Requires an open arena and the kernel. */
export function buildStadium(p: StadiumParams, art: Artwork | null): BuildResult {
  const d = derive(p);
  const issues: Issue[] = [];
  const N = Math.round(p.sections);
  const seg = Math.min(480, Math.ceil(segmentsFor(d.rSeats) / (2 * N)) * 2 * N);
  const zBase = p.baseThickness;
  const r0 = d.ri + p.wall;
  const yWall = d.wallOuter;
  const seats: Manifold[] = []; // accent: slabs on the treads
  const accent: Manifold[] = []; // accent: awnings, the band, wing lettering
  const signage: Manifold[] = []; // sign colour: the panel
  const doorSkins: Manifold[] = []; // sign colour, inside the wall
  const signArt: Manifold[] = []; // facade colour, raised on the sign
  const emblemGrey: Manifold[] = []; // structure colour pieces of the emblem
  const facadeParts: Manifold[] = []; // facade colour: the wall ring, columns, tower

  // ---- 1. solid block: base plate, the body up to the concourse, the exterior wall
  // The structure (grey) is the base plate and the block inside the walls; the exterior wall ring stands on the base
  // plate as the facade (its own colour), touching the block along the inner polygon.
  const block = prism(polygon(N, d.wallInner), 0, d.zSeatTop);
  const base = prism(polygon(N, d.baseApothem), 0, zBase);
  let body = mUnion([base, block]);
  facadeParts.push(prism(track(polygon(N, yWall).subtract(polygon(N, d.wallInner))), zBase, d.wallHeight));

  // ---- 2. the bowl: the cavity, the rim ledge, and everything above the ledge out to the last row
  body = mSubtract(body, revolve([[0, d.zFloor], [d.ri, d.zFloor], [d.ri, d.zRim], [d.rSeats, d.zRim], [d.rSeats, d.zSeatTop + big], [0, d.zSeatTop + big]], seg));

  // ---- 3. seating: a stepped ring standing on the ledge; stair aisles at the corners with half steps; a raised seat slab on each tread
  const steps: [number, number][] = [[r0, d.zRim]];
  for (let k = 1; k <= p.rows; k++) steps.push([r0 + (k - 1) * p.rowTread, d.zRim + k * p.rowRise], [r0 + k * p.rowTread, d.zRim + k * p.rowRise]);
  steps.push([d.rSeats, d.zRim]);
  const aisleBoxes = (w: number) => mUnion(d.cornerAngles.map((a) => sideBox(a, -w / 2, -(d.rSeats + 1), d.zRim - 1, w / 2, -(r0 - 1), d.zSeatTop + 2)));
  const aisles = aisleBoxes(p.aisleWidth);
  const halfSteps = p.rowTread / 2 >= 0.8 && p.rowRise / 2 >= 2 * p.layerHeight;
  const stairProfile: [number, number][] = [[r0, d.zRim]];
  for (let k = 1; k <= p.rows; k++) {
    const ri = r0 + (k - 1) * p.rowTread, zk = d.zRim + (k - 1) * p.rowRise;
    if (halfSteps) stairProfile.push([ri, zk + p.rowRise / 2], [ri + p.rowTread / 2, zk + p.rowRise / 2]);
    stairProfile.push([ri + (halfSteps ? p.rowTread / 2 : 0), zk + p.rowRise], [ri + p.rowTread, zk + p.rowRise]);
  }
  stairProfile.push([d.rSeats, d.zRim]);
  body = mUnion([body, dropSlivers(mSubtract(revolve(steps, seg), aisles)), dropSlivers(mIntersect(revolve(stairProfile, seg), aisles))]);
  const slabW = p.rowTread - SEAT.front - SEAT.back;
  if (slabW >= SEAT.minWidth) {
    const slabs: [number, number][][] = [];
    for (let k = 1; k <= p.rows; k++) {
      const ri = r0 + (k - 1) * p.rowTread + SEAT.front, z = d.zRim + k * p.rowRise;
      slabs.push(rectRing(ri, z, ri + slabW, z + SEAT.raise));
    }
    seats.push(dropSlivers(mSubtract(revolve(slabs, seg), aisleBoxes(p.aisleWidth + 2 * SEAT.back))));
  }

  // ---- 4. exterior architecture: corner columns, pilasters, doors with awnings, the band along the top
  const colTop = d.wallHeight - TRIM.height;
  const features = facadeParts;
  const recesses: Manifold[] = [];
  for (const a of d.cornerAngles) {
    const hw = PILASTER.cornerWidth / 2;
    features.push(sideBox(a, -hw, -(d.wallCorner + PILASTER.cornerOut), zBase, hw, -(d.wallCorner - 1.6), colTop));
  }
  // Doors shrink with a low wall so they stay in proportion. Above the concourse the wall is
  // free-standing, so a recess there must leave two nozzle widths of wall.
  const doorScale = Math.min(1, Math.max(0.5, (d.wallHeight - zBase) / 40));
  const doorW = DOOR.width * doorScale, doorH = DOOR.height * doorScale;
  const doorTop = zBase + doorH + doorW / 2;
  const sideDoorDepth = doorTop > d.zSeatTop ? Math.min(DOOR.depth, p.wallThickness - 2 * p.nozzle) : DOOR.depth;
  let wingText = false;
  const tw = d.towerWidth;
  for (const a of d.sideAngles) {
    const front = Math.abs(a + 90) < 1e-9;
    // Pilasters on this side (in the front frame) also mask the window bands, so a band never cuts through one.
    const masks: Manifold[] = [];
    const pil = (x: number) => {
      const m = box(x - PILASTER.width / 2, -(yWall + PILASTER.out), zBase, x + PILASTER.width / 2, -(yWall - 0.5), colTop);
      masks.push(m);
      features.push(spin(m, a));
    };
    const midPilasters = d.sideLength >= 24;
    let clearAbove = zBase + 1;
    let textBottom = Infinity, textTop = -Infinity;
    if (front) {
      const xp = tw / 2 + 3 + PILASTER.width / 2;
      if (xp + PILASTER.width / 2 < d.sideLength / 2 - PILASTER.cornerWidth - 1) { pil(xp); pil(-xp); }
      masks.push(box(-tw / 2 - 0.3, -(d.towerFront + 1), -1, tw / 2 + 0.3, -(yWall - 1), d.towerTop + 1));
    } else {
      if (midPilasters) { pil(d.sideLength * 0.28); pil(-d.sideLength * 0.28); }
      if (sideDoorDepth >= 0.6 && d.sideLength >= doorW + 2 * PILASTER.width + 6 && d.wallHeight > doorTop + AWNING.out + 3) {
        const dw = doorway(yWall, doorW, doorH, a, zBase, sideDoorDepth);
        recesses.push(dw.recess);
        doorSkins.push(dw.skin);
        accent.push(dw.awning);
        clearAbove = dw.top + 1;
      }
      // Lettering on the two faces beside the entrance, like a ballpark's name across its wings.
      if (Math.abs(angleDiffDeg(a, -90)) < 360 / N + 1e-6) {
        const maxW = midPilasters ? 2 * (d.sideLength * 0.28 - PILASTER.width / 2 - 1) : d.sideLength - 2 * PILASTER.cornerWidth - 4;
        const maxH = colTop - 1 - clearAbove;
        const text = layoutWingText(p, maxW, maxH, issues);
        if (text) {
          const zc = (clearAbove + colTop - 1) / 2;
          accent.push(spin(extrudeY(track(text.section.translate([0, zc])), -yWall - WING.raise, -yWall), a));
          textBottom = zc - text.capHeight / 2;
          textTop = zc + text.capHeight / 2;
          wingText = true;
        }
      }
    }
    // Two recessed window bands: one under the top band, one above the awnings (where the lettering leaves room).
    const halfSpan = d.sideLength / 2 - PILASTER.cornerWidth / 2 - 0.3;
    const bands: [number, number][] = [];
    const upper: [number, number] = [colTop - WINDOW.belowTop - WINDOW.height, colTop - WINDOW.belowTop];
    const lower: [number, number] = [clearAbove + WINDOW.aboveAwning, clearAbove + WINDOW.aboveAwning + WINDOW.height];
    const clearOfText = ([z0, z1]: [number, number]) => textBottom === Infinity || z0 > textTop + 0.8 || z1 < textBottom - 0.8;
    if (upper[0] > clearAbove + 1 && clearOfText(upper)) bands.push(upper);
    if (lower[1] < upper[0] - 1 && clearOfText(lower)) bands.push(lower);
    if (halfSpan > 6)
      for (const [z0, z1] of bands)
        recesses.push(spin(mSubtract(box(-halfSpan, -(yWall + 0.5), z0, halfSpan, -(yWall - WINDOW.depth), z1), mUnion(masks)), a));
  }

  // ---- 5. entrance tower on the front: the big door, its awning, the sign panel and the raised artwork
  const towerBack = -(yWall - p.wallThickness);
  features.push(box(-tw / 2, -d.towerFront, zBase, tw / 2, towerBack, d.towerTop));
  // The front door is bigger than the side doors, but shrinks until a sign of at least 5 mm fits above it.
  const zTop = d.towerTop - TRIM.height - 1.2;
  let fd = doorway(d.towerFront, 1, 1, -90, zBase, DOOR.depth);
  for (let s = 1.25; s >= 0.5; s -= 0.05) {
    const w = Math.min(12, tw * 0.42) * (s / 1.25), h = DOOR.height * s * doorScale;
    fd = doorway(d.towerFront, w, h, -90, zBase, DOOR.depth);
    if (zTop - (fd.top + 1.2) >= 5) break;
  }
  recesses.push(fd.recess);
  doorSkins.push(fd.skin);
  accent.push(fd.awning);
  const zBottom = fd.top + 1.2;
  let capHeight = 0;
  if (zTop - zBottom >= 5) {
    // With an emblem and the name already on the wings, the tower carries the emblem alone (like the reference crest).
    const sign = layoutSign(p, art, tw - 2 * 1.2, zTop - zBottom, issues, !(art && wingText));
    const zc = zTop - sign.panelH / 2;
    const yFace = -d.towerFront;
    signage.push(extrudeY([rectRing(-sign.panelW / 2, zc - sign.panelH / 2, sign.panelW / 2, zc + sign.panelH / 2)], yFace - SIGN.raise, yFace));
    if (sign.section) {
      signArt.push(extrudeY(track(sign.section.translate([0, zc])), yFace - SIGN.raise - SIGN.textRaise, yFace - SIGN.raise));
      capHeight = sign.capHeight;
    }
    const byColour = { structure: emblemGrey, facade: signArt, accent, sign: signage };
    for (const e of sign.emblem) byColour[e.colour].push(extrudeY(track(e.section.translate([0, zc])), yFace - SIGN.raise - SIGN.textRaise, yFace - SIGN.raise));
  } else issues.push({ severity: "warning", message: "The entrance tower is too short for a sign above its door; a taller exterior wall makes room." });

  // Red band along the top of the wall and around the tower top, standing out in two half steps so the overhang stays tiny.
  // The band owns the outer skin of the wall top, so it is cut out of the structure rather than stuck onto it.
  const ring = (out: number, inset: number, z0: number, z1: number) => prism(track(polygon(N, yWall + out).subtract(polygon(N, yWall - inset))), z0, z1);
  const towerFoot = box(-tw / 2 - TRIM.out - 0.1, -d.towerFront - TRIM.out - 0.1, -1, tw / 2 + TRIM.out + 0.1, towerBack + 0.01, d.towerTop + 5);
  const band = mSubtract(mUnion([ring(TRIM.out / 2, TRIM.skin, d.wallHeight - TRIM.height, d.wallHeight), ring(TRIM.out, TRIM.skin, d.wallHeight - TRIM.height / 2, d.wallHeight)]), towerFoot);
  const capShell = (out: number, z0: number) => mSubtract(box(-tw / 2 - out, -d.towerFront - out, z0, tw / 2 + out, towerBack, d.towerTop), box(-tw / 2 + TRIM.skin, -d.towerFront + TRIM.skin, z0 - 1, tw / 2 - TRIM.skin, towerBack + 1, d.towerTop + 1));
  accent.push(band, capShell(TRIM.out / 2, d.towerTop - TRIM.height), capShell(TRIM.out, d.towerTop - TRIM.height / 2));

  // ---- 6. floodlight plinths (and the masts themselves when printed in place)
  const lights = buildFloodlight(p, d);
  const standing: Floodlight[] = [];
  const sockets: Manifold[] = [];
  if (p.lights !== "none") {
    const plinthTop = zBase + PLINTH.height;
    const half = PLINTH.size / 2;
    const plinths: Manifold[] = [];
    for (const s of d.lightSpots) {
      const cx = s.radius * Math.cos(rad(s.angle)), cy = s.radius * Math.sin(rad(s.angle));
      plinths.push(at(rotZ(box(-half, -half, zBase - 0.5, half, half, plinthTop), s.angle), cx, cy, 0));
      standing.push(placeStanding(lights, s.angle, s.radius, plinthTop - (p.lights === "attached" ? 1 : 0)));
      if (p.lights === "separate") {
        const c = p.pegClearance;
        sockets.push(at(rotZ(box(-MAST.pegDepth / 2 - c, -MAST.pegWidth / 2 - c, plinthTop - PLINTH.socketDepth, MAST.pegDepth / 2 + c, MAST.pegWidth / 2 + c, plinthTop + 1), s.angle), cx, cy, 0));
      }
    }
    // Plinths sit against the wall at the corners; the facade keeps that material, the plinth the rest.
    const plinthSolid = mSubtract(mUnion(plinths), mUnion(features));
    body = mUnion([body, plinthSolid, ...(p.lights === "attached" ? standing.map((f) => f.mast) : [])]);
  }

  // ---- 7. cut the recesses, door skins and the band's skin out of the facade; door skins and sockets out of the structure
  const facade = dropSlivers(mSubtract(mUnion(features), mUnion([...recesses, ...doorSkins, ...accent])));
  // Door skins reach a little past the wall into the block behind it, so they come out of the structure too.
  body = dropSlivers(mSubtract(body, mUnion([...recesses, ...doorSkins, ...sockets])));
  const voids = voidCount(body) + voidCount(facade);
  const bodyPieces = solidPieces(body).length - voidCount(body);
  const facadePieces = solidPieces(facade).length - voidCount(facade);
  if (bodyPieces !== 1 || facadePieces !== 1) issues.push({ severity: "error", message: `The stadium is not one piece (structure ${bodyPieces}, facade ${facadePieces}). Please report these settings.` });
  if (voids) issues.push({ severity: "error", message: `The stadium has ${voids} sealed pocket(s) inside it. Please report these settings.` });

  const stadiumSolids: Solid[] = [
    { name: "STRUCTURE", hex: p.colorStructure, solid: body },
    { name: "FACADE", hex: p.colorFacade, solid: facade },
    { name: "SEATS", hex: p.colorAccent, solid: mUnion(seats) },
    { name: "SIGN_ART", hex: p.colorFacade, solid: mUnion(signArt) },
    { name: "SIGN", hex: p.colorSign, solid: mUnion(signage) },
    { name: "DOORS", hex: p.colorSign, solid: mUnion(doorSkins) },
    { name: "TRIM", hex: p.colorAccent, solid: mUnion(accent) },
    { name: "EMBLEM", hex: p.colorStructure, solid: mUnion(emblemGrey) },
  ];
  if (p.lights === "attached") {
    stadiumSolids.push({ name: "LAMP_HEADS", hex: p.colorSign, solid: mUnion(standing.map((f) => f.head)) });
    stadiumSolids.push({ name: "LAMPS", hex: p.colorFacade, solid: mUnion(standing.map((f) => f.lamps)) });
  }
  const live = stadiumSolids.filter((s) => !s.solid.isEmpty());
  const toPart = (object: string, name: string, hex: string, solid: Manifold): Part => ({ name, object, hex: hex.toUpperCase(), mesh: manifoldToMesh(solid), volume: solid.volume() });
  const stadiumParts: Part[] = live.map((s) => toPart(OBJ, s.name, s.hex, s.solid));

  // ---- 8. floodlights as their own objects (lying flat), the assembled view, and the fit test
  const floodlights: Printed[] = [];
  const fitTest: Printed[] = [];
  const assembled: Part[] = [...stadiumParts];
  if (p.lights === "separate") {
    const pitch = MAST.headWidth + 6;
    standing.forEach((f, i) => {
      const obj = `floodlight-${i + 1}`;
      const flat = placeFlat(lights, 0, (i - (standing.length - 1) / 2) * pitch);
      floodlights.push({ object: obj, parts: [toPart(obj, "MAST", p.colorStructure, flat.mast), toPart(obj, "HEAD", p.colorSign, flat.head), toPart(obj, "LAMPS", p.colorFacade, flat.lamps)] });
      assembled.push(toPart(obj, "MAST", p.colorStructure, f.mast), toPart(obj, "HEAD", p.colorSign, f.head), toPart(obj, "LAMPS", p.colorFacade, f.lamps));
    });
    // Fit test: a plinth with the socket at the chosen clearance, and a 12 mm stub of mast with its peg.
    const half = PLINTH.size / 2, c = p.pegClearance, top = PLINTH.height + 1.2;
    const socketBlock = mSubtract(box(-half, -half, 0, half, half, top), box(-MAST.pegDepth / 2 - c, -MAST.pegWidth / 2 - c, top - PLINTH.socketDepth, MAST.pegDepth / 2 + c, MAST.pegWidth / 2 + c, top + 1));
    const stub = mUnion([box(-MAST.depth / 2, -MAST.width / 2, 0, MAST.depth / 2, MAST.width / 2, 12), box(-MAST.pegDepth / 2, -MAST.pegWidth / 2, -MAST.pegLength, MAST.pegDepth / 2, MAST.pegWidth / 2, 0.5)]);
    const stubFlat = at(track(stub.rotate([0, -90, 0])), 0, half + MAST.width / 2 + 4, MAST.depth / 2);
    fitTest.push({ object: "fit-test", parts: [toPart("fit-test", "SOCKET", p.colorStructure, socketBlock), toPart("fit-test", "PEG", p.colorStructure, stubFlat)] });
  }

  return { assembled, stadium: [{ object: OBJ, parts: stadiumParts }], floodlights, fitTest, stadiumSolids: live, issues, derived: d, capHeight, bodyPieces };
}

/** Largest overlap volume (mm³) between any two colour solids of the stadium; 0 when they only touch. Slow, for tests. */
export function largestOverlap(solids: Solid[]): { volume: number; pair: string } {
  let worst = { volume: 0, pair: "" };
  for (let i = 0; i < solids.length; i++)
    for (let j = i + 1; j < solids.length; j++) {
      const v = mIntersect(solids[i].solid, solids[j].solid).volume();
      if (v > worst.volume) worst = { volume: v, pair: `${solids[i].name} / ${solids[j].name}` };
    }
  return worst;
}
