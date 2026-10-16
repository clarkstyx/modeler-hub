# Box Modeler — notes for Claude Code

Sliding-lid boxes, tins and sorting trays, plus stackable enclosure racks with drawer trays. One of
Clark's Valencia Modelers. The hub (`clarkstyx/modeler-hub`) clones this repo, builds it with
`vite build --base=/m/box-modeler/` and serves it behind the Patreon gate (Maker tier). Clark is a
beginner programmer who vibe-codes: explain in plain words, keep changes small, and verify in the browser.

## Layout

- `src/core/` parameters (`params.ts`: `BoxParams`, `derive` for the box, `deriveRack` for the rack),
  presets, settings file round-trip (`recipe.ts`), parameter checks (`validateParams.ts`).
- `src/geometry/` manifold-3d builders: `buildBox.ts` (box + lid + lid fit test), `buildRack.ts`
  (rack cube, drawer tray, joining keys, key fit test), `buildBatch.ts` (one lid per name on plates).
- `src/pipeline/` runs everything in a Web Worker; `generate.ts` validates every mesh and blocks
  export on errors.
- `src/ui/` React sidebar (`App.tsx`, `RackControls.tsx`) and the three.js preview.
- `src/shared/` is a **copy** of the hub's `packages/geometry/src/` (kernel, shapes, mesh checks,
  3MF/STL, text). Each file says so in its header. Shared fixes belong in the hub package first;
  then copy the changed files here so the two stay the same.

## Conventions

- Lengths are millimetres everywhere in code; the rack UI can show inches.
- Parts never overlap, every exported mesh is watertight, colours become 3MF filament slots.
- Print orientation is part of the design: the box and lid print flat; the rack cube prints on its
  back (no supports, no bridges); trays print flat.
- Physical fits (lid clearance, tray stop, key clearance) are **not yet verified by a print**. The
  hub's `docs/PRINT_VALIDATION.md` records defaults and test results; update it there.

## Commands

```bash
npm install
npm run dev        # http://localhost:5181
npm run check      # typecheck + vitest + build
npm run validate   # every preset and edge case, writes out/*.3mf
```
