import { beforeAll, describe, expect, it } from "vitest";
import { unzipSync, strFromU8 } from "fflate";
import { build, params, ready, starArt } from "./helpers";
import { export3MF, exportStl, exportStlZip } from "../src/pipeline/generate";
import { readProjectFrom3MF } from "../src/export/threeMF";
import { parseRecipe, toRecipe } from "../src/core/recipe";

beforeAll(ready);

describe("3MF", () => {
  it("has one colour group per colour, one mesh per part, one build item per printed object, Bambu config and the project", () => {
    const p = params({ text: "STAR", relief: "raised", textColor: "#C2457F" });
    const r = build(p, starArt());
    const bytes = export3MF(r, p, "test");
    const files = unzipSync(bytes);
    const names = Object.keys(files);
    expect(names).toContain("[Content_Types].xml");
    expect(names).toContain("_rels/.rels");
    expect(names).toContain("3D/3dmodel.model");
    expect(names).toContain("Metadata/model_settings.config");
    expect(names).toContain("Metadata/box-modeler.json");
    const model = strFromU8(files["3D/3dmodel.model"]);
    const colours = new Set(r.parts.map((x) => x.hex));
    expect((model.match(/<m:colorgroup /g) ?? []).length).toBe(colours.size);
    expect((model.match(/<mesh>/g) ?? []).length).toBe(r.parts.length);
    expect((model.match(/<item /g) ?? []).length).toBe(2); // box + lid
    expect(model).toContain('unit="millimeter"');
    expect(model).toContain('name="LID_TEXT"');
    const config = strFromU8(files["Metadata/model_settings.config"]);
    expect((config.match(/<part /g) ?? []).length).toBe(r.parts.length);
    expect(config).toMatch(/key="extruder" value="[1-4]"/);
    const project = readProjectFrom3MF(bytes)!;
    expect(parseRecipe(project).text).toBe("STAR");
  });

  it("escapes XML in names/titles", () => {
    const p = params({ text: "A&B <C>" });
    const r = build(p);
    const model = strFromU8(unzipSync(export3MF(r, p, 'Tom & "Jerry" <3'))["3D/3dmodel.model"]);
    expect(model).toContain("Tom &amp; &quot;Jerry&quot; &lt;3");
  });
});

describe("STL", () => {
  it("binary STL triangle count matches the parts", () => {
    const r = build({ text: "HI" });
    const stl = exportStl(r, "t");
    const dv = new DataView(stl.buffer);
    const expected = r.parts.reduce((n, p) => n + p.mesh.indices.length / 3, 0);
    expect(dv.getUint32(80, true)).toBe(expected);
    expect(stl.byteLength).toBe(84 + expected * 50);
  });
  it("STL zip has one file per part plus a README", () => {
    const r = build({ text: "HI" });
    const files = unzipSync(exportStlZip(r, "t"));
    expect(Object.keys(files).length).toBe(r.parts.length + 1);
  });
});

describe("recipe", () => {
  it("round-trips and tolerates junk", () => {
    const p = params({ text: "ROUND", length: 123.5, relief: "inlay" });
    const back = parseRecipe(JSON.stringify(toRecipe(p)));
    expect(back).toEqual(p);
    const junk = parseRecipe({ params: { length: 9999, width: "abc", text: 5, unknown: 1 } });
    expect(junk.length).toBe(250);
    expect(junk.width).toBe(params().width);
    expect(junk.text).toBe("");
    expect(() => parseRecipe("42")).toThrow();
  });
});
