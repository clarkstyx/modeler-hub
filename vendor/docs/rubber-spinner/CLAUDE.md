# Rubber Spinner: notes for Claude Code

Part of Clark's Valencia Modelers family (hub: `clarkstyx/modeler-hub`, served at `/m/rubber-spinner/`).
Clark is a beginner programmer who vibe-codes: explain in plain words, keep changes small, verify
in the browser.

## What lives where

- `src/core/params.ts`: the settings (`SpinnerParams`), their limits, colour schemes.
- `src/geometry/design.ts`: every shared dimension derived from the settings (pure maths, no kernel),
  plus `openAngle(press)`: how far the petals swing for a press. Change a number here, not in a
  part builder, and read `docs/DESIGN.md` first: the stack (collar, nut, flange, shaft top, button)
  sets `maxStroke`.
- `src/geometry/parts.ts`: the seven part builders (manifold-3d), all in the assembled frame at
  rest: ball centred on the origin, Z up, button on top, petal 0 facing +X. `swungPetal` opens one.
- `src/geometry/layout.ts`: print orientation per part and plate packing.
- `src/pipeline/generate.ts`: settings → parts (assembled + plates), mesh checks, 3MF / STL / ZIP.
- `src/shared/`: the hub's shared engine (`packages/geometry` in the hub). Copied by hand; keep in
  step with the hub, do not edit here.
- `src/ui`: React page, geometry in a Web Worker (same layout as the cookie cutter).

## Conventions

- manifold-3d only. Build each part as one solid; the tests check that moving pairs never overlap.
- Export is blocked when a mesh check fails. Never "repair" a mesh: fix the geometry (usually a
  face that exactly coincides with another, see the hub's block).
- Print orientation is part of the design: petals on their back, hub and button upside down, the
  rest as they stand. No supports anywhere.
- The ratchet direction and the twist direction are linked (`test/spinner.test.ts`, "pressing
  turns the nut clockwise"). If one changes, the other must.
- The preview moves parts itself (`src/ui/Preview3D.tsx`, `poseOf`): the top slides down and turns,
  petals swing on their pins. Keep it in step with the maths in `design.ts`.
- 3MF: one object per printed part, one `m:colorgroup` per colour, Bambu `model_settings.config`.

## Commands

```bash
npm install
npm run dev
npm test
npm run validate   # writes out/*.3mf
npm run check      # typecheck + test + build
```
