# Chunky letter charms A–Z + 0–9: print files

Made on 2026-11-09 with the Letter Bead Modeler (`letter_bead_creator`, `src/LetterBeadModeler.jsx`). A headless
Node script ran the modeler's own `buildLetter`, `layoutPlates` and `build3MF` code (copied word for word from
the JSX), so the shapes match what the web app makes with these settings. The modeler itself was not changed.

## Settings used
| Setting | Value |
|---|---|
| Font | Lilita One (chunky, rounded), keep font baseline, fatness 0, width 100 % |
| Letter height | 20 mm (border included) |
| Border | 1 mm |
| Body thickness | 8 mm |
| Face | 1 mm, raised on top, top only |
| Cord hole | horizontal, **two cords**, hole 4.5 mm |
| Spacer beads | 0 |
| Printer / plate | Bambu Lab A1, 256 × 256 mm, 5 mm gap |
| Colours | body `#8E6FD8` (filament 1), face `#E9DDFB` (filament 2) |

## Files
- `STL/Letter-A.stl` … `Letter-Z.stl`, `Number-0.stl` … `Number-9.stl`: 36 files. Each one is a single watertight
  solid (body and face joined), centred, lying flat on z = 0 with the face up. Use these for one colour.
- `3MF/Letters-A-Z.3mf` (all 26 on one A1 plate) and `3MF/Numbers-0-9.3mf` (all 10 on one plate). Each character
  is one object with two parts: `body` on filament 1 and `face` on filament 2. These are **Bambu-native
  projects**: the generator file was opened in Bambu Studio 2.8.2.61, given the two filaments and colours, then
  File › Save Project as…, then run through `strip_paint.py` (there was no painting to remove). When opened again
  in Bambu Studio they load with no "geometry only" message, with 2 filaments, the purple/lilac colours and
  every part on the right filament. With one colour, set both filaments to the same spool (or use the STLs).

## Size
Every charm is 9.0 mm thick (8 mm body + 1 mm face) and about 20 mm tall (Q is 24.8 mm because of its tail).

**Slot:** one oval slot running left to right through the middle of each charm: 9.0 mm tall (two 4.5 mm circles
side by side, one above the other) × 4.5 mm deep. Two 4 mm (550) paracords fit side by side.
**Plastic under the slot:** 1.75 mm. **Above the slot:** 1.75 mm body plus the 1 mm face (2.75 mm where the face is).
At slot height every letter is cut right across (see below), so these two layers are what hold the top and
bottom halves of each charm together. That is the same as the charms Clark has already printed.

"Plastic above / below" in the table means: in the letter's own plane, the thinnest plastic left between the slot
and the letter's outline, ignoring the rounded 1 mm at each end where the slot comes out. Numbers under 1 mm are
marked **thin**.

| Char | File | W × H × T (mm) | Plastic above slot (mm) | Plastic below slot (mm) |
|---|---|---|---|---|
| A | Letter-A.stl | 18.0 × 20.0 × 9.0 | 4.1 | 1.5 |
| B | Letter-B.stl | 15.0 × 20.0 × 9.0 | 3.3 | 3.2 |
| C | Letter-C.stl | 14.9 × 20.5 × 9.0 | 2.0 | 2.1 |
| D | Letter-D.stl | 15.8 × 20.0 × 9.0 | 2.2 | 2.1 |
| E | Letter-E.stl | 12.4 × 20.0 × 9.0 | 5.4 | 5.3 |
| F | Letter-F.stl | 12.2 × 20.2 × 9.0 | 5.4 | 5.5 |
| G | Letter-G.stl | 16.0 × 20.5 × 9.0 | 2.0 | 2.1 |
| H | Letter-H.stl | 16.0 × 20.0 × 9.0 | 5.2 | 5.3 |
| I | Letter-I.stl | 12.1 × 20.0 × 9.0 | 5.4 | 5.5 |
| J | Letter-J.stl | 12.7 × 20.2 × 9.0 | 5.3 | 3.2 |
| K | Letter-K.stl | 16.6 × 20.2 × 9.0 | 2.0 | 1.3 |
| L | Letter-L.stl | 11.9 × 20.0 × 9.0 | 5.2 | 5.2 |
| M | Letter-M.stl | 22.8 × 20.0 × 9.0 | 2.9 | 3.5 |
| N | Letter-N.stl | 16.1 × 20.0 × 9.0 | 0.1 | 0.1 | **thin**
| O | Letter-O.stl | 18.3 × 20.5 × 9.0 | 2.0 | 2.1 |
| P | Letter-P.stl | 14.5 × 20.0 × 9.0 | 2.7 | 0.2 | **thin**
| Q | Letter-Q.stl | 18.3 × 24.8 × 9.0 | 2.0 | 2.0 |
| R | Letter-R.stl | 15.5 × 20.1 × 9.0 | 3.0 | 1.4 |
| S | Letter-S.stl | 14.1 × 20.5 × 9.0 | 2.9 | 2.9 |
| T | Letter-T.stl | 14.6 × 20.1 × 9.0 | 5.4 | 5.4 |
| U | Letter-U.stl | 16.5 × 20.2 × 9.0 | 5.2 | 2.5 |
| V | Letter-V.stl | 18.4 × 20.0 × 9.0 | 4.5 | 4.0 |
| W | Letter-W.stl | 25.4 × 20.1 × 9.0 | 4.3 | 0.8 | **thin**
| X | Letter-X.stl | 18.6 × 20.1 × 9.0 | 1.9 | 1.7 |
| Y | Letter-Y.stl | 18.5 × 20.1 × 9.0 | 1.2 | 5.2 |
| Z | Letter-Z.stl | 14.8 × 20.0 × 9.0 | 4.7 | 4.7 |
| 0 | Number-0.stl | 16.6 × 20.5 × 9.0 | 2.3 | 2.3 |
| 1 | Number-1.stl | 10.7 × 20.0 × 9.0 | 5.3 | 5.3 |
| 2 | Number-2.stl | 13.6 × 20.3 × 9.0 | 3.5 | 5.0 |
| 3 | Number-3.stl | 14.0 × 20.5 × 9.0 | 3.9 | 2.9 |
| 4 | Number-4.stl | 16.0 × 20.1 × 9.0 | 1.9 | 1.5 |
| 5 | Number-5.stl | 13.0 × 20.2 × 9.0 | 5.3 | 2.7 |
| 6 | Number-6.stl | 14.8 × 20.5 × 9.0 | 2.1 | 2.6 |
| 7 | Number-7.stl | 13.8 × 19.9 × 9.0 | 4.9 | 3.8 |
| 8 | Number-8.stl | 15.1 × 20.5 × 9.0 | 3.1 | 2.8 |
| 9 | Number-9.stl | 14.6 × 20.5 × 9.0 | 2.6 | 2.4 |

### Thin spots (cosmetic, not structural)
- **N**: the V-notches at the top and bottom middle of the N come to within 0.06 / 0.11 mm of the slot, over
  about 0.5 mm. That will print as a tiny window where the slot meets the notch.
- **P**: the bottom of the bowl is 0.2 mm from the bottom of the slot over about 2 mm, so expect a thin slit
  under the P's bowl.
- **W**: 0.8 mm below the slot at the middle notch.
- Everything else has at least 1.2 mm (Y 1.2, K 1.3, R 1.35, 4 1.5, A 1.5); most have 2–5.5 mm.
- On letters with arms or legs at mid-height (T, F, L, V, Y, 4, 7, A) the slot also cuts a shallow open
  groove in the underside or edge of the arm. This comes with a horizontal slot through a letter shape and is
  how the printed ones are.
If a buyer complains about N or P, the fix is in the modeler (a slightly smaller hole, or a thicker border for
those letters). Do not edit these files by hand.

## Print suggestions
- Lay flat, face up, as the files are. **No supports**: the slot is bridged by the 1.75 mm roof.
- 0.2 mm layers (Bambu "0.20mm Standard @BBL A1"), 0.4 mm nozzle, PLA. 0.16 mm gives a smoother face.
- For a full plate, set the bed to 65 °C (first layer and other layers) so the small parts stay stuck.
- Two colours on AMS: one filament change per plate (the face is the top 1 mm only).

## Slicer estimates (Bambu Studio 2.8.2.61, Bambu Lab A1, 0.20mm Standard, PLA Basic, default prime tower)
| File | Time | Filament | Filament changes |
|---|---|---|---|
| Letters-A-Z.3mf | 1 h 53 m (model 1 h 46 m) | 40.0 g total: 33.6 g body, 6.4 g face (incl. 1.15 g tower, 0.4 g purge) | 1 |
| Numbers-0-9.3mf | 47 m (model 40 m) | 14.2 g total: 11.9 g body, 2.3 g face | 1 |
These are slicer estimates, not timed prints.

## What was checked
- Checked: every STL (36) and every 3MF part (72 in the generator files, 72 in the Bambu files) has no open or
  non-manifold edges, no flipped triangles, positive volume and one shell. Sizes measured from the meshes. Slot and
  wall sizes measured from the modeler's 2D outline and a slice at mid-slot height. Both 3MFs opened and sliced in
  real Bambu Studio; the saved A–Z project reopened cleanly with its colours.
- Not checked: no new print was made from these exact files (Clark's earlier prints used the same modeler
  and settings); OrcaSlicer was not tried for these files; how the N/P thin spots look in a real print.
