# Cookie Cutter

**Cookie cutters** from a shape, a set of letters, a word, or your own SVG outline, printed
flange-down with a thin cutting edge, exported as 3MF or STL.

Lives inside the hub at `modelers/cookie-cutter/` and is served at `/m/cookie-cutter/` (Maker
tier). It is a normal Vite app and can move to its own repository by changing `path` to `repo` in
`modelers.json`.

## Food contact

Valencia Modelers makes **no food-safety claim** for printed cutters. Printed plastic has layer lines
that are hard to clean, and whether a filament, colour or nozzle is suitable for food depends on the
material and the printer, which this app cannot check. The same note is shown next to the export
buttons and written into the README of every ZIP download.

## What it makes

- **Shapes**: circle, scalloped circle, heart, star, rounded square, egg, sized by their longest side.
- **Letters**: one cutter per character (capital-letter height), packed onto as many plates as needed.
  Letter holes (O, A, B…) are filled because the cutter follows the outside; the dot of an i or j is
  joined on so each cutter is one piece.
- **Word**: one cutter around the whole word (one or two lines), at a set distance from the letters.
- **SVG**: the outside outline of every filled shape in your SVG.
- **Cutter**: height, wall, cutting edge, edge band (half of it a stepped taper from the wall to the
  edge), flange width and thickness. Thin spikes and narrow notches are rounded off by the
  smoothing radius; parts of a shape under 3 mm wide are flagged as fragile.
- Exports: 3MF (one object per cutter, settings embedded so it reopens here), STL, a ZIP with every
  plate as 3MF + STL, `manifest.csv` and a README with the food-contact note.

The defaults (15 mm tall, 1.2 mm wall, 0.8 mm edge, 4 mm × 1.6 mm flange) are common choices for
FDM-printed cutters, **not tested on dough yet**: see `docs/PRINT_VALIDATION.md` in the hub.

## Run

```bash
npm install
npm run dev        # http://localhost:5183
npm test           # vitest: every shape, letters, words, SVG holes, rules, exports, settings
npm run validate   # every shape, every letter/digit in every font, edge settings; writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/cookie-cutter/)
```

## How it is built

Same Generation 2 layout as `box-modeler` and `gridfinity-labels`, on the shared engine in
`packages/geometry` (copied into `src/shared/` by `npm run sync-shared` in the hub). Each outline is
cleaned in 2D (`src/geometry/outlines.ts`: holes filled, smoothing, points where the outline touches
itself fused, islands joined). The cutter (`src/geometry/buildCutters.ts`) is a stack of solid layers,
each the outline grown by that layer's wall thickness, minus the outline cut straight through, so the
inner cutting face is one surface and no layer overhangs the one below. Every mesh is checked
(closed, consistently wound, no degenerate triangles, positive volume) before export is allowed.
