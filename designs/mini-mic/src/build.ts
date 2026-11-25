// Let's Make Studio — Mini Mic, version 1.
//
// Our own modular mini microphone holder. Five kinds of printed part, joined
// with push-fit D-shaped pins (no glue, parts can be swapped later):
//
//   HEAD        retro capsule head with meridian ribs, socket underneath
//   BODY        rounded block: logo recess on the front, mic pocket open at the back,
//               a socket on top and underneath
//   LOGO PLATE  press-fits into the front recess (blank, plus a two-colour heart demo)
//   HANDLE      tapered grip with three rings, socket on top
//   PIN (x2)    joins head↔body and body↔handle; prints lying on its flat side
//
//   FIT TEST    only the mic pocket with thin walls: a short print to check the mic fit
//               before printing the full holder
//
// Run:  npm run build          writes out/
//       npm run build -- --check   builds and checks every mesh, writes nothing
//
// The MIC numbers below are NOT verified. They are a starting point to print the
// fit test with; change them to what the fit test shows, then build again.

import { mkdirSync, writeFileSync } from "node:fs";
import { initKernel, kernel, track, withArena, type CrossSection, type Manifold } from "./shared/kernel";
import { rect, box, mUnion, mSubtract, mIntersect, mTranslate, prism, csSubtract, csOffset, csTranslate } from "./shared/shapes";
import { manifoldToMesh, validateMesh } from "./shared/mesh";
import { buildThreeMF } from "./shared/threeMF";
import { meshToStl, partsToStlZip } from "./shared/stl";
import { shelfPack } from "./shared/batch";
import type { Part } from "./shared/types";

export const P = {
  // --- Mic pocket (UNVERIFIED starting values, set from the fit test) ---
  micW: 35.0, // mic body width (side to side)
  micT: 21.6, // mic body thickness (front to back of the mic)
  micD: 30.2, // how far the mic slides in
  clipSlot: 3.5, // gap for the mic's clip
  clipWall: 1.2, // thin wall the clip grips, like a shirt pocket edge
  clipRelief: 10, // the clip wall starts this far in from the opening, so the clip can hook over it
  fit: 0.2, // extra room around the mic on every side

  // --- Body ---
  wall: 3.5, // side walls around the pocket
  front: 3.0, // wall between pocket and logo recess
  band: 11.5, // solid band above and below the pocket, where the sockets go (keeps 2 mm between socket and pocket)
  logoW: 34, logoH: 34, logoDepth: 1.6, logoR: 6,
  plateFit: 0.15, // logo plate is this much smaller than its recess on every side

  // --- Pins and sockets ---
  pinD: 10, pinFlat: 1.0, pinLen: 8, // each end of a pin goes 8 mm into a socket
  pinFit: 0.2, // socket is this much bigger than the pin on every side

  // --- Head ---
  headR: 16, collarR: 11, collarH: 4, flareH: 5, bandH: 10,

  // --- Handle ---
  handleLen: 75, handleR0: 7.5, handleR1: 9,
};

const COLORS = { body: "#E5392F", head: "#C8C8C8", handle: "#15171B", plate: "#FFFFFF", art: "#E5392F" };

// ---------- helpers ----------
const K = () => kernel();
const polygon = (pts: [number, number][]) => track(new (K().CrossSection)([pts]));
function circle(r: number) { return track(K().CrossSection.circle(r, 96)); }
function revolve(profile: [number, number][]) { return track(K().Manifold.revolve(polygon(profile), 128)); }
const rotate = (m: Manifold, x: number, y: number, z: number) => track(m.rotate([x, y, z]));

/** D-shaped pin profile: a circle with one flat side, so parts cannot spin. */
function dProfile(grow = 0): CrossSection {
  const r = P.pinD / 2;
  const d = csSubtract(circle(r), rect(r - P.pinFlat, -r - 1, r + 1, r + 1));
  return csOffset(d, grow);
}
/** Socket: D hole going up from z0, depth deep. */
const socket = (z0: number, depth: number) => prism(dProfile(P.pinFit), z0, z0 + depth);
const socketDepth = () => P.pinLen + 0.6;

/** Rounded rectangle in the X-Z plane, extruded along Y from y0 to y1. */
function xzRoundBox(w: number, h: number, r: number, y0: number, y1: number, cx = 0, cz = 0) {
  const s = prism(rect(cx - w / 2, cz - h / 2, cx + w / 2, cz + h / 2, r), 0, y1 - y0); // extruded along Z
  return mTranslate(rotate(s, 90, 0, 0), 0, y1, 0); // now along Y, from y0 to y1
}

// ---------- parts ----------
function bodyDims() {
  const pocketW = P.micW + 2 * P.fit;
  const stack = P.clipSlot + P.clipWall + P.micT + 2 * P.fit;
  return {
    W: pocketW + 2 * P.wall,
    H: stack + 2 * P.band,
    D: P.logoDepth + P.front + P.micD + P.fit,
    pocketW,
    zClip0: P.band,
    zMic0: P.band + P.clipSlot + P.clipWall,
  };
}

/** The empty space the mic and its clip slide into, open at the back (y = D). */
function pocketCut(): Manifold {
  const b = bodyDims();
  const yIn = b.D - P.micD - P.fit;
  const x0 = -b.pocketW / 2, x1 = b.pocketW / 2;
  const mic = box(x0, yIn, b.zMic0, x1, b.D + 1, b.zMic0 + P.micT + 2 * P.fit);
  const clip = box(x0, yIn, b.zClip0, x1, b.D + 1, b.zClip0 + P.clipSlot);
  const relief = box(x0, b.D - P.clipRelief, b.zClip0 + P.clipSlot - 0.01, x1, b.D + 1, b.zMic0 + 0.01);
  return mUnion([mic, clip, relief]);
}

function body(): Manifold {
  const b = bodyDims();
  // Soft "pillow" block: rounded seen from the front, slightly rounded seen from above.
  const front = xzRoundBox(b.W, b.H, 8, 0, b.D, 0, b.H / 2);
  const top = prism(rect(-b.W / 2, 0, b.W / 2, b.D, 3), 0, b.H);
  let m = mIntersect(front, top);
  // Logo recess on the front, with a fingernail notch at the bottom to lift the plate out.
  const zc = b.H / 2;
  const recess = xzRoundBox(P.logoW, P.logoH, P.logoR, -1, P.logoDepth, 0, zc);
  const notch = mTranslate(rotate(prism(circle(2.5), 0, P.logoDepth + 1), 90, 0, 0), 0, P.logoDepth, zc - P.logoH / 2);
  m = mSubtract(m, mUnion([recess, notch]));
  m = mSubtract(m, pocketCut());
  // Sockets: from the top and from underneath, in the middle of the solid bands.
  const yc = P.logoDepth + P.front + 3.5; // toward the front, clear of the clip relief
  const sockets = mUnion([socket(-1, socketDepth() + 1), socket(b.H - socketDepth(), socketDepth() + 1)]);
  return mSubtract(m, mTranslate(sockets, 0, yc, 0));
}

function head(): Manifold {
  const r = P.headR;
  const z1 = P.collarH, z2 = z1 + P.flareH, z3 = z2 + P.bandH;
  const prof: [number, number][] = [[0, 0], [P.collarR, 0], [P.collarR, z1], [r, z2], [r, z3]];
  for (let i = 1; i <= 24; i++) { const a = (i / 24) * (Math.PI / 2); prof.push([r * Math.cos(a), z3 + r * Math.sin(a)]); }
  let m = revolve(prof);
  // Rings around the band, and ribs over the dome: the grille look.
  const rings = [0, 1, 2].map((i) => {
    const zc = z2 + 2 + i * 3;
    return revolve([[r - 0.7, zc - 0.5], [r + 1, zc - 0.5], [r + 1, zc + 0.5], [r - 0.7, zc + 0.5]]);
  });
  const shell = mSubtract(track(K().Manifold.sphere(r + 1, 96)), track(K().Manifold.sphere(r - 0.7, 96)));
  const domeShell = mIntersect(mTranslate(shell, 0, 0, z3), box(-r - 2, -r - 2, z3 + 2, r + 2, r + 2, z3 + r - 3));
  const ribs = mUnion([0, 1, 2, 3, 4, 5].map((k) => rotate(box(-r - 2, -0.5, 0, r + 2, 0.5, 60), 0, 0, k * 30)));
  m = mSubtract(m, mUnion([...rings, mIntersect(domeShell, ribs)]));
  return mSubtract(m, socket(-1, socketDepth() + 1));
}

function handle(): Manifold {
  const L = P.handleLen, r0 = P.handleR0, r1 = P.handleR1, c = 1.5;
  let m = revolve([[0, 0], [r0 - c, 0], [r0, c], [r1, L - c], [r1 - c, L], [0, L]]);
  const rAt = (z: number) => r0 + (r1 - r0) * (z / L);
  const grips = [14, 19, 24].map((z) => revolve([[rAt(z) - 0.8, z - 0.6], [rAt(z) + 1, z - 0.6], [rAt(z) + 1, z + 0.6], [rAt(z) - 0.8, z + 0.6]]));
  m = mSubtract(m, mUnion(grips));
  return mSubtract(m, socket(L - socketDepth(), socketDepth() + 1));
}

/** Pin lying on its flat side, chamfered ends so it starts into the socket easily. */
function pin(): Manifold {
  const len = 2 * P.pinLen - 0.4, ch = 0.8;
  const end = (z0: number, up: boolean) => {
    const e = track(K().Manifold.extrude(dProfile(), ch, 0, 0, [0.86, 0.86]));
    return up ? mTranslate(e, 0, 0, z0) : mTranslate(rotate(e, 180, 0, 0), 0, 0, z0 + ch);
  };
  const m = mUnion([end(0, false), prism(dProfile(), ch, len - ch), end(len - ch, true)]);
  return rotate(m, 0, -90, 0); // flat side down
}

function logoPlate(withArt: boolean): { plate: Manifold; art?: Manifold } {
  const w = P.logoW - 2 * P.plateFit, h = P.logoH - 2 * P.plateFit;
  const outline = rect(-w / 2, -h / 2, w / 2, h / 2, P.logoR - P.plateFit);
  if (!withArt) return { plate: prism(outline, 0, P.logoDepth) };
  // Demo art: a heart inlaid flush in a second colour, so the photos show a two-colour logo.
  const pts: [number, number][] = [];
  for (let i = 0; i < 120; i++) {
    const t = (i / 120) * 2 * Math.PI;
    pts.push([16 * Math.sin(t) ** 3 * 0.75, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.75 + 1]);
  }
  const heart = polygon(pts.reverse()); // counter-clockwise
  const art = prism(heart, P.logoDepth - 0.6, P.logoDepth);
  return { plate: mSubtract(prism(outline, 0, P.logoDepth), art), art };
}

/** Fit test: just the pocket with 1.6 mm walls, printed with the opening facing up. */
function fitTest(): Manifold {
  const b = bodyDims(), t = 1.6;
  const yIn = b.D - P.micD - P.fit;
  const outer = box(-b.pocketW / 2 - t, yIn - t, b.zClip0 - t, b.pocketW / 2 + t, b.D, b.zMic0 + P.micT + 2 * P.fit + t);
  return rotate(mSubtract(outer, pocketCut()), 90, 0, 0);
}

// ---------- export ----------
interface Built { name: string; object: string; hex: string; m: Manifold }

function toPart(b: Built): Part {
  const mesh = manifoldToMesh(b.m);
  return { name: b.name, object: b.object, hex: b.hex, mesh, volume: b.m.volume() };
}

/** Drop every printed object onto the bed (z = 0) and spread them out. */
function plate(parts: Part[], bed = 250): Part[] {
  const objects = [...new Set(parts.map((p) => p.object))];
  const bounds = objects.map((o) => {
    const mn = [Infinity, Infinity, Infinity], mx = [-Infinity, -Infinity, -Infinity];
    for (const p of parts.filter((q) => q.object === o))
      for (let i = 0; i < p.mesh.positions.length; i += 3)
        for (let k = 0; k < 3; k++) { const v = p.mesh.positions[i + k]; mn[k] = Math.min(mn[k], v); mx[k] = Math.max(mx[k], v); }
    return { mn, mx };
  });
  const spots = shelfPack(bounds.map((b) => ({ w: b.mx[0] - b.mn[0], h: b.mx[1] - b.mn[1] })), bed, 10, 8);
  return parts.map((p) => {
    const i = objects.indexOf(p.object), s = spots[i];
    if (!s || s.plate > 0) throw new Error(`${p.object} does not fit on one ${bed} mm plate`);
    const { mn } = bounds[i];
    const pos = Float64Array.from(p.mesh.positions);
    for (let v = 0; v < pos.length; v += 3) { pos[v] += s.x - mn[0]; pos[v + 1] += s.y - mn[1]; pos[v + 2] -= mn[2]; }
    return { ...p, mesh: { positions: pos, indices: p.mesh.indices } };
  });
}

async function main() {
  const check = process.argv.includes("--check");
  await initKernel();
  const b = bodyDims();
  const { printParts, assembled, test } = withArena(() => {
    const demo = logoPlate(true);
    const printed: Built[] = [
      { name: "HEAD", object: "Head", hex: COLORS.head, m: head() },
      { name: "BODY", object: "Body", hex: COLORS.body, m: body() },
      { name: "HANDLE", object: "Handle", hex: COLORS.handle, m: handle() },
      { name: "PIN", object: "Pin 1", hex: COLORS.handle, m: pin() },
      { name: "PIN", object: "Pin 2", hex: COLORS.handle, m: pin() },
      { name: "LOGO_PLATE_BLANK", object: "Logo plate (blank)", hex: COLORS.plate, m: logoPlate(false).plate },
      { name: "LOGO_PLATE", object: "Logo plate (heart demo)", hex: COLORS.plate, m: demo.plate },
      { name: "LOGO_ART", object: "Logo plate (heart demo)", hex: COLORS.art, m: demo.art! },
    ];
    // Assembled view, for the preview picture only (head on top, handle underneath).
    const yc = P.logoDepth + P.front + 3.5;
    const plateFront = rotate(demo.plate, 90, 0, 0), artFront = rotate(demo.art!, 90, 0, 0);
    const assembledBuilt: Built[] = [
      { name: "head", object: "a", hex: COLORS.head, m: mTranslate(head(), 0, yc, b.H + 0.5) },
      { name: "body", object: "a", hex: COLORS.body, m: body() },
      { name: "plate", object: "a", hex: COLORS.plate, m: mTranslate(plateFront, 0, P.logoDepth, b.H / 2) },
      { name: "art", object: "a", hex: COLORS.art, m: mTranslate(artFront, 0, P.logoDepth, b.H / 2) },
      { name: "handle", object: "a", hex: COLORS.handle, m: mTranslate(handle(), 0, yc, -P.handleLen - 0.5) },
    ];
    return {
      printParts: printed.map(toPart),
      assembled: assembledBuilt.map(toPart),
      test: toPart({ name: "FIT_TEST", object: "Mic fit test", hex: COLORS.body, m: fitTest() }),
    };
  });

  let bad = 0;
  for (const p of [...printParts, test]) {
    const r = validateMesh(`${p.object}/${p.name}`, p.mesh);
    const size = r.bbox.max.map((v, k) => (v - r.bbox.min[k]).toFixed(1)).join(" x ");
    console.log(`${r.ok ? "ok " : "BAD"} ${(p.object + " " + p.name).padEnd(40)} ${size} mm  ${(p.volume / 1000).toFixed(1)} cm³`);
    if (!r.ok) { bad++; console.log("    " + r.errors.join("; ")); }
  }
  // The sockets sit in the solid bands: keep at least 2 mm between a socket and the pocket.
  const floor = b.zClip0 - socketDepth(), roof = b.H - socketDepth() - (b.zMic0 + P.micT + 2 * P.fit);
  if (Math.min(floor, roof) < 2) { console.log(`BAD only ${Math.min(floor, roof).toFixed(1)} mm between a socket and the mic pocket: raise band`); bad++; }
  const height = b.H + 1 + P.handleLen + P.collarH + P.flareH + P.bandH + P.headR;
  console.log(`body ${b.W.toFixed(1)} x ${b.D.toFixed(1)} x ${b.H.toFixed(1)} mm, assembled height about ${height.toFixed(0)} mm`);
  if (bad) process.exit(1);
  if (check) return;

  mkdirSync("out/render", { recursive: true });
  const plated = plate(printParts);
  writeFileSync("out/letsmake-mini-mic.3mf", buildThreeMF(plated, { app: "mini-mic", title: "Let's Make Studio Mini Mic", project: JSON.stringify(P) }));
  writeFileSync("out/letsmake-mini-mic-stl.zip", partsToStlZip(plated, "letsmake-mini-mic"));
  const t = plate([test]);
  writeFileSync("out/letsmake-mini-mic-fit-test.3mf", buildThreeMF(t, { app: "mini-mic", title: "Mini Mic fit test", project: JSON.stringify(P) }));
  writeFileSync("out/letsmake-mini-mic-fit-test.stl", meshToStl(t[0].mesh));
  assembled.forEach((p, i) => writeFileSync(`out/render/${i}_${p.hex.slice(1)}_${p.name}.stl`, meshToStl(p.mesh)));
  console.log("wrote out/letsmake-mini-mic.3mf, out/letsmake-mini-mic-stl.zip, out/letsmake-mini-mic-fit-test.3mf/.stl");
}

main().catch((e) => { console.error(e); process.exit(1); });
