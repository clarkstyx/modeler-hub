# Valencia Nordic Studio

A parametric wreath and hanging-ornament generator for 3D printing, part of Valencia Modelers.
Pick a frame, add botanicals, hang a centerpiece in the middle, put the family name on a
nameplate, then print it **as one piece, in multicolour, or as separate components** — all three
from the same design.

Everything is drawn in code from curves, capsules, ellipses and rectangles. Nothing is traced or
adapted from an existing model, photo or artwork.

```bash
npm install
npm run dev        # http://localhost:5186
npm test           # 61 geometry and export checks, headless
npm run validate   # builds every preset in every mode, writes out/*.3mf, *.stl, *.zip
npm run check      # typecheck + tests + production build
```

## What is in Phase 1

| Area | Built |
|---|---|
| Frames | Circle, oval, rounded arch. Width, height, band width, thickness, corner rounding, hanging eyelet. |
| Decoration | Pine branches, eucalyptus leaves, wheat stalks, plus berries as a second colour. Full perimeter, lower / left / right crescent, diagonal pair, off-centre sweep; symmetric or asymmetric; size, density, coverage. |
| Centerpieces | Christmas tree, winter cabin, prairie grain elevator. Size, height in the frame, thickness, colour. Hangs on a cord (removable) or is bridged to the frame. |
| Nameplate | Family name, message, year; four fonts; letter height and spacing; raised or engraved; text shrinks evenly to fit, never stretched. |
| Printing modes | Single piece, multicolour 3MF, separate components with pins and sockets. |
| Preview | Assembled, exploded and print-plate views, per-component show/hide and colours, dimension lines, warnings, weight estimate. |
| Export | STL, colour-ready 3MF (per plate), one STL per component, ZIP with instructions and settings, connector test piece, JSON design file. |
| Presets | Nordic Pine Crescent, Prairie Winter, First Christmas in Our Home, Botanical Family Wreath. |

Not built yet (Phase 2 and 3): heart, hexagon and scalloped frames; snowflake, maple, holly, vine,
petal and northern-lights decorations; the other centerpieces, custom text and SVG upload as a
centerpiece; segmented frames for small beds; the Canadian Maple Heritage and Snowflake Elegance
presets (they need the maple and snowflake generators).

## How one design becomes three prints

`src/geometry/design.ts` builds the flat design: one outline per component (frame, greens, berries,
nameplate, lettering, centerpiece), kept separate. `src/geometry/assemble.ts` then applies the mode:

| | Single piece | Multicolour | Separate components |
|---|---|---|---|
| Result | one fused solid | one solid per colour, touching, never overlapping | one flat piece per component |
| Decoration, nameplate | fused on, carried down to the bed where they overhang | sit on the frame's front face; overhang carried down to the bed | flat inserts that sit on the frame |
| Centerpiece | bridged to the frame | cord or bridge, your choice | hangs on a cord |
| Joined by | — | the print itself | loose 3 mm pins in blind sockets |

Heights are the same in every mode: frame `0 … frameThickness`, decoration and nameplate on top of
it, berries and raised letters 0.8 mm above those, centerpiece `0 … centerThickness` in the opening.

### Connectors (separate components)

One mechanism: **loose round pins**. The frame has blind sockets in its front, each insert has
blind sockets in its back, and a short pin joins each pair. No part has a peg sticking out, so
every part prints flat, the same way up as it is shown, and no socket shows on a finished face.
Clearance is 0.10–0.40 mm per side (default 0.20; glue fit adds 0.10). **Print the connector test
piece first** — the right clearance depends on the printer and filament.

## What the app checks, and what it does not

Checked automatically on the real geometry, every build:

- every mesh is watertight, consistently wound, positive volume, no zero-area triangles
- no two solids overlap (intersection volume under 0.01 mm³)
- every printed object is one connected body (a nameplate that misses the frame is an error)
- real wall and gap widths, by morphological opening and closing, not bounding boxes:
  structure ≥ 1.6 mm, gaps ≥ 0.8 mm, letter strokes ≥ 0.6 mm
- nothing needs supports (downward faces above the bed, other than 3.4 mm socket roofs)
- every piece fits the chosen bed inside the margin — an oversized design is refused, never resized
- every socket has solid wall around it in both parts; at most four colours

**Not checked: physical prints.** As of this release no part of this modeler has been printed.
Connector fit, the 45 mm bridge limit and small-letter legibility are engineering estimates until
they are. The weight shown is volume × density (a solid part), not a slicer result.

Slicer import status is recorded in `docs/SLICER_IMPORT.md`.

## Fonts and licences

Lettering uses the typeface JSON fonts bundled with three.js: Helvetiker, Optimer and Gentilis
(MgOpen licence) and Droid Sans (Apache 2.0). Both licences allow the fonts to be embedded and the
resulting shapes to be sold, so exported models and prints can be used commercially. No font is
fetched at run time.

## Layout

```
src/core/       params (all settings, limits, FDM rules), presets, recipe (tolerant load), validateParams
src/geometry/   region (2D helpers + width measurement), frames, decor, centerpieces, nameplate,
                connectors, design (flat design), assemble (the three modes + solid checks)
src/pipeline/   generate (settings → components → exports), worker, client, protocol
src/export/     3MF wrapper, assembly instructions
src/shared/     copy of the hub's packages/geometry (kernel, shapes, mesh checks, 3MF, STL, text)
src/ui/         React: App, Preview3D, controls
test/           vitest, runs the engine in Node
```
