# Stackable Clicker Blocks (4 mm paracord, big letter keycaps): pack notes

Made 2026-11-09 with Clark's Clicker Maker (`/home/user/clicker`, branch `claude/confident-newton-7vslv9`, unchanged),
headless through the modeler's own `generate()` / `clickerDownload()` / `buildKeycap()`.

## Settings used
- `mode: "stack"` (Stackable), `blockStyle: "round"` (rounded block), `keySize: "block"` (`KEY_SIZES.block`, 21.2 mm caps,
  `capShape: "straight"`), `font: "lilita"` (Lilita One, SIL OFL 1.1, for A–Z and 0–9; Clark's choice: Valencia Chunky
  has no digits and its M read like an "n"), `letterRelief: "raised"`, `baseEnds: "plain"`, no charm.
- Printer `a1` (Bambu Lab A1, 256 mm bed): every 3MF carries `slicerProjectSettings()` (A1 0.4, 0.20mm Standard @BBL A1,
  Bambu PLA Basic per colour).
- StyxVal watermark on (default): hidden 0.3 mm "SV" under each block, StyxVal metadata in every 3MF, with the licence
  fields changed to the commercial licence (see "Licence" below).
- MX switches are not part of the product (buyer supplies one MX-style switch per block).

## Colours (modeler defaults, kept: they read well together)
| Role | Hex | Name in slicer | Filament slot |
|---|---|---|---|
| Keycap | #FFF4E0 | Cream | 1 in the keycap files |
| Letter | #E0457B | Rose | 2 in the keycap files |
| Block | #F6A5C0 | Blush pink | 1 in the block / fit-test files |

Renders use extra pastel block colours (mint #9ED9C5, blush #F7B3C9, sky #A9CDF2, sand #F6D57A, lavender #C9B6F2,
peach #F9C29B, white, aqua #8FD0E8, green #B8E0A0) to show mixing; the shipped block file is one colour.

## Files
3MF (each one plate, Bambu project for the A1):
- `3MF/Keycaps-A-Z.3mf`: 26 keycaps, 8 per row, 4 rows. Cream + Rose.
- `3MF/Keycaps-0-9.3mf`: 10 keycaps. Cream + Rose.
- `3MF/Keycap-BLANK.3mf`: one keycap with no letter. Cream.
- `3MF/Blocks-x10.3mf`: 10 rounded blocks (`block:round:#F6A5C0` ×10). Blush.
- `3MF/Fit-Test.3mf`: the modeler's fit test (one block + one "A" keycap, all one colour so no swaps).

STL (one watertight solid each, in print orientation, centred, on z = 0):
- `STL/Keycap-A.stl` … `Keycap-Z.stl`, `Keycap-0.stl` … `Keycap-9.stl`, `Keycap-BLANK.stl` (cap + raised letter joined).
- `STL/Block-Rounded.stl` (one block, with the SV mark underneath).
- `STL/Fit-Test-Block.stl` (same as Block-Rounded) and `STL/Fit-Test-Keycap-A.stl`.

## Sizes (measured from the exported meshes)
| What | Size |
|---|---|
| Rounded block | 28.2 mm (along the cord) × 30.0 mm × 17.0 mm tall |
| Cord tunnels | 2 per block, teardrop (round Ø 5.2 mm with a 45° pointed roof, 6.3 mm tall), run the full 28.2 mm length |
| Tunnel spacing | centres 22.0 mm apart (±11.0 mm from the block centre), 4.9 mm above the bed |
| Cord | 4 mm / 550 paracord (0.6 mm clearance in the round part) |
| Switch | MX-style, 14.0 mm square plate hole, ledge 9.5 mm above the bed, 1.2 mm floor (closed bottom) |
| Keycap pocket | 22.2 mm, corner r 5.8 mm (0.5 mm gap round the cap) |
| Keycap | 21.2 × 21.2 mm, 6.0 mm body + 1.0 mm raised letter = 7.0 mm tall; straight sides, 1.1 × 1.5 mm rounded top edge; MX cross stem 4.15 × 1.30 mm |
| Letters | 13 mm cap height (Lilita One; A 11.6 mm wide, M 15.0 mm, I 7.3 mm; W fitted to the 15.6 mm flat top), raised 1.0 mm |
| Digits | about 13.3 mm tall, 9.5–10.6 mm wide, same font, raised 1.0 mm |
| Stack pitch | 28.2 mm per letter on the cord (blocks sit end to end), so a 5-letter name is about 141 mm plus knots |
| Assembled height | 23.6 mm (block + cap, cap rim 0.4 mm below the block top) |

## Print orientation and suggestions
- Everything is already in print position and needs no supports: blocks open side up (teardrop tunnels print
  without support, 45° foot on the bed), keycaps upright with the stem standing on the bed and the letter on top.
- 0.20 mm layers, 0.4 mm nozzle, PLA. Keycaps: the letter colour starts at 6.0 mm, so only one filament change per plate.
- Print blocks in any colours (one colour per plate is fastest); mix them on the cord.
- Print `Fit-Test.3mf` first: check the switch clicks into the block, the cap pushes onto the stem, and 4 mm
  paracord slides through both tunnels.
- Thread two cords, one through each tunnel line; knot or add end beads to hold the stack.

## Bambu Studio 2.8 check (real app, Linux, A1 profile)
All five 3MFs opened as projects: printer Bambu Lab A1, 0.20mm Standard @BBL A1, filaments already in the right
colours; no "geometry only" / invalid-config message and no "Standard 3mf Import color" dialog, so no re-save or
paint stripping was needed. All sliced with no warnings.

| File | Time | Filament | Changes |
|---|---|---|---|
| Keycaps-A-Z (Lilita One, re-sliced) | 1 h 45 m | 45.05 g (Cream 41.84 g, Rose 3.21 g; prime tower 1.05 g) | 1 |
| Keycaps-0-9 (sliced with the earlier font) | 45 m 35 s | 18.07 g (Cream 17.13 g, Rose 0.94 g) | 1 |
| Keycap-BLANK | 11 m 06 s | 1.66 g | 0 |
| Blocks-x10 | 2 h 00 m | 57.53 g (about 5.75 g a block) | 0 |
| Fit-Test (sliced with the earlier font on the A) | 24 m 49 s | 7.53 g | 0 |

Screenshots: `../screenshots-raw/bambu-*-loaded.png` and `bambu-*-sliced.png`.

## Verified vs not
- Verified: every mesh watertight (modeler `validateMesh` on all 3MF parts; STLs re-checked separately: 0 open
  edges, 0 winding errors, one shell each, keycaps genus 0, blocks genus 2 = the two tunnels); the files load and slice
  in Bambu Studio 2.8.
- Printed and works: the **rounded** block (Clark's tested print, per Clark 2026-11-09; the modeler's README/CLAUDE.md
  still only record the square block on 4 mm paracord, so log the rounded print there / in `PRINT_VALIDATION.md`).
- **Not printed yet:** the **block-size keycaps** with **Lilita One** letters (21.2 mm straight caps). Print
  `Fit-Test.3mf` (or one A–Z plate) before listing to check the stem fit and the letters.
- Font: Lilita One is SIL Open Font License 1.1 (licence in the modeler's `src/fonts/LilitaOne-OFL.txt`); OFL allows
  selling prints and models made with it.

## Licence
Sold with a commercial licence. In every shipped 3MF (`3D/3dmodel.model`) two StyxVal fields were rewritten after export:
- `LicenseTerms`: "Commercial licence (Valencia Holdings Inc.): you may print and sell physical prints of this design.
  Do not share, resell or upload the files. One licence per shop."
- `Description`: "StyxVal Stack paracord letter block system by StyxVal Studio (@styxval). Commercial licence (see
  LicenseTerms)." (the modeler's text ended "Personal use only.")

Kept as the modeler writes them: `Designer` (StyxVal Studio), `Copyright` (© 2026 Valencia Holdings Inc.), `CreationDate`
and the SV deboss. The two changed fields no longer match the watermark tool's `config.yaml` strings
(`core/styxvalBrand.ts` says they must), so a check that compares them to config.yaml will flag these files.
STL files have no metadata.
