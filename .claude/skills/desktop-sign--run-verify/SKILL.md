---
name: run-verify
description: Use when running, previewing, screenshotting, or verifying the desktop-sign-modeler app (dev server, Vitest, headless WebGL screenshots, OpenSCAD render, 3MF/manifold checks). Read before claiming a change works.
---

# Desktop Sign Modeler — run & verify

A Vite + React + three.js browser app that models 3D-printable desktop-sign
nameplates (leaning panel on an L-foot) and exports 3MF/STL. Pure geometry lives
in unit-tested modules; the UI + scene live in `src/SignModeler.jsx`.

## Run

```bash
npm install
npm run dev            # http://localhost:1221  (strictPort — fails if taken)
npm test               # Vitest (geometry + 3MF unit tests)
```

Check the dev server is up: `curl -s -o /dev/null -w "%{http_code}" http://localhost:1221/` → `200`.

## Architecture (where things live)

- `src/signGeometry.js` — pure: `layoutLines`, `buildOutlineShapes` (clipper
  silhouette + flat bottom; **fillHoles drops ALL holes**, not just counters),
  `buildPlateShape`, `buildWedgeGeometry`, `cutBottomArch`, `measureShapes`.
- `src/logoGeometry.js` — pure: `traceBitmap` (image→relief), `parseSvgPaths`,
  `placeLogo` (3×3 anchor + offset + scale + rotate).
- `src/threeMF.js` — pure: `buildThreeMF(objects)` → `Uint8Array` (store-ZIP +
  3MF core XML, one `<basematerials>` colour per part).
- `src/SignModeler.jsx` — UI + scene. Groups: `displayGroup` (drag) → `leanGroup`
  → `modelGroup` (scale + geometry). **The L-foot lean is baked into the panel
  geometry** (panel pivots about its bottom-front edge, welds into the foot);
  `leanGroup` is now identity. Fonts load from jsDelivr (Google fonts + a
  Waltograph TTF) via `loadFont()`.
- `desktop-sign.scad` — OpenSCAD/MakerWorld mirror (OpenSCAD is **Z-up**; the web
  app builds the standing shape in its own frame). Estimates glyph widths — web
  app is the source of truth. No raster logo / no title in the SCAD.

Pure modules are unit-tested; **prefer adding a Vitest case over manual checks**
for geometry logic.

## Verify a change (do this before saying it works)

1. **Transforms clean** (catches JSX/syntax/import errors without a browser):
   ```bash
   curl -s "http://localhost:1221/src/SignModeler.jsx" | head -c 300   # no "error"/"SyntaxError"
   ```
2. **Tests pass**: `npm test`.
3. **See it** — headless WebGL screenshot of the real app via `_shot.mjs`:
   ```bash
   CHROME_EXE="$(find "$LOCALAPPDATA/ms-playwright" -iname chrome.exe | head -1)"
   CHROME_EXE="$CHROME_EXE" node _shot.mjs "http://localhost:1221/" "shot.png" 7000
   ```
   Then Read the PNG. Env knobs: `DRAG_X=<px>` orbits the model, `SET_ANGLE=<deg>`
   sets Display Angle, `SHOW_TITLE=1` ticks the title. (Playwright MCP's *bridge*
   isn't installed; `playwright-core` + cached Chromium is used instead.)

## Verify the SCAD

```bash
OSCAD="/c/Program Files/OpenSCAD/openscad.exe"
"$OSCAD" -o out.png --imgsize=760,560 --viewall --autocenter --projection=o \
  --camera=0,0,0,90,0,-90,0 desktop-sign.scad     # side view (the L profile)
"$OSCAD" -o out.stl -D 'stand_type="..."' desktop-sign.scad   # compile-check a config
```

## Verify a 3MF export (colour + manifold)

Download it in-browser, then check it's a valid ZIP and watertight:

```bash
unzip -t out.3mf                                  # CRC/integrity → "No errors"
unzip -p out.3mf 3D/3dmodel.model | grep -o 'displaycolor="[^"]*"' | sort -u
```

Non-manifold edges must be **0**. Extruded geometry is non-indexed, so the 3MF
export **welds vertices by position** — if you touch that path, recount edges
(each edge must be shared by exactly 2 triangles) from the model XML.

## Gotchas

- `strictPort:true` — a stale dev server on 1221 blocks a new one.
- Fonts + the model need network (jsDelivr). No net → "Couldn't load that font".
- Overlapping parts (name/band/foot) are intentional (print as one piece); a
  slicer auto-unions them. Only the *non-manifold* (unwelded) error is a real bug.
