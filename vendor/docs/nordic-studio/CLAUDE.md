# Nordic Studio — notes for Claude Code

Parametric wreath / hanging-ornament modeler for the Valencia Modelers hub (`/m/nordic-studio/`).
Clark is a beginner programmer who vibe-codes: plain words, small changes, verify in the browser.

## Rules that must keep holding

- **Modular first.** `design.ts` keeps every component as its own outline. Never union components
  there. Only `assemble.ts` joins things, and only for the mode asked for. A new component is a new
  outline in `Design` plus one branch per mode in `assemble()`.
- **One design, three modes.** `single`, `multicolor` and `separate` are built from the same
  `Design`. If a feature only works in one mode, it is not done.
- **Preview = export.** The preview draws `Component.parts`; exports move those same meshes
  (`printPose`) and never rebuild them.
- **Original geometry only.** Shapes come from code (capsules, ellipses, polygons, curves). Do not
  trace or import existing models, photos or artwork into the built-in library.
- **Never resize silently.** Too big for the bed is an error message, not a scale.
- **Measured, not assumed.** Width and gap checks use `inspect()` (opening / closing). Add a check
  there rather than reasoning from bounding boxes.
- **Do not claim a print test** in the UI, README or instructions unless Clark says he printed it.
- `src/shared/` is a copy of the hub's `packages/geometry/src`. Change it in the hub, then copy.

## FDM numbers (`FDM` in `src/core/params.ts`)

0.4 mm nozzle; structure ≥ 1.6 mm; gaps ≥ 0.8 mm; letter strokes ≥ 0.6 mm; ≤ 4 colours; everything
prints flat, back on the bed, no supports, never flipped. Pins are 3 mm; sockets are blind.

## Adding things

- **Decoration:** a new `Kit` in `decor.ts` (`node`, `tip`, `spacing`) in local coordinates
  (origin on the stem, +x growth, +y outward). `design.ts` already makes it printable and anchored.
- **Centerpiece:** a function in `centerpieces.ts` returning a `Silhouette` in units of its height,
  base at y = 0, hanging point `top` on x = 0. Add it to `MAKERS` and `CENTER_LABELS`.
- **Frame shape:** a branch in `outlineRing()`; everything else follows the outline.
- **Preset:** `src/core/presets.ts`. The test suite requires every preset to build with no errors
  and no warnings in all three modes.

## Commands

```bash
npm run dev        # port 5186
npm test           # must stay green
npm run validate   # writes out/ for a look in a slicer
npm run check      # before pushing
```

Screenshots need software WebGL: launch Chromium with `--use-gl=swiftshader --enable-unsafe-swiftshader`.
