# Checklist Tag — notes for Claude Code

Seasonal YES / NO checklist tags ("IS KINSLEY ON THE NICE LIST?"), sized by default for an Elf on the
Shelf to hold. One of Clark's Valencia Modelers. The hub (`clarkstyx/modeler-hub`) clones this repo,
builds it with `vite build --base=/m/checklist-tag/` and serves it behind the Patreon gate (Maker tier).
Clark is a beginner programmer who vibe-codes: explain in plain words, keep changes small, and verify
in the browser.

## Layout

- `src/core/` parameters (`params.ts`: `TagParams`, hole position, `{name}` substitution, names list),
  `layout.ts` (where the question, boxes and labels go; wraps and shrinks text to fit, no geometry
  kernel), presets by season (`presets.ts`), settings file round-trip (`recipe.ts`), checks (`validateParams.ts`).
- `src/geometry/buildTag.ts` manifold-3d builder: card minus hole, raised text, boxes minus the tick,
  tick; one tag per name packed on plates.
- `src/pipeline/` runs everything in a Web Worker; `generate.ts` validates every mesh and blocks
  export on errors.
- `src/ui/` React sidebar (`App.tsx`) and the three.js preview.
- `src/shared/` is a **copy** of the hub's `packages/geometry/src/` (kernel, shapes, mesh checks,
  3MF/STL, text). Each file says so in its header. Shared fixes belong in the hub package first;
  then copy the changed files here so the two stay the same.

## Conventions

- Lengths are millimetres everywhere.
- Parts never overlap, every exported mesh is watertight, colours become 3MF filament slots
  (TAG, TEXT, BOXES, CHECK).
- The tag prints flat; colours change only in the raised top layers.
- Presets are grouped by season (Christmas, Halloween, Valentine's, Easter) so the tags can join a
  seasonal collection later.
- Not yet verified by a print. The hub's `docs/PRINT_VALIDATION.md` records defaults and test
  results; update it there.

## Commands

```bash
npm install
npm run dev        # http://localhost:5190
npm run check      # typecheck + vitest + build
npm run validate   # every preset and edge case, writes out/*.3mf
```
