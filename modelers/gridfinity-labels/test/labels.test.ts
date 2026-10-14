import { beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { build, errorsOf, logoArt, params, ready } from "./helpers";
import { GRID_PITCH, labelWidth } from "../src/core/params";
import { parseCsv, parseList, guessMapping, csvHeaders, splitCsvRow } from "../src/core/batch";
import { parseRecipe, toRecipe } from "../src/core/recipe";
import { batchZip, generate, manifestCsv, plate3MF, plateStl } from "../src/pipeline/generate";
import { readProjectFrom3MF } from "../src/export/threeMF";

beforeAll(ready);

describe("batch list parsing", () => {
  it("reads text | icon | units, skips blanks and comments, warns on bad fields", () => {
    const r = parseList("M3 x 8 | screw | 2\n\n# comment\nWASHERS|washer\nODD | rocket | 9\nTWO\\nLINES", "none");
    expect(r.specs.map((s) => [s.text, s.icon, s.units])).toEqual([
      ["M3 x 8", "screw", 2],
      ["WASHERS", "washer", null],
      ["ODD", "none", null],
      ["TWO\nLINES", "none", null],
    ]);
    expect(r.warnings.length).toBe(2);
  });

  it("CSV: quoted cells, guessed columns, quantity and order ids", () => {
    expect(splitCsvRow('a,"b, c","say ""hi"""')).toEqual(["a", "b, c", 'say "hi"']);
    const csv = 'Order ID,Label,Qty,Icon,Width\n1001,"M3, 8 mm",2,screw,1\n1002,NUTS,1,nut,2\n';
    const m = guessMapping(csvHeaders(csv));
    expect(m).toEqual({ text: "Label", icon: "Icon", units: "Width", order: "Order ID", quantity: "Qty" });
    const r = parseCsv(csv, m, "none");
    expect(r.specs.map((s) => [s.text, s.icon, s.units, s.order])).toEqual([
      ["M3, 8 mm", "screw", 1, "1001"],
      ["M3, 8 mm", "screw", 1, "1001"],
      ["NUTS", "nut", 2, "1002"],
    ]);
  });
});

describe("one label", () => {
  it("default label: watertight plate + raised text as separate parts, sized from the 42 mm grid", () => {
    const r = build("M3 x 8");
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    const parts = r.plates[0].parts;
    expect(parts.map((p) => p.name)).toEqual(["PLATE", "TEXT"]);
    const l = r.plates[0].labels[0];
    expect(l.width).toBeCloseTo(GRID_PITCH - 6);
    expect(l.height).toBe(12);
    expect(r.meshesFailed).toBe(0);
  });

  it("every built-in icon builds clean and makes an ICON part", () => {
    for (const icon of ["screw", "bolt", "nut", "washer", "insert"]) {
      const r = build(`M4 | ${icon} | 2`);
      expect(errorsOf(r), icon).toEqual([]);
      expect(r.plates[0].parts.map((p) => p.name), icon).toContain("ICON");
    }
  });

  it("uploaded SVG icon, and a warning when none is loaded", () => {
    expect(build("LOGO | svg | 2", {}, logoArt()).plates[0].parts.map((p) => p.name)).toContain("ICON");
    expect(build("LOGO | svg | 2").issues.some((i) => /no SVG is loaded/.test(i.message))).toBe(true);
  });

  it("inlay and engraved relief", () => {
    const inlay = build("NUTS | nut", { relief: "inlay", reliefDepth: 0.6 });
    expect(errorsOf(inlay)).toEqual([]);
    expect(inlay.plates[0].parts.map((p) => p.name)).toEqual(["PLATE", "TEXT", "ICON"]);
    const eng = build("NUTS", { relief: "engraved" });
    expect(eng.plates[0].parts.map((p) => p.name)).toEqual(["PLATE"]);
  });

  it("long text shrinks and warns, unicode does not break", () => {
    const r = build("A VERY LONG LABEL TEXT FOR ONE UNIT");
    expect(errorsOf(r)).toEqual([]);
    expect(r.issues.some((i) => /only .* mm tall/.test(i.message))).toBe(true);
    const u = build("Zoë ♥ Łódź | washer | 2");
    expect(errorsOf(u)).toEqual([]);
    expect(u.issues.some((i) => /no letter shape/.test(i.message))).toBe(true);
  });

  it("limits: thin labels and too-deep engraving are errors", () => {
    expect(build("X", { thickness: 0.4 }).exportable).toBe(false);
    expect(build("X", { relief: "engraved", reliefDepth: 1.0, thickness: 1.2 }).exportable).toBe(false);
    expect(build("X", { height: 6, padding: 2 }).exportable).toBe(false);
  });
});

describe("batch plates", () => {
  const many = Array.from({ length: 60 }, (_, i) => `BIN ${i + 1} | ${["screw", "nut", "washer", "bolt", "insert"][i % 5]} | ${1 + (i % 3)}`).join("\n");

  it("lays labels on plates without overlap and spills to a second plate", () => {
    const r = build(many, { bedSize: 180 });
    expect(errorsOf(r)).toEqual([]);
    expect(r.labelCount).toBe(60);
    expect(r.plates.length).toBeGreaterThan(1);
    for (const plate of r.plates) {
      const ls = plate.labels;
      for (const l of ls) {
        expect(l.x).toBeGreaterThanOrEqual(5 - 1e-9);
        expect(l.y + l.height).toBeLessThanOrEqual(180 - 5 + 1e-9);
        expect(l.x + l.width).toBeLessThanOrEqual(180 - 5 + 1e-9);
      }
      for (let i = 0; i < ls.length; i++)
        for (let j = i + 1; j < ls.length; j++) {
          const a = ls[i], b = ls[j];
          const apart = a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y;
          expect(apart, `${a.object} vs ${b.object}`).toBe(true);
        }
    }
    // order kept across plates
    expect(r.plates.flatMap((p) => p.labels.map((l) => l.index))).toEqual(Array.from({ length: 60 }, (_, i) => i + 1));
  });

  it("3MF per plate: one object per label, colour groups, slot config, embedded settings", () => {
    const p = params();
    const list = "M3 x 8 | screw\nM3 NUT | nut\nWASHER | washer";
    const r = build(list);
    const bytes = plate3MF(r, 1, p, list, "drawer");
    const files = unzipSync(bytes);
    const model = strFromU8(files["3D/3dmodel.model"]);
    expect((model.match(/<item /g) ?? []).length).toBe(3);
    expect((model.match(/<m:colorgroup /g) ?? []).length).toBe(3);
    expect((model.match(/<mesh>/g) ?? []).length).toBe(r.plates[0].parts.length);
    expect(strFromU8(files["Metadata/model_settings.config"])).toMatch(/key="extruder" value="3"/);
    expect(parseRecipe(readProjectFrom3MF(bytes)!).list).toBe(list);
  });

  it("ZIP holds every plate, a manifest with order ids, and a README", () => {
    const p = params({ bedSize: 150 });
    const r = build(many, { bedSize: 150 });
    const zip = unzipSync(batchZip(r, p, many, "drawer"));
    const names = Object.keys(zip);
    expect(names.filter((n) => n.endsWith(".3mf")).length).toBe(r.plates.length);
    const manifest = strFromU8(zip["manifest.csv"]).trim().split("\n");
    expect(manifest.length).toBe(61);
    expect(manifest[0]).toBe("label,plate,object,text,icon,width_mm,height_mm,x_mm,y_mm,letter_mm,source_line,order");
    expect(names).toContain("README.txt");
  });

  it("manifest escapes commas and quotes", () => {
    const r = generate(params(), parseCsv('Label,Order\n"M3, ""long""",A-1\n', { text: "Label", icon: "", units: "", order: "Order", quantity: "" }, "none").specs, null);
    expect(manifestCsv(r).split("\n")[1]).toContain('"M3, ""long"""');
  });

  it("STL of a plate has all its triangles", () => {
    const r = build("A\nB");
    const stl = plateStl(r, 1, "t");
    const n = new DataView(stl.buffer).getUint32(80, true);
    expect(n).toBe(r.plates[0].parts.reduce((s, p) => s + p.mesh.indices.length / 3, 0));
  });
});

describe("fit test and settings", () => {
  it("fit-test strip: three heights, each engraved with its size", () => {
    const r = generate(params({ height: 12 }), [], null, "fit-test");
    expect(errorsOf(r)).toEqual([]);
    expect(r.plates[0].labels.map((l) => l.height)).toEqual([11.6, 12, 12.4]);
    expect(r.plates[0].labels.map((l) => l.object)).toEqual(["FIT_11_6MM", "FIT_12_0MM", "FIT_12_4MM"]);
  });

  it("settings round-trip and tolerate junk", () => {
    const p = params({ height: 13, relief: "inlay" });
    expect(parseRecipe(JSON.stringify(toRecipe(p, "A\nB")))).toEqual({ params: p, list: "A\nB" });
    const junk = parseRecipe({ params: { height: 999, units: "x" } });
    expect(junk.params.height).toBe(40);
    expect(junk.params.units).toBe(1);
  });

  it("mm width mode ignores the grid", () => {
    expect(labelWidth(params({ widthMode: "mm", widthMm: 50 }), null)).toBe(50);
  });
});
