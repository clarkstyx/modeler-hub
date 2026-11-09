# Mistletoe ornament, blank tag (commercial files)

Made 2026-11-09 from `modelers/mistletoe-ornament` (hub commit a0fb3d1, new `blankTag` setting):
default Christmas colours, name empty, `blankTag: true`, and **`layerThickness: 0.6`** (the modeler's
minimum, for fewer colour swaps; the modeler gives no warning at this setting). Everything else is default.

## Files

| File | What it is |
|---|---|
| `Mistletoe-BlankTag-Bambu-EditableName.3mf` | Bambu Studio 2.8 project. **4 filaments** (fits one AMS / AMS lite), editable "NAME" text on the tag. |
| `Mistletoe-BlankTag.stl` | One solid with all parts joined (manifold union): 1 piece, watertight, no colours. For single-colour printing or other slicers. |

## Size

- Ornament: **82.4 × 82.6 × 2.2 mm** blank; 2.8 mm thick with the name.
- Tag (raised red plate): **56 × 16 mm**, corner radius 4 mm, centred under the sprig.
- Hanger hole: **3.5 mm** diameter, ring wall 2.4 mm (ring about 8.3 mm across), hole centre about 4.2 mm below the top edge.

## Colours / filaments (Bambu project)

| Filament | Colour | Parts |
|---|---|---|
| 1 | dark green `#1F3A2A` | BASE (back plate, outline, hanger ring, stalk to the tag) |
| 2 | leaf green `#4F9A5C` | LEAVES |
| 3 | red `#C8322B` | BOW, TAG |
| 4 | cream `#F4F1E6` | BERRIES, text_shape (the name) |

All PLA Basic, Bambu Lab A1 profile, 0.20 mm Standard, textured PEI plate.

## Layers (0.2 mm layer height, 14 layers)

- z 0 – 1.6 mm (layers 1–8): BASE only, filament 1.
- z 1.6 – 2.2 mm (layers 9–11): leaves, berries, bow and tag side by side (filaments 2, 3, 4). The colour changes on every one of these layers.
- z 2.2 – 2.8 mm (layers 12–14): the name only (filament 4). Text: Fredoka, 12 mm size (NAME is 33 × 8.5 mm), 0.6 mm thick, "Surround surface" mode, operation Part.

## Slicer numbers (Bambu Studio 2.8, A1, the project as shipped with NAME)

- Model printing time 34 m 07 s; total 40 m 48 s (with 6 m 17 s prepare).
- Filament 12.45 g total: 9.03 g model, 2.32 g purge, 1.10 g prime tower.
- **7 filament changes.** The old 1.0 mm colour layer with a 5th filament for the name gave 12 changes, 43 m 03 s and 14.50 g.

## What was verified

- Generator export: every part watertight (`validateMesh`), no warnings; modeler test suite green (13 tests, one new for the blank tag).
- STL: manifold union status NoError, one piece, mesh check passes, top at z = 2.2 mm.
- Bambu project: saved with Save Project as…, run through `strip_paint.py` (it had no triangle painting), reopened in Bambu Studio 2.8. No "geometry only" message, exactly 4 filaments with the right colours, and the parts carry filaments 1/2/4/3/3/4 (BASE/LEAVES/BERRIES/BOW/TAG/text_shape).
- Text is centred on the tag (measured from the 3MF: text and tag centres match to 0.01 mm).
- Editable name: selecting `text_shape` in the Objects list and clicking the Ta (Text shape) button opens the text editor with NAME / Fredoka / 12 mm / 0.6 mm. Typing "Emma" replaced it and it stayed on the tag; see `renders/mistletoe-blanktag-Emma.png`. A retyped name keeps its anchor point, so "Emma" sits about 0.5 mm left of centre.
- If Fredoka is missing on the customer's computer, Bambu substitutes another font. Tell buyers to install Fredoka (free, Google Fonts) or pick another font in the Ta panel.

**Not printed yet.** Nothing about this ornament has been printed. Log the first print in
`docs/PRINT_VALIDATION.md`.
