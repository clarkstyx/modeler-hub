import { beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, PATTERN_LABELS, derive, type BeadParams, type Pattern } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import { beadZip, generate, plate3MF } from "../src/pipeline/generate";

beforeAll(() => initKernel().then(() => undefined));

const params = (patch: Partial<BeadParams> = {}): BeadParams => ({ ...DEFAULT_PARAMS, ...patch });
const errorsOf = (r: ReturnType<typeof generate>) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);
const beadCount = (r: ReturnType<typeof generate>) => r.plates.reduce((n, p) => n + p.beads.length, 0);

describe("knot bead", () => {
  it("builds the default: a watertight bead, 20 copies on one plate", () => {
    const r = generate(params());
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.meshReport?.ok).toBe(true);
    expect(r.plates.length).toBe(1);
    expect(beadCount(r)).toBe(20);
    expect(new Set(r.plates[0].parts.map((p) => p.object)).size).toBe(20);
  });

  it("is the right size with a hole through it", () => {
    const p = params();
    const r = generate(p);
    const b = r.meshReport!.bbox;
    expect(b.max[0] - b.min[0]).toBeCloseTo(p.diameter, 1);
    expect(b.max[2] - b.min[2]).toBeCloseTo(p.height, 3);
    expect(b.min[2]).toBeCloseTo(0, 5);
    const solidCylinder = Math.PI * (p.diameter / 2) ** 2 * p.height;
    const boreVolume = Math.PI * (p.bore / 2) ** 2 * p.height;
    expect(r.bead!.volume).toBeLessThan(solidCylinder - boreVolume);
    expect(r.bead!.volume).toBeGreaterThan((solidCylinder - boreVolume) * 0.7);
  });

  it("every pattern builds without supports (under the hard overhang limit)", () => {
    for (const pattern of Object.keys(PATTERN_LABELS) as Pattern[]) {
      const r = generate(params({ pattern }));
      expect(errorsOf(r), pattern).toEqual([]);
      expect(r.derived.overhangDeg, pattern).toBeLessThan(72);
    }
  });

  it("refuses a bore that leaves too little wall", () => {
    const r = generate(params({ diameter: 8, bore: 6.5 }));
    expect(r.exportable).toBe(false);
    expect(errorsOf(r).join(" ")).toMatch(/wall/);
  });

  it("refuses a pattern that overhangs too much", () => {
    const r = generate(params({ pattern: "coil", pitch: 1.5, ridgeDepth: 3 }));
    expect(r.exportable).toBe(false);
    expect(errorsOf(r).join(" ")).toMatch(/overhang/);
  });

  it("spills onto more plates when the batch does not fit, all inside the bed", () => {
    const p = params({ count: 150, bedSize: 180, diameter: 16 });
    const r = generate(p);
    expect(beadCount(r)).toBe(150);
    expect(r.plates.length).toBeGreaterThan(1);
    for (const plate of r.plates) for (const b of plate.beads) {
      expect(b.x - p.diameter / 2).toBeGreaterThanOrEqual(0);
      expect(b.x + p.diameter / 2).toBeLessThanOrEqual(p.bedSize);
      expect(b.y + p.diameter / 2).toBeLessThanOrEqual(p.bedSize);
    }
    expect(r.issues.some((i) => /plates/.test(i.message))).toBe(true);
  });

  it("every preset builds", () => {
    for (const preset of PRESETS) {
      const r = generate(presetParams(preset.id));
      expect(errorsOf(r), preset.id).toEqual([]);
      expect(r.issues.filter((i) => i.severity === "warning"), preset.id).toEqual([]);
    }
  });

  it("3MF holds one mesh per bead and the settings; ZIP has every plate; settings round-trip", () => {
    const p = params({ count: 30, bedSize: 120 });
    const r = generate(p);
    const files = unzipSync(plate3MF(r, 1, p, "beads"));
    const model = strFromU8(files["3D/3dmodel.model"]);
    expect((model.match(/<mesh>/g) ?? []).length).toBe(r.plates[0].parts.length);
    expect(parseRecipe(strFromU8(files["Metadata/knot-bead.json"]))).toEqual(p);
    const zip = unzipSync(beadZip(r, p, "beads"));
    expect(Object.keys(zip).filter((f) => f.endsWith(".3mf")).length).toBe(r.plates.length);
    expect(parseRecipe(JSON.stringify(toRecipe({ ...p, count: 999 }))).count).toBe(200);
    expect(parseRecipe({ pattern: "macrame" }).pattern).toBe("snake");
  });

  it("derive reports the thinnest wall", () => {
    const p = params({ diameter: 12, bore: 5.5, ridgeDepth: 1 });
    expect(derive(p).minWall).toBeCloseTo(6 - 1 - 2.75);
  });
});
