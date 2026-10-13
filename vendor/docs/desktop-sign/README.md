# Desktop Sign Modeler

A browser modeler for custom, 3D-printable **desktop signs** — standing
nameplates like `Ms. Barnes`, `Janelle Dee`, or `Coach Barrington`: raised text
on a silhouette or plate body that leans back on a foot, exported as 3MF or STL.

It's a sibling of the name-keychain modeler: same live three.js preview and
parametric sidebar, but the keyring is gone and the model now stands, leans, and
takes multiple lines of text.

## Run it

```bash
npm install
npm run dev      # opens http://localhost:1221
```

```bash
npm test         # Vitest unit tests for the geometry math
```

## How it's built

Each glyph is laid out in the XY plane, the body silhouette is built around it
with clipper, and both are extruded into a thin **panel**. The panel leans back
over a flat **foot** (the L-foot stand), pivoting about its bottom-front edge so
the base welds into the foot at any angle. Key dimensions:

- **Panel Thickness** — how thick the leaning panel is.
- **Text Raise** — relief height of the letters (and logo) on the front face.
- **Display Angle** — how far the panel leans back from vertical.

Scene groups: `displayGroup` (drag) → `leanGroup` → `modelGroup` (scale +
geometry). The lean is baked into the panel geometry, so export reads the
standing model with drag zeroed and the model scale baked in.

### Files

| File | What it is |
| --- | --- |
| `src/signGeometry.js` | Pure geometry — multi-line layout, outline silhouette + flat bottom, plate, lean wedge, arch cut. No scene/React/DOM, so it's unit-tested and mirrors the SCAD. |
| `src/logoGeometry.js` | Pure logo geometry — trace an uploaded image to relief (`traceBitmap`), parse an SVG (`parseSvgPaths`), and place it on the face (`placeLogo`). |
| `src/threeMF.js` | Dependency-free 3MF writer (store-ZIP + core XML) — one coloured object per part. |
| `src/*.test.js` | Vitest unit tests for the geometry + 3MF functions. |
| `src/SignModeler.jsx` | The UI + three.js scene. |
| `desktop-sign.scad` | Parametric mirror for the OpenSCAD Customizer / MakerWorld. |

## Controls

- **Text** — name (multi-line: press Enter for a new line), font, size, line
  spacing, text raise, bevel, and fit-to-plate.
- **Title** — optionally tick **Add title** for a subtitle under the name, with
  its own text, font, and size. It shares the name's colour and sits on its own
  flat **base band** welded below the name, so the outline stays hugging just the
  name/word.
- **Sign Body** — base style, sign depth, and per-style options:
  - **Outline** — a merged-glyph silhouette inflated by the outline width, with
    optional see-through letter centres and a straight bottom lip to stand on.
  - **Plate** — a rounded rectangle sized by a character-count chart, auto-fit,
    or manual length × height.
  - **None** — text only.
- **Stand** — an **L-foot**: the sign panel (base + text + logo) leans back on a
  horizontal foot, an L in side view. Three sliders:
  - **Display Angle** — how far the panel leans from vertical (°).
  - **Foot Depth** — how far the foot runs forward (mm).
  - **Foot Thickness** — thickness of the foot shelf (mm).
  - (**Panel Thickness**, under Sign Body, sets how thick the leaning panel is.)
- **Logo** — upload a **PNG / JPG / SVG** company logo. Raster images are
  thresholded (adjustable, with invert for light-on-dark marks) and traced into
  a raised relief; SVGs are used directly. Place it with a **3×3 anchor grid**
  plus free **X / Y offset**, and set its size, rotation, height, and colour.
  Prints as its own colour (defaults to the text colour).
- **Overall Size** — uniform model scale (%).
- **Colours** — text, base, and scene.
- **View** — auto-rotate and reset rotation. Drag the model to rotate.

The sidebar shows the finished footprint as **W × H × D mm**.

## Export

- **Download 3MF (combined, colored)** — the whole sign in one file, with each
  part (base / text / logo) as a **separate coloured object**. A slicer imports
  them already coloured, so you can select the text and assign its filament in a
  single click. (Written by a tiny dependency-free 3MF writer in `src/threeMF.js`
  — three.js only ships an STL exporter.)
- **Download STL (combined)** — the whole sign as a single (colourless) mesh for
  filament-swap printing.
- **Text STL** / **Base STL** / **Logo STL** — the parts separately, for AMS /
  multi-material printing or painting.

## Notes

- The **lean / foot proportions** are the geometry most likely to want tuning
  after a first test print.
- The parts (name outline, title band, foot) **overlap** by design so they print
  as one piece; the 3MF export **welds vertices** so each part is a watertight
  manifold, and a slicer auto-unions the overlapping volumes.
- The OpenSCAD mirror (`desktop-sign.scad`) estimates glyph widths rather than
  measuring them, so treat the web modeler as the exact source of truth and nudge
  the SCAD sizes to match. It also doesn't include the raster logo or the title
  (both web-only for now).

## Develop & verify

- Dev server: `npm run dev` (port **1221**, `strictPort`). Tests: `npm test`.
- Headless screenshot of the running app: `_shot.mjs` (drives the cached
  Playwright Chromium). E.g. `CHROME_EXE=<chrome.exe> node _shot.mjs <url> out.png`.
- Render/verify the SCAD with the OpenSCAD CLI (`openscad -o out.png --viewall …`).
