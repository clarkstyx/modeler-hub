# Mistletoe Ornament

A browser app that builds a flat mistletoe ornament: a sprig of leaves, a cluster of berries, a ribbon bow with a hanger ring, and a name tag. Pick the colours, watch the 3D preview, export a slicer-ready multi-part 3MF (or STL).

Every colour is its own printed part: a back plate with an outline and the hanger ring, then leaves, berries, bow and tag side by side on one raised layer, then the name raised on the tag (or flush inside it). Where two colours meet, the one in front wins and the other is cut back 0.6 mm so a thin line of the back plate shows between them. Prints flat on its back, no supports, up to five filaments.

## Run it

```bash
npm install
npm run dev        # http://localhost:5185  (add ?name=Ava to open with a name)
npm test           # vitest: geometry, options, exports
npm run check      # typecheck + tests + build
```

## Layout

- `src/core/` — settings (`params.ts`), tolerant loader (`recipe.ts`), rules checked before building.
- `src/geometry/buildOrnament.ts` — the sprig in a nominal frame, scaled to the asked width; tag and name sized to fit; layers cut back where colours meet; parts.
- `src/pipeline/` — Web Worker generation, mesh validation, 3MF/STL.
- `src/shared/` — copy of the hub's `packages/geometry/src` (do not edit here; `npm run sync-shared` in the hub).
- `src/ui/` — React UI: dark sidebar, three.js preview, downloads.

The app exposes `window.__valenciaState()` (the current settings) so the hub's craft-show order button can save the exact design with an order.

## Before printing

In OrcaSlicer / Bambu Studio answer **Yes** to "load as a single object with multiple parts", then give each colour a filament. Not printed yet: check the first print and log it in the hub's `docs/PRINT_VALIDATION.md`.
