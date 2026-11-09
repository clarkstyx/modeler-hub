/**
 * Etsy pack: Small (12 mm slot) and Large (13.5 mm slot) stands, soda-can tab lifter only (no
 * bottle opener), two-piece snap-lock, laid out for a 256 mm bed. Writes blank + sample-name
 * 3MF and STL files to the folder given as the first argument.
 *   npx tsx scripts/etsy-pack.ts <outDir>
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { initKernel } from "../src/shared/kernel";
import { DEFAULT_PARAMS, PRESETS, type StandParams } from "../src/core/params";
import { generate, plate3MF, plateStl } from "../src/pipeline/generate";
import { buildThreeMF } from "../src/export/threeMF";

await initKernel();
const out = process.argv[2] ?? "out/etsy";
mkdirSync(out, { recursive: true });
const sizes = { Small: "standard", Large: "large" } as const;
for (const [label, id] of Object.entries(sizes)) {
  for (const [suffix, text, textStyle] of [["", "", "engraved"], ["-sample-SAM", "SAM", "inlay"]] as const) {
    const p: StandParams = {
      ...DEFAULT_PARAMS,
      ...PRESETS.find((x) => x.id === id)!.patch,
      openerMode: "soda",
      printer: "a1",
      text,
      textPlace: "side",
      textStyle,
    };
    const r = generate(p);
    if (!r.exportable) throw new Error(`${label}: ${r.issues.map((i) => i.message).join("; ")}`);
    const L = r.layout!;
    const stem = `PhoneStand-${label}${suffix}`;
    writeFileSync(`${out}/${stem}.3mf`, plate3MF(r, 1, p, `Phone Stand Keychain ${label}`, "all"));
    {
      // Folded and standing poses, only for product pictures.
      writeFileSync(`${out}/render-${label}${suffix}-standing.3mf`, buildThreeMF(r.plates[0].standingParts, { title: "standing" }));
      writeFileSync(`${out}/render-${label}${suffix}-folded.3mf`, buildThreeMF(r.plates[0].closedParts, { title: "folded" }));
    }
    if (!suffix) {
      writeFileSync(`${out}/${stem}-BODY.stl`, plateStl(r, 1, `${stem}-BODY`, "body", p));
      writeFileSync(`${out}/${stem}-FLAP.stl`, plateStl(r, 1, `${stem}-FLAP`, "flap", p));
    }
    console.log(stem, `${L.length.toFixed(1)} x ${p.width} x ${p.thickness} mm, slot ${p.phoneSlot}, swing ${L.flapSwing.toFixed(0)}°, phone ${L.phoneAngle.toFixed(0)}°, meshes ${r.meshesChecked} failed ${r.meshesFailed}`);
    for (const i of r.issues) console.log("  ", i.severity, i.message);
  }
}
