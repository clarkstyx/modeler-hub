# Gridfinity Labels

**Bin labels for Gridfinity drawers**, one or a whole drawer at a time: text plus an optional
hardware icon, laid out on print plates and exported as colour-ready 3MF files with a manifest.

Lives inside the hub at `modelers/gridfinity-labels/` and is served at `/m/gridfinity-labels/`
(Seller tier: batch plates are the Seller magnet). It is a normal Vite app and can move to its own
repository by changing `path` to `repo` in `modelers.json`.

## What it makes

- Flat label plates sized in **grid units** (42 mm pitch minus an end clearance, default 6 mm, so a
  1-unit label is 36 mm) or a fixed width in mm. Height, thickness and corner radius are sliders.
- **Text**: one or two lines (`\n` in the list), four bundled fonts, auto-fit size or a fixed one,
  letter and line spacing, left / centre / right.
- **Icons**: screw, bolt (threaded side views), nut, washer, heat-set insert, or your own SVG.
- **Relief**: raised (second and third colour on top), flush inlay, or engraved (one colour).
- **Batch**: type a list (`text | icon | units`, one label per line, `#` comments) or import a CSV
  and pick which columns are text, icon, width, order id and quantity. Up to 500 labels.
- **Plates**: labels are packed in list order onto plates that fit your bed; extra labels spill onto
  new plates. Each plate exports as its own 3MF with every label as a separate object.
- **Fit-test strip**: three labels at your height −0.4 / 0 / +0.4 mm, named `FIT_11_6MM` etc.
- Exports: 3MF per plate, STL per plate, ZIP of every plate + `manifest.csv` (label → plate → x/y →
  order id) + README, settings JSON (also embedded in each 3MF).

## Fit is not verified

Only the 42 mm grid pitch is a published Gridfinity fact. Label slots differ between bin designs
(the default 12 × 1.2 mm is a common size, not a standard). **Print the fit-test strip in your own
bins before a big batch**, then set height and thickness to the label that fit.

## Run

```bash
npm install
npm run dev        # http://localhost:5182
npm test           # vitest: list/CSV parsing, layout, geometry, 3MF/ZIP structure
npm run validate   # builds batches and edge cases, checks meshes, writes out/*.3mf and out/*.zip
npm run build      # production build (the hub passes --base=/m/gridfinity-labels/)
```

## How it is built

Same Generation 2 layout as `box-modeler` (see `../../docs/GENERATOR_ARCHITECTURE.md`): geometry
runs in a Web Worker on **manifold-3d**, text and icons are 2D cross-sections extruded on top of,
inlaid into or cut out of the plate, and every exported mesh is checked independently (closed,
consistently wound, no degenerate triangles, positive volume). Parts of one label never overlap,
and export is blocked on any error. Letters under 5 mm get a warning, and so do strokes thinner
than the nozzle.

| File | Role |
|---|---|
| `src/core/params.ts` | every parameter, its default and limits; `labelWidth()` |
| `src/core/batch.ts` | list and CSV parsing, column guessing, quantities |
| `src/geometry/icons.ts` | built-in hardware icons and SVG artwork icons |
| `src/geometry/buildLabels.ts` | one label, plate packing, fit-test strip |
| `src/pipeline/generate.ts` | validation, 3MF / STL per plate, manifest, batch ZIP |
| `src/ui/App.tsx` | sidebar, list / CSV import, plate picker, exports |
