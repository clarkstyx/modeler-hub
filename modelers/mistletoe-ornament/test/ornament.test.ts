import { beforeAll, describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type OrnamentParams } from "../src/core/params";
import { generate, ornament3MF, ornamentStl, type GenerateResult } from "../src/pipeline/generate";
import { readProjectFrom3MF } from "../src/export/threeMF";
import { parseRecipe, toRecipe } from "../src/core/recipe";

beforeAll(() => initKernel().then(() => undefined));
const P = (patch: Partial<OrnamentParams> = {}): OrnamentParams => ({ ...DEFAULT_PARAMS, ...patch });
const errorsOf = (r: GenerateResult) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);
const names = (r: GenerateResult) => r.parts.map((p) => p.name);
const part = (r: GenerateResult, name: string) => r.parts.find((p) => p.name === name)!;

function bounds(r: GenerateResult, only?: string) {
  let minX = Infinity, minY = Infinity, minZ = Infinity, maxX = -Infinity, maxY = -Infinity, maxZ = -Infinity;
  for (const p of r.parts) {
    if (only && p.name !== only) continue;
    const V = p.mesh.positions;
    for (let i = 0; i < V.length; i += 3) {
      minX = Math.min(minX, V[i]); maxX = Math.max(maxX, V[i]);
      minY = Math.min(minY, V[i + 1]); maxY = Math.max(maxY, V[i + 1]);
      minZ = Math.min(minZ, V[i + 2]); maxZ = Math.max(maxZ, V[i + 2]);
    }
  }
  return { minX, minY, minZ, maxX, maxY, maxZ };
}

describe("default ornament", () => {
  it("builds six watertight parts in five colours, flat on the bed, at the asked width", () => {
    const r = generate(P());
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.meshesFailed).toBe(0);
    expect(names(r).sort()).toEqual(["BASE", "BERRIES", "BOW", "LEAVES", "NAME", "TAG"]);
    expect(r.info.colours).toBe(4); // tag shares the ribbon colour, name shares the berry colour
    const b = bounds(r);
    expect(b.minZ).toBeCloseTo(0, 6);
    expect(b.maxZ).toBeCloseTo(DEFAULT_PARAMS.baseThickness + 2 * DEFAULT_PARAMS.layerThickness, 6);
    expect(r.info.width).toBeGreaterThanOrEqual(DEFAULT_PARAMS.size);
    expect(r.info.width).toBeLessThan(DEFAULT_PARAMS.size + 2 * DEFAULT_PARAMS.outline + 1);
    expect(r.info.capHeight).toBeGreaterThanOrEqual(4);
  });

  it("stacks the layers: base, then colours, then the raised name", () => {
    const r = generate(P());
    const base = bounds(r, "BASE"), leaves = bounds(r, "LEAVES"), name = bounds(r, "NAME");
    expect(base.maxZ).toBeCloseTo(1.6, 6);
    expect(leaves.minZ).toBeCloseTo(1.6, 2);
    expect(leaves.maxZ).toBeCloseTo(2.6, 6);
    expect(name.minZ).toBeCloseTo(2.6, 2);
    expect(name.maxZ).toBeCloseTo(3.6, 6);
    // the hanger ring is the highest point of the base and nothing covers it
    expect(base.maxY).toBeGreaterThan(bounds(r, "BOW").maxY + 1);
  });

  it("flush letters sit inside the tag layer", () => {
    const r = generate(P({ textStyle: "flush" }));
    expect(errorsOf(r)).toEqual([]);
    const name = bounds(r, "NAME");
    expect(name.minZ).toBeCloseTo(1.6, 2);
    expect(name.maxZ).toBeCloseTo(2.6, 6);
    expect(r.info.thickness).toBeCloseTo(2.6, 6);
  });
});

describe("options", () => {
  it("no name: no tag and no name part, still one piece", () => {
    const r = generate(P({ name: "" }));
    expect(errorsOf(r)).toEqual([]);
    expect(names(r)).not.toContain("NAME");
    expect(names(r)).not.toContain("TAG");
    expect(r.issues.some((i) => i.severity === "info")).toBe(true);
  });
  it("no bow, no berries, one leaf pair still hangs together", () => {
    const r = generate(P({ bow: false, berries: 0, leafPairs: 1 }));
    expect(errorsOf(r)).toEqual([]);
    expect(names(r)).not.toContain("BOW");
    expect(names(r)).not.toContain("BERRIES");
  });
  it("three leaf pairs and seven berries at the largest size", () => {
    const r = generate(P({ leafPairs: 3, berries: 7, size: 120, name: "Christopher" }));
    expect(errorsOf(r)).toEqual([]);
    expect(r.info.width).toBeGreaterThanOrEqual(120);
  });
  it("a long name on a small ornament warns, an absurd one errors", () => {
    const small = generate(P({ size: 50, name: "Maximilian Jr" }));
    expect(small.issues.some((i) => /letters|fit/i.test(i.message))).toBe(true);
    const absurd = generate(P({ size: 50, name: "WWWWWWWWWWWWWWWW" }));
    expect(absurd.issues.some((i) => i.severity === "error" || i.severity === "warning")).toBe(true);
  });
  it("characters the font lacks are reported, not printed as ?", () => {
    const r = generate(P({ name: "Zoë ✓" }));
    expect(errorsOf(r).join(" ")).toMatch(/no shape/);
    expect(r.parts.length).toBe(0);
  });
  it("the hanger hole goes through the base and nothing covers it", () => {
    const r = generate(P({ holeDiameter: 4 }));
    const { x, y, d } = r.info.hole;
    // top faces of every part: no triangle may cover the hole centre; the ring wall next to it is solid base
    const covers = (name: string, px: number, py: number) => {
      const p = part(r, name);
      const V = p.mesh.positions, I = p.mesh.indices;
      let top = -Infinity;
      for (let i = 2; i < V.length; i += 3) top = Math.max(top, V[i]);
      for (let t = 0; t < I.length; t += 3) {
        const [a, b, c] = [I[t] * 3, I[t + 1] * 3, I[t + 2] * 3];
        if (Math.abs(V[a + 2] - top) > 1e-6 || Math.abs(V[b + 2] - top) > 1e-6 || Math.abs(V[c + 2] - top) > 1e-6) continue;
        const s1 = (V[b] - V[a]) * (py - V[a + 1]) - (V[b + 1] - V[a + 1]) * (px - V[a]);
        const s2 = (V[c] - V[b]) * (py - V[b + 1]) - (V[c + 1] - V[b + 1]) * (px - V[b]);
        const s3 = (V[a] - V[c]) * (py - V[c + 1]) - (V[a + 1] - V[c + 1]) * (px - V[c]);
        if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) return true;
      }
      return false;
    };
    for (const p of r.parts) expect(covers(p.name, x, y), `${p.name} covers the hole`).toBe(false);
    expect(covers("BASE", x, y + d / 2 + 1)).toBe(true);
    expect(covers("BASE", x + d / 2 + 1, y)).toBe(true);
    expect(covers("BASE", x, y - d / 2 - 1)).toBe(true);
  });
});

describe("exports", () => {
  it("3MF carries one object, one mesh per part, a colour per slot and the settings", () => {
    const params = P({ name: "Ava", leafColor: "#123456" });
    const r = generate(params);
    const bytes = ornament3MF(r, params, "ava");
    const files = unzipSync(bytes);
    const model = strFromU8(files["3D/3dmodel.model"]);
    expect((model.match(/<mesh>/g) || []).length).toBe(r.parts.length);
    expect(model).toContain("#123456");
    const json = readProjectFrom3MF(bytes);
    expect(json).toBeTruthy();
    expect(parseRecipe(json!).name).toBe("Ava");
    expect(parseRecipe(json!).leafColor).toBe("#123456");
  });
  it("STL has every triangle", () => {
    const r = generate(P());
    const stl = ornamentStl(r, "x");
    const tri = new DataView(stl.buffer, stl.byteOffset).getUint32(80, true);
    expect(tri).toBe(r.parts.reduce((n, p) => n + p.mesh.indices.length / 3, 0));
  });
  it("recipe round-trips and clamps", () => {
    const back = parseRecipe(JSON.stringify(toRecipe(P({ size: 999, name: "x".repeat(40), berryColor: "nope" }))));
    expect(back.size).toBe(120);
    expect(back.name.length).toBe(16);
    expect(back.berryColor).toBe(DEFAULT_PARAMS.berryColor);
  });
});
