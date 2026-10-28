# Clicker Maker

**Keycap name clickers for 3D printing.** Pick how many keys, type the letters, choose a plain
keyring or a charm on top, and download a colour-ready 3MF for Bambu Studio / OrcaSlicer.
Part of the Valencia Modelers family.

![Keyring clicker](docs/images/keyring.png)
![Charm clicker](docs/images/charm-kitty.png)

## Sizes and shapes

- **Classic keys** (17.4 mm keycaps, 20 mm apart) or **Big keys** (21.2 mm keycaps on a 25 mm
  base, like the "I Love U" clicker). Same MX switches either way.
- Base shape: **Rectangle** (one rounded box) or **Silhouette** (one rounded square per key,
  joined, so it pinches in between keys).
- Outer wall: **Smooth**, **Grooves** (rings round the base) or **Ridges** (wavy, up and down).
- The bottom is closed: no holes. (A push-out hole under each switch is an option.)

![Big keys, silhouette base, ridges](docs/images/big-bubble.png)

## Clicker bar: pictures instead of letters

Under **Keys**, switch the keycap tops from **Letters** to **Pictures** and every key gets a picture,
like the beads of a "create your own clicker" bar: click a key, then a picture for it (the 69
Valencia Kawaii designs, the simple shapes, your own upload), and the next key is selected for you.
A key with no picture shows its letter, so names and pictures mix on one base. The picture is
scaled to the flat top of the keycap (12 mm on classic keys, 15 mm on big keys) and cleaned for
printing. Each picture colour is **raised** like the letters by default, or a **flush inlay** or
**engraved**. A picture colour with the same name as one of your clicker colours (a cream, a red)
uses that filament, so a bar still prints with a few colours; every colour can be changed.

For a shop bar, the **Keycap sheet** section is a plate of keycaps only: click the pictures (and
type letters) you want, set a quantity for each, and the **Keycap sheet** view shows the plate;
**Keycap sheet 3MF** downloads it as one print. Print stock for the bins, and print the bases
separately in each colour.

## Printer

Pick your printer under Shape & branding: **Bambu Lab A1 Combo** (256 mm, AMS lite 4 spools),
**Anycubic Kobra X Combo** (260 mm, ACE 2 Pro 4 spools), **Flashforge Creator 5 Pro** (256 mm,
4 toolheads) or another. It sets the bed, how many filaments the printer holds at once (the app
warns when a print needs more), and whether to split prints by colour: the Creator 5 Pro has a
toolhead per colour and does not purge, so it prints everything in one go.

![Clicker bar](docs/images/clicker-bar.png)

**Tiles** (the first group in the gallery) are nine faces drawn for keycaps: fox, panda, frog,
dino, strawberry, robot, sun, mushroom and cloud. Each has a tile colour, so its keycap prints in
that colour (an orange fox key, a green frog key) and the face's main colour shares the keycap's
filament. Any key can get its own colour (*Key N colour*, or *Auto* for the tile colour). With
*Emboss: stacked by size* the faces build up in layers like moulded clay tiles. Keycaps of
different colours print as separate prints, one per colour. Redraw or add tiles with
`python3 scripts/draw-tiles.py`.

![Tiles on a clicker bar](docs/images/tiles-bar.png)

**Moods** are twelve expressions, one per keycap, each on its own colour: happy, laughing, wink,
tongue out, sleepy, surprised, love, angry, crying, cool, dizzy and shy. A bar or a sheet of them
is a set of different moods. Drawn by the same script; the same Tiles and Moods are in the Icon
Bead modeler under *Valencia*.

![Moods](docs/images/moods.png)

## Shape clicker: the picture is the button

One switch, and the button is a picture: pick one of the 69 **Valencia Kawaii** designs (Tiles, Moods,
Everyday, Christmas, Pets, Food and Squishy), a simple shape, or **upload your own PNG, JPG or SVG**. The **whole picture is kept**
by default, never cropped: the clicker grows to fit it, and separate parts (a sticker sheet) are
joined by a backing. You can also pick just one sticker from a sheet. Photos and drawings are traced
to 2–6 flat colours.

- **Button**: the picture's outline as a 6.5 mm slab, printed **face up**. Each picture colour
  can be a **flush inlay**, **raised** or **engraved**; all print without support. Underneath: a
  45° hollow for the switch body and the MX stem down to the bed.
- **Tray**: the same outline, bigger by a wall (1.8 mm), with the button sunk into it so there is
  no gap. A thin sleeve holds the switch; the rest is hollow. The ring loop sits on the tray's
  highest point. Smooth, grooved or ridged wall.
- **Emboss**, like the Image Keychain: **Flat** (each colour at its own setting) or **stacked by
  size, darkness or brightness** (the first colour stays flush, each next one steps up by the
  *Step*, 0.4 mm). Any colour can be pinned to flush, raised or engraved, and you can **click a
  colour on the 3D view** to cycle it flush → raised → engraved. The same options apply to charms
  and to the pictures on keycaps.
- Pictures are cleaned for the nozzle: lines thinner than 0.4 mm and specks under 0.5 mm² are
  dropped, so auto-traced art prints clean. Drawing guidelines for new charms: `docs/ART_PROMPT.md`.
- Palm-sized: 35 mm by default. The switch needs a solid area about 20 mm across, so very thin
  pictures are enlarged a little, or get a small backing pad behind them.

![Shape clicker, axolotl](docs/images/shape-axolotl.png)
![Traced from a sticker sheet](docs/images/shape-traced-sheet.png)

## Stackable: a block per key, on paracord

The **Stackable** mode prints one small base block per key instead of one long base, like the
Super Fidget clickers: each block holds one switch under a big 21.2 mm keycap and has a cord
tunnel along each side (Ø 5.2 mm, for 4 mm / 550 paracord). Print blocks in different colours,
thread them on two cords and mix any colours in any order; knot the cords or add end beads to
hold the stack. Each block can have its own colour (*Colours → Block N*), and the keycap sheet can
print stock: *Stackable blocks → Add* puts blocks of a colour on the sheet.

The tunnels are teardrops (pointed roof), so the blocks still print open side up with no support.
Print the fit test (one block, one keycap) to check your cord slides through.

![Stackable blocks on paracord](docs/images/stackable.png)

## Two key-clicker styles

- **Keyring**: the base ends in a low tapered **tag with a slot** (for a split ring, ball chain or
  strap), or a small round loop. Reads left to right by default.
- **With charm**: the base has a **male dovetail** on the end; the charm has the **female slot**.
  Slide the charm straight down onto the base. The charm's keyring loop goes on its highest point
  (an ear tip, a crown point), flat on the bed so it prints without support. Letters stack under
  the charm by default.

Built-in charms: bunny, kitty, bear, heart, star, flower, cloud, paw, crown, butterfly, an
initial badge, or **your own SVG** (filled shapes, one colour per part). Every charm layer can use
the base, keycap or letter colour, so a whole clicker prints with 3 filaments.

## What you print

Everything comes out already in print position, no supports:

- the base, open side up (1–10 keys, 20 mm apart, an MX switch hole under each key);
- one keycap per key, **upright**, with the letter raised on top (the colour change is only in
  the top layers);
- the charm, face up.

![Print plate](docs/images/print-plate.png)

The download is a zip with **one 3MF per main colour** (bases, keycaps, charm), each on the bed,
so the printer only swaps filament for the letters and charm face, not on every layer. Works in
OrcaSlicer, Anycubic Slicer and Bambu Studio. Untick "One file per colour" for a single 3MF. The
fit test is one colour.

**Filament slots are the same in every file**: one slot per colour for the whole clicker (the
app's readout and the zip's README list them, e.g. 1 Pink, 2 Cream, 3 Red). Load your AMS / ACE
in that order once and every file opens already coloured. Parts are named by colour too
(`KEY_1_LETTER · Red`). Each picture colour (Shape clicker and charm) can be a flush inlay, raised
or engraved.

Your brand (`VALENCIA` by default) is hidden: it is saved as the Designer in every 3MF, not
printed on the part. You can also press it into the floor under the first switch, or show it on
the side.

Then: snap an MX-style switch into each hole, press a keycap on each, slide the charm on, add a
split ring or ball chain. **Print the fit test first** (Export → Fit test 3MF): one key, one cap
and a dovetail coupon, and tune the "Fit" settings to your printer.

The sizes come from measuring the reference clickers: see
[docs/REFERENCE_MEASUREMENTS.md](docs/REFERENCE_MEASUREMENTS.md).

## Run

```bash
npm install
npm run dev        # http://localhost:5190
npm test           # vitest: parameters, every charm, fit/clearance checks, 3MF structure
npm run validate   # builds 16 variants, checks every mesh, writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/clicker/)
```

## How it is built

Same Generation 2 layout as the other modelers: geometry runs in a Web Worker on
**manifold-3d**, every exported mesh is checked (closed, consistently wound, positive volume), and
export is blocked on any error. The settings are embedded in each 3MF so it reopens in the app.

| File | Role |
|---|---|
| `src/core/params.ts` | every parameter, its default and limits; `derived()` positions |
| `src/core/validate.ts` | blocks clickers that would not work (switch too deep, thin walls…) |
| `src/geometry/base.ts` | the switch holder, keyring tab, male dovetail, side branding |
| `src/geometry/keycap.ts` | keycap with MX stem and a raised letter or a picture (clicker bar) |
| `src/geometry/charm.ts` | charm body, border, female slot, auto-placed ring loop |
| `src/geometry/charmLibrary.ts` | built-in charm artwork and SVG charms |
| `src/geometry/build.ts` | all pieces of one clicker, assembled preview, fit test |
| `src/pipeline/generate.ts` | mesh checks, plate layout, 3MF / STL |
| `src/ui/App.tsx` | sidebar, preview, exports |
| `src/shared/` | copy of the hub's `packages/geometry` (fix bugs there first) |
