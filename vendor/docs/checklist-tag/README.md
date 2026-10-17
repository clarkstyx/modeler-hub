# Checklist Tag

Parametric **checklist tags**: a flat card with a hanging hole, a raised question
("IS KINSLEY ON THE NICE LIST?") and tick boxes ("YES" / "NO") with one of them ticked.
Sized by default for an Elf on the Shelf to hold (55 × 75 mm), and every size can change.
Printed flat, exported as a colour-ready 3MF for Bambu Studio / OrcaSlicer.

Its own repository (`clarkstyx/checklist-tag`). The Valencia Modelers hub (`clarkstyx/modeler-hub`)
clones and builds it and serves it at `/m/checklist-tag/` (Maker tier).

## What it makes

- **Question**: any text; `{name}` is swapped for the name. Long lines wrap by themselves and the
  letters shrink until the question fits above the boxes (never below 2.5 mm; the app says when it shrank).
- **Tick boxes**: 2 to 4 labels (YES, NO or TRICK, TREAT…), one ticked or none. Tick, cross or heart;
  filled or outline squares; one under the other or side by side (they shrink to fit across the tag).
- **Tag**: width, height, thickness, corner radius, raised height of the details, hanging hole
  (top left like the photo, top centre, top right or none).
- **Colours**: tag, text, boxes and tick are separate parts, so each gets its own filament. The tick is
  cut out of its box and the text never touches either, so no parts overlap.
- **Batch**: a list of names makes one tag each, packed on plates that fit the bed. One 3MF per plate
  (settings embedded so the file reopens here), STL, or every plate in a ZIP.

Presets by season (to grow into a seasonal collection): Christmas nice list and naughty list
(like the reference photo), Halloween trick or treat, Valentine's "be my Valentine" with a heart,
Easter "good bunny".

## Run

```bash
npm install
npm run dev        # http://localhost:5190
npm test           # vitest: parts, size, no overlaps, wrapping and shrinking, refusals, batch, 3MF/ZIP, settings
npm run validate   # every preset and edge case, writes out/*.3mf
npm run build      # production build (the hub runs vite build --base=/m/checklist-tag/)
```

## How it is built

`src/core/layout.ts` decides where everything goes before any geometry is built: tick boxes centred
near the bottom, the question wrapped and shrunk into the space between the boxes and the hole.
`src/geometry/buildTag.ts` turns that into flat outlines on **manifold-3d** (the card minus the hole,
the text from the shared font outlines, the boxes minus the tick) and lifts each into a solid. All of
it runs in a Web Worker.

## Printing

Flat as placed, no supports, 0.2 mm layers. The colours change only in the top 0.8 mm, so a
4-colour tag wastes little filament. A 5 mm hole takes a small book ring or ribbon. Not yet printed;
see `docs/PRINT_VALIDATION.md` in the hub repository.
