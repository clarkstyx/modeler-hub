import { AWNING, DOOR, MAST, PILASTER, SEAT, SIGN, TRIM, WINDOW, WING, derive, type Derived, type Side, type StadiumParams } from "../core/params";
import type { Artwork, Issue, Part } from "../core/types";
import { kernel, track, type Manifold } from "../shared/kernel";
import { manifoldToMesh } from "../shared/mesh";
import { box, cs, csBounds, mIntersect, mSubtract, mUnion, prism, segmentsFor } from "../shared/shapes";
import { buildFloodlight, placeFlat, placeStanding, socketBoxes, type Floodlight } from "./buildFloodlight";
import { archRing, at, extrudeX, extrudeY, octagonRing, rectRing, revolve, spin } from "./frames";
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
  /** The stadium with its floodlights on the wall, as it will look on the shelf. */
  assembled: Part[];
  /** What goes on the bed: the stadium alone; the four floodlights lying flat; the peg fit test. */
  stadium: Printed[];
  floodlights: Printed[];
  fitTest: Printed[];
  /** The stadium's colour volumes as solids, for the overlap check in the tests. */
  stadiumSolids: Solid[];
  issues: Issue[];
  derived: Derived;
  /** Sign letters as built on the tower (0 = none). */
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

/** A box in the "front" frame (x along the side, −y towards the viewer), spun to a side or corner angle. */
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
  const t = d.wallThickness;
  /** The building outline grown outwards by `out` (negative = inwards). */
  const oct = (out: number) => cs([octagonRing(d.wallOuter + out, d.shortOuter + out)]);
  const seats: Manifold[] = []; // accent: slabs on the treads
  const accent: Manifold[] = []; // accent: awnings, the band, wing lettering
  const signage: Manifold[] = []; // sign colour: the panel
  const doorSkins: Manifold[] = []; // sign colour, inside the wall
  const signArt: Manifold[] = []; // facade colour, raised on the sign
  const emblemGrey: Manifold[] = []; // structure colour pieces of the emblem
  const facadeParts: Manifold[] = []; // facade colour: the wall ring, columns, tower

  // ---- 1. structure (grey): base plate with the front terrace, and the block inside the walls. The wall ring stands
  // on the base as the facade (its own colour), touching the block along the inner outline.
  const block = prism(oct(-t), 0, d.zSeatTop);
  const halfFront = d.wallOuter + p.baseMargin * 0.8;
  const apron = p.frontApron > 0 ? [box(-halfFront, -(d.baseOuter + p.frontApron), 0, halfFront, -d.wallOuter + 1, zBase)] : [];
  const base = mUnion([prism(oct(p.baseMargin), 0, zBase), ...apron]);
  let body = mUnion([base, block]);
  facadeParts.push(prism(track(oct(0).subtract(oct(-t))), zBase, d.wallHeight));

  // ---- 2. the bowl: the cavity, the rim ledge, and everything above the ledge out to the last row
  body = mSubtract(body, revolve([[0, d.zFloor], [d.ri, d.zFloor], [d.ri, d.zRim], [d.rSeats, d.zRim], [d.rSeats, d.zSeatTop + big], [0, d.zSeatTop + big]], seg));

  // ---- 3. seating: a stepped ring standing on the ledge; stair aisles with half steps; a raised seat slab on each tread
  const steps: [number, number][] = [[r0, d.zRim]];
  for (let k = 1; k <= p.rows; k++) steps.push([r0 + (k - 1) * p.rowTread, d.zRim + k * p.rowRise], [r0 + k * p.rowTread, d.zRim + k * p.rowRise]);
  steps.push([d.rSeats, d.zRim]);
  const aisleBoxes = (w: number) => mUnion(d.aisleAngles.map((a) => sideBox(a, -w / 2, -(d.rSeats + 1), d.zRim - 1, w / 2, -(r0 - 1), d.zSeatTop + 2)));
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

  // ---- 4. exterior architecture, side by side: corner columns, pilasters, doors with awnings, lettering, window bands
  const colTop = d.wallHeight - TRIM.height;
  const features = facadeParts;
  const recesses: Manifold[] = [];
  for (const c of d.corners) {
    const hw = PILASTER.cornerWidth / 2;
    features.push(sideBox(c.angle, -hw, -(c.radius + PILASTER.cornerOut), zBase, hw, -(c.radius - 1.6), colTop));
  }
  // Doors shrink with a low wall so they stay in proportion. Above the concourse the wall is
  // free-standing, so a recess there must leave two nozzle widths of wall.
  const doorScale = Math.min(1, Math.max(0.5, (d.wallHeight - zBase) / 40));
  const doorW = DOOR.width * doorScale, doorH = DOOR.height * doorScale;
  const doorTop = zBase + doorH + doorW / 2;
  const sideDoorDepth = doorTop > d.zSeatTop ? Math.min(DOOR.depth, t - 2 * p.nozzle) : DOOR.depth;
  const tw = d.towerWidth;
  let wingText = false;
  const addSide = (side: Side) => {
    const { angle: a, apothem: face, length: len, kind } = side;
    const masks: Manifold[] = [];
    const pil = (x: number) => {
      const m = box(x - PILASTER.width / 2, -(face + PILASTER.out), zBase, x + PILASTER.width / 2, -(face - 0.5), colTop);
      masks.push(m);
      features.push(spin(m, a));
    };
    const midPilasters = len >= 24 && kind !== "short";
    // The two short sides beside the logo carry the main entrances and the name banners (like the reference);
    // the other short sides get an entrance too. The long left, right and back sides stay plain.
    const entrance = kind === "short";
    const banner = kind === "short" && Math.abs(angleDiffDeg(a, -90)) < 90;
    let clearAbove = zBase + 1;
    let textBottom = Infinity, textTop = -Infinity;
    if (kind === "front") {
      const xp = tw / 2 + 3 + PILASTER.width / 2;
      if (xp + PILASTER.width / 2 < len / 2 - PILASTER.cornerWidth - 1) { pil(xp); pil(-xp); }
      masks.push(box(-tw / 2 - 0.3, -(d.towerFront + 1), -1, tw / 2 + 0.3, -(face - 1), d.towerTop + 1));
    } else {
      if (midPilasters) { pil(len * 0.28); pil(-len * 0.28); }
      if (entrance && sideDoorDepth >= 0.6 && len >= doorW + 2 * PILASTER.cornerWidth + 4 && d.wallHeight > doorTop + AWNING.out + 3) {
        const dw = doorway(face, doorW, doorH, a, zBase, sideDoorDepth);
        recesses.push(dw.recess);
        doorSkins.push(dw.skin);
        accent.push(dw.awning);
        clearAbove = dw.top + 1;
      }
      if (banner) {
        const maxW = len - 2 * PILASTER.cornerWidth - 2 - 2 * WING.margin;
        const maxH = colTop - 1.5 - clearAbove - 2 * WING.margin;
        const text = layoutWingText(p, maxW, maxH, issues);
        if (text) {
          const zc = (clearAbove + colTop - 1) / 2;
          const tb = csBounds(text.section);
          const pw = tb.w + 2 * WING.margin, ph = text.capHeight + 2 * WING.margin;
          // A raised banner panel in the accent colour with the name raised on it in the facade colour.
          accent.push(spin(extrudeY([rectRing(-pw / 2, zc - ph / 2, pw / 2, zc + ph / 2)], -face - WING.raise, -face), a));
          signArt.push(spin(extrudeY(track(text.section.translate([0, zc])), -face - WING.raise - WING.textRaise, -face - WING.raise), a));
          textBottom = zc - ph / 2;
          textTop = zc + ph / 2;
          wingText = true;
        }
      }
    }
    // Two recessed window bands: one under the top band, one above the awnings (where the lettering leaves room).
    const halfSpan = len / 2 - PILASTER.cornerWidth / 2 - 0.3;
    const bands: [number, number][] = [];
    const upper: [number, number] = [colTop - WINDOW.belowTop - WINDOW.height, colTop - WINDOW.belowTop];
    const lower: [number, number] = [clearAbove + WINDOW.aboveAwning, clearAbove + WINDOW.aboveAwning + WINDOW.height];
    const clearOfText = ([z0, z1]: [number, number]) => textBottom === Infinity || z0 > textTop + 0.8 || z1 < textBottom - 0.8;
    if (upper[0] > clearAbove + 1 && clearOfText(upper)) bands.push(upper);
    if (lower[1] < upper[0] - 1 && clearOfText(lower)) bands.push(lower);
    if (halfSpan > 6)
      for (const [z0, z1] of bands) {
        const strip = box(-halfSpan, -(face + 0.5), z0, halfSpan, -(face - WINDOW.depth), z1);
        recesses.push(spin(masks.length ? mSubtract(strip, mUnion(masks)) : strip, a));
      }
  };
  for (const side of d.sides) addSide(side);

  // ---- 5. entrance tower on the front: the logo (emblem, or the name when there is none) and nothing else
  const towerBack = -d.wallInner;
  features.push(box(-tw / 2, -d.towerFront, zBase, tw / 2, towerBack, d.towerTop));
  const zTop = d.towerTop - TRIM.height - 1.2;
  const zBottom = zBase + 2.5;
  let capHeight = 0;
  if (zTop - zBottom >= 5) {
    // With an emblem and the name already on the wings, the tower carries the emblem alone (like the reference crest).
    const sign = layoutSign(p, art, tw - 2 * 1.2, zTop - zBottom, issues, !(art && wingText));
    const zc = (zTop + zBottom) / 2;
    const yFace = -d.towerFront;
    signage.push(extrudeY([rectRing(-sign.panelW / 2, zc - sign.panelH / 2, sign.panelW / 2, zc + sign.panelH / 2)], yFace - SIGN.raise, yFace));
    if (sign.section) {
      signArt.push(extrudeY(track(sign.section.translate([0, zc])), yFace - SIGN.raise - SIGN.textRaise, yFace - SIGN.raise));
      capHeight = sign.capHeight;
    }
    const byColour = { structure: emblemGrey, facade: signArt, accent, sign: signage };
    for (const e of sign.emblem) byColour[e.colour].push(extrudeY(track(e.section.translate([0, zc])), yFace - SIGN.raise - SIGN.textRaise, yFace - SIGN.raise));
  } else issues.push({ severity: "warning", message: "The entrance tower is too short for a sign; a taller exterior wall makes room." });

  // Red band along the top of the wall and around the tower top, standing out in two half steps so the overhang stays tiny.
  // The band owns the outer skin of the wall top, so it is cut out of the facade rather than stuck onto it.
  const ring = (out: number, inset: number, z0: number, z1: number) => prism(track(oct(out).subtract(oct(-inset))), z0, z1);
  const towerFoot = box(-tw / 2 - TRIM.out - 0.1, -d.towerFront - TRIM.out - 0.1, -1, tw / 2 + TRIM.out + 0.1, towerBack + 0.01, d.towerTop + 5);
  const band = mSubtract(mUnion([ring(TRIM.out / 2, TRIM.skin, d.wallHeight - TRIM.height, d.wallHeight), ring(TRIM.out, TRIM.skin, d.wallHeight - TRIM.height / 2, d.wallHeight)]), towerFoot);
  const capShell = (out: number, z0: number) => mSubtract(box(-tw / 2 - out, -d.towerFront - out, z0, tw / 2 + out, towerBack, d.towerTop), box(-tw / 2 + TRIM.skin, -d.towerFront + TRIM.skin, z0 - 1, tw / 2 - TRIM.skin, towerBack + 1, d.towerTop + 1));
  accent.push(band, capShell(TRIM.out / 2, d.towerTop - TRIM.height), capShell(TRIM.out, d.towerTop - TRIM.height / 2));

  // ---- 6. floodlight towers on the short sides: sockets in the wall top, or the towers themselves when printed in place
  const lights = buildFloodlight(p, d);
  const standing: Floodlight[] = [];
  const sockets: Manifold[] = [];
  for (const s of d.lightSpots) {
    standing.push(placeStanding(lights, s.angle, s.radius, d.wallHeight)); // printed in place the towers stand on the wall top, touching it
    if (p.lights === "separate") for (const sb of socketBoxes(s.radius, d.wallHeight, p.pegClearance)) sockets.push(spin(sb, s.angle));
  }

  // ---- 7. cut the recesses, door skins, the band's skin and the sockets out of the facade; door skins out of the structure too
  const facade = dropSlivers(mSubtract(mUnion(features), mUnion([...recesses, ...doorSkins, ...accent, ...sockets])));
  body = dropSlivers(mSubtract(body, mUnion([...recesses, ...doorSkins])));
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
    stadiumSolids.push({ name: "TOWERS", hex: p.colorStructure, solid: mUnion(standing.map((f) => f.mast)) });
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
      floodlights.push({ object: obj, parts: [toPart(obj, "TOWER", p.colorStructure, flat.mast), toPart(obj, "HEAD", p.colorSign, flat.head), toPart(obj, "LAMPS", p.colorFacade, flat.lamps)] });
      assembled.push(toPart(obj, "TOWER", p.colorStructure, f.mast), toPart(obj, "HEAD", p.colorSign, f.head), toPart(obj, "LAMPS", p.colorFacade, f.lamps));
    });
    // Fit test: a piece of wall top with the two sockets at the chosen clearance, and a 12 mm stub of tower with its pegs.
    const blockH = MAST.pegLength + 1.5, blockW = MAST.legGap + MAST.pegWidth + 2 * 2.5;
    // socketBoxes puts the legs along X at y = −radius; radius 0 centres them on the block's length.
    const wallBlock = mSubtract(box(-blockW / 2, -t / 2, 0, blockW / 2, t / 2, blockH), mUnion(socketBoxes(0, blockH, p.pegClearance)));
    const g = MAST.legGap / 2, lw = MAST.legWidth / 2, hx = MAST.depth / 2;
    const stub = mUnion([
      box(-hx, -g - lw, 0, hx, -g + lw, 12), box(-hx, g - lw, 0, hx, g + lw, 12), box(-hx, -g, 10, hx, g, 11.3),
      ...[-g, g].map((y) => box(-MAST.pegDepth / 2, y - MAST.pegWidth / 2, -MAST.pegLength, MAST.pegDepth / 2, y + MAST.pegWidth / 2, 0.5)),
    ]);
    const stubFlat = at(track(stub.rotate([0, -90, 0])), 0, t / 2 + g + lw + 4, hx);
    fitTest.push({ object: "fit-test", parts: [toPart("fit-test", "SOCKETS", p.colorFacade, wallBlock), toPart("fit-test", "PEGS", p.colorStructure, stubFlat)] });
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
