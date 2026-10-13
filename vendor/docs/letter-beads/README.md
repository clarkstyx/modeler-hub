# Letter Bead Modeler

Parametric **chunky letter beads** for a paracord name string, in the browser: each letter is a thick block in the body colour (the glyph grown by a border), with the glyph itself on top in the face colour and a round **cord hole** bored straight through from side to side. Optional spacer beads share the same hole. Export a **colour-ready 3MF** (or STL).

Sibling of the [keychain-modeler](../keychain-modeler), [Jeepney Style Keychain](../Jeepney%20style%20keychain%20modeler), [Image Keychain](../Image%20keychain%20modeler) and [Name Tag](../Name%20tag%20modeler) projects; same Vite + React + three.js stack and 3MF writer. The solids themselves are built with [manifold-3d](https://github.com/elalish/manifold) (offset, extrude and the hole boolean), which the other modelers don't need.

## Letter

```
        ┌─────────────┐  ← face (glyph), 1 mm, face colour
   ○────┤    body     ├────○   ← cord hole Ø5 mm, through the width
        └─────────────┘  ← body (glyph + 1 mm border), 8 mm, body colour
```

Defaults follow the commercial chunky-letter sets: 20 mm tall, 8 mm thick body with a 1 mm border, 1 mm face, Ø5 mm hole through the middle of the block (the set this was measured from was 18 × 7 mm with a 5 × 4.5 mm hole). Everything is generated from the font outlines, so the result is an original design.

- **Letters**: any characters the font has, including Ñ, numbers and lowercase. Pick a chunky family or upload your own `.ttf`/`.otf`.
- **Font Fatness** grows the glyph itself (before the border) so a thinner font prints chunky; **Text Width** squeezes or stretches letters sideways (60–140 %).
- **Letter sizing**: *Keep font baseline* scales every letter by the font's cap height and centres it on the cap band, so all letters line up on the cord and Q's tail or Ñ's tilde stick out as the font draws them. *Stretch each letter* forces every glyph to exactly the same height.
- **Letter block**: *Letter Height* (20 mm, border included), *Border* (1 mm), *Body Thickness* (8 mm), *Face Thickness* (1 mm). *Raised on top* adds the face above the body (9 mm total); *Flush inlay* sinks it into the body so the top is level. *Face on both sides* mirrors it underneath for beads that get flipped.
- **Cord hole**: diameter (5 mm, the usual size for these sets; 550 paracord is about 4 mm) and direction, horizontal through the width or vertical. The readout warns when less than 1 mm of plastic is left above and below the hole.
- **Spacer beads**: round pucks with softened edges and the same hole, in the bead colour.
- **Plate**: parts are laid out in rows for a 180 / 256 / 350 mm bed with an adjustable gap, and exported at those positions.
- **Colours**: body, face and beads. Each letter exports as one object with a `body` and a `face` part. In Bambu Studio and OrcaSlicer (including Flashforge's Orca) the parts open already on separate filaments: body on filament 1, face on 2, beads on 3. Set those filament slots to the colours you have loaded. Your printer and filament presets are left alone.

## Run

Requires Node 18+.

```bash
npm install
npm run dev      # opens http://localhost:5179
npm run build    # production build into dist/
```

## Printing

- Print flat, face up. Bodies come in on filament 1, faces on 2 and beads on 3; in other slicers select all parts of one colour in the object list and set the filament once.
- 8 mm body with a Ø5 mm hole leaves 1.5 mm of wall above and below the hole; don't go under 1 mm.
- The hole prints as a bridge across the top of the bore; at 5 mm it needs no support. If the printed hole is snug for your cord, raise the diameter 0.3–0.5 mm.
- *Flush inlay* prints a level top with no step and slightly cleaner colour edges; *Raised on top* matches the original set's look.

## Fonts

Lilita One, Titan One, Sigmar One, Righteous, Bungee and Poppins Black (OFL) and Luckiest Guy and Chewy (Apache licence) ship with the app in `public/fonts`, copied from the [google/fonts](https://github.com/google/fonts) repository with their licence files. Fredoka and Baloo only ship there as variable fonts, which the TTF loader reads at the regular weight, so download a static bold and upload it if you want them.

## Credits

[three.js](https://threejs.org/), [manifold-3d](https://github.com/elalish/manifold), [Vite](https://vitejs.dev/), [JSZip](https://stuk.github.io/jszip/).
