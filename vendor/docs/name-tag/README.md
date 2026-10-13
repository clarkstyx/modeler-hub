# Name Tag Modeler

Parametric **employee name tag** for 3D printing, in the browser: an SVG logo on the left, an optional company name beside it, a thin divider, and on the right the employee's **name in bold** over their **position**. The plate length grows to fit whatever you put on it, and stops at a maximum so tags stay a sensible size for a work shirt. Export a **colour-ready 3MF** (or STL).

Sibling of the [keychain-modeler](../keychain-modeler), [Jeepney Style Keychain](../Jeepney%20style%20keychain%20modeler) and [Image Keychain](../Image%20keychain%20modeler) projects; same Vite + React + three.js stack and 3MF writer.

## Layout

```
┌──────────────────────────────────────────────┐
│  [logo] Company │  NAME IN BOLD              │
│                 │  POSITION                  │
└──────────────────────────────────────────────┘
```

- **Style**: *Raised letters on a plate* (the default), or *Cut-out letters (two layers)*: a solid bottom layer in the text colour and a top layer in the plate colour with the name, position, company, divider and logo cut right through it, so the bottom colour shows through the letters. A logo's own colours fill the bottom of its openings (0.4 mm deep by default). Tick *Exploded view* to lift the top layer in the preview; downloads are always assembled.
- **Name and position** are stacked and centred on each other, in the bold and regular faces of the chosen font family. Capitals are on by default for both; turn them off to keep the case you typed.
- **Logo**: upload an SVG, PNG or JPG. An SVG's fill colours become separate coloured parts. A PNG or JPG is traced into flat colours: the background around it is removed automatically (a flood fill from the picture's edges, so white inside the logo survives), the biggest *Logo Colours* are kept (3 by default) and the rest snap to their nearest kept colour, anti-aliasing fringe is dropped, and *Logo Cleanup* erases traced details thinner than 0.3 mm at printed size. Or tick *Print the logo in one colour*. The logo is scaled to *Logo Height*.
- **Small text**: the position is bold by default, since the regular weight's strokes are thinner than one 0.4 mm nozzle line at small sizes and print broken. *Thicken Text* grows every letter's strokes (try 0.1 to 0.2 mm). Ironing roughens the tops of small raised letters; leave it off for the raised style, or use the cut-out style, whose flat face irons well.
- **Logo Depth** (logos with more than one colour): *Flat* keeps every colour level on one layer; *Layered* keeps the base colour (the biggest one by default, or pick it under *Base Colour*) at the normal height and stands the other colours *Detail Height* (0.6 mm) higher, so a smiley's eyes and mouth stand up from its face. Works in both styles. Colours that overlap in an SVG are trimmed so the parts never overlap.
- **Wordmark logos**: if the logo already includes the company name it is wide, so it is capped to *Max Logo Width* (32 mm) instead of crowding out the employee's name, it gets the divider automatically, and you leave the company-name tick box off.
- **Company name**: tick *Company name beside the logo* to add it in bold next to a logo mark. When you add it the plate lengthens automatically.
- **Divider**: a thin raised bar before the name, on by default whenever there is a company name or a wordmark logo. A lone logo mark sits beside the name without one, as on a printed badge.
- **Plate**: height 25 mm and length *auto* by default, growing from *Min Length* (60 mm) to *Max Length* (100 mm) with the content. Or set the length manually, which is best for a batch of matching tags. The name and the position fit the space *on their own*, so the position comes out the same size on every tag of a batch and only a long name gives way: it is first squeezed narrower down to *Max Squeeze* (80%; the letters keep their height), then made smaller, but never shorter than the position, so it stays the biggest thing on the tag. The footprint readout says how much each line was squeezed or shrunk. Padding, corner radius, plate thickness and the raised height of the logo and text are all adjustable.
- **Colours**: plate, text (name, position, company and divider), and the logo's own colours.

## MakerWorld version

[`makerworld/name_tag.scad`](makerworld/name_tag.scad) is an OpenSCAD version for MakerWorld's **Parametric Model Maker**: upload it there (with `default.png` and `default.svg`) and visitors get sliders and an upload button for their own tag. Upload steps are in [`makerworld/README.md`](makerworld/README.md) and the listing text in [`makerworld/makerworld-listing.txt`](makerworld/makerworld-listing.txt).

- **Logo**: upload a PNG (split into up to 3 colors by brightness, as in the image keychain) or a one-color SVG; Flat or Layered logo depth.
- **Styles**: *Cut-out* (two layers, the bottom colour shows through the letters), *Raised*, or *Inlay* (cut-out with the openings filled flush).
- **Text**: name over position, capitals on by default, a font list, sizes, line gap, letter spacing and *thicken*.
- **Plate**: auto length between a min and max (the text width is estimated, since OpenSCAD can't measure text), or a manual length; height, padding, corner radius, layer thicknesses, and an optional border.
- **Back**: optional recesses for two round badge magnets.
- Each colour is its own `color()` block, so the 3MF from MakerWorld has one part per colour.

## Run

Requires Node 18+.

```bash
npm install
npm run dev      # opens http://localhost:5178
npm run build    # production build into dist/
```

## Printing

- The 3MF loads as one object made of coloured parts. If a slicer ever asks to convert the units of small parts, answer **No**: everything is already in millimetres.
- Print flat, plate down. With an AMS assign a filament to `Plate`, `Text`, and each `Logo #colour` part.
- Single extruder: print the plate colour, add a filament change at the top of the plate (2 mm by default), and print everything raised in one colour.
- Cut-out style: assign a filament to `Bottom Layer`, `Top Layer` and each `Logo #colour` part. Single extruder: print the bottom layer colour and add a filament change at the top of the bottom layer (2 mm by default). The middles of letters like A, O and R are part of the top layer and print fused to the bottom layer, so print the two layers together, not separately.
- Raised height 0.8 mm is four 0.2 mm layers, enough to read by touch without catching on clothing.
- For a pin or magnet, glue a standard badge magnet or pin bar to the back.

## Fonts

Poppins, Lato, Barlow, Kanit, Titillium Web and Rajdhani are loaded from the [google/fonts](https://github.com/google/fonts) repository via jsDelivr under their open licences; Helvetiker is three.js' built-in face.

## Credits

[three.js](https://threejs.org/), [Vite](https://vitejs.dev/), [JSZip](https://stuk.github.io/jszip/).
