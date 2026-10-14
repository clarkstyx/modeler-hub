import { beforeAll, describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, FOOD_NOTE, type CutterParams, type ShapeId } from "../src/core/params";
import { generate, cutterZip, plate3MF, type GenerateResult } from "../src/pipeline/generate";
import { readProjectFrom3MF } from "../src/export/threeMF";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import type { Artwork } from "../src/core/types";

beforeAll(() => initKernel().then(() => undefined));
const P = (patch: Partial<CutterParams> = {}): CutterParams => ({ ...DEFAULT_PARAMS, ...patch });
const errorsOf = (r: GenerateResult) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);
const messages = (r: GenerateResult) => r.issues.map((i) => i.message).join(" | ");

function bounds(r: GenerateResult) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const pl of r.plates) for (const part of pl.parts) {
    const P = part.mesh.positions;
    for (let i = 0; i < P.length; i += 3) {
      minX = Math.min(minX, P[i]); maxX = Math.max(maxX, P[i]);
      minY = Math.min(minY, P[i + 1]); maxY = Math.max(maxY, P[i + 1]);
      minZ = Math.min(minZ, P[i + 2]); maxZ = Math.max(maxZ, P[i + 2]);
    }
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

describe("shapes", () => {
  for (const shape of ["circle", "scalloped", "heart", "star", "square", "egg"] as ShapeId[])
    it(`${shape}: one watertight cutter, flange on the bed, full height, cookie at the set size`, () => {
      const r = generate(P({ shape }), null);
      expect(errorsOf(r)).toEqual([]);
      expect(r.exportable).toBe(true);
      expect(r.cutterCount).toBe(1);
      expect(r.meshesFailed).toBe(0);
      const c = r.plates[0].cutters[0];
      expect(Math.max(c.cookieW, c.cookieH)).toBeCloseTo(70, 0);
      expect(c.width).toBeCloseTo(c.cookieW + 2 * (1.2 + 4), 5);
      const b = bounds(r);
      expect(b.minZ).toBeCloseTo(0, 6);
      expect(b.maxZ).toBeCloseTo(15, 6);
      expect(b.maxX - b.minX).toBeCloseTo(c.width, 0);
    });

  it("the cutting edge is thinner than the wall: less material in the top band than lower down", () => {
    const thick = generate(P({ shape: "circle", edge: 1.2, wall: 1.2 }), null).plates[0].parts[0].volume;
    const thin = generate(P({ shape: "circle", edge: 0.8, wall: 1.2 }), null).plates[0].parts[0].volume;
    expect(thin).toBeLessThan(thick);
    const noFlange = generate(P({ shape: "circle", flange: 0 }), null);
    expect(noFlange.exportable).toBe(true);
    expect(noFlange.plates[0].cutters[0].width).toBeCloseTo(noFlange.plates[0].cutters[0].cookieW + 2.4, 5);
  });
});

describe("text", () => {
  it("letters: one cutter per character, spaces skipped, holes filled, the dot of an i joined", () => {
    const r = generate(P({ source: "letters", text: "AB i", size: 50 }), null);
    expect(errorsOf(r)).toEqual([]);
    expect(r.plates.flatMap((p) => p.cutters.map((c) => c.object))).toEqual(["01_A", "02_B", "03_I_LOWER"]);
    expect(messages(r)).toMatch(/i \(lower case\): separate pieces were joined/);
    for (const c of r.plates[0].cutters) expect(c.cookieH).toBeGreaterThan(20);
  });

  it("word: one cutter around the whole word, sized to its longest side", () => {
    const r = generate(P({ source: "word", text: "LOVE", size: 90 }), null);
    expect(errorsOf(r)).toEqual([]);
    expect(r.cutterCount).toBe(1);
    expect(r.plates[0].cutters[0].cookieW).toBeCloseTo(90, 0);
  });

  it("many letters spill onto more plates on a small bed", () => {
    const r = generate(P({ source: "letters", text: "ABCDEFGHIJ", size: 60, bedSize: 160 }), null);
    expect(errorsOf(r)).toEqual([]);
    expect(r.cutterCount).toBe(10);
    expect(r.plates.length).toBeGreaterThan(1);
    const b = bounds(r);
    expect(b.minX).toBeGreaterThanOrEqual(5 - 1e-6);
    expect(b.maxX).toBeLessThanOrEqual(155 + 1e-6);
    expect(b.maxY).toBeLessThanOrEqual(155 + 1e-6);
  });

  it("a character the font lacks is reported", () => {
    expect(messages(generate(P({ source: "letters", text: "A漢" }), null))).toMatch(/no "漢"/);
  });
});

describe("svg and printability", () => {
  const ringWithHole: Artwork = {
    name: "frame.svg",
    layers: [{ hex: "#000000", rings: [[[0, 0], [100, 0], [100, 100], [0, 100]], [[30, 30], [30, 70], [70, 70], [70, 30]]] }],
    bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 },
  };
  it("an SVG with a hole cuts its outside only", () => {
    const r = generate(P({ source: "svg", size: 60, smoothing: 0 }), ringWithHole);
    expect(errorsOf(r)).toEqual([]);
    expect(r.plates[0].cutters[0].label).toBe("FRAME");
    const solid = generate(P({ source: "svg", size: 60, smoothing: 0 }), { ...ringWithHole, layers: [{ hex: "#000000", rings: [ringWithHole.layers[0].rings[0]] }] });
    expect(r.plates[0].parts[0].volume).toBeCloseTo(solid.plates[0].parts[0].volume, 3);
  });

  it("a thin spike is smoothed off and a narrow part is flagged as fragile", () => {
    const spiky: Artwork = { name: "spike", layers: [{ hex: "#000", rings: [[[0, 0], [60, 0], [60, 60], [31, 60], [30.5, 100], [30, 60], [0, 60]]] }], bounds: { minX: 0, minY: 0, maxX: 60, maxY: 100 } };
    const r = generate(P({ source: "svg", size: 70, smoothing: 0.6 }), spiky);
    expect(r.exportable).toBe(true);
    expect(messages(r)).toMatch(/smoothing rounded off|under 3 mm wide/);
  });

  it("rules: edge under two nozzles, wall thinner than the edge, too short, too big for the bed", () => {
    expect(errorsOf(generate(P({ edge: 0.6 }), null))[0]).toMatch(/two nozzle widths/);
    expect(errorsOf(generate(P({ wall: 0.9, edge: 1.0 }), null))[0]).toMatch(/thinner than the cutting edge/);
    expect(errorsOf(generate(P({ height: 7 }), null))[0]).toMatch(/too short/);
    expect(errorsOf(generate(P({ size: 200, bedSize: 150 }), null))[0]).toMatch(/does not fit a 150 mm bed/);
  });
});

describe("exports", () => {
  it("3MF has one object per cutter and reopens with the settings", () => {
    const p = P({ source: "letters", text: "XYZ" });
    const r = generate(p, null);
    const bytes = plate3MF(r, 1, p, "xyz");
    const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
    expect((model.match(/<item /g) ?? []).length).toBe(3);
    expect(parseRecipe(readProjectFrom3MF(bytes)!).text).toBe("XYZ");
  });

  it("ZIP holds 3MF + STL per plate, manifest and the food-contact note", () => {
    const p = P({ shape: "star" });
    const zip = unzipSync(cutterZip(generate(p, null), p, "star"));
    expect(Object.keys(zip).sort()).toEqual(["README.txt", "manifest.csv", "star.3mf", "star.stl"]);
    expect(strFromU8(zip["README.txt"])).toContain(FOOD_NOTE);
    expect(strFromU8(zip["manifest.csv"]).split("\n")[1]).toMatch(/^1,1,01_STAR,STAR,70\.0,/);
  });

  it("settings round-trip and junk is ignored", () => {
    const p = P({ source: "word", text: "HI", shape: "egg" });
    expect(parseRecipe(JSON.stringify(toRecipe(p)))).toEqual(p);
    const junk = parseRecipe({ params: { source: "laser", size: 9999, shape: "egg", wall: "x" } });
    expect(junk.source).toBe("shape");
    expect(junk.size).toBe(200);
    expect(junk.shape).toBe("egg");
    expect(junk.wall).toBe(DEFAULT_PARAMS.wall);
  });
});
