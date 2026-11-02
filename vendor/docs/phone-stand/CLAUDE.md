# Phone Stand Keychain — notes for Claude Code

Valencia Modelers' print-in-place keychain phone stand. Clark is a beginner programmer who
vibe-codes: explain in plain words, keep changes small, and verify in the browser.

## Where things are

- `src/core/params.ts` — every setting with its limits, presets and labels. Add a setting here first.
- `src/core/layout.ts` — every derived dimension (hinge position, pin, ledge, hook, stop face, tip,
  phone angle, free text areas). The rules, the geometry and the readout all read from it; never
  recompute a dimension elsewhere.
- `src/core/validateParams.ts` — rules checked before building. Errors block export.
- `src/geometry/buildStand.ts` — the solids. Frame: x along the bar from the keychain end, y across
  it (centre = 0), z up from the bed. Side-plane profiles are extruded across the bar with `prismY`.
  The flap is drawn folded (pointing +x) and turned about the pin afterwards; its text goes on
  before the turn.
- `src/pipeline/` — worker protocol; `generate.ts` validates, builds, checks every mesh, places the
  stand on the bed. Export only from a result whose `exportable` is true.
- `src/shared/` — copy of the hub's `packages/geometry`. Fix bugs there and copy the file here by hand.
- `docs/DESIGN.md` — the mechanism, the dimensions, and the measurements of the original.

## Conventions

- Print-in-place is the point: the flap and the body must never touch. The slot is the flap's full
  swing grown by `clearance`; the test `the flap never touches the body` measures it. Keep it green.
- The ledge sits 0.2 mm below the hinge slot's floor on purpose: a single T-shaped floor face
  triangulates into a zero-area triangle and fails the mesh check.
- Circles use a multiple of four segments so the lowest line of a cylinder is on the bed exactly.
- Dark sidebar, plain React, no framework beyond that. Same look as the other modelers.
- Colour-ready 3MF: bar, flap and text are separate parts of one object. Settings are embedded so a
  downloaded 3MF reopens in the app.
- Nothing here has been printed yet. When a print happens, log it in the hub's
  `docs/PRINT_VALIDATION.md` and adjust the defaults (clearance, latch) from what was learned.

## Commands

```bash
npm run dev        # port 5184
npm test
npm run validate   # headless build of presets and edge settings, writes out/*.3mf
npm run check      # typecheck + test + build
```
