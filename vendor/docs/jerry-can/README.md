# Jerry Can Modeler

Browser-based parametric designer for the jerry can keychain (Chibi Kitty Bubu).
Same family as keychain-modeler / letter-bead-modeler: Vite + React + three.js + manifold-3d,
dark sidebar on the left, live 3D preview on the right, colour-ready 3MF export.

## Run

```bash
npm install
npm run dev        # http://localhost:5173
npm run build      # static site in dist/ (host it on the Mac mini like the others)
```

## What it does

- Every dimension is a slider: fatness, corner radius, key-hole width/height, bar thickness,
  cap size/position, panel size, ribs…
- Text: up to 3 lines, 5 bundled fonts, raised or engraved, auto-shrinks to fit the centre panel.
- Icon: heart, star, maple leaf (add more polygons in `src/geometry/shapes2d.js`).
- Export STL (single solid) or 3MF (body + text/icon as separate, non-overlapping parts with
  display colours → Bambu Studio: "load as single object with multiple parts" → assign filaments).
- Save/Load settings as JSON; the last settings are also remembered in the browser.
- Everything is exported lying on its back (flat back = first layer, no supports).

## Code map

```
src/geometry/jerrycan.js   the parametric solid (manifold-3d) — DEFAULTS live here
src/geometry/shapes2d.js   polygon helpers + icon outlines
src/geometry/text.js       text → glyph polygons (three.js typeface fonts)
src/geometry/toThree.js    manifold mesh → three.js BufferGeometry
src/viewer/Viewer.jsx      three.js preview (OrbitControls, lights, bed grid)
src/ui/Controls.jsx        slider / select / toggle / colour components
src/export/stl.js          binary STL writer
src/export/threemf.js      multi-part colour 3MF writer (JSZip)
src/App.jsx                state, debounced rebuild, sidebar, export buttons
test/build-test.mjs        Node smoke test: `node --import ./test/register.mjs test/build-test.mjs`
```

## Adding an icon

Add a counter-clockwise `[x, y]` polygon to `ICONS` in `shapes2d.js` (run it through `normalise`)
and a label in `ICON_LABELS`. It shows up in the Icon dropdown automatically.
