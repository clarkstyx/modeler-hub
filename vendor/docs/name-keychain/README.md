# Parametric Name Keychain Generator

Design personalized 3D-printable name keychains in your browser, then export a **color-ready 3MF** (or STL) — plus a matching **OpenSCAD** file ready to publish as a parametric model on **MakerWorld**.

![style: plate + outline](https://img.shields.io/badge/styles-tag%20%7C%20outline%20%7C%20none-blueviolet)

## What's inside

| File | What it is |
|---|---|
| `src/KeychainModeler.jsx` | The web app — a React + three.js component that builds the keychain live and exports 3MF / STL |
| `keychainv2.scad` | **v2.1** — the standalone parametric OpenSCAD model with Customizer controls, for MakerWorld (`keychainv2.txt` is an identical copy for sharing) |
| `keychain.scad` | v1 of the OpenSCAD model, kept for reference |
| `waltograph42.ttf` | The Disney-style script font, bundled for the MakerWorld upload |

The web app is the source of truth; the SCAD mirrors its features.

## Features

- **Any name or word**, with adjustable size and **auto-fit** so text always fills the base.
- **SVG logo or symbol** — upload your own, place it **before or after** the text, with its own size, thickness, gap, and **separate color**.
- **Fonts** — built-in three.js fonts plus 35+ free Google Fonts (cartoon, script, bold, marker, pixel, horror). The SCAD also lists MakerWorld's built-in font set.
- **Three base styles:**
  - **Tag / Plate** — rounded rectangle.
  - **Outline** — a *flat* backing that follows only the outer silhouette of the whole word (and logo), letters merged, via real 2D polygon offset.
  - **None** — letters only.
- **Plate sizing modes:** `Auto` (hug the content + padding) or `Manual` (exact length & width, with fit-to-plate scaling).
- **Keyring** that auto-positions to the base, with adjustable hole diameter, ring wall, and free X/Y offset.
- **Adjustable** base/text thickness, text bevel, corner radius, colors, and overall **model scale** (default 150%).
- **One-click 3MF export with colors** — each part (base, text, logo, keyring) arrives in the slicer as a separate named object with your chosen color, ready to map to filaments. STL export is also available (font baked into the geometry).

## Run the web app

Requires Node 18+.

```bash
npm install
npm run dev      # opens http://localhost:5173
npm run build    # production build into dist/
```

Pick a name, font, and style in the sidebar, then **Download 3MF (with colors)** — open it in Bambu Studio / PrusaSlicer / OrcaSlicer and assign a filament per part.

## Use the OpenSCAD file (MakerWorld)

1. Open `keychainv2.scad` in [OpenSCAD](https://openscad.org/) (Customizer panel) or upload it to MakerWorld's parametric maker.
2. Adjust the grouped parameters (Text / Logo / Base / Overall Size / Keyring / Colors).
3. Render and export.

**Notes**
- The `font` dropdown lists Google fonts (matching the web preview) plus MakerWorld's built-in fonts. In desktop OpenSCAD, fonts you don't have installed fall back to the default font — they render correctly on MakerWorld's engine.
- **Logo on MakerWorld:** the customizer can only use SVG files *shipped with the model* (like the bundled font) — customizer users can't upload their own. For a custom logo, use the **web app** and export the 3MF/STL. In desktop OpenSCAD, point `logo_file` at any local SVG; set `logo_aspect` (width ÷ height) so spacing and fit are computed correctly — the logo art itself is never distorted.
- Exact text measurement uses `textmetrics()` where available (MakerWorld). On OpenSCAD 2021.01 and older the file silently falls back to an estimate, so it renders anywhere without warnings.
- For the fancy web-app fonts MakerWorld doesn't have, export from the **web app** (the font is baked in) and upload that as a regular model.

## Multi-color printing

- **With an AMS:** export the **3MF from the web app** — base, text, and logo come in as separate colored parts; assign each to a filament slot and print.
- **Without an AMS:** slice in one color and add a filament-change pause at the top of the base — `Base Thickness × Model Scale` (default `3 mm × 150% = 4.5 mm`) — then swap to your text color and resume.

## Credits

Free fonts are loaded from the [google/fonts](https://github.com/google/fonts) repository under their respective open licenses (OFL / Apache 2.0). Built with [three.js](https://threejs.org/), [Vite](https://vitejs.dev/), [clipper-lib](https://www.npmjs.com/package/clipper-lib), and [JSZip](https://stuk.github.io/jszip/).
