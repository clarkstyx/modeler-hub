# Print validation

What "printable" means for Valencia Modelers, what is checked automatically, which fits have been
measured, and what still needs a real print. Nothing here claims a physical result that was not
observed.

## Default print assumptions

- 0.4 mm nozzle, 0.20 mm layers, PLA, Bambu/Orca-style multi-material (up to 4 filaments).
- Flat on the bed, support-free. Every product is designed with its largest flat face at Z = 0.
- Minimum printable wall: 2 nozzle widths (0.8 mm). Minimum visible detail: 1 nozzle width.
- Letters under 5 mm cap height get a warning; strokes under 1 nozzle width are reported as lost.

## Automatic checks (box-modeler, gridfinity-labels, cookie-cutter, trinket-tray, phone-grip)

| Check | How | Result |
|---|---|---|
| Watertight | every directed edge appears once and its reverse once | error blocks export |
| Winding | no repeated directed edge | error |
| Degenerate triangles | area < 1e-10 mm² or repeated index | error (box-modeler welds coincident vertices and flips flat triangles first, so these are now 0 in all test cases) |
| Volume | signed volume > 0 | error |
| Overlap | pairwise `intersect().volume()` of parts in one object > 0.01 mm³ | error |
| Thin walls | parameter rules (wall ≥ 2 × nozzle, rail skin ≥ 2 × nozzle, lip ≥ 2 layers, floor under engraving ≥ 0.6 mm) | error or auto-cap with an info note |
| Thin decoration | morphological opening of the decoration at nozzle/2 and nozzle; area lost reported | warning |
| Bed fit | outer size vs bed; box + lid side by side | error / warning |
| Colour count | distinct hex > 4 | warning |
| Missing glyphs | font has no outline | warning |

Run them headlessly: `npm test` and `npm run validate` in the `box-modeler` repo or
`modelers/gridfinity-labels` (the latter writes `out/*.3mf` for a slicer check).

## Fit data

| Fit | Default | Source | Status |
|---|---|---|---|
| Box-modeler sliding lid clearance | 0.25 mm per side, rail depth 1.0 mm, lip 1.2 mm, lid 2.0 mm | common practice for Bambu-class printers; the parameter is exposed and the app ships a **lid fit test** (box section + lids at ±0.1 mm) | **Unverified physically.** Print the fit test before selling. Record the winning clearance here. |
| Box-modeler thumb notch | 0.8 mm recess, 6 × ≤24 mm | design choice | unverified |
| Box-modeler enclosure rack: tray in its cube | 0.5 mm per side, slides on the cube floor | design choice (a drawer does not need a tight fit) | **Unverified physically.** |
| Box-modeler enclosure rack: tray stop | 1.5 mm floor ramp (8 mm long, steep back face) in a 2.1 mm deep channel under the tray; tray slides out half its length | design choice; tests check the tray clears the cube closed and catches on the stop when pulled | **Unverified physically.** The cube prints on its back, so the steep face is a 1.5 mm overhang. Check it catches and that a loaded tray does not tip over it. |
| Box-modeler enclosure rack: joining keys | 6 mm dovetail neck, 2 mm deep, 25° flanks, 0.2 mm key clearance, keys 1 mm shorter than the cube | design choice; the app ships a **key fit test** (2 blocks + keys at ±0.05 mm) | **Unverified physically.** Record the winning key clearance here. |
| Phone-grip PopGrip glue face | 33 mm bonding face on a 39.6 mm top | Amazon Merch PopSockets FAQ | unverified (calibration rings 37/38/39 mm ship in the app) |
| Phone-grip swappable PopTop | – | not measured | not generated (listed, unselectable) |
| Trinket Tray coaster holder clearance | 0.8 mm | design choice | unverified |
| Letter Beads cord hole | 5 mm | design choice | printed by Clark (per MANUAL) |
| Jerry Can keyring hole | 5.5 mm, chamfered | design choice | printed by Clark (per MANUAL) |
| Cookie cutter wall / edge / flange | 1.2 mm wall, 0.8 mm edge, 4 mm × 1.6 mm flange, 15 mm tall | common choices for FDM cutters | **Untested on dough.** |
| Gridfinity label width | grid units × 42 mm − 6 mm end clearance (1 unit = 36 mm) | 42 mm pitch is the published Gridfinity grid; the clearance is a design choice | unverified |
| Ribbon skirt ornament: walls and overhangs | 1.6 mm wall, pleat folds must bend wider than the wall, no wall leaning over 45°, waistband floor either a flat 2 mm bridge (≤ 26 mm, hidden inside) or a 45° inner cone, teardrop loop hole | design choice; checked on every build (export blocked otherwise) | **Unverified physically.** Print the default and check the waist cone and loop hole print clean without supports. |
| Gridfinity label slot | 12 mm high × 1.2 mm thick | a common size, **not** a standard: slots differ between bin designs | **Unverified.** The app's fit-test strip prints 11.6 / 12.0 / 12.4 mm; record the one that fits your bins here. |

## Required before claiming a fit (future engines)

- **MX clickers**: plate cut-out 14.0 × 14.0 mm, plate thickness 1.5 mm, stem cross 4.0 × 1.1 mm,
  housing 15.6 mm square (Cherry MX datasheet). Print a 3-pocket coupon at nominal, +0.1 and +0.2 mm
  and record which retains a real switch before shipping a preset.
- **Stamp handle**: press-fit peg at 0.1/0.2/0.3 mm interference or an M8 thread with 0.2 mm
  radial clearance; coupon required.
- **NFC pockets**: tag diameter + 0.4 mm, depth = tag thickness + 0.2 mm; verify with the actual
  tag batch.
- **QR codes**: module ≥ 1.0 mm raised (2.5 nozzle widths) and a 4-module quiet zone; scan the
  printed sample with two phones before shipping.
- **Cookie cutters** (cookie-cutter): defaults 15 mm tall, 1.2 mm wall, 0.8 mm cutting edge (two
  nozzle widths), 4 × 1.6 mm flange are design choices. Print one and cut dough before claiming they
  cut cleanly. Always show the food-contact note; never claim food safety.

## Slicer verification

- Trinket Tray's 3MF was verified with lib3mf in strict mode (0 warnings) and trimesh
  (`docs/SLICER_TESTING.md` in that repo).
- box-modeler: structure is checked by tests (content types, colour groups per colour, one mesh per
  part, one build item per printed object, Bambu slot config, embedded recipe) and 18 files are
  written by `npm run validate`. **Opening them in Bambu Studio / OrcaSlicer was not possible in
  this environment** and is the next manual step: expect two objects ("box", "lid"), parts named
  as in the app, no repair prompt.

## Test log

| Date | Generator | What | Method | Result |
|---|---|---|---|---|
| 2026-10-13 | box-modeler | 23 unit tests (default, min, max, long/unicode text, SVG multicolour, dividers, every preset, calibration set, 3MF/STL/recipe) | vitest in Node | pass |
| 2026-10-13 | box-modeler | 18 export cases + calibration | `npm run validate` | pass, all watertight, 0 overlaps |
| 2026-10-13 | box-modeler | app under `/m/box-modeler/`, preset switch, closed view, 3MF download | headless Chromium (SwiftShader) | pass, 0 console errors |
| 2026-10-13 | all 13 modelers | hub pull + build | `node scripts/pull.mjs --no-fetch` | 13/13 ok |
| 2026-10-13 | trinket-tray, grinch, dumpling, desktop-sign, jerry-can, phone-grip | existing suites | `npm test` / `npm run check` | 117 / 103 / 156 / 22 / smoke / 14 variants pass |
| 2026-10-14 | grinch / dumpling ornaments | name font under a sub-path | `--base=/m/x/` build in Chromium | 404 + font error before the fix, none after |
| 2026-10-14 | name keychain | export after dragging the preview | Chromium, STL + 3MF Z extent | 66.57 mm (tilted) before, 10.50 mm after |
| 2026-10-14 | name tag | fast typing with a slow chunk | Chromium, count of Text parts in the 3MF | 11 before, 1 after |
| 2026-10-14 | jerry can | name with `& < " '` | smoke test + Python XML parser + Chromium export | invalid XML before, valid with slot config after |
| 2026-10-14 | trinket tray | heart, cloud, text artwork, 3 presets | vitest (134), Chromium walkthrough, `scripts/scanSizes.ts` | pass; ~1 % of size/scale combos fail on a pre-existing 2D pinch (export blocked, base branch same) |
| 2026-10-14 | trinket tray | 2D pinch | `scripts/scanSizes.ts` + new regression test | ~1 % of combos failed before, 0 after (Trinket-Tray-Generator#8) |
| 2026-10-14 | name keychain, name tag, desktop sign | fonts with the CDN unreachable | Chromium with every non-local request blocked | 28/28, 7/7, 21/21 fonts failed before, 0 after |
| 2026-10-14 | gridfinity-labels | 16 unit tests (list/CSV parsing, quantities, widths, raised/inlay/engraved, icons, SVG, plate spill, fit test, 3MF/STL/ZIP/manifest, recipe) | vitest in Node | pass |
| 2026-10-14 | gridfinity-labels | 11 export cases (1u default, 8 hardware labels × 3 reliefs, two lines, fixed mm, 9 mm high, unicode, CSV quantity, 120 labels on a 180 mm bed → 3 plates) + fit test | `npm run validate` | pass, all watertight; 3MF items = labels; ZIP plates and manifest rows match |
| 2026-10-14 | gridfinity-labels | app under `/m/gridfinity-labels/`, sample list, CSV with order ids, 3MF/STL/fit-test downloads | headless Chromium (SwiftShader) | pass, 0 page errors, 0 external requests |
| 2026-10-14 | box-modeler, gridfinity-labels | after moving shared code to `packages/geometry` | `npm run check` + `npm run validate` in both, Chromium export + reopen of a saved 3MF | 23 + 16 tests pass, every validate case watertight, settings reopen, 0 page errors |
| 2026-10-14 | box-modeler | batch: 9 vitest cases (list/CSV parsing, quantities, packing inside the bed without overlap, lids/sets, oversized lids, per-line warnings, 3MF/ZIP/manifest) + 3 validate batches of 26 names (raised/engraved/inlay, 180 mm bed → 13 plates) | vitest + `npm run validate` | 32 tests pass, all watertight, ZIP plates / manifest rows / 3MF items match |
| 2026-10-14 | box-modeler | batch in the app: typed list → lid plate, order CSV → box + lid sets on 2 plates, ZIP with manifest, single-box export unchanged | headless Chromium | pass, 0 page errors, 0 external requests |
| 2026-10-14 | name keychain | batch (keychain-modeler#3): 6 headless tests; geometry refactor checked by comparing the single 3MF from main and the branch | `npm test`, Chromium | tests pass; single 3MF byte-identical (default, accented name, outline); 22 names → 2 plates, CSV → ZIP + manifest, filament slots 1–2, 0 page errors |
| 2026-10-14 | cookie-cutter | 17 vitest (6 shapes, edge thinner than wall, letters incl. joined i-dot, word size, plate spill, missing glyph, SVG hole filled, spike smoothing, rules, 3MF/ZIP/food note, settings) + 26 validate cases (every A–Z, a–z, 0–9, & in 4 fonts = 252 cutters, words, edge settings) | vitest, `npm run validate` | all watertight. Getting there needed: cutter built as solid layers minus the outline (was stacked rings: open edges on ~20 glyphs), sub-0.0001 mm edges collapsed, outline pinch points fused |
| 2026-10-14 | cookie-cutter | app under `/m/cookie-cutter/`: heart, scalloped, letters ABCi, word LOVE, SVG bunny, thin-edge rule, 3MF + ZIP | headless Chromium | pass, food note shown and in README, 0 page errors, 0 external requests |
| 2026-10-16 | box-modeler | enclosure rack: 10 vitest (watertight cube/tray/keys, 4×4×6 in sizing, key count, closed tray clears the cube, stop catches past its travel and frees when lifted, key in two facing grooves clears both, vents, bed limit, key fit test, presets + recipe) + 2 rack presets, 2 edge cases and the key fit test in `npm run validate` | vitest + `npm run validate` | 42 tests pass, every case watertight, 0 overlaps |
| 2026-10-16 | box-modeler | rack in the app: product switch, both presets, print layout, assembled rack view (one tray pulled out, see-through enclosures), 3MF download, box mode unchanged | headless Chromium (production build) | pass, 0 page errors |
| – | box-modeler | physical lid fit | – | **not yet printed** |
| – | box-modeler | enclosure rack: tray slide and stop, key fit, cube on its back without supports | – | **not yet printed** |
| – | gridfinity-labels | fit-test strip in real bins; 3MF opened in Bambu Studio | – | **not yet printed / not opened** |
| 2026-10-16 | ribbon-skirt | 11 vitest (default parts, size, hollow, ribbons add up to the whole, same-colour merge, one colour, fold-over and 45° checks, waistband raise, presets, 3MF + settings round-trip) + 11 validate cases (3 presets, no pleats, straight cone, 24 pleats, one colour, 8 ribbons, smooth waist, 200 mm, 30 mm) | vitest + `npm run validate` | all pass, every part watertight |
| 2026-10-16 | ribbon-skirt | app: default build, preview, readout, 3MF parts per colour | headless Chromium (production build) | pass, 0 page errors |
| – | cookie-cutter | print a heart and the letters, cut dough | – | **not yet printed** |
| – | ribbon-skirt | print the default ornament in 4 colours | – | **not yet printed** |
