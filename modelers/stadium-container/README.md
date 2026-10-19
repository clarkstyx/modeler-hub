# Stadium Container

A miniature baseball stadium wrapped around an open round container. A baseball (about 74 mm) sits in
the default cavity; the seats step up around it. The building is a square with its corners cut off:
the front carries the entrance tower with your logo, the left and right sides the ballpark's name over
a main entrance with its awning, and the four short diagonal sides each carry a lattice floodlight tower
(two legs, X bracing, 6 × 3 lamps) whose legs plug into the wall top. A terrace in front leaves room for
rocks and palms. Up to four filament colours, exported as a colour-ready 3MF or as STL. One of Clark's
Valencia Modelers; the hub serves it at `/m/stadium-container/`.

## What you can change

- **Container**: inside diameter, usable depth, rim width, floor thickness.
- **Seating**: rows, row rise and depth, number of sections, aisle width.
- **Building**: corner size (1 = regular octagon, smaller = squarer), exterior wall height (raised
  automatically to the top row), wall thickness (thickened automatically to 4 mm so the floodlight legs fit),
  front terrace, concourse width, base thickness and margin.
- **Sign**: text in four fonts on the tower and on the wings beside it; an uploaded emblem on the tower as SVG,
  PNG or JPG (a bitmap has its background removed and is reduced to at most four colours; each colour prints in
  the nearest of your four filaments; with an emblem the tower shows it alone and the name moves to the wings),
  emblem height.
- **Floodlights**: separate parts whose legs plug into sockets in the wall top (print lying flat; a fit
  test is included and the peg clearance is adjustable), printed in place, or none.
- **Colours**: structure (base, steps, masts), facade (walls, tower, letters, lamps), accent (seat rows, awnings,
  the top band, the lettering on the wings beside the entrance), sign panel / doors / lamp heads.

## Printing

Print the stadium as placed, base on the bed, no supports: awning undersides climb at 45°, the top
band steps out in two 0.3 mm steps. Floodlights print lying on their backs, lamps up, so the layers
run along the legs. Print the peg fit test first and adjust the clearance before printing all four.

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
