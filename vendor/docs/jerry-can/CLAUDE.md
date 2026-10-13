# Jerry Can Modeler — notes for Claude Code

Parametric 3D-print keychain designer (Chibi Kitty Bubu / Valencia AI). One of Clark's family of
browser modelers: keychain-modeler, name-tag-modeler, image-keychain-modeler, letter_bead_creator,
icon-bead-modeler, Trinket-Tray-Generator. Same conventions as those siblings:

- Vite + React 18 + three.js, dark sidebar left / live 3D preview right.
- Geometry is built with **manifold-3d** (WASM CSG). No fillets: rounded shapes are convex hulls
  of torus point clouds (see `pillow()` in `src/geometry/jerrycan.js`), which keeps a rebuild ~100 ms.
- Colour-ready **3MF** export: one `<object>` per colour, `<basematerials>` carries the colour, parts
  touch but never overlap. Bambu Studio → "load as single object with multiple parts" → assign filaments.
- **Print orientation is baked in**: X = width, Y = height, Z = depth, flat back at Z = 0 (bed).
  Everything (handle, neck, cap) is tangent to the bed plus a `bedCut` shave so nothing needs support.

## Commands

```bash
npm install
npm run dev                                   # http://localhost:5173
npm run build                                 # dist/ with relative paths (base './')
node --import ./test/register.mjs test/build-test.mjs   # headless geometry smoke test (writes test/*.stl)
```

## Where things are

| File | Role |
|---|---|
| `src/geometry/jerrycan.js` | the parametric solid; `DEFAULTS` is the single source of truth for every slider |
| `src/geometry/shapes2d.js` | polygon helpers + icon outlines (`ICONS`, `ICON_LABELS`) — add new icons here |
| `src/geometry/text.js` | text → glyph polygons via three.js typeface fonts (`FONTS`) |
| `src/geometry/toThree.js` | manifold mesh → BufferGeometry (uses manifold's `calculateNormals`) |
| `src/viewer/Viewer.jsx` | three.js scene; only swaps geometries, never builds geometry |
| `src/ui/Controls.jsx` | Slider / Select / Toggle / ColorInput / Segmented |
| `src/export/stl.js`, `threemf.js`, `download.js` | writers; `download.js` also handles the claude.ai artifact `downloads` capability (STL/3MF wrapped in .zip there) |
| `src/App.jsx` | state, 120 ms debounced rebuild, sidebar, exports, settings JSON |

## Rules of thumb

- Every new parameter: add to `DEFAULTS`, use it in `buildJerryCan`, add a control in `App.jsx`.
- WASM objects must be freed: create intermediates through the `Scope` helper (`S.add(...)`);
  only `base`, `detail`, `merged` leave `buildJerryCan`, and `disposeResult()` frees them.
- Keep text/icon as a separate `detail` manifold that sits exactly on the panel top (`topZ`) so the
  3MF parts stay non-overlapping. Engraved text subtracts from `base` instead.
- Hull ingredients must be convex; a hole needs a subtraction (see the handle's chamfered cutter).
- Fonts are bundled JSON; adding a font = import it in `text.js` and add it to `FONTS`.

## Ideas queued

- OpenSCAD mirror for MakerWorld's parametric maker (keychain-modeler has one as a template).
- SVG upload for custom icons / characters (image-keychain-modeler has the SVG → polygon path).
- Backside pattern (engraved X, printable on the bed).
- Modeler picker page on the Mac mini that links all siblings.
