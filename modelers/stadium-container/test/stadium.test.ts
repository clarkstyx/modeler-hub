import { beforeAll, describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { initKernel, withArena } from "../src/shared/kernel";
import { DEFAULT_PARAMS, MAST, derive, type StadiumParams } from "../src/core/params";
import { generate, group3MF, stadiumZip, type GenerateResult } from "../src/pipeline/generate";
import { buildStadium, largestOverlap } from "../src/geometry/buildStadium";
import { readProjectFrom3MF } from "../src/export/threeMF";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import type { Artwork, Part } from "../src/core/types";

beforeAll(() => initKernel().then(() => undefined));
const P = (patch: Partial<StadiumParams> = {}): StadiumParams => ({ ...DEFAULT_PARAMS, ...patch });
const errorsOf = (r: GenerateResult) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);
const messages = (r: GenerateResult) => r.issues.map((i) => i.message).join(" | ");
const stadiumParts = (r: GenerateResult) => r.groups.stadium.flatMap((o) => o.parts);
const part = (r: GenerateResult, name: string) => stadiumParts(r).find((p) => p.name === name)!;

function bounds(parts: Part[]) {
  const b = { minX: Infinity, minY: Infinity, minZ: Infinity, maxX: -Infinity, maxY: -Infinity, maxZ: -Infinity };
  for (const p of parts) {
    const P = p.mesh.positions;
    for (let i = 0; i < P.length; i += 3) {
      b.minX = Math.min(b.minX, P[i]); b.maxX = Math.max(b.maxX, P[i]);
      b.minY = Math.min(b.minY, P[i + 1]); b.maxY = Math.max(b.maxY, P[i + 1]);
      b.minZ = Math.min(b.minZ, P[i + 2]); b.maxZ = Math.max(b.maxZ, P[i + 2]);
    }
  }
  return b;
}

/** Is the point inside the closed mesh? Ray cast along +X, counting crossings. */
function inside(mesh: Part["mesh"], x: number, y: number, z: number): boolean {
  const { positions: P, indices: I } = mesh;
  let hits = 0;
  for (let t = 0; t < I.length; t += 3) {
    const a = I[t] * 3, b = I[t + 1] * 3, c = I[t + 2] * 3;
    // Möller–Trumbore with the ray direction (1, 0, 0).
    const e1 = [P[b] - P[a], P[b + 1] - P[a + 1], P[b + 2] - P[a + 2]];
    const e2 = [P[c] - P[a], P[c + 1] - P[a + 1], P[c + 2] - P[a + 2]];
    const h = [0, -e2[2], e2[1]]; // dir × e2
    const det = e1[0] * h[0] + e1[1] * h[1] + e1[2] * h[2];
    if (Math.abs(det) < 1e-12) continue;
    const f = 1 / det;
    const s = [x - P[a], y - P[a + 1], z - P[a + 2]];
    const u = f * (s[0] * h[0] + s[1] * h[1] + s[2] * h[2]);
    if (u < 0 || u > 1) continue;
    const q = [s[1] * e1[2] - s[2] * e1[1], s[2] * e1[0] - s[0] * e1[2], s[0] * e1[1] - s[1] * e1[0]];
    const v = f * q[0]; // dir · q
    if (v < 0 || u + v > 1) continue;
    const dist = f * (e2[0] * q[0] + e2[1] * q[1] + e2[2] * q[2]);
    if (dist > 1e-9) hits++;
  }
  return hits % 2 === 1;
}

describe("default stadium", () => {
  let r: GenerateResult;
  beforeAll(() => { r = generate(P(), null); });
  it("exports: every mesh watertight, structure one piece, four colours, a sign with readable letters", () => {
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.meshesFailed).toBe(0);
    expect(stadiumParts(r).map((p) => p.name)).toEqual(["STRUCTURE", "FACADE", "SEATS", "SIGN_ART", "SIGN", "DOORS", "TRIM"]);
    expect(new Set(r.assembled.map((p) => p.hex)).size).toBe(4);
    expect(r.readout!.capHeight).toBeGreaterThan(3.5);
    expect(r.groups.floodlights.length).toBe(4);
    expect(r.groups["fit-test"].length).toBe(1);
  });

  it("the cavity is open, the right size, and has a solid floor; the seats stay outside it", () => {
    const d = derive(P());
    const s = part(r, "STRUCTURE");
    const ri = DEFAULT_PARAMS.innerDiameter / 2;
    // (points sit off the y = 0 line, away from the stair in the middle of the right side and off any mesh seam)
    const y = 6.37;
    // empty inside the cavity, just inside the wall and just above the floor
    expect(inside(s.mesh, ri - 0.6, y, d.zFloor + 0.5)).toBe(false);
    expect(inside(s.mesh, 0.2, y, d.zRim - 0.5)).toBe(false);
    // solid floor under the cavity and solid rim beside it
    expect(inside(s.mesh, 0.2, y, d.zFloor - 0.5)).toBe(true);
    expect(inside(s.mesh, ri + 0.6, y, d.zRim - 0.5)).toBe(true);
    // the steps start right outside the rim and never reach into the cavity; a seat slab sits on every tread
    expect(inside(s.mesh, ri + DEFAULT_PARAMS.wall + 1, y, d.zRim + 1)).toBe(true);
    expect(inside(s.mesh, ri - 0.6, y, d.zRim + 1)).toBe(false);
    const seats = part(r, "SEATS");
    const r0 = ri + DEFAULT_PARAMS.wall;
    expect(inside(seats.mesh, r0 + DEFAULT_PARAMS.rowTread / 2, y, d.zRim + DEFAULT_PARAMS.rowRise + 0.3)).toBe(true);
    expect(inside(seats.mesh, r0 + 0.2, y, d.zRim + DEFAULT_PARAMS.rowRise + 0.3)).toBe(false); // set back from the riser edge
    const sb = bounds([seats]);
    expect(sb.minZ).toBeCloseTo(d.zRim + DEFAULT_PARAMS.rowRise, 5);
    expect(sb.maxZ).toBeCloseTo(d.zSeatTop + 0.6, 5);
    // the facade is the wall ring: solid in the wall, empty inside the bowl
    const f = part(r, "FACADE");
    expect(inside(f.mesh, 0.2, -(d.wallOuter - 1), d.wallHeight - 5)).toBe(true);
    expect(inside(f.mesh, 0.2, -(d.wallInner - 1), d.wallHeight - 5)).toBe(false);
  });

  it("stands on the bed, fits the footprint and height the readout reports", () => {
    const b = bounds(stadiumParts(r));
    expect(b.minZ).toBeCloseTo(0, 6);
    expect(b.maxZ).toBeCloseTo(r.readout!.height, 5);
    expect(b.maxX - b.minX).toBeLessThanOrEqual(r.readout!.footprint + 1e-6);
    expect(b.maxY - b.minY).toBeLessThanOrEqual(r.readout!.footprint + 1e-6);
    // the front (sign, entrance) is towards −Y
    const sign = part(r, "SIGN");
    expect(bounds([sign]).maxY).toBeLessThan(0);
  });

  it("colour volumes only touch; nothing overlaps", () => {
    withArena(() => {
      const b = buildStadium(P(), null);
      expect(b.bodyPieces).toBe(1);
      expect(largestOverlap(b.stadiumSolids).volume).toBeLessThan(0.01);
    });
  });

  it("floodlights lie flat for printing, lamps up, and the pegs match the wall sockets with the set clearance", () => {
    const f = r.groups.floodlights[0].parts;
    const fb = bounds(f);
    expect(fb.minZ).toBeCloseTo(0, 6);
    expect(fb.maxZ).toBeCloseTo(MAST.depth + MAST.lampRaise, 5);
    expect(fb.maxX - fb.minX).toBeCloseTo(DEFAULT_PARAMS.lightHeight + MAST.pegLength, 5);
    const lamps = f.find((p) => p.name === "LAMPS")!;
    expect(bounds([lamps]).maxZ).toBeCloseTo(MAST.depth + MAST.lampRaise, 5);
    expect(lamps.mesh.indices.length / 3).toBe(MAST.lampCols * MAST.lampRows * 12); // 18 boxes
    // fit test: a piece of wall top with two sockets, each peg + clearance each side, pegLength + 0.3 deep
    const block = r.groups["fit-test"][0].parts.find((p) => p.name === "SOCKETS")!;
    const c = DEFAULT_PARAMS.pegClearance, g = MAST.legGap / 2, top = MAST.pegLength + 1.5;
    expect(inside(block.mesh, g, 0, top - 0.5)).toBe(false);
    expect(inside(block.mesh, g + MAST.pegWidth / 2 + c + 0.1, 0, top - 0.5)).toBe(true);
    expect(inside(block.mesh, g, 0, top - MAST.pegLength - 0.3 - 0.3)).toBe(true);
    // the stadium's wall has the same sockets at the four short sides
    const d = derive(P());
    const spot = d.lightSpots[0];
    const sx = spot.radius * Math.cos((spot.angle * Math.PI) / 180), sy = spot.radius * Math.sin((spot.angle * Math.PI) / 180);
    const facade = part(r, "FACADE");
    const along = [-Math.sin((spot.angle * Math.PI) / 180), Math.cos((spot.angle * Math.PI) / 180)];
    expect(inside(facade.mesh, sx + along[0] * g, sy + along[1] * g, d.wallHeight - 1)).toBe(false);
    expect(inside(facade.mesh, sx, sy, d.wallHeight - 1)).toBe(true);
  });

  it("rows run straight along the sides: the first riser is at the same distance all along the front, further out at the corners", () => {
    const d = derive(P());
    const s = part(r, "STRUCTURE");
    const z = d.zRim + 1;
    // just outside the first row's inner edge: solid (the step); just inside: air (the deck), at two spots along the front
    for (const x of [5, 18]) {
      expect(inside(s.mesh, x, -(d.seatA + 0.5), z)).toBe(true);
      expect(inside(s.mesh, x, -(d.seatA - 0.5), z)).toBe(false);
    }
    // on the diagonal the first row starts at seatB > seatA (the deck is wider at the corners)
    expect(d.seatB).toBeGreaterThan(d.seatA);
    const u = Math.SQRT1_2;
    expect(inside(s.mesh, (d.seatB + 0.5) * u, -(d.seatB + 0.5) * u, z)).toBe(true);
    expect(inside(s.mesh, (d.seatB - 0.5) * u, -(d.seatB - 0.5) * u, z)).toBe(false);
    // the cavity stays round: empty at seatA - wall - 0.5 in every direction
    expect(inside(s.mesh, (d.ri - 0.5) * u, (d.ri - 0.5) * u, d.zRim - 1)).toBe(false);
  });

  it("the building is a chamfered square: long sides front/back/left/right, floodlights on the short diagonals", () => {
    const d = derive(P());
    expect(d.sides.map((s) => s.kind)).toEqual(["front", "short", "side", "short", "back", "short", "side", "short"]);
    expect(d.sides[0].length).toBeGreaterThan(d.sides[1].length);
    expect(d.lightSpots.map((s) => s.angle).sort((a, b) => a - b)).toEqual([-135, -45, 45, 135]);
    expect(d.wallThickness).toBeGreaterThanOrEqual(MAST.pegDepth + 2 * MAST.wallAround);
    const regular = derive(P({ cornerSize: 1 }));
    expect(regular.sides[0].length).toBeCloseTo(regular.sides[1].length, 6);
  });
});

describe("parameter rules and automatic raises", () => {
  it("wall raised to the top row and thickened for the floodlight legs", () => {
    const r = generate(P({ wallHeight: 10, wallThickness: 2 }), null);
    expect(errorsOf(r)).toEqual([]);
    expect(messages(r)).toMatch(/Exterior wall raised/);
    expect(messages(r)).toMatch(/thickened to 4.0 mm/);
    expect(stadiumParts(r).map((p) => p.name)).toContain("FACADE");
    const thin = generate(P({ wallThickness: 2, lights: "none" }), null);
    expect(derive(P({ wallThickness: 2, lights: "none" })).wallThickness).toBe(2);
    expect(errorsOf(thin)).toEqual([]);
  });
  it("too big for the bed, floor under target, rim under two nozzles", () => {
    expect(errorsOf(generate(P({ innerDiameter: 160, bedSize: 150 }), null))[0]).toMatch(/does not fit a 150 mm bed/);
    expect(messages(generate(P({ floor: 2 }), null))).toMatch(/Floor 2 mm is under the 2.4 mm design target/);
    expect(errorsOf(generate(P({ wall: 1.6, nozzle: 1 }), null))[0]).toMatch(/rim must be at least two nozzle/);
  });
  it("small, large, attached lights and no lights all export", () => {
    for (const patch of [
      { innerDiameter: 40, depth: 12, rows: 2, stairsPerSide: 0, wallHeight: 20, lightHeight: 30 },
      { innerDiameter: 120, depth: 50, rows: 8, stairsPerSide: 3, wallHeight: 80, baseMargin: 12, bedSize: 350 },
      { lights: "attached" as const },
      { lights: "none" as const },
      { stairsPerSide: 2, rows: 1, cornerSize: 1 },
      { stairsPerSide: 3, rowRise: 1.2, rowTread: 2, cornerSize: 0.3, frontApron: 0 },
    ] as Partial<StadiumParams>[]) {
      const r = generate(P(patch), null);
      expect(errorsOf(r), JSON.stringify(patch)).toEqual([]);
      expect(r.exportable).toBe(true);
      expect(r.groups.floodlights.length).toBe(patch.lights === "separate" || patch.lights === undefined ? 4 : 0);
    }
  });
  it("attached lights: towers standing on the wall, heads and lamps their own colours", () => {
    const r = generate(P({ lights: "attached" }), null);
    expect(stadiumParts(r).map((p) => p.name)).toContain("LAMP_HEADS");
    expect(stadiumParts(r).map((p) => p.name)).toContain("TOWERS");
    expect(bounds(stadiumParts(r)).maxZ).toBeCloseTo(derive(P()).wallHeight + DEFAULT_PARAMS.lightHeight, 5);
    expect(messages(r)).toMatch(/wobbly/);
  });
});

describe("sign", () => {
  it("long text shrinks and warns; an emblem keeps each SVG colour as its own raised piece in the nearest filament", () => {
    const long = generate(P({ text: "THE GRAND OLD BALLPARK" }), null);
    expect(long.exportable).toBe(true);
    expect(messages(long)).toMatch(/Sign letters are only|thinner than one nozzle|left off/);
    const crest: Artwork = {
      name: "crest.svg",
      layers: [
        { hex: "#C53B32", rings: [[[0, 0], [60, 0], [60, 60], [0, 60]]] }, // red square
        { hex: "#888888", rings: [[[15, 15], [45, 15], [45, 45], [15, 45]]] }, // grey square on top
      ],
      bounds: { minX: 0, minY: 0, maxX: 60, maxY: 60 },
    };
    const plain = generate(P({ text: "HOME" }), null);
    const withArt = generate(P({ text: "HOME" }), crest);
    expect(errorsOf(withArt)).toEqual([]);
    expect(stadiumParts(withArt).map((p) => p.name)).toContain("EMBLEM"); // the grey piece
    expect(part(withArt, "TRIM").volume).toBeGreaterThan(part(plain, "TRIM").volume + 20); // the red frame
    expect(part(withArt, "EMBLEM").volume).toBeGreaterThan(5);
    withArena(() => expect(largestOverlap(buildStadium(P({ text: "HOME" }), crest).stadiumSolids).volume).toBeLessThan(0.01));
  });
  it("no text: no raised artwork part, the panel stays", () => {
    const r = generate(P({ text: "" }), null);
    expect(errorsOf(r)).toEqual([]);
    expect(stadiumParts(r).map((p) => p.name)).not.toContain("SIGN_ART");
    expect(stadiumParts(r).map((p) => p.name)).toContain("SIGN");
  });
});

describe("exports", () => {
  it("3MF: one object per printed part set, one colour group per colour, settings embedded", () => {
    const p = P({ text: "XYZ" });
    const r = generate(p, null);
    const model = strFromU8(unzipSync(group3MF(r, "stadium", p, "xyz"))["3D/3dmodel.model"]);
    expect((model.match(/<item /g) ?? []).length).toBe(1);
    expect((model.match(/<m:colorgroup /g) ?? []).length).toBe(4);
    expect(model).toContain('unit="millimeter"');
    const lights = unzipSync(group3MF(r, "floodlights", p, "xyz"));
    expect((strFromU8(lights["3D/3dmodel.model"]).match(/<item /g) ?? []).length).toBe(4);
    expect(parseRecipe(readProjectFrom3MF(group3MF(r, "stadium", p, "xyz"))!).text).toBe("XYZ");
  });
  it("ZIP holds the stadium, floodlights and fit test as 3MF + STL, plus a README", () => {
    const p = P();
    const zip = unzipSync(stadiumZip(generate(p, null), p, "park"));
    expect(Object.keys(zip).sort()).toEqual(["README.txt", "park-fit-test.3mf", "park-fit-test.stl", "park-floodlights.3mf", "park-floodlights.stl", "park.3mf", "park.stl"]);
    expect(strFromU8(zip["README.txt"])).toMatch(/fit test/);
    // STL: 80-byte header + count + 50 bytes per triangle
    const stl = zip["park.stl"];
    const n = new DataView(stl.buffer, stl.byteOffset).getUint32(80, true);
    expect(stl.length).toBe(84 + n * 50);
  });
  it("settings round-trip and junk is ignored", () => {
    const p = P({ text: "HI", lights: "none", colorFacade: "#ABCDEF" });
    expect(parseRecipe(JSON.stringify(toRecipe(p)))).toEqual(p);
    const junk = parseRecipe({ params: { lights: "laser", innerDiameter: 9999, colorFacade: "red", rows: "x" } });
    expect(junk.lights).toBe("separate");
    expect(junk.innerDiameter).toBe(160);
    expect(junk.colorFacade).toBe(DEFAULT_PARAMS.colorFacade);
    expect(junk.rows).toBe(DEFAULT_PARAMS.rows);
  });
});
