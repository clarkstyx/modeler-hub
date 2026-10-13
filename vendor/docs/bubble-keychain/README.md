# Bubble Keychain Maker

Type a few words, pick a speech-bubble style, drag the keyring hole where you want it, and download a multi-colour 3D-printable keychain.

## What it does

- **Text:** type the words; each Enter starts a new line. Four fonts: Fredoka, Titan One, Luckiest Guy (bundled) and a plain bold. Optionally stretch short lines to the same width.
- **Bubble styles:** speech (rounded), oval, pill, comic box, thought cloud, shout (spiky). Each has a matching tail, bottom left, bottom right or none.
- **Keyring hole:** drag it anywhere in the top view, or pick a preset spot. It snaps to the bubble's edge and the outline wraps around it. Ring style **Separate ring** keeps the bubble's whole outline and hooks the ring on outside it, so a band of outline colour runs between them; **Blended** merges ring and bubble under one outline.
- **Text** can be raised (embossed) or flush (inlaid). The **outline** can be raised, flush, or "whole edge" (the full side wall in the outline colour).
- **Size:** set the keychain width; the letters size themselves to fit, with a warning when they get under 4 mm.
- **Export:** 3MF with bubble, outline and text on separate filaments (opens ready to print in Bambu Studio / OrcaSlicer), or STL.
- **Projects:** every 3MF keeps your settings inside it (`Metadata/bubble-keychain.json`). **Open project…** reads them back from that 3MF, from the `.zip` a hosted page wraps it in, or from a **Save settings** `.json`.

## How it is built

Everything is millimetres, built with clipper:

- body = bubble ∪ tail ∪ keyring tab (bubble colour)
- outline = offset(body, border) − body (outline colour, so it hugs the tab)
- text = the letters (text colour), with counters (the inside of a, e, o) left open

Each part is a separate extruded prism, so no two parts overlap and every part is watertight.

## Run

Requires Node 18+.

```bash
npm install
npm run dev              # opens http://localhost:5177
npm run build            # production build into dist/
npm run build:artifact   # self-contained page for claude.ai → dist-artifact/
```

## Printing tips

- Turn on **ironing** (top surfaces) for smooth raised letters.
- Oval, cloud and shout bubbles leave less room for letters; make them 65–70 mm wide for three lines.
- 0.12–0.16 mm layers give sharper small text than 0.2 mm.

## Credits

[three.js](https://threejs.org/), [clipper-lib](https://www.npmjs.com/package/clipper-lib), [JSZip](https://stuk.github.io/jszip/), [Vite](https://vitejs.dev/), React. Fonts in `src/fonts/` (Fredoka, Titan One, Luckiest Guy) are under the SIL Open Font License; the license files sit next to them. The 3MF writer comes from [image-keychain-modeler](https://github.com/clarkstyx/image-keychain-modeler).
