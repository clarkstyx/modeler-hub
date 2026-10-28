# Clicker Maker — notes for Claude Code

Keycap name clickers (MX switches in a printed base, printed keycaps with letters, optional charm on
a dovetail). Part of Clark's Valencia Modelers; the hub (`clarkstyx/modeler-hub`) builds this repo
into `/m/clicker/`. Clark is a beginner who vibe-codes: explain in plain words, keep changes small,
and check changes in the browser.

## Conventions

- manifold-3d for all geometry, in a Web Worker. Every exported part is checked with
  `validateMesh`; never export something that fails.
- **Everything prints without support**, already in print position: base open side up, keycaps
  upright with raised letters (stem down to the rim, standing on the bed), charm face up with its loop flat on the bed and
  the dovetail slot open at the bed. Keep it that way when adding features.
- **Male dovetail on the base, female slot in the charm.** Charm slides down from above.
- Sizes come from measured references: `docs/REFERENCE_MEASUREMENTS.md`. Change a default only
  with a reason (a print test), and update that file.
- The brand is hidden by default: written into the 3MF's Designer/CopyRight fields, not on the
  plastic (like the NSHOP 7-key). `brandMark` can put it under the first switch or on the side.
- Clark slices in **OrcaSlicer / Anycubic Slicer**, not Bambu Studio. They import our 3MFs as
  geometry on one plate (no plate list), so multi-colour downloads are one 3MF per main colour in a zip.
- Pictures: `src/art/` holds the Valencia Kawaii SVG library (69 files in seven groups, the nine Tiles and twelve Moods drawn by `scripts/draw-tiles.py` with a `data-tile` keycap colour, also copied into the Icon Bead modeler's `charms/Valencia`: flat polygons,
  ≤4 colours, a `translate` on each path, read by `parseSimpleSvg`, which also runs in the worker and tests) and the PNG/JPG tracer (`trace.ts`,
  following the hub's image-to-multicolor playbook). Picture colours are named ("Black", "Cream")
  so settings and reliefs are per colour.
- Keycap tops are letters or, for the "clicker bar", a picture per key (`capStyle`, `keyPictures`: library
  id, drawn charm id, "upload" or "" for the letter). The worker resolves the ids itself (`keyPictures()`
  in `generate.ts`), so the UI only sends ids plus the uploaded artwork.
- Each key's keycap colour: `keyCapColors[i]`, else its picture's tile colour, else `capColor` (`keyCapColor()`).
- `printer` (`PRINTERS` in params) sets the bed, the filament slots and whether prints are split by
  colour; the keycap sheet (`sheet`: picture ids or `letter:A` with quantities) is keycaps only.
- Reliefs: `planReliefs()` (`geometry/relief.ts`) decides each colour's flush / raised / engraved and
  stack height for the Shape button, the charm and keycap pictures; part names end in the colour
  name, which is how a click on the 3D view (`Preview3D.onPick`) finds the colour to cycle.
- Charm layer colours are roles (`@base`, `@cap`, `@letter`) so a clicker prints with 3 filaments.
- `src/shared/` is a copy of the hub's `packages/geometry/src`. Fix shared bugs in the hub first.
- Dark sidebar UI, plain React, no UI framework.

## Check before saying it works

```bash
npm run check      # typecheck + tests + build
npm run validate   # every charm and edge case, writes out/*.3mf
npm run dev        # look at it: Assembled and Print plate views
```

The tests include an assembled-fit check: keycaps and charm must not touch the base, the charm
must be locked by the dovetail sideways and free only straight up.

## Not verified yet

The fit numbers are copied from the references but have not been printed with this design. Print
`Fit test 3MF` and record the result in `docs/REFERENCE_MEASUREMENTS.md`.
