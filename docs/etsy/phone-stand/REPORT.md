# Phone Stand Keychain Etsy pack: findings report (2026-11-09)

## How it was checked
- Files made with the modeler's own code (`generate` + `plate3MF`/`plateStl`): Small = preset `standard`
  (12 mm slot), Large = preset `large` (13.5 mm slot), `openerMode: "soda"` (tab lifter, no bottle opener),
  two-piece permanent snap-lock (the default), printer A1. All 16 meshes watertight (`validateMesh`).
- Opened, edited and sliced in real **Bambu Studio 2.8.2.61** (A1 profile) and **OrcaSlicer 2.4.2**
  (Creality Ender-3 V3 SE profile) on Linux, like a new customer. Screenshots in `guide/screenshots-raw/`.
- **Not done:** no physical print. Nothing here proves fit or strength.

## What the plain generator 3MF does in Bambu Studio
- "The 3mf file has invalid config, load geometry data only" (no `project_settings.config`).
- New in 2.8: a "Standard 3mf Import color" dialog then reads the colours and adds filaments, but it does so by
  **painting every triangle** (inspect: `paint_color` on all faces). Changing a part's filament number then does
  nothing visible. The shipped files have the paint stripped (`scripts/strip_paint.py`) so part filaments rule.

## Problem found: 176 colour swaps
Body and flap are both 35 mm tall. On one plate in two colours, Bambu Studio sliced **176 filament changes,
63 g purge, 5 h 54 min** (`screenshots-raw/finding-176-swaps.png`). Fix in the shipped file: body + name on
plate 1 (**1 change, ~49 min, 15 g** Small; ~52 min, 17 g Large), flap alone on plate 2 (**0 changes, ~27 min**).
The modeler's own A1 note already says "separate colour plates"; its combined export does not do it.

## Editable name (the "slot" on the side)
- Bambu file: a `text_shape` part, text "NAME", Fredoka, size 7, thickness 0.6, on the side cheek's flat area,
  filament 1 (white). Verified: re-open › click text_shape › Ta › all settings come back; "Alexander" (9 letters)
  fits on the Small; slices with 1 change, top 35.60.
- Gotcha: clicking Ta with nothing selected makes a **new separate "Text" object**. In the guide (page 3, FAQ).
- OrcaSlicer: STL › right-click side › Add Part › Text works; Height 7 / Depth 0.6 / Fredoka gives the same
  letters; sliced 44 min, top 35.60, no errors. Orca shows Bambu editable text as a plain mesh, so the guide
  sends non-Bambu buyers to the STL.
- Font: Fredoka Bold instance made from the OFL variable font, bundled with OFL.txt.

## Print check (2026-11-09)
Clark printed the Small: hinge, click and can tab lifter all work (logged in `docs/PRINT_VALIDATION.md`). The Large is still unprinted.

## Previously unverified
From `docs/PRINT_VALIDATION.md`: the **leaf-spring click** that holds the flap shut and the **can tab lifter**
have never been printed. The hinge was verified by one print (2026-11-02). Print one Small and one Large,
check the click and the lifter on a real can, take a real photo for the listing, and log it in
`PRINT_VALIDATION.md`.

## Suggested exporter improvements (not done)
1. Put body and flap on separate plates in the A1 3MF (or warn when they are on one plate in two colours).
2. Write `project_settings.config` so colours load without the import dialog/painting.
3. Offer a "blank name area" export with a Bambu `text_info` placeholder so this pack can be rebuilt without GUI work.
