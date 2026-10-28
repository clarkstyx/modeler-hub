# Rubber Spinner

A **press-and-spin transforming ball** you print in any colour mix. Press the top: the petals
swing open into a flower and the ball spins. Let go: a **rubber band around the equator** pulls
the petals shut and the top pops back up. Every part is its own object in the export, so each
petal, the button, the hub and the ring can be a different filament. Same idea as the shop-bought
"press and spin" balls, designed from scratch for FDM printing without supports.

Part of Clark's Valencia Modelers family (hub: `clarkstyx/modeler-hub`, served at `/m/rubber-spinner/`).

## What you get

| Part | Count | Prints | What it does |
|---|---|---|---|
| Petal | 5–8 | on its flat back | A slice of the ball with a hinge tongue on top and the band groove at its equator. Snaps onto a pin under the hub. Any colour each. |
| Hub | 1 | upside down | The top: a disc with a boss for the button, ears with a hinge pin per petal, a tube down to a flange with saw teeth. |
| Shaft | 1 | foot down | Stands still. Pivot foot, a collar, then three twisted lobes. |
| Nut | 1 | flat side down | Rides the shaft's twist under the hub; its teeth grip the hub's teeth one way and slide over them the other way. |
| Cap | 1 | plate down | Snaps onto the hub's flange and keeps the nut in. |
| Button | 1 | top down | Presses onto the hub's boss; hollow so the shaft's top can rise into it. |
| Bottom ring | 1 | flat | Sits on the pivot foot; the petal tips rest and slide on it. |

Plus **one rubber band** around the equator (a #33 office band or a hair tie for a 60 mm ball).

Settings: ball diameter (48–80 mm), petal count (5–8), a colour per part, optional letters set into
the button top as a second colour, press depth (how far the petals open), twist lead (spin per
press), fit clearance, bed size. The preview has a press slider and an exploded view. Exports: 3MF
with one object per part and colours assigned (settings embedded so the file reopens here), STL of
the plate, a ZIP with one STL per part and an assembly README.

## How it works

The shaft stands still on its pivot foot. Everything else, the hub, nut, cap, button and petals,
slides down the shaft when you press the top. The petals hang from pins under the hub and their
tips sit on the bottom ring, so as the hub comes down they have no choice but to swing outward:
the ball opens into a flower (54° at the defaults) and the band in the equator groove stretches.
The nut comes down too, but it sits on the shaft's twisted lobes, so it has to turn; its saw teeth
push into the hub's teeth and the whole ball turns with it, 0.83 of a turn per press. Let go: the
band pulls the petals shut, which pushes the hub back up; the nut turns back the free way and the
ball keeps spinning. Press again to add speed.

The maths behind every number, print orientations and the assembly order: `docs/DESIGN.md`.

## Run

```bash
npm install
npm run dev        # http://localhost:5184
npm test           # vitest: design limits, clearances at rest / half / full press, ratchet direction, exports, settings
npm run validate   # 40 settings combinations, every part watertight and every pair clear through the stroke; writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/rubber-spinner/)
```

## Status

Designed and checked in software (watertight meshes, parts never overlap anywhere in the stroke,
the nut follows the shaft, the ratchet drives one way). **Not yet test-printed**: the first print
should check the petal snap, the cap snap and the nut on the shaft at the default 0.3 mm fit, and
which band gives a comfortable press and a firm close.
