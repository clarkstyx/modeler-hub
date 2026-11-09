# Snowflake ornament, blank name plate (commercial pack)

Made 2026-11-09 with the name-ornaments modeler, branch `claude/youthful-brown-ev6mdo` (commit 538dfc8),
preset "Blank name plate" (`nameMode: "plate"`), classic snowflake, 90 mm tip to tip.

## Files
- `Snowflake-BlankPlate-Bambu-EditableName.3mf`: Bambu Studio project (A1, 0.20 mm Standard) with an
  editable text part `text_shape` reading "NAME" on the plate. Triangle painting stripped
  (`strip_paint.py`), so each part's filament number sets its colour.
- `Snowflake-BlankPlate.stl`: one colour, all parts joined into one solid (manifold union): watertight,
  genus 1 (the only hole is the hanging loop), 18.0 cm³, 9,282 triangles. No name on it; non-Bambu
  buyers add their own text.

## Size and layers
- Outside: 83.6 × 99.6 mm. Height 4.8 mm blank, 5.4 mm with the 0.6 mm name.
- Layers from the bed (0.2 mm layers):
  | Height | Part | Filament (colour) |
  |---|---|---|
  | 0 – 3.0 mm | BASE backing, solid under the plate (no holes but the loop) | 1, green #1E6B3A |
  | 3.0 – 4.2 mm | SNOWFLAKE | 3, white #FFFFFF |
  | 3.0 – 4.8 mm | PLATE | 2, red #D62839 |
  | 4.8 – 5.4 mm | text_shape (NAME) | 4, white #FFFFFF |
- Colour changes happen at 3.0 mm (snowflake and plate start), 4.2 mm (snowflake ends) and 4.8 mm
  (name starts).
- Plate: 66 × 20 mm, 4 mm round corners, centred on the snowflake; 1.6 mm of green shows round it.
  Room for a name about 58 × 14 mm.
- Loop: 4 mm hole, 2.5 mm wall (9 mm ring) on the top arm; hole centre 47.6 mm above the ornament centre.

## Name text (Bambu Text tool)
- Fredoka (Bold, installed), size 12 mm (capitals 8.5 mm), thickness 0.6 mm, embedded depth 0,
  surface mode, centred on the plate (bounding box centre = plate centre to 0.01 mm).
- Fit at size 12: "NAME" 33.0 mm, "Emma" 32.1 mm, "Isabella" 41.6 mm (all fit). "ALEXANDER" in capitals
  is 69.6 mm, wider than the plate: buyers with 9+ capitals should drop the size to about 9 mm.
- When the name is retyped, Bambu keeps the text's origin, not its box, so a new name can sit ~0.5 mm
  off centre; harmless, or nudge it with Move.

## Verified in Bambu Studio 2.8.2 (Linux, A1 profile)
- Reopened the final file: no "geometry only" message, no import-colour dialog, 4 project filaments
  in the right colours, parts on filaments 1/3/2/4 as above.
- Objects list › `text_shape` › "Ta" (Text shape): text, font, size and thickness all came back;
  retyped "Isabella", "ALEXANDER" and "Emma" live.
- Sliced once with "Emma": **54 min 40 s total** (47 min 38 s printing), **18.97 g** (filament 1:
  10.61 g, 2: 3.40 g, 3: 4.28 g, 4: 0.68 g; 3.64 g of it purge, 1.34 g prime tower),
  **8 filament changes**, 27 layers, top at 5.40 mm. No warnings.
- Mesh checks in the modeler: every part watertight, no overlaps, backing solid under the plate
  (new test in `test/ornament.test.ts`).

## Not verified
- Never printed. The snowflake ornament itself has not been printed yet (modeler README), so arm
  strength, the loop and the plate's look are untested. Print one before listing and log it in
  `docs/PRINT_VALIDATION.md`.
- Not checked in OrcaSlicer.
