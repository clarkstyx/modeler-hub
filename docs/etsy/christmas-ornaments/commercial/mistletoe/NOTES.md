# Mistletoe ornament, blank tag (commercial files)

Made 2026-11-09 from `modelers/mistletoe-ornament` (hub commit a0fb3d1, new `blankTag` setting), default
settings, default Christmas colours, name empty + `blankTag: true`.

## Files

| File | What it is |
|---|---|
| `Mistletoe-BlankTag-Bambu-EditableName.3mf` | Bambu Studio 2.8 project. 5 filaments, editable "NAME" text on the tag. |
| `Mistletoe-BlankTag.stl` | One solid, all parts joined (manifold union): 1 piece, watertight, no colours. For single-colour printing or other slicers. |

## Size

- Ornament: **82.4 × 82.6 × 2.6 mm** (blank). With the Bambu name on: 3.2 mm thick.
- Tag (raised red plate): **56 × 16 mm**, corner radius 4 mm, centred under the sprig.
- Hanger hole: **3.5 mm** diameter, ring wall 2.4 mm (ring about 8.3 mm across), hole centre about 4.2 mm below the top edge.

## Colours / filaments (Bambu project)

| Filament | Colour | Parts |
|---|---|---|
| 1 | dark green `#1F3A2A` | BASE (back plate, outline, hanger ring, stalk to the tag) |
| 2 | leaf green `#4F9A5C` | LEAVES |
| 3 | red `#C8322B` | BOW, TAG |
| 4 | cream `#F4F1E6` | BERRIES |
| 5 | white `#FFFFFF` | text_shape (the name) |

All PLA Basic, Bambu Lab A1 profile, 0.20 mm Standard, textured PEI plate.

**Five filaments is one more than an AMS / AMS lite holds.** To print with 4 spools, set the
`text_shape` filament to 4 (cream, like the berries) in the Objects list: the name sits on its own
layers, so it costs nothing extra.

## Layers (0.2 mm layer height)

- z 0 – 1.6 mm (layers 1–8): BASE only, filament 1.
- z 1.6 – 2.6 mm (layers 9–13): leaves, berries, bow and tag side by side (filaments 2, 3, 4). Colour changes happen on every one of these layers.
- z 2.6 – 3.2 mm (layers 14–16): the name only (filament 5). Text: Fredoka, 12 mm size (NAME is 33 × 8.5 mm), thickness 0.6 mm, "Surround surface" mode, part operation.

## Slicer numbers (Bambu Studio 2.8, A1, the project with "Emma" typed in)

- Model printing time 43 m 03 s; total 49 m 47 s (with 6 m 17 s prepare).
- Filament 14.50 g total: 9.55 g model, 3.62 g purge, 1.34 g prime tower.
- **12 filament changes.** Almost all of them come from the 5 layers where leaves, berries and bow/tag sit side by side.
- To cut swaps: set the modeler's colour-layer thickness to 0.6 mm (its minimum) so that layer is 3 print layers instead of 5, or print the base + colour layers at 0.28 mm in Bambu with a height-range modifier. Either roughly halves the changes. Putting the name on filament 4 does not add any.

## What was verified

- Generator export: every part watertight (`validateMesh`), modeler test suite green (13 tests, one new for the blank tag).
- STL: manifold union status NoError, one piece, mesh check passes.
- Bambu project: saved with Save Project as…, run through `strip_paint.py` (it had no triangle painting), reopened in Bambu Studio 2.8: no "geometry only" message, the 5 colours load correctly, the parts carry filaments 1/2/4/3/3/5.
- Text is centred on the tag (measured from the 3MF: text and tag centres match to 0.01 mm).
- Editable name: selecting `text_shape` in the Objects list and clicking the Ta (Text shape) button opens the text editor with NAME / Fredoka / 12 mm / 0.6 mm; typing "Emma" replaced it and it stays on the tag (sample render `renders/mistletoe-blanktag-Emma.png`).
- If Fredoka is missing on the customer's computer, Bambu substitutes another font; tell buyers to install Fredoka (free, Google Fonts) or pick another font in the Ta panel.

**Not printed yet.** Nothing about this ornament has been printed. Log the first print in
`docs/PRINT_VALIDATION.md`.
