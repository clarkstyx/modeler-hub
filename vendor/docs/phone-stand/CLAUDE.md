# Phone Stand Keychain — Notes for Agents

Valencia Modelers' side-printed, sleek EDC capsule keychain phone stand. Explain changes in plain words, keep changes modular, and verify watertightness + clearances on every change.

## Architecture

- `src/core/params.ts` — settings, limits, opener/text choices, presets (`standard`, `large`, `soda-slim`, `compact`), and printer profiles.
- `src/core/layout.ts` — single source of truth for all derived dimensions (tapered capsule silhouette, conical hinge, cradle valley & ramp, phone angle, keyring eyelet, soda tab lifter, bottle opener jaw, text boxes).
- `src/core/validateParams.ts` — pre-build parameter rules and helpful multi-colour / portrait-stability tips.
- `src/geometry/buildStand.ts` — builds `BODY`, `FLAP`, and optional `TEXT` / `LOGO_n` decals (`placeDecal`: side cheek z = W, top deck y = T following the taper, flap outer face; colours are partitioned so none overlap, cut once as a union, then each colour part is carved from the removed skin) plus the logo plate (`Layout.logoPlate`: dovetail channel or glue pocket across the top deck, open at z = W; the plate prints flat, logo up) in the side-printed bed frame (`z ∈ [0, width]`), plus `standingParts` and `closedParts` for the 3-pose preview.
- `src/image/` — logo upload. `loadLogo.ts` (main thread only: canvas) draws the picture small; `colors.ts` (pure) drops the background and finds up to `logoColors` flat colours (5-bit buckets, Lab k-means, deterministic seeds, 3×3 majority filter); `traceMask.ts` (pure) traces each colour into exact pixel-edge rings in one shared frame, normalised to width 1, centred, y up, EvenOdd. The layers live in `params.logoLayers`, so the worker, saved settings and the 3MF carry them; the original picture is not kept.
- `src/pipeline/` — Web Worker generation, mesh validation (`validateMesh`), `shelfPack` multi-plate batch layout, and 3MF/STL/ZIP export.

## Key invariants

- **Side-printed bed contact:** both `BODY` and open `FLAP` sit flat on `z = 0` and reach `z = width`, with all Z-transitions (perimeter bevels, internal hinge cones, front hook cutout, keyring pocket, soda-lifter ends, backrest crest) at `≤ 45°` from vertical so zero supports and zero brim are needed.
- **Non-touching print-in-place clearance:** `minDistance(FLAP, BODY) >= clearance` in both the printed pose and the resting folded pose (`test/stand.test.ts`).
- **The click is the only intended interference:** `Layout.click` (skin spring, hidden slit, side caps, nose, notch) is the one place body and flap overlap, and only while the tip passes the nose in the last ~4° of closing, by at most `latch`. The test `the leaf-spring click only touches the flap...` measures it; keep it green. The `detent*` / `rotResistance` settings do nothing (kept for old saved settings).
- Nothing with the click has been printed yet. When a print happens, log it in the hub's `docs/PRINT_VALIDATION.md` and adjust `latch` from what was learned.

## Commands

```bash
npm run dev        # http://localhost:5184
npm test           # vitest suite
npm run validate   # headless build of all 37 validation cases -> out/*.3mf
npm run check      # tsc --noEmit + vitest + vite build
```
