# Rubber Spinner: notes for Claude Code

Part of Clark's Valencia Modelers family (hub: `clarkstyx/modeler-hub`, served at `/m/rubber-spinner/`).
Clark is a beginner programmer who vibe-codes: explain in plain words, keep changes small, verify
in the browser.

## What lives where

- `src/core/params.ts`: the settings (`SpinnerParams`), their limits, colour schemes.
- `src/geometry/design.ts`: every shared dimension derived from the settings (pure maths, no kernel).
  Change a number here, not in a part builder, and read `docs/DESIGN.md` first: most numbers
  depend on each other (ledge, cup height, rim, slot, button).
- `src/geometry/parts.ts`: the six part builders (manifold-3d), all in the assembled frame: ball
  centred on the origin, Z up, button on top, petal 0 facing +X.
- `src/geometry/layout.ts`: print orientation per part and plate packing.
- `src/pipeline/generate.ts`: settings → parts (assembled + plates), mesh checks, 3MF / STL / ZIP.
- `src/shared/`: the hub's shared engine (`packages/geometry` in the hub). Copied by hand; keep in
  step with the hub, do not edit here.
- `src/ui`: React page, geometry in a Web Worker (same layout as the cookie cutter).

## Conventions

- manifold-3d only. Build each part as one solid; the tests check that moving pairs never overlap.
- Export is blocked when a mesh check fails. Never "repair" a mesh: fix the geometry (usually a
  face that exactly coincides with another, see the hub's block).
- Print orientation is part of the design: petals on their back, cup rim down, nut and shaft
  flipped, hub and foot as they stand. No supports anywhere.
- The ratchet direction and the twist direction are linked (`test/spinner.test.ts`, "pushing the
  shaft down turns the nut anticlockwise"). If one changes, the other must.
- 3MF: one object per printed part, one `m:colorgroup` per colour, Bambu `model_settings.config`.

## Commands

```bash
npm install
npm run dev
npm test
npm run validate   # writes out/*.3mf
npm run check      # typecheck + test + build
```
