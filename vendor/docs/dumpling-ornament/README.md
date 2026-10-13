# Dumpling Ornament Generator

A browser app that builds a parametric dumpling-in-a-bamboo-steamer ornament with a personalised name, previews it live in 3D, and exports a slicer-ready multi-part 3MF (plus STL and SVG). Every printed layer is real, independent geometry with its own thickness and colour slot, so the same engine can later carry accessories and other characters.

## Run it

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # vitest (geometry, text fit, exports, store, UI)
npm run typecheck
npm run build      # production bundle in dist/
```

Node 20 or newer. The first page load initialises the manifold-3d WASM kernel and fetches the font from `public/fonts/`.

## Layout

- `src/engine/` — character-agnostic: manifold kernel wrapper and 2D shapes, text layout and auto-fit, Z resolution, printability validation, 3MF/STL/SVG exporters, accessory types.
- `src/characters/dumpling/` — the dumpling itself: state schema and defaults, constants, one builder per part, the accessory registry, and `buildOrnament(state, font)` which produces the `OrnamentModel` that the preview and every export read.
- `src/app/` — React UI: store (undo/redo, save/load), engine bootstrap, 3D viewport, and the Design / Layers / Print tabs.
- `docs/superpowers/specs/` and `docs/superpowers/plans/` — the design doc and the implementation plan this code follows.

## Adding an accessory

1. Create `src/characters/dumpling/accessories/<id>.ts` exporting an `AccessoryDefinition` (see `src/engine/accessories/types.ts`). Each layer declares its anchor, tier (`behindBun`, `detail`, `top`), the part it rests on, a palette slot, a thickness, and a `build` function that returns geometry in accessory-local space (origin at the anchor).
2. Add the id to `ACCESSORY_IDS` in `src/characters/dumpling/schema.ts` and register the definition in `accessories/registry.ts`.
3. Write a test like the stub in `tests/characters/dumpling/build.test.ts` ("accessory registry"): the layer builds, sits at the right Z, and does not overlap the bun.

The dropdown, the Layers tab rows, and the exports pick the new accessory up automatically.

## Before printing

Follow [docs/slicer-check.md](docs/slicer-check.md) once with the default design; it is the gate before accessory work starts.
