# Rubber Spinner

A **press-and-spin fidget ball** you print in any colour mix: the ball is made of swappable
petals, a twisted shaft drives it through a one-way ratchet, and one small **rubber band** is the
return spring. Every part is its own object in the export, so each petal, the button, the hub and
the foot can be a different filament. Same idea as the shop-bought "spinner balls", designed from
scratch for FDM printing without supports.

Part of Clark's Valencia Modelers family (hub: `clarkstyx/modeler-hub`, served at `/m/rubber-spinner/`).

## What you get

| Part | Count | Prints | What it does |
|---|---|---|---|
| Petal | 5–8 | on its flat back | A slice of the ball. Slides up a dovetail rail on the hub. Any colour each. |
| Hub | 1 | standing | The ball's skeleton: rails for the petals, a bore for the shaft, saw teeth on top. |
| Shaft + button | 1 | button down | Three twisted lobes. Press the button: the lobes turn the nut. A slot under the button takes the band. |
| Nut | 1 | flat side down | Rides the shaft's twist; teeth underneath grip the hub's teeth one way and slide over them the other way. |
| Cup | 1 | rim down | Sits loosely on the hub, keeps the nut in place and carries the band on two hooks. |
| Foot | 1 | disc down | The disc the ball stands on; its split boss snaps into the hub and locks the petals in. |

Plus **one small rubber band** (a loom band, or an office band wrapped twice).

Settings: ball diameter (48–80 mm), petal count (5–8), a colour per part, optional letters set into
the button top as a second colour, button travel, twist lead (spin per press), fit clearance, bed
size. Exports: 3MF with one object per part and colours assigned (settings embedded so the file
reopens here), STL of the plate, a ZIP with one STL per part and an assembly README.

## How it works

Press the button and the shaft slides down through the nut. The shaft's three lobes are twisted
(a coarse three-start thread), so the nut has to turn. The nut's saw teeth push against the hub's
saw teeth in that direction, so the hub, and with it the whole ball, spins. Let go: the band pulls
the shaft back up, the nut turns back the other way, and its teeth slide over the ramps while the
ball keeps spinning. Press again to add speed.

The rubber band runs through a slot in the shaft just under the button, lies across the open top
of the cup in two notches, and hooks under two hooks on the outside of the cup. Pressing pulls the
band down into a V; it springs the button back. The cup is not fixed to the hub: it sits on a ledge
and is held by the band, so the ball turns underneath it and the band never twists.

The maths behind every number, print orientations and the assembly order: `docs/DESIGN.md`.

## Run

```bash
npm install
npm run dev        # http://localhost:5184
npm test           # vitest: design limits, assembly clearances, ratchet direction, exports, settings
npm run validate   # 40 settings combinations, every part watertight and every pair clear; writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/rubber-spinner/)
```

## Status

Designed and checked in software (watertight meshes, parts never overlap, the nut follows the
shaft, the ratchet drives one way). **Not yet test-printed**: the first print should check the
petal rails, the foot snap and the nut on the shaft at the default 0.3 mm fit, and that a loom
band gives a comfortable press.
