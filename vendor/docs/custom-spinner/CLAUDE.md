# Custom Spinner: notes for Claude Code

Part of Clark's Valencia Modelers family (hub: `clarkstyx/modeler-hub`, served at `/m/custom-spinner/`).
Clark is a beginner programmer who vibe-codes: explain in plain words, keep changes small, verify
in the browser.

## What lives where

- `src/core/params.ts`: settings (`SpinnerParams`) and the fixed, measured `GEOMETRY`. Changing a
  `GEOMETRY` number changes how the parts fit; check `docs/DESIGN.md` and run the tests first.
- `src/spinner/parts.ts`: outer ring, inner ring and the blank face plate (manifold-3d revolves,
  cones, extruded profiles). Built in the assembled frame: ring axis Z, spin axis Y, lug at +Y.
- `src/spinner/facePlate.ts`: artwork → fitted, cleaned, partitioned colour inlays on the plate.
- `src/pipeline/generate.ts`: builds every part, lays them out for printing (plates face-down) and
  assembled (preview), validates meshes, exports 3MF / STL.
- `src/image`, `src/geometry2d`, `src/mesh`, `src/export`: shared with the Trinket Tray generator.
  The playbook is `.claude/skills/image-to-multicolor-print`.
- `src/ui`: React page (worker-based, like the tray).

## Conventions

- manifold-3d only; carve bodies (`blank − pockets`), never union side-by-side solids.
- Export is blocked when any mesh check fails; never "repair" meshes, fix the geometry.
- 3MF: one object per printed part group (OUTER_RING, INNER_RING, FRONT_PLATE, BACK_PLATE), one
  `m:colorgroup` per colour, Bambu `model_settings.config` for filament slots.
- The face plates print face-down; the back plate is the same part, so the image reads correctly
  from both sides.

## Commands

```bash
npm install
npm run dev
npm test          # includes the 360° spin-clearance and plate-seat checks
npm run check     # lint + typecheck + test + build
npm run sample    # headless export to examples/output/
```
