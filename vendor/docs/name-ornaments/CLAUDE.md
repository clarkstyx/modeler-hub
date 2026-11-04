# Name Ornaments — notes for Claude Code

Personalised name ornaments: a name in chunky letters across a snowflake, layered colours, hanging
loop. One of Clark's Valencia Modelers; built the same way as `clarkstyx/checklist-tag`. More shapes
(candy cane with bow, wreath, tree) are planned in this repo. Clark is a beginner programmer who
vibe-codes: explain in plain words, keep changes small, and verify in the browser.

## Layout

- `src/core/` parameters (`params.ts`: `OrnamentParams`, names list, hole position), `layout.ts`
  (letters shrunk to fit and arched; no geometry kernel), presets (`presets.ts`), settings file
  round-trip (`recipe.ts`), checks (`validateParams.ts`).
- `src/geometry/buildOrnament.ts` manifold-3d builder: snowflake from strokes, thickened name, backing
  grown round both (holes filled), snowflake cut back from the name, loop; `tidy` removes needle
  spikes and pinch points (the 3MF's position rounding would weld them into non-watertight edges);
  `thinShare` warns when a part is thinner than the nozzle; one ornament per name packed on plates.
- `src/pipeline/` runs everything in a Web Worker; `generate.ts` validates every mesh and blocks
  export on errors.
- `src/ui/` React sidebar (`App.tsx`) and the three.js preview.
- `src/shared/` is a **copy** of the hub's `packages/geometry/src/` (kernel, shapes, mesh checks,
  3MF/STL, text). Each file says so in its header. Shared fixes belong in the hub package first;
  then copy the changed files here so the copies stay the same.

## Conventions

- Lengths are millimetres everywhere.
- Parts never overlap, every exported mesh is watertight, colours become 3MF filament slots
  (BASE, SNOWFLAKE, NAME).
- Prints flat; the backing is solid and the colours change only in the raised layers.
- Not yet verified by a print.

## Commands

```bash
npm install
npm run dev        # http://localhost:5191
npm run check      # typecheck + vitest + build
npm run validate   # every preset and edge case, writes out/*.3mf
```
