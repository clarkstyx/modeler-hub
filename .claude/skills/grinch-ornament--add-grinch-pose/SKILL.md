---
name: add-grinch-pose
description: Add a new Grinch pose to the Grinch Ornament Generator from an approved ornament picture (black outline, hanger ring, the Grinch in a Santa suit, a name underneath) — trace it, make it printable in four colours, test, screenshot for approval, then commit and push. Use when the user sends a new Grinch picture and asks for it as a pose/style, or asks to change an existing pose's look or colours.
---

# Add a Grinch pose

The user approves designs by picture. The loop is: **trace their picture → build it as printable
layers → screenshot → they approve or send a correction → ship.** Match the picture; don't invent.

## What the user sends

A finished-ornament picture in the house style (see `docs/references/grinch/`): a square canvas, black
base outline, hanger ring at the top, the Grinch in his Santa suit, and the name in red bubble letters
underneath. Flat colours (green, red, white, yellow eyes) with black outlines. The name is cut off by
`--crop` and drawn by the generator; the rest is traced.

## Rules every pose must follow

- **Four filaments (one AMS):** `dark` (black: base, the outlines between colours, and the line-work printed on each colour), `green` (fur),
  `red` (suit, hat, props), `white` (trim, pom, eyes — yellow eyes fold into white). The tracer never
  traces black: black is the base showing through between the colours.
- **1 mm black line between touching colours** (`PART_GAP`): the tracer's `inset` widens the picture's
  outlines and `figurePieces` cuts red back from green and white back from both. The suit's skirt behind
  the name is cut back from every letter the same way, so the name sits in the suit with an outline.
- **Printable:** no feature under 0.8 mm (`FIGURE.minFeature`, fur tips are opened away), no island
  under 2 mm², the colours ≥ 0.5 mm apart, the hanger ring clear of the hat. `m.warnings` must be `[]`
  for every pose with the default name.
- **One scale for the set** (`FIGURE.mmPerPx`): the pictures share their framing, so every pose gets
  the same head size. Don't fit a pose to a width.

## Steps

1. **Save the picture** as `docs/references/grinch/<id>.jpg` (quality ~92; the tracer tolerates JPEG).
   Ids are one lower-case word (`think`, `peek`, `lights`, `chin`, `cool`, `gift`, `bauble`, …).

2. **Find the crop row**: the top pixel row of the name's letters.
   ```
   python .claude/skills/add-grinch-pose/scripts/trace_figure.py list docs/references/grinch/<id>.jpg
   ```
   lists the big red / green / white components with their pixel boxes; the letters are the red
   components near the bottom, so `--crop` is a few pixels above the topmost of them.

3. **Record and trace**: add the pose to `docs/references/grinch/poses.json` (`{"picture", "crop"}`) and run
   ```
   python .claude/skills/add-grinch-pose/scripts/trace_figure.py regen docs/references/grinch/poses.json src/characters/grinch/poses
   ```
   (or `gen <picture> <out.ts> --crop <row> --name <id>` for one). It writes `GREEN`, `RED`, `WHITE` and
   `BLACK_ON_GREEN` / `BLACK_ON_WHITE` / `BLACK_ON_RED` as `Shape[]` (outlines with holes) in reference
   mm at the set's scale, with the lowest coloured point at `FIGURE.bottom`. Every black mark inside one
   colour (fur strokes, the mouth, finger lines, eyes, pupils, the suit's folds) becomes that colour's
   black line-work, printed on it (thin lines widened by `THICKEN_PX`), and the colour is made whole
   underneath, so no colour is ever chopped into islands by pits. Only the outlines between colours and
   around the figure stay as gaps (`SEP_PX`). Never edit the generated file by hand.

4. **Check the line-work** in the `gen` output line (how many black marks landed on each colour) and in
   the screenshot: the face must be one solid green with its strokes on top, never cut into pieces; a
   solid shape that bridges two colours (a pupil in an eye) goes with the colour that surrounds it most.

5. **Register**: add the id to `POSE_IDS` in `src/characters/grinch/schema.ts` and an entry (id, menu
   label, picture, art module) to `POSES` in `src/characters/grinch/poses/index.ts` (menu order).

6. **Test**: `npx tsc --noEmit -p .` and `npx vitest run`. `tests/characters/grinch/build.test.ts` runs
   every registered pose: no warnings, four colours, colours a black line apart, the figure standing
   on the name box at the shared scale (45–80 mm wide, 46–56 mm tall), the hanger ring centred.
   Common fixes: `FEATURE_TOO_THIN` → a sliver left by a cut, raise `FIGURE.minArea` or check the
   picture; the ring opening into the hat → the hat's centre crease, already handled by
   `buildBase` (the ring clears its full width); a pose too tall/short → the picture is framed
   differently from the set, ask for one in the house framing rather than changing the scale.

7. **Screenshot and show the user.** With the dev server running
   (`npx vite --host 0.0.0.0 --port 5187 --strictPort`), open `http://localhost:5187/?pose=<id>` in a
   headless Chromium with a **fresh** `--user-data-dir` each time (cached profiles show stale builds):
   ```
   chrome --headless=new --disable-gpu --use-angle=swiftshader --enable-unsafe-swiftshader --hide-scrollbars \
     --user-data-dir="<scratch>/prof_<id>_<n>" --window-size=1400,900 --virtual-time-budget=20000 \
     --screenshot="<scratch>/<id>.png" "http://localhost:5187/?pose=<id>"
   ```
   Read the PNG yourself first (check against the picture: eyes, pupils, props, trim), then send it
   with SendUserFile. If the user sends a correction picture, go back to step 2 with it.

8. **Ship** once it looks right: commit on `main` with a message naming the pose, `git push`.
   If the project is deployed, deploy it and give the user the live link with `?pose=<id>`.
