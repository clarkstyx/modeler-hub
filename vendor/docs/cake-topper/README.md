# Cake Topper

A personalised birthday cake topper that runs in the browser: a name, an age and a wish
(“Happy Birthday”) stacked on a themed emblem, with two sticks to push into the cake. Pick a
theme from the dropdown (Pokeball, Star, Heart, Rainbow, Soccer ball, or plain words), type
the words, and export a colour-ready 3MF.

One of the [Valencia Modelers](https://github.com/clarkstyx/modeler-hub).

## What you can change

- **Layout**: *Rows around an emblem* (three rows of words, the theme emblem behind the middle
  one), *Giant number* (the age is the big shape, the name sits across it, the message below) or
  *Script words, no plate* (joined-up letters in one colour on the sticks, like an acrylic topper;
  short bridges and dot stems keep every word attached).
- **Theme** (rows layout): the emblem behind the middle row and a matching colour set. Pokeball,
  Star, Heart, Rainbow, Soccer ball, Daisy, Sunshine or plain words. Colours stay editable.
- **Words**: name, age, and a message with one line per row (“Happy ⏎ Birthday”).
- **Order**: any top-to-bottom order of name, age and message. The emblem always sits behind
  the middle row, so whichever word is in the middle lands on it (like the “7” on the pokeball).
- **Print as**: one piece (everything in one file, colours stacked on the plate) or separate
  pieces (every colour piece flat on its own, laid out beside the plate, with 0.4 mm pockets in
  the plate and emblem showing exactly where each piece glues on).
- **Letters**: five fonts (four from three.js plus Dancing Script, SIL Open Font Licence), height
  per row, boldness (fattens thin fonts so they print), row spacing (can go negative to overlap).
- **Sticks**: length, width, distance apart (0 = one stick in the middle).
- **Support**: fills the gaps between letters and ties the rows to the sticks so the plate is
  always one piece.

## Printing

Print as placed: plate on the bed, colours up, no supports. Load the 3MF in Bambu Studio or
OrcaSlicer as one object with multiple parts and give each colour a filament. The pokeball
theme uses five colours (plate, words, red, white, black); reuse one or print the pieces
separately if your AMS holds four.

Keep the sticks out of what gets eaten, or wrap them: PLA is not food-safe.

Sizes by default: up to 150 mm wide, 80 mm sticks, 1.6 mm plate, 1 mm colour layers. Not yet
verified by a test print.

## Commands

```bash
npm install
npm run dev        # http://localhost:5193
npm run check      # typecheck + vitest + build
npm run validate   # every theme and edge case, writes out/*.3mf
```
