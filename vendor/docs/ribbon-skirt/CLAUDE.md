# Ribbon Skirt Ornament — notes for Claude Code

Pleated ribbon skirt ornaments with ribbon bands in your colours, a gathered or bottle-cap waistband and a hanging loop. One of Clark's Valencia Modelers. The hub (`clarkstyx/modeler-hub`) clones this repo, builds
it with `vite build --base=/m/ribbon-skirt/` and serves it at `/m/ribbon-skirt/`, behind the Patreon gate (Maker tier). Clark is a beginner
programmer who vibe-codes: explain in plain words, keep changes small, and verify in the browser.

This modeler started inside the hub under `modelers/ribbon-skirt/` and moved here with its git history.

## Layout

- `src/core/` parameters (`params.ts`), presets, settings file round-trip (`recipe.ts`),
  parameter checks (`validateParams.ts`).
- `src/geometry/` manifold-3d builder: `buildSkirt.ts` (pleated hollow skirt, waistband styles, loop, ribbon slabs cut out as colour parts).
- `src/pipeline/` runs everything in a Web Worker; `generate.ts` validates every mesh and blocks
  export on errors.
- `src/export/` 3MF writer; `src/ui/` React sidebar and the three.js preview.
- `src/shared/` is a **copy** of the hub's `packages/geometry/src/` (kernel, shapes, mesh checks,
  3MF/STL, text). Each file says so in its header. Shared fixes belong in the hub package first;
  then copy the changed files here so the two stay the same.

## Conventions

- Lengths are millimetres everywhere in code.
- Parts never overlap, every exported mesh is watertight, colours become 3MF filament slots.
- Print orientation is part of the design. The ornament prints standing up as placed, hem on the bed, no supports. Walls never lean past 45°.
- **Not yet verified by a print:** the default ornament in four colours. The hub's `docs/PRINT_VALIDATION.md` records
  defaults and test results; update it there.
- Keep `base: "./"` in `vite.config.ts`; the hub passes its own `--base` when it builds.

## Commands

```bash
npm install
npm run dev        # http://localhost:5185
npm run check      # typecheck + vitest + build
npm run validate   # every preset and edge case, writes out/*.3mf
```
