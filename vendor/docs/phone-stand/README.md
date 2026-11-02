# Phone Stand Keychain

A **print-in-place keychain phone stand**: a flat bar with a kickstand flap hinged in the middle.
Flip the flap up, sit the phone's bottom edge on the ledge against the hook, lean it back on the
flap. Fold the flap down and it clicks flat into the bar: a keychain again. Keyring hole, optional
bottle-opener slot, and your name as a flush two-colour inlay. Exported as 3MF (colours and
settings embedded) or STL.

Our own design of the "small smartphone stand, print in place" idea that is popular on MakerWorld.
`docs/DESIGN.md` has the drawing, every dimension and what was learned from measuring the original.

## What it makes

- **One object, no assembly.** The flap's hinge barrel sits in a slot in the bar around a pin that is
  part of the bar, with the chosen clearance (0.3 mm) everywhere. Printed flat with the flap open.
- **Sizes:** Small (72 × 35 × 11 mm), Large (76 × 35 × 12 mm, cased phones), Short (no keychain
  tail), or anything in between: width, thickness, flap length, opening angle and tail length.
- **Keychain end:** keyring hole (diameter or none), bottle-opener slot (9 mm × 24 mm through the
  tail: the far edge hooks under the cap, the near edge presses on top).
- **Your name:** on the flat tail top (best for two colours) or on the back of the flap (shows while
  the phone is up). Inlay (flush, its own colour), raised, or engraved. Four fonts, two lines,
  shrinks to fit.
- **Colours:** bar, flap and text each get a filament slot in the 3MF.
- **Fit:** hinge clearance, flap thickness and how far it sinks below the top when folded, hook wall,
  click grip (how far the hook lip overhangs the folded flap), the dip under the flap tip.
- The readout shows the folded size, how far the stand rises above the bar, the angle the phone
  leans at, the ledge depth and the weight; the preview can show the stand open (as printed) or folded.

## Print it

Print as placed: flat on the bed, flap open, **no supports**. PLA or PETG, 0.2 mm layers, 3 walls.
After printing, work the flap back and forth once to free the hinge (the pin bridges inside the
barrel). If the hinge is stuck, raise the clearance to 0.35–0.4 mm; if it is sloppy, lower it.
Not printed yet: see the test log in the hub's `docs/PRINT_VALIDATION.md` before calling a fit verified.

## Run

```bash
npm install
npm run dev        # http://localhost:5184
npm test           # vitest: sizes, clearance in both poses, click lip, options, rules, exports
npm run validate   # presets, every option and slider edge; writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/phone-stand/)
```

## How it is built

Same Generation 2 layout as the other Valencia modelers, on a copy of the hub's shared engine in
`src/shared/` (manifold kernel, mesh checks, 3MF/STL writers, text). Geometry is in
`src/geometry/buildStand.ts`; every derived dimension is in `src/core/layout.ts` so the UI, the rules
and the geometry agree. The bar and flap profiles are drawn in the side plane and extruded across
the bar. The slot in the bar is the flap's whole swing (every angle from folded to open) grown by the
clearance, so the flap turns freely and the tail of the bar is its stop. Every part is checked
(closed, consistently wound, no degenerate triangles, positive volume) before export is allowed.
