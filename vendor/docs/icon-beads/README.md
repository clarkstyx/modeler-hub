# Icon Bead Modeler

Parametric **icon and logo beads** for a paracord string, in the browser. The sibling of the [Letter Bead Modeler](https://github.com/clarkstyx/letter_bead_creator): same chunky block, border, face and Ø5 mm cord hole, so icon beads hang on the same cord as your letters. Export a **colour-ready 3MF** (one object per bead, one part per colour) or an STL.

```
        ┌─────────────┐  ← design, 1 mm, face colour (or the logo's own colours)
   ○────┤    body     ├────○   ← cord hole Ø5 mm, through the width
        └─────────────┘  ← body (icon outline + border, or a circle / square / hex / heart tile), 8 mm
```

## Getting an icon

- **Charm library**: about 420 ready-made charms in two dropdowns, *Category* (Animals, Food, Faces, Kawaii, Line Art, Nature, Hearts & symbols, Fun & sports, Holidays) and *Group* (e.g. Animals → Faces, Sea, Dinosaurs). Click one to add it, or *Add all* for the whole group. They're multi-colour, so switch on *Keep logo colours*.
- **Kawaii set**: 82 original cute charms with a chunky dark outline and little faces: drinks (boba, matcha latte, iced matcha, iced coffee, coffee, cocoa, strawberry milk), treats (donuts, macaron, cupcake, ice cream, cookie, pancakes, pudding…), food friends (onigiri, toast, sushi, dumpling, avocado, ramen…), critters (axolotl, baby spider, ladybug, baby dino, kitten, frog, ghost, bee, unicorn, fluffy yeti…), pets (tabby cat, corgi, beagle, French bulldog, teddy bear), people (girl with bow, Santa boy and girl, chef, football kid, princess), sports balls (basketball, soccer, baseball, volleyball, football, 8-ball), martial arts (judo kids in white or blue gi: ready, fighting stance, bow, side kick and victory poses, plus black belt, gi jackets, gold medal and yin-yang) and cute stuff (bow, heart, star, cloud, moon, instant camera, nurse cap). They're drawn from scratch, not copies of any film, show or game character, so they're yours to print and sell. They look best with *Contour*, *Keep logo colours*, *Raised* and Emboss *by size*. Each one uses at most 4 colours, one of them the dark outline, and adding one sets the body to that outline colour, so a Kawaii bead fits a 4-slot AMS. Mixing different charms on one plate can add up to more than 4 filaments, so print one design (or ones that share colours) per plate.
- **Christmas** and **Everyday Cute**: 24 cozy kawaii charms in two 4-colour palettes. *Christmas* has Characters (snowman, sleepy reindeer, gingerbread dragon, stocking penguin, winter fox, present kitten, polar bear, candy-cane worm) and Decorations & treats (ornament planet, hot cocoa, Christmas tree, snow globe); *Everyday Cute* has Space (ringed planet, shooting star, moon, astronaut bunny), Water friends (axolotl, sea otter, capybara, stingray) and Garden & fantasy (mushroom hedgehog, rainboot frog, sleepy dragon, strawberry cat). Adding one turns on *Keep logo colours* with the body in the darkest colour, the dark outline, so each bead fits a 4-slot AMS. They're sized for 26–28 mm beads; the wide ones (stingray, ringed planet, shooting star) need a larger *Max Width* to reach full height. Each set shares one palette, so a whole set prints on one plate with 4 filaments.
- **Line Art set**: 61 original charms in the bold-outline style: one main colour for the body, thick raised lines in a contrast colour (usually black) and small raised accents like cheeks and highlights. Groups: Faces (smiley, silly face, star face, ninja, sun, cloud), Animals (panda, pig, bunny, mouse, bee, ladybug, octopus, puppy, paw print, kitty), Food (apple, cheese, fries, pumpkin, donut, lemon, hot dog, dumpling, watermelon, cupcake, pancakes, candy, ice cream), Flowers (sunflower, daisy, happy flower, butterfly, heart, clover), Love notes (chat bubble, love letter, crown, heart tee, gift, heart book, coffee cup, bow, phone, bucket hat…) Play (basketball, soccer ball, pickleball, paddle, camera, game controller, play button) and Gymnastics (pink gymnast silhouettes in a ring on a white disc: handstand, handstand straddle, split leap, star jump, beam arabesque, ribbon dancer, back walkover, plus a scorpion handstand with no ring: a white backing follows the figure's outline, so the bead is the gymnast's shape. They look best at 24 mm or bigger). A charm drawn on a pale backing carries `data-body="lightest"`, and the app then picks *Body colour → Lightest* for it. They're drawn from scratch, so they're yours to print and sell. Adding one sets *Keep logo colours*, body = *Main colour*, Emboss *flat* and *Raised*, so you get a flat body with the lines standing up, 2–4 colours per charm.
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
- **Two cords**: under *Cord hole*, *Two cords* bores a second hole beside the first, 1.5 mm apart, the same as the letter beads, so a looped lanyard (two paracords) runs through every icon and spacer bead. The holes sit side by side in the bead's plane (left and right for vertical, one above the other for horizontal). The readout warns if a hole comes out through the side of a narrow bead.
- **Cord collar**: under *Cord hole*, *Cord collar* adds a short neck where the cord goes in (on top for a vertical hole, on the left for a horizontal one), like the caps on bought cord ends. *Collar Width* and *Collar Length* size it; it widens itself to keep 1.5 mm of plastic round the hole(s), fills a dip like the top of a heart, and prints flat with the bead. *Collar in its own colour* makes it a separate part (pick the colour under it). It pairs well with *End cap*.
- **End cap**: under *Cord hole*, pick *End cap (hides the knot)* for the last bead on a cord. The cord goes in through the normal hole at the top (vertical) or left (horizontal) and comes out of a wide oval knot pocket on the other side. Tie a knot in the end and pull it back into the pocket, where it hides inside the bead. With *Lock the knot in*, the mouth of the pocket is a little narrower than the pocket, so the knot squeezes past it and stays. *Knot Width* and *Knot Depth* size the pocket; it is as tall as the body allows (keeping 1.2 mm walls), so choosing End cap raises the body to at least 9 mm. The pocket never breaks out through the side: on a narrow or pointy edge it gets smaller instead, and the readout says so.

Defaults: 24 mm tall, 8 mm body, 1 mm border and face, Ø5 mm hole. The body, border and hole match the letter beads; the height is a little more than the letters' 20 mm because a charm the same height looks smaller next to them (a heart narrows to a point, a letter is a full block). Set 20 mm if you want them exactly level.

## MakerWorld bundle (one command)

```bash
npm run makerworld:bundle
```

Builds the app, exports the free set in `scripts/sets/makerworld-free.json` headlessly (the app runs in Chromium with `?harness=1`, no clicking), and writes `makerworld-bundle/` (not committed): `1-upload-files/` (plate 3MF + STL, one 3MF per charm), `2-photos/` (four 1600 × 1200 JPEGs, cover first), `3-listing-text.md` and `CHECKLIST.md`. Edit the set file to change the charms or options, and `scripts/makerworld-bundle/listing.json` for the title, tags and Patreon link. Needs Chrome/Edge or `CHROMIUM_PATH`. Only 10 charms are published free on purpose; the rest stay in the modeler.

## Adding your own charms

The dropdowns are made from the folders in `charms/`:

```
charms/
  Animals/            ← Category dropdown
    Faces/            ← Group dropdown
      cat-face.svg    ← a charm (file name = its label)
```

Drop your own SVGs into any folder, or make new folders, and they show up the next time the app starts or builds. SVG is best: each fill colour becomes its own printable part. Keep shapes filled (no thin hairlines) and use a few flat colours (no gradients or photos).

`npm run kawaii` redraws the Kawaii set from `scripts/build-kawaii.mjs` (each charm is a few shapes on a 64 × 64 grid, so it's easy to add more). It replaces the whole `charms/Kawaii/` folder, so keep your own SVGs elsewhere.

`npm run lineart` does the same for the Line Art set from `scripts/build-lineart.mjs` and replaces `charms/Line Art/`.

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
