import { beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, derive, type SkirtParams } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import { export3MF, generate } from "../src/pipeline/generate";

beforeAll(() => initKernel().then(() => undefined));

const params = (patch: Partial<SkirtParams> = {}): SkirtParams => ({ ...DEFAULT_PARAMS, ...patch });
const errorsOf = (r: ReturnType<typeof generate>) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);
const bbox = (r: ReturnType<typeof generate>) => {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  for (const m of r.meshReports) for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], m.bbox.min[k]); max[k] = Math.max(max[k], m.bbox.max[k]); }
  return { min, max };
};

describe("ribbon skirt ornament", () => {
  it("builds the default: skirt plus one part per ribbon, all watertight", () => {
    const r = generate(params());
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.parts.map((p) => p.name)).toEqual(["SKIRT", "RIBBON_1_FF5A36", "RIBBON_2_A23CFF", "RIBBON_3_1E78FF"]);
    for (const m of r.meshReports) expect(m.ok, m.name).toBe(true);
  });

  it("is as wide as the hem diameter and as tall as body plus loop, centred on the bed", () => {
    const p = params();
    const r = generate(p);
    const b = bbox(r);
    expect(b.max[0] - b.min[0]).toBeCloseTo(p.bottomDiameter, 1);
    expect(b.max[1] - b.min[1]).toBeLessThanOrEqual(p.bottomDiameter + 0.01);
    expect(b.min[2]).toBeCloseTo(0, 5);
    expect(b.max[2]).toBeCloseTo(derive(p).totalHeight, 2);
    expect((b.min[0] + b.max[0]) / 2).toBeCloseTo(p.bedSize / 2, 1);
  });

  it("is hollow: far less plastic than a solid cone of the same size", () => {
    const p = params({ ribbons: "" });
    const r = generate(p);
    const solidCone = (Math.PI * p.height * (p.bottomDiameter ** 2 / 4 + (p.bottomDiameter * p.topDiameter) / 4 + p.topDiameter ** 2 / 4)) / 3;
    expect(r.parts[0].volume).toBeLessThan(solidCone * 0.2);
  });

  it("ribbons are exact horizontal slices that add up to the whole ornament", () => {
    const plain = generate(params({ ribbons: "" }));
    const banded = generate(params());
    const total = banded.parts.reduce((v, p) => v + p.volume, 0);
    expect(total).toBeCloseTo(plain.parts[0].volume, 0);
    const d = derive(params());
    banded.meshReports.slice(1).forEach((m, i) => {
      expect(m.bbox.min[2]).toBeCloseTo(d.ribbons[i].z0, 3);
      expect(m.bbox.max[2]).toBeCloseTo(d.ribbons[i].z1, 3);
    });
  });

  it("ribbons of the same colour share one part; a ribbon in the skirt colour joins the skirt", () => {
    const r = generate(params({ ribbons: "#FF0000,#151515,#FF0000" }));
    expect(errorsOf(r)).toEqual([]);
    expect(r.parts.map((p) => p.name)).toEqual(["SKIRT", "RIBBON_1_FF0000"]);
  });

  it("no ribbons prints in one colour", () => {
    const r = generate(params({ ribbons: "" }));
    expect(r.parts.map((p) => p.name)).toEqual(["SKIRT"]);
    expect(r.issues.some((i) => /one colour/.test(i.message))).toBe(true);
  });

  it("refuses pleats so tight the inside of the wall would fold over", () => {
    const r = generate(params({ pleats: 36, pleatDepth: 12, wall: 3 }));
    expect(r.exportable).toBe(false);
    expect(errorsOf(r).join(" ")).toMatch(/fold over/);
  });

  it("refuses a skirt leaning over 45° (would need supports)", () => {
    const r = generate(params({ height: 40, bottomDiameter: 200, topDiameter: 20, flare: 2.5 }));
    expect(r.exportable).toBe(false);
    expect(errorsOf(r).join(" ")).toMatch(/45°/);
  });

  it("raises a short waistband so its solid top sits on a 45° cone, and says so", () => {
    const p = params({ waistHeight: 4 });
    const d = derive(p);
    expect(d.waistHeight).toBeCloseTo(p.topDiameter / 2 - p.wall + 2);
    expect(generate(p).issues.some((i) => /Waistband raised/.test(i.message))).toBe(true);
  });

  it("every preset builds", () => {
    for (const preset of PRESETS) {
      const r = generate(presetParams(preset.id));
      expect(errorsOf(r), preset.id).toEqual([]);
      expect(r.exportable, preset.id).toBe(true);
    }
  });

  it("3MF holds one mesh per colour and the settings; settings round-trip", () => {
    const p = params();
    const r = generate(p);
    const files = unzipSync(export3MF(r, p, "skirt"));
    const model = strFromU8(files["3D/3dmodel.model"]);
    expect((model.match(/<mesh>/g) ?? []).length).toBe(r.parts.length);
    const back = parseRecipe(strFromU8(files["Metadata/ribbon-skirt.json"]));
    expect(back).toEqual(p);
    expect(parseRecipe(JSON.stringify(toRecipe({ ...p, pleats: 999 }))).pleats).toBe(36);
  });
});
