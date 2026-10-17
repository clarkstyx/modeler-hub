# Knot Bead

Parametric **paracord knot beads**: a short tube whose outside looks like a tied knot, with a bore
for the cord. Slide it on instead of tying; it saves cord and every bead comes out the same.
Printed standing up in batches, exported as 3MF for Bambu Studio / OrcaSlicer.

Lives inside the hub at `modelers/knot-bead/` and is served at `/m/knot-bead/`. It is a normal Vite
app and can move to its own repository by changing `path` to `repo` in `modelers.json`.

## What it makes

- **Four knot looks**, all from one smooth surface formula so they print without supports:
  snake knot (a chain of oval links, each turned 90° from the one below and pinched at the joins),
  coil wrap (one strand wrapped round, like a whipping), twisted rope (2 to 6 strands), round braid
  (two crossing families of strands, woven look).
- **Size and bore**: height, diameter over the ridges, bore (5.5 mm for one strand of 550 cord,
  8.5 mm for two), a chamfer at each end of the bore so the cord feeds in, and a fade that flattens
  the ridges at the rims.
- **Batch**: how many beads; they are packed on plates that fit the bed, each bead its own object.
  One 3MF per plate (settings embedded so the file reopens here), STL, or every plate in a ZIP.
- **Checks**: thinnest wall between bore and the pattern's valleys (two nozzle widths), overhang of
  the pattern (warns over 60°, refuses over 72°), watertight mesh.

Presets: snake knot, coil wrap (like the reference photo), twisted rope, round braid, snake knot
for a doubled cord.

## Run

```bash
npm install
npm run dev        # http://localhost:5189
npm test           # vitest: geometry, sizes, packing, checks, 3MF/ZIP, settings
npm run validate   # every preset and edge case, writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/knot-bead/)
```

## How it is built

All geometry runs in a Web Worker on **manifold-3d**. One bead is a closed mesh built ring by ring:
the outside radius is `core + pattern(θ, z)`, the inside is the bore with its chamfers, with a flat
annulus at each end. The pattern fades to the mean radius at the rims, so the ends are plain and
add no overhang of their own. The batch reuses that one mesh, moved on the plate, so 200 beads build
as fast as one. The overhang check samples the outside on a fine grid before anything is built.

## Printing

Standing up as placed, no supports, 0.2 mm layers, 3 walls. Ridges deeper than about 1 mm at a
short pitch print with slightly rough undersides; the app says so. Not yet printed; see
`../../docs/PRINT_VALIDATION.md`.
