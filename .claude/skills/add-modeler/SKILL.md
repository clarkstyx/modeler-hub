---
name: add-modeler
description: Add one of Clark's modeler repos to the hub (modelers.json entry, pull, verify at /m/<id>/, commit). Use when Clark says "add X to the hub", "put the new modeler on the site", or a new modeler repo exists that the hub does not list.
---

# Add a modeler to the hub

1. Confirm the repo builds with `vite build` (every modeler so far does). If it needs `tsc` first,
   that is fine: the pull script runs `npx vite build` directly, which skips type-checking.
2. Add an entry to `modelers.json`:
   - `id`: short, lowercase, hyphenated; it becomes the URL `/m/<id>/`. Never change an id later,
     links on MakerWorld and in videos point at it.
   - `repo`: `owner/name` on GitHub.
   - `tagline`: one plain sentence a buyer understands, 60 to 110 characters.
   - `category`: reuse an existing one (Keychains, Tags & signs, Home, Seasonal) unless a new one is clearly needed.
   - `tier`: `free` for funnel pieces (simple, popular, single colour), `maker` for the full multi-colour
     tools, `seller` for anything that takes uploads or that Etsy sellers would pay for.
   - `makerworld`: the model's MakerWorld URL once published, else `""`.
   - `scad`: path to the OpenSCAD mirror inside the repo, if it has one.
3. `npm run pull <id>` then `npm run build && npm run pages:dev` and open `http://localhost:8788/m/<id>/`.
   Check: the page loads, assets are not 404 (the `--base` flag handles this), exports work.
4. Commit `modelers.json` plus whatever `vendor/docs/<id>/` and `.claude/skills/<id>--*` the pull added.
5. Tell Clark the card is live after the next deploy, and remind him to add the MakerWorld link once the
   free version is posted.
