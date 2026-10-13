---
name: add-dumpling-accessory
description: Add a new accessory style (hat, ears, antlers, halo, holly…) to the Dumpling Ornament Generator from a reference picture — trace it, make it printable in at most 4 colours, test, screenshot for approval, then commit and deploy. Use when the user sends artwork of the dumpling wearing something and asks for it as a style, or asks to change an existing style's look or colours.
---

# Add a dumpling accessory style

The user approves designs by picture. The loop is: **trace their artwork → build it as printable
layers → screenshot → they approve or send a correction → ship.** Match the artwork; don't invent.

## What the user sends

Best input is a **composite**: the standard dumpling ornament (bun, face, steamer, name plate) wearing
the accessory, flat colours with black outlines. The trace script scales from the bun (52 mm) and the
eyes, so a composite traces straight into position. A lone accessory drawing (no dumpling) needs a
composite to place it — ask for one, or place it by hand and show a screenshot.

## Rules every style must follow

- **Max 4 filaments (one AMS).** Slots are `dark` (black: base + outlines, eyes, mouth), `light`
  (white: bun, plate, highlights), `wood` (steamer + pleats, tan by default) and `accent` (cheeks,
  red by default). A style fits its colours into these 4 by:
  - setting `suggestedAccent` (e.g. elf green, beanie blue) — the cheeks then use it too, so pair it
    with `hides: ['cheeks']` or `restyle: { cheeks: 'wood' }` unless the artwork's cheeks match;
  - or `suggestedPalette: { wood: '#…' }` (holly green, reindeer/gingerbread brown) — the steamer
    and pleats take that colour too;
  - or reusing an existing slot (star/halo/baubles on tan `wood`, pom-poms on `light`).
  Never use the `trim` slot (legacy). `colours.test.ts` enforces ≤ 4 for every registered style.
- **1 mm black line between touching parts** (`PART_GAP`). Parts that touch must be separated
  either by tiers/`covers` (the engine cuts them) or with `clearOf(shape, [others], scope, PART_GAP)`.
- **Printable:** no feature under 0.8 mm, same-tier parts ≥ 0.5 mm apart, every part fully on its
  support. `m.warnings` must be `[]` for the default build.

## How a layer sits (src/engine/accessories/types.ts)

| Want | Layer settings |
|---|---|
| Behind the head (antlers, ears, wings, halo, leaves) | `tier: 'behindBun', restsOn: 'base'` — cut back from the bun automatically |
| Worn over the crown (hats, cuffs, brims, berries on top) | `tier: 'body', restsOn: 'base', covers: ['bun', 'pleats']` — bun and pleats give way by 1 mm |
| Decoration printed on another accessory part (icing, band, baubles, shine) | `tier: 'detail'` (or `'top'` on a detail), `restsOn: 'accessory_<host>'` — must lie fully on the host |
| On the face (nose, carrot) | `anchor: 'faceCenter', tier: 'detail', restsOn: 'bun', fixed: true` |
| Stays put when the user moves/scales the accessory | `fixed: true` (ears, noses) |
| Remove a character part | `hides: ['cheeks']` on any layer |

Anchors: `dumplingTop` (top of the bun, ref y 22.5) for anything on the head; `faceCenter` (0, 1.8).
Traced coordinates are absolute reference mm, so shift by the anchor: `dy = -anchors.dumplingTop.y`.

## Steps

1. **Classify the pieces** in the artwork: which are behind the head, over the crown, decorations,
   on the face; which colour slot each takes (4-colour rule above). Tell the user the plan in a
   short table if any colour has to merge.

2. **Trace.** List the coloured pieces with their component indices and positions (ref mm):
   ```
   python .claude/skills/add-dumpling-accessory/scripts/trace.py list <composite.png>
   ```
   Ignore the bun (`white`, ~52 wide), plate, steamer (the ~66-wide pieces below y −8), eyes' shine
   dots and cheeks. Write a piece map JSON (in the scratchpad) and generate the shapes module:
   ```
   python .claude/skills/add-dumpling-accessory/scripts/trace.py gen <composite.png> <pieces.json> \
     src/characters/dumpling/accessories/shapes/<id>.ts --name <id>
   ```
   Kinds: `poly`, `polys` (e.g. beanie ribs), `circle` (berries, baubles, poms), `ring` (halo).
   Black parts (a top hat) can't be traced — build them from `roundedRect`/`circle` positioned from
   a traced neighbour (see `snowman.ts`).

3. **Test first** — add the style to `STYLES` in `tests/characters/dumpling/accessories/styles.test.ts`
   (label, colours it sets, layer ids in order) plus any style-specific checks (gap to the bun,
   fixed parts don't move with `offsetX`, decorations rest on their host). Run it and watch it fail.

4. **Write `src/characters/dumpling/accessories/<id>.ts`** using the helpers in `traced.ts`
   (`traced`, `tracedAll`, `tracedRing`, `dot`, `clearOf`). Copy the closest existing style:
   `beanie.ts` (simple hat), `holly.ts` (front + behind + shines), `gingerbread.ts` (decorations
   that split their host — weld the grown decoration back into the host), `tree.ts`, `angel.ts`,
   `snowman.ts` (procedural black part + fixed face part), `elf.ts`, `reindeer.ts`, `santa.ts`.
   Add the id to `ACCESSORY_IDS` in `schema.ts` (if new) and register it in `registry.ts`
   (menu order).

5. **Verify.** `npx tsc --noEmit -p .` and `npx vitest run` — all green, no warnings. Common fixes:
   - `PART_OFF_SUPPORT` on a decoration → weld it into the host (`offset(deco, 1.2)` unioned in).
   - `FEATURE_TOO_THIN` → a sliver from a cut; move the piece or widen the gap.
   - Vitest swallows `console.log`; write probe output to a file (and delete it after).

6. **Screenshot and show the user.** With the dev server running
   (`npx vite --host 0.0.0.0 --port 5187 --strictPort`), open `http://localhost:5187/?accessory=<id>`
   in headless Edge with a **fresh** `--user-data-dir` each time (cached profiles show stale builds):
   ```
   "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" --headless=new --disable-gpu \
     --hide-scrollbars --user-data-dir="<scratch>/edge_<id>_<n>" --window-size=1400,900 \
     --virtual-time-budget=15000 --screenshot="<scratch>/<id>.png" "http://localhost:5187/?accessory=<id>"
   ```
   Read the PNG yourself first (check against the artwork), then send it with SendUserFile.
   If the user sends a correction picture, go back to step 2 with it.

7. **Ship** once it looks right: commit on `main` with a message describing the style, `git push`,
   then `npx vercel deploy --prod --yes` (the user has approved production deploys for this
   project). Give the user the live link: `https://dumpling-ornament-generator.vercel.app/?accessory=<id>`.
