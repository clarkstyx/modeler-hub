# Phone Stand Keychain (v2 — Permanent Snap-Lock)

A **support-free EDC phone stand keychain** (`~70.9 × 35 × 11.5 mm` folded, `12 mm` phone slot) that folds shut into **one sleek, seamless pebble capsule** — upgraded with a **Permanent Two-Piece Snap-Lock Hinge** so you can print **Body and Flap separately** in any two filament colours (zero supports, zero AMS purge waste) and **permanently lock them together in one click**.

## What it makes

- **Permanent Two-Piece Snap-Lock (`perm-snap`, default):** Print **Body** and **Flap** separately, align the Flap's C-clip with the Body's internal `Ø 5.05 × 3.89 mm` cam shaft at `~43°`, and press until both localized retaining barbs click home.
  - **25° angled lead-in ramps** + `0.48 mm` nozzle-printable barb crests spread the calibrated `1.40 mm` flexible clip arms elastically (`~1.8%` strain) into the outer knuckle flex headroom.
  - **75° steep retaining shoulders + stress-relieved hook pockets** prevent withdrawal even at the `~43°` assembly angle, while the `Ø 5.05 mm` major cam lobes block withdrawal across `0°..85°`.
  - **`0.30 mm` circular bearing bore** lets the Flap fold completely flush (`0°`) and open smoothly to `~85°` (`~64–67°` screen angle) with zero rotational friction.
- **Three Snap-Fit Test Presets + Compact Hinge Coupons:** Generate **Easy Fit** (`0.35 mm` barb, `1.30 mm` wall, `72°`), **Standard Fit** (`0.45 mm` barb, `1.40 mm` wall, `75°`), and **Firm Fit** (`0.55 mm` barb, `1.50 mm` wall, `78°`) Flaps — **all mating with the exact same Body** — plus compact **Hinge-Only Test Coupons (`E`, `S`, `F`)** to dial in tolerance on your printer in minimal time and filament.
- **Material & Orientation Controls:** Built-in **PLA / PETG** elasticity presets, **Auto / Side / Flat** print orientation selector, **`0.16 / 0.20 / 0.24 mm`** layer-height targets, and **Support-Free Geometry Optimization** (`45°` blind cheek cones, `45°` Z-ramped barb reliefs, and `45°` teardrop bores).
- **Your logo on it, in colour:** upload a PNG, JPG or SVG (section 5). The browser finds its flat colours (up to 6; the white or transparent background is dropped) and traces each into outlines. Three ways to put it on:
  - **Cut into the stand:** engraved, inlay (one part per colour for the slicer) or raised, on the side cheek, the top deck or the flap. Set its width, nudge it, turn it.
  - **Sliding plate:** a dovetail channel across the top deck and a separate flat plate that carries the logo. The plate prints flat, logo up, so any printer can do the colours (swap filament for the last layers); it slides in from the side.
  - **Glue-in plate:** the same plate in a plain pocket, for glue.
  The outlines are saved with the settings and inside every 3MF.
- **Click shut:** a leaf spring in the front hook snaps over a notch in the flap tip when you fold the stand flat, so the keychain stays closed in a pocket. `Folded click` sets how firm it is (`0.50 mm` default, `0` = none).
- **Original Snap & 1-Piece Print-in-Place preserved:** Switch **Assembly mode** anytime between **Permanent Snap-Lock**, **Original Snap** (swappable at `~43°`), and **Print-in-Place** (1-piece single-spool print).
- **Preserved EDC Features:** `12 mm` phone slot (customizable `8.5–16 mm`), `5 mm` corner keyring eyelet, sculpted underside bottle-cap opener + beveled soda-tab lifter, `45°` exterior bevels, and customizable engraved/inlaid/raised text.

## Run

```bash
npm install
npm run dev        # http://localhost:5184
npm test           # vitest: watertightness, identical Body across Easy/Std/Firm, 0°..85° clearance, permanent lock & the click
npm run validate   # builds 46 validation cases + out/deliverables/* (Body, Easy/Std/Firm Flaps, Hinge Coupons, ZIP)
npm run check      # typecheck + test + production build
```
