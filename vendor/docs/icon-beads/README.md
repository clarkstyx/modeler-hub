# Icon Bead Modeler

Parametric **icon and logo beads** for a paracord string, in the browser. The sibling of the [Letter Bead Modeler](https://github.com/clarkstyx/letter_bead_creator): same chunky block, border, face and Ø5 mm cord hole, so icon beads hang on the same cord as your letters. Export a **colour-ready 3MF** (one object per bead, one part per colour) or an STL.

```
        ┌─────────────┐  ← design, 1 mm, face colour (or the logo's own colours)
   ○────┤    body     ├────○   ← cord hole Ø5 mm, through the width
        └─────────────┘  ← body (icon outline + border, or a circle / square / hex / heart tile), 8 mm
```

## Getting an icon

- **Charm library**: about 280 ready-made charms in two dropdowns, *Category* (Animals, Food, Faces, Nature, Hearts & symbols, Fun & sports, Holidays) and *Group* (e.g. Animals → Faces, Sea, Dinosaurs). Click one to add it, or *Add all* for the whole group. They're multi-colour, so switch on *Keep logo colours*.
- **Search** 200 000+ icons from the [Iconify](https://iconify.design/) sets, filtered to *Logos* (Simple Icons, SVG Logos, Devicon), *Solid*, *Outline* (Lucide, Tabler…) or *Emoji* (Noto, Twemoji…). Click a result to add it.
- **Quick picks**: 29 built-in icons (heart, star, paw, crown…) that work offline.
- **Upload** your own logo: SVG gives the cleanest edges; PNG / JPG / WebP are traced in the browser (transparent or plain backgrounds work best). Adjust *Trace Threshold*, *Trace Smoothing* and *Invert* for pictures.
- Every icon in **Your beads** has its own count, so one plate can hold 3 hearts, 2 stars and a logo.

## Design

- **Colours**: *One face colour* prints the whole design in one filament, and white areas in a logo become gaps that show the body. *Keep logo colours* makes every colour in the SVG (or up to 4 traced picture colours) its own part; overlaps are resolved so parts never intersect, similar colours are merged and *Max Colours* folds the smallest ones into their nearest neighbour. Each logo colour can be recoloured.
- **Outline icons** (stroke-only, like Lucide) are converted to solid outlines; *Design Fatness* thickens thin lines so they print.
- **Bead shape**: *Contour* follows the icon outline like the letters do (holes filled; separate pieces get joined by a bar along the cord). *Circle*, *Square*, *Hex* and *Heart* are fixed tiles with the design centred on them (*Design Size* scales it).
- **Face style**: *Raised*, *Flush inlay* (level top) or *Engraved* (cut into the body; one colour).
- **Both sides**: the back copy is mirrored the way the bead turns on the cord, so it reads correctly from behind.
- **Cord hole**, **spacer beads**, **plate** layout and colours work the same as in the letter modeler.

Defaults (20 mm tall, 8 mm body, 1 mm border and face, Ø5 mm hole) match the letter beads.

## Adding your own charms

The dropdowns are made from the folders in `charms/`:

```
charms/
  Animals/            ← Category dropdown
    Faces/            ← Group dropdown
      cat-face.svg    ← a charm (file name = its label)
```

Drop your own SVGs into any folder, or make new folders, and they show up the next time the app starts or builds. SVG is best: each fill colour becomes its own printable part. Keep shapes filled (no thin hairlines) and use a few flat colours (no gradients or photos).

`npm run charms` regenerates the built-in set from Fluent Emoji; edit the list in `scripts/build-charms.mjs` to change what's included. Your own files in other folders aren't touched, but don't put them in a built-in folder under the same name as a built-in charm, or the next `npm run charms` will overwrite them.

## Run

Requires Node 18+.

```bash
npm install
npm run dev      # opens http://localhost:5180
npm run build    # production build into dist/
```

Icon search needs an internet connection (it calls `api.iconify.design` from the browser); quick picks and uploads work offline.

## Printing

- Print flat, face up. In Bambu Studio and OrcaSlicer (including Flashforge's Orca) each bead is one object with a `body` part plus one part per design colour, already on separate filaments: body on 1, then each design colour in turn, beads last. Set those filament slots to the colours you have loaded; your printer presets are left alone.
- Keep at least 1 mm of plastic above and below the hole (the readout warns).
- Logos with very thin lines: raise *Design Fatness* to 0.3–0.5 mm or the bead height.
- Logos are trademarks of their owners; print them for personal use.

## Credits

[three.js](https://threejs.org/), [manifold-3d](https://github.com/elalish/manifold), [Iconify](https://iconify.design/) (each icon set keeps its own licence), [Fluent Emoji](https://github.com/microsoft/fluentui-emoji) by Microsoft (MIT, see `charms/LICENSE-fluent-emoji.txt`) for the charm library, [Material Design Icons](https://pictogrammers.com/library/mdi/) (Apache 2.0), [Vite](https://vitejs.dev/), [JSZip](https://stuk.github.io/jszip/).
