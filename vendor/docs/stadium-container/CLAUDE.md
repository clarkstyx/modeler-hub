# Stadium Container — notes for Claude Code

A miniature baseball stadium around an open round container (a baseball fits the default): stepped
seating, polygonal exterior with columns, arched doors and awnings, an entrance tower with a raised
sign (text + optional SVG emblem) and four floodlights. One of Clark's Valencia Modelers, kept in the
hub under `modelers/stadium-container/` and served at `/m/stadium-container/` behind the Patreon gate
(Maker tier). Clark is a beginner programmer who vibe-codes: explain in plain words, keep changes
small, and verify in the browser.

## Layout

- `src/core/` parameters and derived dimensions (`params.ts`: `StadiumParams`, `derive`, the fixed
  design constants such as `DOOR`, `AWNING`, `MAST`), parameter checks (`validateParams.ts`),
  settings file round-trip (`recipe.ts`).
- `src/geometry/` manifold-3d builders. `frames.ts` has the helpers (polygon by apothem, revolve,
  shapes extruded along X or Y, `spin` a front-side feature to another side). `buildStadium.ts` builds
  one connected structure and the colour volumes that only touch it. `buildFloodlight.ts` builds a
  mast standing, and places it in its socket (preview) or flat on the bed (export). `sign.ts` lays out
  the text and emblem and drops strokes under a nozzle width.
- `src/image/raster.ts` turns a small bitmap into filled colour layers (alpha, border flood fill, Lab k-means,
  blend merge, majority filter, exact pixel-edge tracing); `src/ui/loadRaster.ts` decodes and downsizes in the browser.
- `src/pipeline/` runs everything in a Web Worker; `generate.ts` validates every mesh and blocks
  export on errors. Export groups: `stadium`, `floodlights`, `fit-test`.
- `src/export/` 3MF writer wrapper; `src/ui/` React sidebar and the three.js preview.
- `src/shared/` is a **copy** of the hub's `packages/geometry/src/`, written by `npm run sync-shared`
  in the hub. Edit the package, never the copy.

## Conventions

- Lengths are millimetres. The stadium is centred on the origin, Z up, the front (sign) faces −Y.
- Colour volumes are built as separate solids that touch the structure (never carved out of it with
  shared faces: the kernel's coplanar path is slow and leaves zero-volume shells). Anything inside the
  wall (door skins, the top band's skin, sockets) is subtracted from the structure once, in step 7.
- Print orientation is part of the design: everything prints as placed, no supports, overhangs at 45°
  or tiny steps. Floodlights lie on their backs.
- **Not yet verified by a print**: all of it. The hub's `docs/PRINT_VALIDATION.md` records the design
  targets; update it there after the first print.
- Keep `base: "./"` in `vite.config.ts`; the hub passes its own `--base` when it builds.

## Commands

```bash
npm install
npm run dev        # http://localhost:5189  (?view=front|top|back frames the preview)
npm run check      # typecheck + vitest + build
npm run validate   # every configuration, writes out/*.3mf
```
