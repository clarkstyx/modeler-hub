// Headless check: builds a handful of designs and writes out/*.3mf for a look in the slicer.
import { mkdirSync, writeFileSync } from "node:fs";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, type OrnamentParams } from "../src/core/params";
import { generate, ornament3MF } from "../src/pipeline/generate";

const CASES: Record<string, Partial<OrnamentParams>> = {
  default: {},
  flush: { textStyle: "flush", name: "Olivia" },
  big: { size: 120, leafPairs: 3, berries: 7, name: "Christopher" },
  small: { size: 50, leafPairs: 1, berries: 3, name: "Mo", bow: false },
  noname: { name: "" },
};

await initKernel();
mkdirSync("out", { recursive: true });
let bad = 0;
for (const [id, patch] of Object.entries(CASES)) {
  const params = { ...DEFAULT_PARAMS, ...patch };
  const r = generate(params);
  const errors = r.issues.filter((i) => i.severity === "error");
  console.log(`${id.padEnd(8)} ${r.parts.length} parts, ${r.info.width.toFixed(0)}×${r.info.height.toFixed(0)} mm, ${r.info.colours} colours, ${r.elapsedMs} ms${errors.length ? "  ✗ " + errors.map((e) => e.message).join("; ") : ""}`);
  if (errors.length) { bad++; continue; }
  writeFileSync(`out/${id}.3mf`, ornament3MF(r, params, id));
}
if (bad) process.exit(1);
