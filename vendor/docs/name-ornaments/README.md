# Name Ornaments

Personalised Christmas **name ornaments**: a name in chunky letters joined across a **snowflake**,
on a backing that follows both outlines, with a hanging loop on the top arm. Layered colours, printed
flat, exported as a colour-ready 3MF for Bambu Studio / OrcaSlicer.

One of the Valencia Modelers (`clarkstyx/name-ornaments`). More ornament shapes (candy cane with
bow, wreath, tree) are planned here next to the snowflake.

## What it makes

- **Name**: any name; the letters are as big as you allow and shrink by themselves until the name
  fits across the snowflake (refused below 6 mm capitals, a warning below 9 mm). Puffy letters
  (every stroke thickened), an optional arch, and an outline of backing colour round the letters so
  the name reads against the snowflake.
- **Snowflake**: three styles (classic, simple, frosty), any size, arm width.
- **Layers**: backing (3 mm), snowflake raised 1.2 mm, name raised 2.4 mm, each its own part and
  colour. The backing never has holes: letter counters and gaps are filled.
- **Loop**: a ring on the top arm with a 4 mm hole for ribbon or a hook (or none).
- **Batch**: a list of names makes one ornament each, packed on plates that fit the bed. One 3MF per
  plate (settings embedded so the file reopens here), STL, or every plate in a ZIP.

## Run

```bash
npm install
npm run dev        # http://localhost:5191
npm test           # vitest: parts, layers, no overlaps, shrinking, refusals, batch, 3MF, settings
npm run validate   # every preset and edge case, writes out/*.3mf
npm run build      # production build (the hub can run vite build --base=/m/name-ornaments/)
```

## How it is built

`src/core/layout.ts` places the name's letters (shrunk to fit, bent into an arch).
`src/geometry/buildOrnament.ts` draws the snowflake from round-ended strokes, thickens the letters,
grows the backing round both, cuts the snowflake back from the letters, adds the loop and lifts each
outline into a solid on **manifold-3d**. Every outline is cleaned of needle spikes and pinch points
before export, and every mesh is checked watertight. All of it runs in a Web Worker.

## Printing

Flat as placed, no supports, 0.2 mm layers. Colours change where the snowflake starts (3 mm) and
where the name rises above it (4.2 mm); the AMS does it from the 3MF. Not yet printed.
