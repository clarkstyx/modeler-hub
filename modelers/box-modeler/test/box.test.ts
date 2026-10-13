import { beforeAll, describe, expect, it } from "vitest";
import { build, errorsOf, params, ready, starArt } from "./helpers";
import { derive } from "../src/core/params";
import { PRESETS, presetParams } from "../src/core/presets";
import { generate } from "../src/pipeline/generate";

beforeAll(ready);

describe("default box", () => {
  it("builds a watertight box and lid with no errors", () => {
    const r = build();
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.parts.map((p) => p.name)).toEqual(["BOX", "LID"]);
    for (const m of r.meshReports) {
      expect(m.watertight).toBe(true);
      expect(m.consistentWinding).toBe(true);
      expect(m.degenerateTriangles).toBe(0);
      expect(m.volume).toBeGreaterThan(0);
    }
  });

  it("has the derived outer size and the lid fits the rail with clearance", () => {
    const p = params();
    const d = derive(p);
    expect(d.outerL).toBeCloseTo(104);
    expect(d.outerW).toBeCloseTo(69);
    expect(d.outerH).toBeCloseTo(1.6 + 25 + 2 + 0.25 + 1.2);
    // lid narrower than the rail by the clearance, shorter than the rail run by the clearance
    const railW = d.innerW + 2 * d.railDepth;
    expect(railW - d.lidW).toBeCloseTo(p.clearance);
    const railRun = d.outerL - p.wall + d.railDepth;
    expect(railRun - d.lidL).toBeCloseTo(p.clearance);
    const r = build();
    const box = r.meshReports.find((m) => m.name === "BOX")!;
    expect(box.bbox.max[0]).toBeCloseTo(d.outerL, 3);
    expect(box.bbox.max[2]).toBeCloseTo(d.outerH, 3);
    const lid = r.meshReports.find((m) => m.name === "LID")!;
    expect(lid.bbox.max[2]).toBeCloseTo(p.lidThickness, 3);
    expect(lid.bbox.max[1] - lid.bbox.min[1]).toBeCloseTo(d.lidW, 3);
  });

  it("box volume matches a hand calculation within the rail/opening removal", () => {
    const r = build({ cornerRadius: 0, lidGrip: "none" });
    const p = params({ cornerRadius: 0 });
    const d = derive(p);
    const shell = d.outerL * d.outerW * d.outerH - d.innerL * d.innerW * (d.outerH - p.base);
    const box = r.parts.find((x) => x.name === "BOX")!;
    expect(box.volume).toBeLessThan(shell);
    expect(box.volume).toBeGreaterThan(shell * 0.8);
  });
});

describe("decoration", () => {
  it("raised text is a separate part sitting exactly on the lid", () => {
    const r = build({ text: "HELLO", relief: "raised", textColor: "#C2457F" });
    expect(errorsOf(r)).toEqual([]);
    const text = r.meshReports.find((m) => m.name === "LID_TEXT")!;
    expect(text).toBeDefined();
    expect(text.bbox.min[2]).toBeCloseTo(2, 5);
    expect(text.bbox.max[2]).toBeCloseTo(2.8, 5);
    expect(r.textSizeUsed).toBeCloseTo(10);
  });

  it("engraved text removes volume from the lid and adds no part", () => {
    const plain = build({ text: "" });
    const eng = build({ text: "HELLO", relief: "engraved" });
    expect(eng.parts.map((p) => p.name)).toEqual(["BOX", "LID"]);
    expect(eng.parts[1].volume).toBeLessThan(plain.parts[1].volume);
  });

  it("inlay text fills its pocket flush with the lid top", () => {
    const r = build({ text: "LUNA", relief: "inlay", reliefDepth: 0.6, textColor: "#000000" });
    const text = r.meshReports.find((m) => m.name === "LID_TEXT")!;
    expect(text.bbox.max[2]).toBeCloseTo(2, 5);
    expect(text.bbox.min[2]).toBeCloseTo(1.4, 5);
    expect(errorsOf(r)).toEqual([]);
  });

  it("long text shrinks to fit and reports it", () => {
    const r = build({ text: "A VERY LONG NAME FOR A SMALL LID", textSize: 20 });
    expect(r.textSizeUsed).toBeLessThan(20);
    expect(r.issues.some((i) => /shrunk/.test(i.message))).toBe(true);
    expect(errorsOf(r)).toEqual([]);
  });

  it("unusual characters do not break the build", () => {
    const r = build({ text: "Zoë & Łukasz — 日本 ♥ 2026!" });
    expect(errorsOf(r)).toEqual([]);
    expect(r.issues.some((i) => /no outline/.test(i.message))).toBe(true);
  });

  it("multi-colour artwork becomes one part per colour with no overlaps", () => {
    const r = build({ text: "STAR", relief: "raised" }, starArt());
    expect(errorsOf(r)).toEqual([]);
    const names = r.parts.map((p) => p.name);
    expect(names).toContain("LID_TEXT");
    expect(names.filter((n) => n.startsWith("LID_ART")).length).toBe(2);
    expect(r.artWidthUsed).toBeGreaterThan(10);
  });

  it("strict four-colour warning when artwork brings too many colours", () => {
    const art = starArt();
    art.layers.push({ hex: "#FF0000", rings: [[[10, 10], [20, 10], [20, 20], [10, 20]]] }, { hex: "#00FF00", rings: [[[80, 80], [90, 80], [90, 90], [80, 90]]] });
    const r = build({ text: "HI", textColor: "#123456", bodyColor: "#654321" }, art);
    expect(r.issues.some((i) => /colours/.test(i.message))).toBe(true);
  });
});

describe("dividers and presets", () => {
  it("dividers merge into one body", () => {
    const r = build({ dividerCols: 3, dividerRows: 2 });
    expect(errorsOf(r)).toEqual([]);
    const plain = build();
    expect(r.parts[0].volume).toBeGreaterThan(plain.parts[0].volume);
    expect(r.meshReports[0].watertight).toBe(true);
  });

  it("every preset builds without errors", () => {
    for (const preset of PRESETS) {
      const r = generate(presetParams(preset.id), null);
      expect(errorsOf(r), preset.id).toEqual([]);
      expect(r.exportable, preset.id).toBe(true);
    }
  });

  it("outer sizing derives inner dimensions", () => {
    const d = derive(params({ sizeMode: "outer", length: 100, width: 60, height: 30 }));
    expect(d.outerL).toBeCloseTo(100);
    expect(d.outerW).toBeCloseTo(60);
    expect(d.outerH).toBeCloseTo(30);
  });
});

describe("limits", () => {
  it("minimum size builds", () => {
    const r = build({ length: 20, width: 15, height: 6, cornerRadius: 0, text: "" });
    expect(errorsOf(r)).toEqual([]);
  });
  it("maximum size on a 256 bed is reported", () => {
    const r = build({ length: 250, width: 250, height: 150, bedSize: 220 });
    expect(errorsOf(r).some((m) => /bed/.test(m))).toBe(true);
    expect(r.exportable).toBe(false);
  });
  it("too-deep engraving is an error", () => {
    const r = build({ text: "X", relief: "engraved", reliefDepth: 1.8, lidThickness: 2 });
    expect(r.exportable).toBe(false);
  });
  it("too many compartments is an error", () => {
    const r = build({ dividerCols: 12, dividerRows: 12, length: 40, width: 30 });
    expect(r.exportable).toBe(false);
  });
});

describe("calibration set", () => {
  it("builds one box section and three labelled lids", () => {
    const r = generate(params(), null, "calibration");
    expect(errorsOf(r)).toEqual([]);
    expect(r.parts.map((p) => p.name)).toEqual(["BOX_SECTION", "LID_0.15", "LID_0.25", "LID_0.35"]);
    expect(r.meshReports.every((m) => m.ok)).toBe(true);
  });
});
