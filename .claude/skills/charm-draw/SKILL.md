---
name: charm-draw
description: Draw a new charm, bead, topper or ornament picture in Clark's house style with the Canva connector (generate-image), so it traces cleanly into the Icon Bead Modeler and the other Valencia modelers. Use whenever Clark asks to draw, sketch, generate, make a picture of, or "canva" any character, food, animal, holiday thing or object, even if he doesn't say "charm" or "Canva". Also use when a picture he got back from Canva needs fixing before it can be traced.
---

# Draw a charm with Canva

Clark draws charms in Canva and I trace them into SVGs for the Icon Bead Modeler (`charms/<Category>/<Group>/<name>.svg`). A picture only traces well when it follows the house style below. This skill turns "draw me a penguin" into a Canva prompt that gets that style every time, checks the result, and hands it on to the tracing step.

## Step 1: work out the subject and the set

Ask nothing if the request already says what to draw. Decide which set it belongs to from the subject; say the choice in one line so Clark can redirect:

| Set (Category in the app) | When | Look | Palette |
|---|---|---|---|
| **Kawaii** (default) | food, drinks, treats, critters, pets, people, sports, cute stuff | chunky dark outline, dot eyes, rosy cheeks | any 3 fills + outline `#3b2a2a` |
| **Christmas** | Santa, snowman, reindeer, gingerbread, tree, candy cane, stockings… | same kawaii look, holiday colours | dark `#202027`, red `#D83F45`, green `#16704B`, cream `#FFF1D2` |
| **Everyday Cute** | space, water friends, garden and fantasy critters | same kawaii look, soft palette | dark `#202027`, cream `#FFF1D2`, coral `#E64C5B`, teal `#57BDB0` |
| **Line Art** | faces, flowers, play, gymnastics badges | one main colour, thick black lines standing up, small accents | main colour + black + 1–2 accents |
| **Valencia** | tiles, moods, bead pets | flat tile with a face, no outline needed | 1–3 flat colours |

Palettes are preferences, not rules: Canva will drift, and the tracer snaps the outline to the set's outline colour anyway. What matters is the colour **count**.

## Step 2: build the prompt

Fill `references/prompt-template.md`: replace `[SUBJECT]` and, when the set is not Kawaii, add that set's extra line from the same file. Keep every other line. The lines exist for printing reasons (see `references/why-each-line.md`); dropping one usually costs a retrace.

Call the Canva connector's `generate-image` with:
- `prompt`: the filled template. Clark has asked, through this skill, for his request to be rewritten into the house prompt, so the full template goes in `prompt`, not his raw words.
- `aspectRatio`: `SQUARE_1_1`.
- `user_intent`: "Draw a <subject> charm in Clark's kawaii bead style for the Icon Bead Modeler."

If a widget shows, let it poll. Otherwise poll `get-generate-image-job` until SUCCESS and give Clark the "Open generated image" link.

## Step 3: check the picture before anyone traces it

Look at the result and tick these off. Any miss: regenerate once with the fix appended to the prompt (for example "thicker outline", "no gradient on the cheeks", "join the hat to the head"). Two misses on the same point: tell Clark what Canva keeps getting wrong and suggest he nudge it in Canva's editor.

- [ ] Plain white (or transparent) background, nothing else in frame, no text, no frame.
- [ ] Counted colours: at most 4 including the outline. Shading, highlights and gradients each count as an extra colour.
- [ ] Outline is thick and even all round. No hairlines, no thin whiskers, no single-pixel sparkles.
- [ ] One connected silhouette: no floating hearts, crumbs, steam, sparkles or separate drops.
- [ ] Small features (eyes, cheeks, buttons) are at least 1/25 of the picture's width, so they are about 1 mm on a 26 mm bead.
- [ ] Subject fills the frame; empty margins shrink the bead.

## Step 4: hand it on

Say which folder it belongs in (`charms/<Category>/<Group>/<kebab-name>.svg` in `clarkstyx/icon-bead-modeler`) and offer to trace it. The tracing recipe is in `references/trace-and-import.md`; the script is `scripts/trace-charm.py` in this repo. The Icon Bead Modeler's README explains the folders and the colour rules (Kawaii body = outline colour; Christmas and Everyday Cute body = darkest colour).

## What not to do

- Don't ask Canva for a 3D render, a photo, clip-art with shadows, or "sticker with white border": the border becomes a 5th colour and a ring around the bead.
- Don't request text on the charm. Names go on the letter beads, not the icon.
- Don't produce several subjects in one image. One subject per picture, one picture per charm.
- Don't copy a film, game or brand character. Clark sells these; everything is drawn from scratch.
