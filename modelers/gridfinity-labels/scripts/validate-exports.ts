/**
 * Export validation: builds a set of label batches headlessly, checks every
 * part is watertight with consistent winding and positive volume, that the
 * labels on a plate do not overlap, and writes out/*.3mf + out/*.zip for a
 * look in the slicer.
 *
 *   npm run validate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type LabelParams } from "../src/core/params";
import { parseCsv, guessMapping, csvHeaders, parseList } from "../src/core/batch";
import { batchZip, generate, plate3MF } from "../src/pipeline/generate";
import type { LabelSpec } from "../src/core/params";

await initKernel();
mkdirSync("out", { recursive: true });

const P = (patch: Partial<LabelParams>): LabelParams => ({ ...DEFAULT_PARAMS, ...patch });
const list = (text: string, p: LabelParams) => parseList(text, p.icon).specs;

const hardware = "M2 | screw\nM2.5 | screw\nM3 | screw\nM4 | bolt\nM5 | bolt\nM3 NUT | nut\nM3 WASHER | washer\nM3 INSERT | insert";
const csv = "order,name,qty\n5001,Ava,3\n5002,Noah,2\n5003,Zoë & Łukasz,1\n";

const cases: [string, LabelParams, LabelSpec[]][] = [];
const add = (name: string, p: LabelParams, specs: LabelSpec[]) => cases.push([name, p, specs]);
{ const p = P({}); add("default-1u", p, list("SCREWS", p)); }
{ const p = P({ units: 2 }); add("hardware-2u-raised", p, list(hardware, p)); }
{ const p = P({ units: 2, relief: "inlay" }); add("hardware-2u-inlay", p, list(hardware, p)); }
{ const p = P({ units: 2, relief: "engraved", thickness: 1.6 }); add("hardware-2u-engraved", p, list(hardware, p)); }
{ const p = P({ units: 3, font: "serif" }); add("two-lines-3u", p, list("CABLES\\nUSB-C | none | 3\nTOOLS\\nSMALL | none | 3", p)); }
{ const p = P({ widthMode: "mm", widthMm: 80, align: "left" }); add("fixed-80mm-left", p, list("LEFT ALIGNED", p)); }
{ const p = P({ units: 1, height: 9 }); add("short-9mm", p, list("M3", p)); }
{ const p = P({ units: 2 }); add("unicode", p, list("Zoë & Łukasz ♥", p)); }
{ const p = P({ units: 1 }); add("csv-quantity", p, parseCsv(csv, guessMapping(csvHeaders(csv)), p.icon).specs); }
{ const p = P({ units: 1, bedSize: 180 }); add("multi-plate-180bed", p, list(Array.from({ length: 120 }, (_, i) => `BIN ${i + 1}`).join("\n"), p)); }

let failed = false;
for (const [name, params, specs] of cases) {
  const r = generate(params, specs, null);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const ok = errors.length === 0 && r.meshesFailed === 0 && r.exportable;
  if (!ok) failed = true;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(22)} ${r.labelCount} labels, ${r.plates.length} plate(s), ${r.meshesChecked} parts, ${r.elapsedMs} ms${errors.length ? "  " + errors.join(" | ") : ""}`);
  if (!ok) continue;
  const bytes = plate3MF(r, 1, params, "", name);
  writeFileSync(`out/${name}.3mf`, bytes);
  const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
  const meshes = (model.match(/<mesh>/g) ?? []).length;
  const items = (model.match(/<item /g) ?? []).length;
  if (!model.includes('unit="millimeter"') || meshes !== r.plates[0].parts.length || items !== r.plates[0].labels.length) {
    console.log(`     3MF structure mismatch: ${meshes} meshes / ${r.plates[0].parts.length} parts, ${items} items / ${r.plates[0].labels.length} labels`);
    failed = true;
  }
  if (r.plates.length > 1) {
    const zip = unzipSync(batchZip(r, params, "", name));
    const plates = Object.keys(zip).filter((f) => f.endsWith(".3mf")).length;
    const rows = strFromU8(zip["manifest.csv"]).trim().split("\n").length - 1;
    if (plates !== r.plates.length || rows !== r.labelCount) { console.log(`     ZIP mismatch: ${plates} plates, ${rows} manifest rows`); failed = true; }
    writeFileSync(`out/${name}.zip`, batchZip(r, params, "", name));
  }
}
const fit = generate(DEFAULT_PARAMS, [], null, "fit-test");
const fitOk = fit.exportable && fit.meshesFailed === 0;
console.log(`${fitOk ? "ok  " : "FAIL"} fit-test strip         ${fit.plates[0]?.labels.map((l) => l.object).join(", ")}`);
if (fitOk) writeFileSync("out/fit-test.3mf", plate3MF(fit, 1, DEFAULT_PARAMS, "", "fit-test"));
else failed = true;
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
