# Trinket Tray Generator

Turn an image into a **printable multicolor trinket (valet) tray or coaster** for FDM printers with an AMS or another multi-material system.

You upload a PNG, JPG, WebP or SVG. The app converts it into clean flat color regions and builds a parametric tray (or, with the **Tray / Coaster** switch at the top, a coaster) around it. The artwork sits as a **flush inlay** in the floor, so keys and coins never catch on it. You can preview the tray in 3D, and when the geometry passes validation you can export:

- a **multi-part 3MF** with named, colored parts
- a **ZIP with one STL per color**
- a **settings JSON**

![App screenshot](docs/images/app-emblem.png)

> Uploaded artwork is the responsibility of the user. Users should ensure they have the necessary rights to reproduce artwork, logos, or trademarks.

## Quick start

Prerequisites: **Node.js 20+** (22 is tested) and a modern browser with WebGL.

```bash
npm install
npm run dev          # http://localhost:5173
```

You can then either:

- drop in an image, or
- click **"Load the generic sample emblem"**.

Then adjust the parameters on the left and download from the right.

## Commands

| Command                                                 | What it does                                                                                            |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `npm run dev`                                           | Development server (frontend + geometry worker; there is no separate backend)                           |
| `npm run build`                                         | Typecheck, then production build into `dist/`                                                           |
| `npm run preview`                                       | Serve the production build                                                                              |
| `npm test`                                              | Unit and integration tests (Vitest, 75 tests)                                                           |
| `npm run lint` / `npm run typecheck` / `npm run format` | ESLint / `tsc` / Prettier                                                                               |
| `npm run check`                                         | Lint + typecheck + tests + build                                                                        |
| `npm run fixtures`                                      | Regenerate the license-free test artwork in `examples/assets/` and `public/`                            |
| `npm run sample`                                        | Headless acceptance sample, written to `examples/output/`                                               |
| `npm run e2e`                                           | Browser walkthrough in headless Chromium (start `npm run dev` first; set `E2E_URL` if the port differs) |
| `scripts/verify_3mf.py`                                 | Optional: verify a 3MF with lib3mf (strict mode) and trimesh. See `docs/SLICER_TESTING.md`              |

## Workflow

1. **Artwork:** upload an image and choose a mode.
   - _Logo / graphic_ keeps crisp flat colors.
   - _Photo_ posterises to 4 colors by default.
   - Set max colors (2–8) and choose whether to remove a solid background.
2. **Colors:** the detected palette with HEX values. You can recolor, merge A into B, remove (make transparent), reorder or reset.
3. **Shape:** artwork silhouette, circle, rounded rectangle, oval, hexagon or octagon.
4. **Size:** max dimension (50–230 mm), artwork margin and artwork scale.
5. **Floor / wall & rim / text / background pattern / underside & printing / colors / printability:** these sections start collapsed so the first view stays simple. See [Coasters](#coasters) for what each one does.
6. **Preview:**
   - The 3D view supports orbit, pan and zoom, perspective/top/bottom views, reset, a grid toggle, PNG export, and an overall dimension readout.
   - The 2D view shows **Original / Colors / Processed**. _Processed_ is the exact cleaned geometry that will be printed.
7. **Validate and export:** "✓ Geometry valid" or a clear list of problems. Export is blocked if any part fails.

## Default preset: "Standard Multicolor Tray"

| Parameter                | Default                                 |
| ------------------------ | --------------------------------------- |
| Max dimension            | 170 mm                                  |
| Structural backing       | 2.4 mm                                  |
| Flush inlay depth        | 0.8 mm, so the finished floor is 3.2 mm |
| Wall height above floor  | 6.0 mm, so the total height is 9.2 mm   |
| Wall thickness           | 2.4 mm                                  |
| Artwork margin           | 5 mm                                    |
| Accent ("eco") rim       | top 0.8 mm of the wall                  |
| Nozzle / minimum feature | 0.4 / 0.8 mm                            |
| Max colors               | 4                                       |
| Art mode / shape         | flush inlay / artwork silhouette        |

There are also **Small Tray** (120 mm) and **Large Tray** (210 mm, thicker wall and backing) presets.

## Size-independent detail

The same picture should look the same on a 170 mm tray and a 105 mm coaster.

- **Auto-adjust detail to size** (Printability, on by default): the minimum feature (0.8 mm) applies at 170 mm and larger, and shrinks in proportion for smaller pieces, down to 1.1 × the nozzle. A 105 mm coaster keeps details down to 0.49 mm. The validation panel says when this happened.
- **Thin lines → Keep** (default): lines and veins thinner than the minimum feature are widened instead of filled in or erased, so leaf veins stay lines rather than breaking into dots.
- **Fit artwork by → Colored parts** (default, fixed shapes): parts of the picture in the body color, such as a dark circle behind a logo, merge into the floor anyway, so the artwork is sized by its other colors and fills the piece. "Whole picture" fits everything.
- **Centring:** by default the box around the artwork is centred. For lopsided designs choose **Centre artwork on → Visual centre**, which centres the artwork's centre of mass instead, so it stays put while you change the scale. **Nudge left / right** and **up / down** move it by hand (fixed shapes).
- **Filling the piece:** the Size section shows where the gap to the outer edge comes from (wall or lip, drip groove, text band, margin). The margin goes down to 0 mm, where the artwork touches the inside of the wall. Artwork scale goes up to 200%: above 100% the artwork runs past the margin and is cut off at the wall, or at the drip groove, and a warning says how much was cut.

## Coasters

Switch **Tray / Coaster** at the top. A coaster is a low, flat tray: a thin base with the artwork as a flush inlay, so glasses stand level. Everything else (color detection, cleanup, preview, validation, 3MF / STL export) is shared with trays.

![Coaster mode](docs/images/app-coaster.png)

| Option             | What it does                                                                                                                                                                     |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shapes             | Circle, rounded square / rectangle, oval, hexagon, octagon, or the outline of the artwork. Hexagons and octagons are sized across the corners.                                   |
| Lip & rim          | A low raised lip (default 0.8 mm) catches drips; its top can be an accent color. With no lip, the border can be a flush colored ring.                                            |
| Drip groove        | A channel just inside the lip that catches condensation.                                                                                                                         |
| Text               | Top and bottom text, curved around the edge (arc) or straight above and below the artwork. Two bundled fonts, letter height in mm, any color. Inlaid like the artwork.           |
| Background pattern | Rings, dots, grid, stripes or honeycomb on the free floor around the artwork, in its own color. Works on trays too.                                                              |
| Underside          | Pockets for stick-on rubber or felt feet (3–12, any size), or a shallow recess for a cork / felt pad.                                                                            |
| Print face down    | Prints the coaster upside down, so the top gets the build plate's glossy or textured finish. Needs a flat top. Required for the cork recess (face up it would be a huge bridge). |
| Holder             | A matching cup for a stack of coasters, with a front notch and a push-up hole in the floor. Shown beside the coaster; separate 3MF / STL download.                               |

Presets: **Round Coaster (105 mm)**, **Square (95 mm)**, **Hexagon (105 mm)**, **Large Mug (110 mm)**, **Glass / Can (90 mm)**, **Flat, printed face down** (cork recess) and **Logo-shaped**. The round coaster is 105 × 105 × 4.8 mm: a 4 mm base (3 mm backing + 1 mm inlay) and a 0.8 mm lip with a 0.4 mm accent rim, a 2 mm wide, 0.6 mm deep drip groove, and a flat underside (feet pockets are an option).

Text, patterns, feet and face-down printing also work on trays. Problems are reported instead of silently cut off: text that doesn't fit, pockets that would break through the base, or a recess that can't be printed face up all block export with a clear message.

**Material:** PLA is fine for cold drinks. For hot mugs use PETG: PLA starts to soften around 60 °C.

## Architecture (short)

- **Stack:** Vite, React 19, strict TypeScript and Three.js.
- **Geometry:** all geometry runs in a **Web Worker** on **[manifold-3d](https://github.com/elalish/manifold)**, a WASM library with guaranteed-manifold booleans and Clipper2 for 2D.
- **Modules:** `image/` (segmentation), `geometry2d/` (polygons), `tray/` (layout and solids), `mesh/` (validation), `export/` (3MF, STL, PNG) and `ui/` (React only).
- **Headless use:** the same engine runs in Node for tests and scripts.

Details are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

### Geometry pipeline

```
IMAGE → color masks → pixel-edge contours → mm scaling → printability filter (mm)
      → tray footprint → color partition → extrusion → manifold parts → validation → 3MF / STL
```

- **Flush inlay:** the backing runs from Z 0–2.4 under the whole footprint. Color inlays run from 2.4–3.2 and finish exactly level with the body-colored floor. The wall ring rises to 9.2, and an optional accent rim covers 8.4–9.2.
- **No overlaps:** no two solids share volume.
- **Validated before export:** every part is checked for watertightness, consistent winding, positive volume, no degenerate triangles and no NaN values before export is allowed.

See [docs/GEOMETRY.md](docs/GEOMETRY.md).

### Export formats

- **3MF:** standards-first (Core and Materials extension).
  - One assembled `TRINKET_TRAY` object with parts such as `BODY_GREEN`, `COLOR_01_BLACK`, `COLOR_02_WHITE` and `RIM_WHITE`.
  - One color group per color, units in mm, and a thumbnail.
  - An optional `Metadata/model_settings.config` lets Bambu Studio and OrcaSlicer place each part on its own filament slot.
  - See [docs/3MF_EXPORT.md](docs/3MF_EXPORT.md).
- **STL ZIP:** `body_green.stl`, `color_01_black.stl`, and so on. All files share one origin.
- **Settings JSON:** the full `Recipe` (tray, print, image, export and palette edits). It can be imported again.

## Examples

- **Inputs:** `examples/assets/` holds generated, license-free test artwork (emblem, letters SVG, transparent PNG, islands, thin features, synthetic photo).
- **Outputs:** `examples/output/` holds the acceptance sample:
  - `sample-tray.3mf`
  - `sample-tray-stls.zip`
  - `sample-tray-settings.json`
  - `sample-tray-preview.png`

  It is a 148 × 170 × 9.2 mm green/white/black emblem tray with a white accent rim.

- **Coaster sample:** `sample-coaster.3mf`, `sample-coaster-holder.3mf`, `sample-coaster-settings.json` and `sample-coaster-preview.png`: a 105 mm round coaster with "CHEERS" / "EST. 2026" arc text and a ring pattern, plus its holder.

## MakerWorld version

`makerworld/` holds a customizable OpenSCAD version for MakerWorld's Parametric Model Maker. Buyers upload a PNG or SVG on MakerWorld, choose a tray or a coaster (with text, patterns, feet pockets, face-down printing and a holder), pick colors, and download a multicolor 3MF. It splits PNG colors by brightness rather than hue, so it is simpler than this app. The folder also has copy-paste listing text, preview renders, tray and coaster sample 3MFs and upload steps: see [makerworld/README.md](makerworld/README.md).

## Testing

- **Unit and integration (`npm test`):** image (transparency, background removal, quantization count, determinism, palette merge), polygons (offset, holes, simplification, islands, spikes, partition), tray (dimensions, Z ranges, every shape, rim and art mode), 3D validity, 3MF package and XML, STL alignment, SVG (counters, transforms, color merge) and recipe tests.
- **Browser E2E (`npm run e2e`):**
  1. Upload the emblem, then change the wall height and the shape, and check that the tray regenerates.
  2. Enter an impossible parameter combination and check the validation message.
  3. Export the 3MF, STL ZIP and settings JSON, and check the downloads.
  4. Upload the SVG and run photo mode.
- **3MF verification:** lib3mf strict mode reports 0 warnings, and trimesh confirms the meshes are watertight.
- **Slicer checks:** the manual slicer checklist is in [docs/SLICER_TESTING.md](docs/SLICER_TESTING.md).

## Current limitations

- **Not opened in real slicers yet.** It was not tested in Bambu Studio or OrcaSlicer from this environment, because downloading them is blocked. The 3MF is verified with lib3mf and trimesh instead; see the manual checklist.
- **Very thin lines are widened.** A line or vein narrower than the minimum feature is kept and widened by half the minimum feature (Printability → Thin lines → Keep), so it may print a little bolder than drawn. Choose "Remove" to delete such lines instead.
- **Photos are posterised.** Gradients are flattened on purpose.
- **Some SVG features are ignored:** strokes, text, filters, masks, clip paths and embedded images. A warning lists what was skipped. Convert strokes and text to outlines first.
- **No bevel on the wall.** The wall top is flat; a bevel is on the roadmap.
- **PrusaSlicer** ignores 3MF colors and splits components into separate objects. Use the STL ZIP and its "single object with multiple parts" import there.

## Roadmap

See [docs/ROADMAP.md](docs/ROADMAP.md). Next up: a slicer round-trip in CI, an optional Bambu project exporter profile, thickening thin features, and a no-AMS insert mode.

## Credits

- **Dependencies:** [manifold-3d](https://github.com/elalish/manifold) (Apache-2.0), [three.js](https://threejs.org) (MIT), [fflate](https://github.com/101arrowz/fflate) (MIT) and [React](https://react.dev) (MIT).
- **Research:** see [docs/REFERENCE_RESEARCH.md](docs/REFERENCE_RESEARCH.md) for the projects studied and their licenses. No third-party code was copied.
