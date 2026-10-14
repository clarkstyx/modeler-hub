# Modeler Hub — notes for Claude Code

The storefront for Clark's family of parametric 3D-print modelers (Valencia AI). Goal: maximum
exposure (free versions on MakerWorld that link here) and recurring income (Patreon tiers that unlock
the full web modelers). Clark is a beginner programmer who vibe-codes: explain in plain words, keep
changes small, and verify in the browser.

## What lives where

- `modelers.json` is the single source of truth: every modeler, its repo (or `path` for one that lives
  in this repo under `modelers/`), tier and category. The pages, the gate and the pull script all read it.
- `modelers/<id>/` holds modelers that have not moved to their own repo yet (`box-modeler`, `gridfinity-labels`, `cookie-cutter`). Same rules
  as a separate repo: a Vite app with its own package.json and tests; `npm run pull <id>` builds it.
- `packages/geometry/` is the shared engine code (manifold kernel, shapes, mesh checks, 3MF/STL, text).
  `npm run sync-shared` copies it into each local modeler's `src/shared/`; edit the package, never a copy.
- `docs/` holds the product strategy: `BLITCH_GAP_ANALYSIS.md` (what competitors offer vs what we
  have, with code evidence), `GENERATOR_ROADMAP.md` (ranked plan and status), `GENERATOR_ARCHITECTURE.md`
  (how a Generation 2 engine is laid out) and `PRINT_VALIDATION.md` (checks, verified fits, test log).
- `scripts/pull.mjs` clones each modeler repo, runs `vite build --base=/m/<id>/` into `public/m/<id>/`,
  and refreshes `vendor/docs/<id>/` (README, CLAUDE.md, MakerWorld .scad) and `.claude/skills/<id>--*`.
  `public/m/` and `vendor/repos/` are gitignored build products; `vendor/docs/` and the copied skills are
  committed so sessions here know every modeler's conventions without cloning them.
- `functions/` are Cloudflare Pages Functions (ES modules, Web Crypto only, no Node APIs).
  `_middleware.js` is the gate, `auth/*` is Patreon OAuth, `api/me.js` is the session lookup.
- The hub pages are plain HTML + one module (`src/site.js`). No framework; keep it that way.

## Conventions

- Tiers are `free` < `maker` < `seller` (levels 0/1/2). Gate by level, never by tier name.
- Never commit secrets. Local secrets go in `.dev.vars`; production ones in the Cloudflare dashboard.
- Every modeler is a Vite app with `npm run build`. If a new one is not, teach `pull.mjs` about it
  rather than special-casing it in the site.
- Modeler repos keep their own conventions (manifold-3d, dark sidebar, colour-ready 3MF, flat-back print
  orientation). See `vendor/docs/<id>/CLAUDE.md` before touching a modeler's behaviour, and make modeler
  changes in the modeler's own repo, not here.
- Test the gate logic with `npm test` (signs/verifies cookies). Test the pages with `npm run dev`.

## Commands

```bash
npm install
npm run pull [id…]        # clone + build modelers into public/m/
npm run dev               # hub pages, no gate
npm run build && npm run pages:dev   # full site with the gate at :8788 (needs .dev.vars)
npm test
```

## Roadmap (in order)

1. Patreon page + Cloudflare project live, jerry can + name tag behind the gate.
2. OpenSCAD mirrors on MakerWorld for the name keychain and jerry can, each linking here.
3. Box with slide lid + sorting tray modeler (highest demand on MakerWorld).
4. Gridfinity bin label generator with batch export (Seller-tier magnet). Built in `modelers/gridfinity-labels`; slot fit still needs a print.
5. Sign / nameplate generator reusing the jerry can text stack.
