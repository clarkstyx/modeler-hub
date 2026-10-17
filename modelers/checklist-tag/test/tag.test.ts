import { beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type TagParams } from "../src/core/params";
import { layoutTag } from "../src/core/layout";
import { PRESETS, presetParams } from "../src/core/presets";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import { generate, plate3MF, tagZip } from "../src/pipeline/generate";

beforeAll(() => initKernel().then(() => undefined));

const params = (patch: Partial<TagParams> = {}): TagParams => ({ ...DEFAULT_PARAMS, ...patch });
const errorsOf = (r: ReturnType<typeof generate>) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);
const partNames = (r: ReturnType<typeof generate>) => r.tag.map((p) => p.name);

describe("checklist tag", () => {
  it("builds the default: card, text, boxes and tick, each watertight", () => {
    const r = generate(params());
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(partNames(r)).toEqual(["TAG", "TEXT", "BOXES", "CHECK"]);
    expect(r.meshReports.every((m) => m.ok)).toBe(true);
    expect(r.layout.question?.text.replace(/\n/g, " ")).toBe("IS KINSLEY ON THE NICE LIST?");
  });

  it("is the size asked for, flat on the bed, with details on top", () => {
    const p = params();
    const r = generate(p);
    const card = r.meshReports.find((m) => m.name.endsWith(" TAG"))!.bbox;
    expect(card.max[0] - card.min[0]).toBeCloseTo(p.width, 3);
    expect(card.max[1] - card.min[1]).toBeCloseTo(p.height, 3);
    expect(card.min[2]).toBeCloseTo(0, 5);
    expect(card.max[2]).toBeCloseTo(p.thickness, 5);
    for (const m of r.meshReports.filter((m) => !m.name.endsWith(" TAG"))) {
      expect(m.bbox.min[2]).toBeCloseTo(p.thickness, 5);
      expect(m.bbox.max[2]).toBeCloseTo(p.thickness + p.relief, 5);
    }
  });

  it("nothing overlaps: the tick is cut out of the box it sits in", () => {
    const r = generate(params());
    const check = r.tag.find((p) => p.name === "CHECK")!;
    const box = r.tag.find((p) => p.name === "BOXES")!;
    const plain = generate(params({ checked: 0 }));
    const plainBox = plain.tag.find((p) => p.name === "BOXES")!;
    // The tick is cut out of the box it sits in, so the box loses about what the tick covers inside it.
    expect(plainBox.volume - box.volume).toBeGreaterThan(0);
    expect(plainBox.volume - box.volume).toBeLessThanOrEqual(check.volume + 1e-6);
    expect(plain.tag.some((p) => p.name === "CHECK")).toBe(false);
  });

  it("puts the name in the question and shrinks long questions to fit", () => {
    const short = layoutTag(params({ name: "AL" }), "AL");
    const long = layoutTag(params(), "MAXIMILIANA-JOSEPHINE");
    expect(short.textFits && long.textFits).toBe(true);
    expect(long.textCap).toBeLessThan(short.textCap);
    expect(long.question!.block.width).toBeLessThanOrEqual(DEFAULT_PARAMS.width - 2 * DEFAULT_PARAMS.margin + 1e-6);
  });

  it("refuses a question that cannot fit, and a hole torn out of the edge", () => {
    const r = generate(params({ question: "IS {name} ON THE NICE LIST? ".repeat(8) }));
    expect(r.exportable).toBe(false);
    expect(errorsOf(r).join(" ")).toMatch(/does not fit/);
    expect(errorsOf(generate(params({ holeInset: 3, holeDiameter: 6 }))).join(" ")).toMatch(/hole/);
  });

  it("makes one tag per name, each with its own question, spilling onto more plates", () => {
    const names = Array.from({ length: 14 }, (_, i) => `KID ${i + 1}`).join("\n");
    const r = generate(params({ names, bedSize: 180 }));
    expect(errorsOf(r)).toEqual([]);
    const tags = r.plates.flatMap((p) => p.tags);
    expect(tags.length).toBe(14);
    expect(r.plates.length).toBeGreaterThan(1);
    expect(new Set(tags.map((t) => t.object)).size).toBe(14);
    for (const plate of r.plates) for (const t of plate.tags) {
      expect(t.x).toBeGreaterThanOrEqual(0);
      expect(t.x + DEFAULT_PARAMS.width).toBeLessThanOrEqual(180);
      expect(t.y + DEFAULT_PARAMS.height).toBeLessThanOrEqual(180);
    }
  });

  it("every preset builds without warnings, and every mark and layout works", () => {
    for (const preset of PRESETS) {
      const r = generate(presetParams(preset.id));
      expect(errorsOf(r), preset.id).toEqual([]);
      expect(r.issues.filter((i) => i.severity === "warning"), preset.id).toEqual([]);
    }
    for (const checkStyle of ["check", "x", "heart"] as const)
      for (const boxStyle of ["filled", "outline"] as const)
        for (const optionsLayout of ["rows", "inline"] as const) {
          const r = generate(params({ checkStyle, boxStyle, optionsLayout, options: "YES, NO, MAYBE", checked: 3 }));
          expect(errorsOf(r), `${checkStyle} ${boxStyle} ${optionsLayout}`).toEqual([]);
          expect(r.meshReports.every((m) => m.ok)).toBe(true);
        }
  });

  it("3MF holds every part and the settings; ZIP has every plate; settings round-trip", () => {
    const p = params({ names: "KINSLEY\nKOHEN" });
    const r = generate(p);
    const files = unzipSync(plate3MF(r, 1, p, "tags"));
    const model = strFromU8(files["3D/3dmodel.model"]);
    expect((model.match(/<mesh>/g) ?? []).length).toBe(r.plates[0].parts.length);
    expect(parseRecipe(strFromU8(files["Metadata/checklist-tag.json"]))).toEqual(p);
    const zip = unzipSync(tagZip(r, p, "tags"));
    expect(Object.keys(zip).filter((f) => f.endsWith(".3mf")).length).toBe(r.plates.length);
    expect(parseRecipe(JSON.stringify(toRecipe({ ...p, width: 999 }))).width).toBe(200);
    expect(parseRecipe({ checkStyle: "star", font: "comic" })).toMatchObject({ checkStyle: "check", font: "sans" });
  });
});
