# Pop Socket Text Modeler

Type a word or two and get **puffy bubble letters with sparkly gems** as a colour-ready 3MF for your pop socket, in the browser. The flat back glues onto any pop socket top; or add a backing disc and glue that.

Made after a request in a 3D printing group for a custom "THAT GIRL" pop socket: pink inflated letters, stacked on two lines, tilted, with little gems set into them. Nothing on MakerWorld did custom bubble text for a pop socket, so this does.

Sibling of [image-keychain-modeler](https://github.com/clarkstyx/image-keychain-modeler): same Vite + React + three.js stack and the same Bambu-friendly 3MF writer, but the geometry here is built with [manifold-3d](https://github.com/elalish/manifold), so every part is a watertight solid and no two parts overlap.

## How it works

1. **Text**: up to three lines in one of five bundled bold fonts (they work offline). Every other letter is tilted (*wobble*) and nudged up or down (*bounce*) for the hand-drawn look, and the whole word can be tilted.
   - **Round** (default): the word block is squeezed into a circle of the chosen *Diameter*, the way a name phone-grip topper is made. Lines are widened to match the longest one, the block is stretched to fill the circle top to bottom (*Fill the circle*, 0 keeps the letters' proportions) and its corners are pushed in along a square-to-disc mapping (*Roundness*). Straight edges are subdivided first so they bend smoothly.
   - **Free**: natural letter shapes at a chosen *Design width*, like the "THAT GIRL" photo that started this. The capital-letter height follows and is shown under *Check*.
2. **Bubble shape**: *Puff* inflates the letters with round joins until neighbouring letters (and lines) fuse into one blob. The blob is extruded as a straight wall plus a rounded top: a stack of thin slabs each eroded a little more along a quarter-circle profile, which the slicer prints as a smooth pillow. If the letters are still separate pieces, a note says so: raise *Puff* or tighten the spacing.
3. **Gems**: diamonds (faceted), hearts, stars or round studs scattered over the letters, never near an edge, with a minimum distance between them. *Shuffle positions* tries a new layout. Each gem's lower half is cut out of the letters and the gem fills the pocket, so the two colours never overlap and the gem reads as set into the letter.
4. **Backing** (optional): in round mode the disc is exactly the design circle. In free mode *Outline plate* hugs the letters by a border and *Round disc + outline* adds a disc under them, like the white PopGrip top showing round the letters in the photo. The plate always covers the whole underside of the letters, so the print needs no supports.
5. **Check**: size, each part with its filament slot and volume, and notes about anything that will not print well.
6. **Download 3MF**: one object with parts named `Letters`, `Gems` and `Base`, one `m:colorgroup` per colour and `Metadata/model_settings.config`, so Bambu Studio and OrcaSlicer put every part on its filament straight away. STL (single colour) and a settings file are also available. The 3MF keeps your settings: open it again in the app with *Open a saved 3MF or settings file…* to carry on editing.

## Grip hardware and fit

Grip dimensions live in `src/hardware.js`, apart from the decorative generator, as presets with an overall diameter, the flat **bonding face** the topper glues to, the overhang past it, the topper diameter that follows, a backing thickness, the attachment method and a **verification status**. The PopGrip numbers come from the Amazon Merch on Demand PopSockets FAQ: a 1.56 in (39.6 mm) top, artwork printed full-bleed over the whole top button, and an inner safe zone (about 84% of the diameter in its template drawing, about 33 mm) where printing is guaranteed; the safe zone is taken as the bonding face. Published sizes describe the printed face, not the glue face, so nothing here claims a universal fit.

| Preset | Topper | Status |
|---|---|---|
| PopSockets PopGrip top, glued on (default) | 38.5 mm on the 33 mm safe zone of a 39.6 mm top | **Unverified: physical fit test required** |
| Generic 40 mm expandable grip | 38 mm on an assumed 36 mm face | **Unverified: physical fit test required** |
| Custom measured flat-top grip | your measured face + overhang | your own measurement |
| PopSockets swappable top, snap-in | 39.6 mm | **future**: the twist-lock connector has not been measured, so it is listed but not selectable and no snap geometry is generated |

Picking a preset sets the topper diameter and backing thickness (both still editable). *Check* then reports the flat glue face in mm² and how much of the grip's bonding face it covers, and warns when it is less than full. **Download calibration set** gives three plain 2 mm toppers at 37, 38 and 39 mm with their size on top: print them once, hold them on the grip, and design to the one that fits. Adding a grip is one entry in `hardware.js`; a snap-fit preset gets its geometry only after a real connector has been measured with calipers.

## Print checks

Made for a 0.4 mm nozzle, 0.2 mm layers and PLA, with up to four filaments; the nozzle, layer height and the thinnest stroke worth keeping (0.8 mm by default) are settings. Every build:

- is built with real booleans (manifold-3d), so every part is a watertight solid and no two parts overlap: gems are cut out of the letters, inlaid letters out of the backing;
- has a flat, full-size underside at z = 0 for gluing; only the backing's *top* edge is rounded (0.5 mm, in steps of one print layer);
- builds the rounded letter tops in steps of one print layer, so the slicer sees predictable Z transitions;
- flags letter strokes thinner than the minimum line (measured by an opening of that width), gems too small for the nozzle, letters that are separate pieces with nothing joining them, capitals under 7 mm, and a glue face smaller than the grip's;
- prints flat on the bed with no supports in every mode, because the backing always covers the whole underside of the letters.

*Relief* chooses between **raised** puffy letters (0.4 to 6 mm of straight wall plus a rounded top, 0.6 to 1 mm for a low relief) and a **flush inlay**, where the letters are sunk level into the backing with at least 0.6 mm of floor under them. *Mirror* flips the design only when ticked. Lines are centred, or left or right aligned in free mode.

## Fitting a pop socket

- **Glue-on (default, no fit risk):** the default is a 38.5 mm round design on a 2 mm disc, sized for a PopGrip top; glue its flat underside to the top of the grip with super glue or E6000. Set *Backing* to *None* to glue the letter blob itself, or switch to *Free* and 55 to 65 mm to overhang the grip like the photo.
- **Swappable (twist-lock) PopTop:** not built. The twist-lock teeth are tiny and nobody publishes their dimensions, so a printable version needs a real PopTop measured with calipers first. The preset exists so the geometry can be added without touching the generator; open an issue with the measurements if you want it.

## Printing

- Print as exported: flat side down, letters up, no supports.
- 0.2 mm layers or finer for a smooth rounded top; 0.12 mm looks like the photo.
- Silk or pearl PLA for the shiny bubble look; white or translucent for the gems.

## Run

Requires Node 18+.

```bash
npm install
npm run dev        # opens http://localhost:5177
npm run build      # production build into dist/
npm run check      # builds 14 variants plus the calibration set in node and checks every part is
                   # watertight, every edge is shared by exactly two triangles, no part overlaps
                   # another, and the inlay is flush; writes out/*.3mf to open in the slicer
```

### Hosted page (claude.ai)

```bash
npm run build:artifact
```

writes `dist-artifact/page.html` plus `app.js`, `worker.js` and `manifold.wasm` as supporting files. Publish `page.html` with those three files alongside it. Downloads on a hosted page go through the page's downloads capability, which wraps the 3MF in a `.zip`.

## Layout

| File | What it is |
|---|---|
| `src/hardware.js` | Grip presets: dimensions, attachment method and verification status, separate from the generator |
| `src/geometry.js` | Text layout, puff, dome, inlay, gems, backing, fit and print checks, calibration set: pure functions on manifold-3d (run in node and in the browser) |
| `src/worker.js` | Web Worker that loads manifold-3d and the fonts and builds the model off the main thread |
| `src/export.js` | 3MF writer, binary STL, project settings, downloads |
| `src/App.jsx` | The UI and the three.js preview |
| `scripts/check-export.mjs` | `npm run check` |
| `scripts/build-artifact.mjs` | `npm run build:artifact` |
