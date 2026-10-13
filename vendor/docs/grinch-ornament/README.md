# Grinch Ornament Generator

A browser app that builds a personalised Grinch ornament from one of nine approved poses, previews it live in 3D, and exports a slicer-ready multi-part 3MF (plus STL and SVG). Pick a pose, type a name, choose four filaments, print.

Every printed layer is real, independent geometry with its own thickness and colour slot: a black base with a hanger ring, three traced colour layers for the figure (green fur, red suit and hat, white trim and eyes), the picture's black line-work (fur strokes, eyes, mouth, folds) printed in black on top of the colour it belongs to, and the name in red bubble letters set into the suit under the figure. Only the outlines between colours are the base showing through, so every colour is one solid surface and a design prints with four filaments (one AMS).

## Run it

```bash
npm install
npm run dev        # http://localhost:5173  (add ?pose=gift to open a pose)
npm test           # vitest (engine, poses, name fit, exports, store, UI)
npm run typecheck
npm run build      # production bundle in dist/
```

Node 20 or newer. The first page load initialises the manifold-3d WASM kernel and fetches the font from `public/fonts/`.

## Poses

| id | menu label | picture |
|---|---|---|
| `think` | Scheming | `docs/references/grinch/think.jpg` |
| `peek` | Peeking | `peek.jpg` |
| `lights` | Tangled in lights | `lights.jpg` |
| `chin` | Daydreaming | `chin.jpg` |
| `cool` | Sunglasses | `cool.jpg` |
| `gift` | With a gift | `gift.jpg` |
| `bauble` | With a bauble | `bauble.jpg` |
| `heart` | Heart hands | `heart.jpg` |
| `tongue` | Tongue out | `tongue.jpg` |

All poses share one scale (the pictures share their framing), so the heads come out the same size and each pose spreads as wide as its picture does. "Size" in the Design tab is nominal: 70 mm prints the pictures at their natural size; the real width and height show above the preview.

## Layout

- `src/engine/` — character-agnostic: manifold kernel wrapper and 2D shapes, text layout and auto-fit, Z resolution, printability validation, 3MF/STL/SVG exporters.
- `src/characters/grinch/` — the ornament: state schema and defaults, constants, `poses/` (one traced module per picture plus the registry), `figure.ts` (traced regions → printable parts), `parts/` (base with hanger ring, name), and `buildOrnament(state, font)` which produces the `OrnamentModel` that the preview and every export read.
- `src/app/` — React UI: store (undo/redo, save/load, `?pose=` deep links), engine bootstrap, 3D viewport, and the Design / Layers / Print tabs.
- `docs/references/grinch/` — the approved pictures the poses were traced from.

## Adding a pose

Follow `.claude/skills/add-grinch-pose/SKILL.md`: record the picture's crop row in `docs/references/grinch/poses.json`, trace it with `scripts/trace_figure.py` (`regen` rebuilds every pose from that file), register the module in `src/characters/grinch/poses/index.ts`, add the id to `POSE_IDS` in `schema.ts`, run the tests (every pose is checked for printability, four colours and a centred hanger), screenshot, ship.

## Before printing

In OrcaSlicer / Bambu Studio, answer **Yes** to "load as a single object with multiple parts", then map the four materials (dark, green, red, white) to filaments. The Print tab lists every part with its slot and colour and blocks export while a design has a blocking warning.
