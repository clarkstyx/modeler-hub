/**
 * Export validation: every shape, every letter, digit and "&" in every font,
 * words, SVG-like outlines and edge settings are built headlessly; every
 * cutter must be watertight with consistent winding and positive volume.
 * Writes out/*.3mf for a look in the slicer.
 *
 *   npm run validate
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { unzipSync, strFromU8 } from "fflate";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, FONT_LABELS, SHAPE_LABELS, type CutterParams, type FontId, type ShapeId } from "../src/core/params";
import { cutterZip, generate, plate3MF } from "../src/pipeline/generate";

await initKernel();
mkdirSync("out", { recursive: true });
const P = (patch: Partial<CutterParams>): CutterParams => ({ ...DEFAULT_PARAMS, ...patch });
const ALL = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789&";

const cases: [string, CutterParams][] = [];
for (const shape of Object.keys(SHAPE_LABELS) as ShapeId[]) cases.push([`shape-${shape}`, P({ shape })]);
for (const font of Object.keys(FONT_LABELS) as FontId[])
  for (const [part, text] of [["upper", ALL.slice(0, 26)], ["lower", ALL.slice(26, 52)], ["digits", ALL.slice(52)]])
    cases.push([`letters-${font}-${part}`, P({ source: "letters", text, font, size: 45 })]);
cases.push(
  ["letters-small-25", P({ source: "letters", text: "ABCabc123", size: 25 })],
  ["letters-big-120", P({ source: "letters", text: "AQ&", size: 120 })],
  ["word-love", P({ source: "word", text: "LOVE", size: 100 })],
  ["word-two-lines", P({ source: "word", text: "HAPPY\nDAY", size: 110, font: "serif" })],
  ["word-unicode", P({ source: "word", text: "Zoë", size: 80 })],
  ["no-smoothing-star", P({ shape: "star", smoothing: 0 })],
  ["max-smoothing-scalloped", P({ shape: "scalloped", smoothing: 3 })],
  ["no-flange-heart", P({ shape: "heart", flange: 0 })],
  ["thick-edge-egg", P({ shape: "egg", wall: 2, edge: 2 })],
  ["tall-small-circle", P({ shape: "circle", size: 20, height: 40 })],
  ["big-square-200", P({ shape: "square", size: 200 })],
  ["nozzle-0.6", P({ shape: "heart", nozzle: 0.6, edge: 1.2, wall: 1.6 })],
);

let failed = false;
for (const [name, p] of cases) {
  const r = generate(p, null);
  const errors = r.issues.filter((i) => i.severity === "error").map((i) => i.message);
  const ok = errors.length === 0 && r.meshesFailed === 0 && r.exportable;
  if (!ok) failed = true;
  const notes = r.issues.filter((i) => i.severity === "warning").length;
  console.log(`${ok ? "ok  " : "FAIL"} ${name.padEnd(24)} ${r.cutterCount} cutter(s), ${r.plates.length} plate(s), ${notes} warning(s), ${r.elapsedMs} ms${errors.length ? "  " + errors.slice(0, 3).join(" | ") : ""}`);
  if (!ok) continue;
  const bytes = plate3MF(r, 1, p, name);
  const model = strFromU8(unzipSync(bytes)["3D/3dmodel.model"]);
  if ((model.match(/<item /g) ?? []).length !== r.plates[0].cutters.length) { console.log("     3MF object count mismatch"); failed = true; }
  writeFileSync(`out/${name}.3mf`, bytes);
  if (r.plates.length > 1) writeFileSync(`out/${name}.zip`, cutterZip(r, p, name));
}
console.log(failed ? "\nSome cases FAILED." : "\nAll cases passed. 3MF files are in out/.");
process.exit(failed ? 1 : 0);
