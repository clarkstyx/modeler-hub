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
- **Folds into one block.** The flap is the full width of the bar past the hinge, its edges match
  the bar's, its tongue tucks under the hook's hood, and the pin shows as a cap on each side: folded,
  only a seam line gives the hinge away.
- **Three looks:** Soft (pill-rounded ends and edges, rounded flap), Classic (plain bar, lightly
  rounded), Stealth (chamfered edges, a tail that tapers towards the ring, a fin-shaped flap).
- **Sizes:** Small (72 × 35 × 11 mm), Large (76 × 35 × 12 mm, cased phones), Short (no keychain
  tail), Printed v1 (the numbers of the first print that worked), or anything in between: width,
  thickness, flap length, opening angle and tail length.
- **Keychain end:** keyring hole (diameter or none), the can tab lifter from the original (a thin
  slit in the end of the tail: slide the lip under a drink can's ring pull and lever it up), and an
  optional bottle-opener slot (9 mm × 24 mm through the tail: the far edge hooks under the cap, the
  near edge presses on top).
- **Your name:** on the flat tail top (best for two colours) or on the back of the flap (shows while
  the phone is up). Inlay (flush, its own colour), raised, or engraved. Four fonts, two lines,
  shrinks to fit.
- **Colours:** bar, flap and text each get a filament slot in the 3MF.
- **Angle grooves:** up to five V-grooves across the ledge (as many as fit). The phone's bottom edge
  rests in one; the groove nearest the hinge stands it steepest, the dip at the hook is the most
  reclined. The readout lists every angle, e.g. 61° / 50° / 39° on the Small preset.
- **Fit and look:** hinge clearance, flap thickness and taper (thicker at the hinge), how far it sinks
  below the top when folded, rounded edges, hook wall, the click (a leaf spring in the hook whose nose snaps
  over the folded flap's tongue, flush with the top; the leaf bends 0.4 mm, under 1 % strain), the
  dip under the flap tip.
- **Batch:** a list of names, one per line ("ANNA x3" for three), and copies of each. The stands
  are packed onto the bed in list order (a new plate starts when the bed is full), each one its own
  object in the slicer (`03_ZOE`), with a plate switcher in the preview.
- **Printers:** Bambu Lab A1 Combo (256 mm, AMS lite), Anycubic Kobra X Combo (260 mm, ACE 2 Pro),
  Flashforge Creator 5 Pro (256 mm, four toolheads, no purging) or another bed size. The choice sets
  the bed the plate is packed for, warns when a print needs more colours than the printer holds,
  and writes the print notes (layers, walls, brim, which slot gets which part) into the sidebar and
  into the README of every ZIP.
- The readout shows the folded size, how far the stand rises above the bar, the angle the phone
  leans at, the ledge depth and the weight; the preview can show the stand open (as printed) or folded.
- Exports: 3MF per plate (colours and settings embedded), STL per plate, or a ZIP with every plate
  as 3MF + STL, `manifest.csv` and the print notes.

## Print it

Print as placed: by default **standing on its long edge** with the flap sticking out sideways and
the hinge pin vertical, the way the original prints and the way the first print worked; or flat on
the bed with "Print orientation" under Printer. **No supports** either way. PLA or PETG, 0.2 mm layers, 3 walls.
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
npm run artifact   # build + artifact/page.html and assets for publishing as a claude.ai page
```

The app is also published as a claude.ai page (artifact) so it can be used without the hub; the
`downloads` capability saves files there (STL and 3MF arrive wrapped in a .zip, which the viewer's
sandbox allows). Republish after a change: `npm run artifact`, then publish `artifact/page.html`
with the files in `artifact/assets/` beside it.

## How it is built

Same Generation 2 layout as the other Valencia modelers, on a copy of the hub's shared engine in
`src/shared/` (manifold kernel, mesh checks, 3MF/STL writers, text). Geometry is in
`src/geometry/buildStand.ts`; every derived dimension is in `src/core/layout.ts` so the UI, the rules
and the geometry agree. The bar and flap profiles are drawn in the side plane and extruded across
the bar. The slot in the bar is the flap's whole swing (every angle from folded to open) grown by the
clearance, so the flap turns freely and the tail of the bar is its stop. Every part is checked
(closed, consistently wound, no degenerate triangles, positive volume) before export is allowed.

## AI assistant (Phase 0 proof of concept)

A chat panel beside the modeler. Describe a change in plain words ("make the keyring hole 6 mm",
"put my name on the flap", "make 12 of these for Ana, Ben and Cara"). The assistant proposes
*settings*, never geometry or code; the modeler's own engine builds the proposal, checks every mesh,
and shows it beside the current model. Nothing changes until you press **Apply**, and **Undo**
restores the settings from before the last applied proposal.

Every proposed change is listed with its status, so nothing is adjusted quietly:

| Status | Meaning |
|---|---|
| APPLIED | used exactly as asked |
| ADJUSTED | changed to fit the limits (for example a 9 mm keyring hole becomes 8 mm, the maximum), with the reason |
| REJECTED | not a setting, wrong type, or not one of the choices; left alone, with the reason |
| UNCHANGED | already that value |

A proposal that the engine refuses (an error such as "the flap is too thick for the bar") cannot be
applied or exported. A change that touches the hinge or the click lip is flagged **Print test
required**: an unchanged latch setting does not prove the snap-lock still works.

Running it:

```bash
cp .env.example .env.local      # add your ANTHROPIC_API_KEY; the key stays in the local proxy
npm run dev                     # http://localhost:5184
# without a key: http://localhost:5184/?ai=mock answers the 20 evaluation instructions with scripted replies
npm test                        # includes the 20 scenarios with mocked replies
npm run eval:live               # the same 20 scenarios against the live model (needs the key)
```

Exports wait while a proposal is pending. The hosted hub build does not include the proxy, so the
panel reports "no key" there until a hosted endpoint exists (not part of Phase 0). Details, results
and limits: `docs/AI_EDITOR.md`.
