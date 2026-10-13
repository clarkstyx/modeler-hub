# Print validation

What "printable" means for Valencia Modelers, what is checked automatically, which fits have been
measured, and what still needs a real print. Nothing here claims a physical result that was not
observed.

## Default print assumptions

- 0.4 mm nozzle, 0.20 mm layers, PLA, Bambu/Orca-style multi-material (up to 4 filaments).
- Flat on the bed, support-free. Every product is designed with its largest flat face at Z = 0.
- Minimum printable wall: 2 nozzle widths (0.8 mm). Minimum visible detail: 1 nozzle width.
- Letters under 5 mm cap height get a warning; strokes under 1 nozzle width are reported as lost.

## Automatic checks (box-modeler, trinket-tray, phone-grip)

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

Run them headlessly: `npm test` and `npm run validate` in `modelers/box-modeler` (the latter
writes `out/*.3mf` for a slicer check).

## Fit data

| Fit | Default | Source | Status |
|---|---|---|---|
| Box-modeler sliding lid clearance | 0.25 mm per side, rail depth 1.0 mm, lip 1.2 mm, lid 2.0 mm | common practice for Bambu-class printers; the parameter is exposed and the app ships a **lid fit test** (box section + lids at ±0.1 mm) | **Unverified physically.** Print the fit test before selling. Record the winning clearance here. |
| Box-modeler thumb notch | 0.8 mm recess, 6 × ≤24 mm | design choice | unverified |
| Phone-grip PopGrip glue face | 33 mm bonding face on a 39.6 mm top | Amazon Merch PopSockets FAQ | unverified (calibration rings 37/38/39 mm ship in the app) |
| Phone-grip swappable PopTop | – | not measured | not generated (listed, unselectable) |
| Trinket Tray coaster holder clearance | 0.8 mm | design choice | unverified |
| Letter Beads cord hole | 5 mm | design choice | printed by Clark (per MANUAL) |
| Jerry Can keyring hole | 5.5 mm, chamfered | design choice | printed by Clark (per MANUAL) |

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
- **Cookie cutters**: wall 0.8 mm, cutting edge chamfer, 2 mm flange; print and cut dough. Always
  show the food-contact note; never claim food safety.
- **Gridfinity labels**: 42 mm pitch and the label-holder slot from the published spec; coupon.

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
| – | box-modeler | physical lid fit | – | **not yet printed** |
