# Cake Topper — notes for Claude Code

A birthday cake topper modeler: name, age and a message in three rows, a themed emblem behind
the middle row, two sticks into the cake. One of Clark's Valencia Modelers, built like
`modeler-hub/modelers/mistletoe-ornament`. Clark is a beginner programmer who vibe-codes:
explain in plain words, keep changes small, and verify in the browser.

## Layout

- `src/core/params.ts` every setting (`TopperParams`), limits, the `STYLES` table (label, what
  the three emblem colour pickers mean, the colours a theme loads), row orders.
- `src/core/recipe.ts` settings-file round trip; `validateParams.ts` checks before any geometry.
- `src/geometry/emblems.ts` the emblem of each theme as coloured 2D pieces centred on the origin.
  Adding a theme = one function here + one `STYLES` entry.
- `src/geometry/buildTopper.ts` the build: rows shrunk to fit the width and stacked, emblem
  behind the middle row, words raised one layer (two where they sit on the emblem), plate =
  outline around everything (+ a 4 mm "closing" and bars when support is on) + sticks.
  "Separate" output lays every colour piece flat beside the plate as its own 3MF object.
- `src/pipeline/` runs everything in a Web Worker; `generate.ts` validates every mesh and
  blocks export on errors.
- `src/ui/` React sidebar (`App.tsx`) and the three.js preview.
- `src/shared/` is a **copy** of the hub's `packages/geometry/src/`. Fix things in the hub
  package first, then copy the changed files here.

## Conventions

- Millimetres everywhere. Parts never overlap in volume; every exported mesh is watertight;
  colours become 3MF filament slots (PLATE, NAME, AGE, MESSAGE, BALL_TOP…).
- Prints flat on the plate; the plate must decompose into exactly one piece or the build errors.
- Not yet verified by a print.

## Commands

```bash
npm install
npm run dev        # http://localhost:5193
npm run check      # typecheck + vitest + build
npm run validate   # writes out/*.3mf for a look in the slicer
```
