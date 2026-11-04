# Cake Topper

A personalised birthday cake topper that runs in the browser: a name, an age and a wish
(“Happy Birthday”) stacked on a themed emblem, with two sticks to push into the cake. Pick a
theme from the dropdown (Pokeball, Star, Heart, Rainbow, Soccer ball, or plain words), type
the words, and export a colour-ready 3MF.

One of the [Valencia Modelers](https://github.com/clarkstyx/modeler-hub).

## What you can change

- **Theme**: the emblem behind the middle row and a matching colour set. Colours stay editable.
- **Words**: name, age, and a message with one line per row (“Happy ⏎ Birthday”).
- **Order**: any top-to-bottom order of name, age and message. The emblem always sits behind
  the middle row, so whichever word is in the middle lands on it (like the “7” on the pokeball).
- **Print as**: one piece (everything in one file, colours stacked on the plate) or separate
  pieces (every colour piece flat on its own, laid out beside the plate, to glue on afterwards).
- **Letters**: font, height per row, boldness (fattens thin fonts so they print), row spacing.
- **Sticks**: length, width, distance apart (0 = one stick in the middle).
- **Support**: fills the gaps between letters and ties the rows to the sticks so the plate is
  always one piece.

## Printing

Print as placed: plate on the bed, colours up, no supports. Load the 3MF in Bambu Studio or
OrcaSlicer as one object with multiple parts and give each colour a filament. The pokeball
theme uses five colours (plate, words, red, white, black); reuse one or print the pieces
separately if your AMS holds four.

Keep the sticks out of what gets eaten, or wrap them: PLA is not food-safe.

## Commands

```bash
npm install
npm run dev        # http://localhost:5193
npm run check      # typecheck + vitest + build
npm run validate   # every theme and edge case, writes out/*.3mf
```
