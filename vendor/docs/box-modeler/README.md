# Box Modeler

Parametric **sliding-lid boxes, gift tins, jewellery boxes and sorting trays** in the browser, with
your text and artwork on the lid, exported as a colour-ready 3MF. One engine, many presets. Also
**enclosure racks**: stackable cubes with a pull-out drawer tray, joined by dovetail keys.

Lives inside the hub at `modelers/box-modeler/` and is served at `/m/box-modeler/` (Maker tier).
It is a normal Vite app and can move to its own repository by changing `path` to `repo` in
`modelers.json`.

## What it makes

- A box with rounded corners and a **lid that slides in from the front** along rails cut into the
  side and back walls. The front wall is lowered across the lid's width so the lid rests on it and
  sits flush when closed.
- Sizes given **inside** (what has to fit) or **outside** (overall), wall, base, corner radius.
- **Fit**: lid thickness, rail depth (auto-capped so the wall outside the rail keeps two nozzle
  widths), rail lip, clearance, thumb notch or raised ridge.
- **Compartments**: rows × columns of dividers at a fraction of the inside height.
- **Lid decoration**: multi-line text in four bundled fonts, reading along or across, auto-shrunk
  to fit; raised (second colour), engraved, or flush inlay (second colour, smooth top). SVG artwork
  with one part per fill colour, placed above the text.
- **Lid fit test**: a short box section plus three lids at your clearance ±0.1 mm, each labelled.
- Exports: 3MF (box and lid as two objects, every colour on its own filament slot, settings
  embedded so the file reopens here), single-colour STL, STL per part (ZIP), settings JSON.
- **Batch** (section 9): a typed list of names (`Noah | 2` for two) or an order CSV (pick the text,
  order id and quantity columns) becomes one personalised lid per name, or a box beside every lid,
  packed onto plates that fit your bed. Download one plate as 3MF, or every plate plus a
  `manifest.csv` (name → order → plate → position) as a ZIP. Up to 200 lids.

### Enclosure rack (Making a → Enclosure rack)

A stackable cube for each small enclosure (isopod/tarantula/plant boxes), as in the "modular
enclosure shelf" pictures people ask for:

- **Sizes from the enclosure**: width, depth and height (inches or mm), a gap on each side and above,
  and space behind for air and cables. The cube is built around one enclosure.
- **Drawer tray** with a D-handle and a shallow recess the enclosure sits in. A ramp on the cube
  floor lets the tray in and catches it on the way out (it slides out half its length by default).
  To take it out completely, pull to the stop and press the handle down so the back lifts over.
- **Vented back** (round holes, size and spacing adjustable, or none).
- **Joining keys**: every outer face has two dovetail grooves; bowtie keys slide in from the front
  to join cubes side by side and on top of each other. Pick a columns × rows layout and the 3MF
  holds every key that layout needs. A **key fit test** (two blocks + keys at ±0.05 mm) sets the
  clearance.
- One 3MF holds one cube, one tray and the keys; print the cube and tray once per compartment.
  The cube prints **on its back** (open side up) so walls, grooves and vents need no supports or
  bridges; the tray prints flat. On a 256 mm bed the cube fits enclosures up to about 8 in wide.
- Views: print layout, or the assembled rack with see-through enclosures and one tray pulled out.

Presets: enclosure rack 4 × 4 × 6 in, enclosure rack 6.25 × 3.5 in (6 in tall assumed).

### Box presets

Presets: gift tin, jewellery box (2 × 3), business-card box, storage box (3 × 2), personalised gift
box, pencil box, 7-day pill box, pet treat tin.

## Run

```bash
npm install
npm run dev        # http://localhost:5181
npm test           # vitest, headless geometry + export tests
npm run validate   # builds every preset and edge case, checks meshes, writes out/*.3mf
npm run build      # production build (the hub passes --base=/m/box-modeler/)
```

## How it is built

All geometry runs in a Web Worker on **manifold-3d**. The rack lives in `src/geometry/buildRack.ts`
(`deriveRack` in `src/core/params.ts`, checks in `validateRack`). For the box: the body is a prism minus the cavity, minus
the rail (the cavity outline grown by the rail depth, from the lid's underside up to the lip),
minus the front opening; dividers are unioned in. The lid is a prism of a rectangle whose front
corners follow the box corners and whose back corners follow the rail. Decoration regions are 2D
cross-sections (text from three.js typeface fonts, artwork from the SVG) that are extruded on top
of, cut into, or inlaid flush with the lid. Parts never overlap: raised and inlaid regions are
booleans of the same sections, and the pipeline checks pairwise intersection volume.

Every exported mesh is checked independently (closed, consistently wound, no degenerate triangles,
positive volume) and export is blocked on any error. See `../../docs/GENERATOR_ARCHITECTURE.md`.

## Printing

Print both objects as placed: flat, no supports, 0.2 mm layers. The default 0.25 mm clearance suits
well-tuned printers; **print the fit test first** for a new printer or material and set Clearance
to the lid that slides without rattling. The physical fit has not been verified yet; see
`../../docs/PRINT_VALIDATION.md`.

## Known limitations

- No PNG/JPG tracing (convert to SVG first, or use the Image Keychain modeler's tracer).
- Only rectangular (rounded) outlines; no oval "sardine tin" ends yet.
- No lid pattern generator, no batch mode yet (planned platform feature).
