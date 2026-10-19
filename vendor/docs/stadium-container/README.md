# Stadium Container

A miniature baseball stadium wrapped around an open round container. A baseball (about 74 mm) sits in
the default cavity; the seats step up around it, the exterior has columns, arched doors with awnings,
an entrance tower with your own sign text (and an optional SVG emblem), and four floodlights on the
corners. Up to four filament colours, exported as a colour-ready 3MF or as STL. One of Clark's
Valencia Modelers; the hub serves it at `/m/stadium-container/`.

## What you can change

- **Container**: inside diameter, usable depth, rim width, floor thickness.
- **Seating**: rows, row rise and depth, number of sections (also the number of sides of the building),
  aisle width. Stairs between sections line up with the corners.
- **Building**: exterior wall height (raised automatically to clear the top row), wall thickness,
  concourse width, base thickness and margin.
- **Sign**: text in four fonts, an uploaded SVG emblem above it, emblem height.
- **Floodlights**: separate parts that peg into sockets on the base (print lying flat; a fit test is
  included and the peg clearance is adjustable), printed in place, or none.
- **Colours**: structure (base, steps, masts), facade (walls, tower, letters, lamps), accent (seat rows, awnings,
  the top band, the lettering on the wings beside the entrance), sign panel / doors / lamp heads.

## Printing

Print the stadium as placed, base on the bed, no supports: awning undersides climb at 45°, the top
band steps out in two 0.3 mm steps. Floodlights print lying on their backs, lamps up, so the layers
run along the mast. Print the peg fit test first and adjust the clearance before printing all four.

Design targets for a 0.4 mm nozzle at 0.20 mm layers (see `docs/PRINT_VALIDATION.md` in the hub):
walls ≥ 2.0 mm, floor and base ≥ 2.4 mm, raised details ≥ 0.6 mm, letter strokes ≥ 0.8 mm.
**Not yet confirmed by a physical print.**

## Commands

```bash
npm install
npm run dev        # http://localhost:5189  (?view=front or ?view=top frames the preview)
npm run check      # typecheck + vitest + build
npm run validate   # 15 configurations, writes out/*.3mf
```
