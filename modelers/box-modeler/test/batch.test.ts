import { beforeAll, describe, expect, it } from "vitest";
import { strFromU8, unzipSync } from "fflate";
import { csvHeaders, guessMapping, parseNames, parseOrdersCsv, MAX_BATCH } from "../src/core/batch";
import { batchManifest, batchPlate3MF, batchZip, generateBatch, type BatchResult } from "../src/pipeline/generate";
import { readProjectFrom3MF } from "../src/export/threeMF";
import { derive } from "../src/core/params";
import { shelfPack } from "../src/shared/batch";
import { params, ready, starArt } from "./helpers";

beforeAll(ready);
const errorsOf = (r: BatchResult) => r.issues.filter((i) => i.severity === "error").map((i) => i.message);

describe("batch input", () => {
  it("reads names, quantities, two-line text and comments", () => {
    const r = parseNames("# Christmas orders\nAva\n\nNoah | 2\nHappy\\nBirthday\nMia | lots\n | 3");
    expect(r.items.map((i) => i.text)).toEqual(["Ava", "Noah", "Noah", "Happy\nBirthday", "Mia"]);
    expect(r.items.map((i) => i.line)).toEqual([2, 4, 4, 5, 6]);
    expect(r.warnings).toEqual(['Line 6: quantity "lots" is not a whole number; made 1.', "Line 7: no text, skipped."]);
  });

  it("CSV: guesses columns, keeps order ids, repeats quantities, honours quotes", () => {
    const csv = 'Order ID,Personalization,Qty\n1001,"Smith, J",2\n1002,Zoë,1\n1003,,1\n';
    const map = guessMapping(csvHeaders(csv));
    expect(map).toEqual({ text: "Personalization", order: "Order ID", quantity: "Qty" });
    const r = parseOrdersCsv(csv, map);
    expect(r.items.map((i) => [i.text, i.order])).toEqual([["Smith, J", "1001"], ["Smith, J", "1001"], ["Zoë", "1002"]]);
    expect(r.warnings).toEqual(["Row 4: no text, skipped."]);
  });

  it(`stops at ${MAX_BATCH} lids`, () => {
    const r = parseNames("A | 50\nB | 50\nC | 50\nD | 50\nE | 50");
    expect(r.items.length).toBe(MAX_BATCH);
    expect(r.warnings.at(-1)).toMatch(/Stopped at 200/);
  });
});

describe("plate packing", () => {
  it("keeps order, stays inside the bed, never overlaps, spills to new plates", () => {
    const sizes = Array.from({ length: 30 }, (_, i) => ({ w: 40 + (i % 3) * 10, h: 30 }));
    const at = shelfPack(sizes, 180, 5, 5);
    expect(at.every(Boolean)).toBe(true);
    expect(new Set(at.map((a) => a!.plate)).size).toBeGreaterThan(1);
    for (let i = 0; i < at.length; i++) {
      const a = at[i]!;
      expect(a.x).toBeGreaterThanOrEqual(5);
      expect(a.x + sizes[i].w).toBeLessThanOrEqual(175);
      expect(a.y + sizes[i].h).toBeLessThanOrEqual(175);
      for (let j = 0; j < i; j++) {
        const b = at[j]!;
        if (a.plate !== b.plate) continue;
        const apart = a.x >= b.x + sizes[j].w || b.x >= a.x + sizes[i].w || a.y >= b.y + sizes[j].h || b.y >= a.y + sizes[i].h;
        expect(apart).toBe(true);
      }
    }
    expect(shelfPack([{ w: 200, h: 10 }], 180, 5, 5)).toEqual([null]);
  });
});

describe("box batch", () => {
  it("lids only: one object per name, own text, watertight, boxes still to print", () => {
    const p = params({ relief: "raised" });
    const r = generateBatch(p, parseNames("Ava\nNoah\nZoë & Łukasz").items, null, "lids");
    expect(errorsOf(r)).toEqual([]);
    expect(r.exportable).toBe(true);
    expect(r.itemCount).toBe(3);
    expect(r.boxesNeeded).toBe(3);
    expect(r.meshesFailed).toBe(0);
    const objs = r.plates.flatMap((pl) => pl.objects);
    expect(objs.map((o) => o.object)).toEqual(["01_AVA_LID", "02_NOAH_LID", "03_ZOE_LUKASZ_LID"]);
    expect(objs.every((o) => o.kind === "lid" && o.textSize > 0)).toBe(true);
    // every lid has its own raised text part
    for (const o of objs) expect(r.plates[0].parts.some((x) => x.object === o.object && x.name !== "LID")).toBe(true);
  });

  it("sets: a box beside every lid, all objects inside the bed", () => {
    const p = params({ bedSize: 220 });
    const r = generateBatch(p, parseNames("A\nB\nC\nD\nE\nF").items, starArt(), "sets");
    expect(errorsOf(r)).toEqual([]);
    expect(r.boxesNeeded).toBe(0);
    const objs = r.plates.flatMap((pl) => pl.objects);
    expect(objs.filter((o) => o.kind === "box").length).toBe(6);
    expect(objs.filter((o) => o.kind === "lid").length).toBe(6);
    for (const pl of r.plates)
      for (const part of pl.parts) {
        const P = part.mesh.positions;
        for (let i = 0; i < P.length; i += 3) {
          expect(P[i]).toBeGreaterThanOrEqual(0);
          expect(P[i]).toBeLessThanOrEqual(220);
          expect(P[i + 1]).toBeLessThanOrEqual(220);
        }
      }
  });

  it("spills onto more plates on a small bed and reports oversized boxes", () => {
    const d = derive(params());
    const many = generateBatch(params({ bedSize: 160 }), parseNames(Array.from({ length: 12 }, (_, i) => `N${i + 1}`).join("\n")).items, null, "lids");
    expect(many.plates.length).toBeGreaterThan(1);
    expect(many.plates.flatMap((pl) => pl.objects).map((o) => o.index)).toEqual(Array.from({ length: 12 }, (_, i) => i + 1));
    const tooBig = generateBatch(params({ bedSize: Math.ceil(d.outerL) + 1 }), parseNames("Big").items, null, "lids");
    expect(tooBig.exportable).toBe(false);
    expect(errorsOf(tooBig)[0]).toMatch(/Line 1 \(Big\): .* does not fit/);
  });

  it("names long text warnings after the line they came from", () => {
    const r = generateBatch(params({ textSize: 30 }), parseNames("Ok\nA VERY LONG NAME THAT WILL NOT FIT AT THIS SIZE").items, null, "lids");
    expect(r.exportable).toBe(true);
    expect(r.issues.some((i) => i.message.startsWith("Line 2 (A VERY LONG NAME"))).toBe(true);
  });

  it("3MF per plate, ZIP with every plate + manifest + README", () => {
    const p = params({ bedSize: 160 });
    const items = parseOrdersCsv("order,name\n5001,Ava\n5002,Noah\n5003,Mia\n5004,Leo\n5005,Ivy\n5006,Max\n", { text: "name", order: "order", quantity: "" }).items;
    const r = generateBatch(p, items, null, "lids");
    const model = strFromU8(unzipSync(batchPlate3MF(r, 1, p, "orders"))["3D/3dmodel.model"]);
    expect((model.match(/<item /g) ?? []).length).toBe(r.plates[0].objects.length);
    expect(readProjectFrom3MF(batchPlate3MF(r, 1, p, "orders"))).toContain('"lidThickness"');
    const zip = unzipSync(batchZip(r, p, "orders"));
    expect(Object.keys(zip).filter((f) => f.endsWith(".3mf")).length).toBe(r.plates.length);
    const rows = strFromU8(zip["manifest.csv"]).trim().split("\n");
    expect(rows.length - 1).toBe(6);
    expect(rows[1]).toMatch(/^1,1,01_AVA_LID,lid,Ava,5001,/);
    expect(strFromU8(zip["README.txt"])).toMatch(/Print 6 plain boxes/);
    expect(batchManifest(r)).toBe(strFromU8(zip["manifest.csv"]));
  });
});
