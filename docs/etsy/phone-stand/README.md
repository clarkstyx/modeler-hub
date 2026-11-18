# Phone Stand Keychain: Etsy pack

Everything for selling the phone stand keychain (`phone-stand`, repo `clarkstyx/Phonestand_keychain_can_opener`)
as a digital download on Etsy: Small and Large sizes, can tab lifter only (no bottle opener), editable name on the side.

| Path | What it is |
|---|---|
| `Phone-Stand-Keychain-Etsy-Download.zip` | **The file to upload to Etsy** (PDF guide, 2 Bambu 3MF, 4 STL, font + licence). |
| `ETSY-LISTING.md` | Title, 13 tags, description, listing settings. |
| `listing-images/01…06-listing.jpg` | 2000 × 2000 listing photos (renders + real Bambu Studio screenshot). |
| `files/` | The same files unzipped. |
| `guide/` | Editable source of `START-HERE-Phone-Stand-Keychain.pdf` (HTML, CSS, fonts, screenshots, renders). |
| `REPORT.md` | How the files were checked in the real slicers, what was found, what is still unverified. |
| `seller/` | **Seller Licence edition**: its own ZIP, `ETSY-LISTING-SELLER.md`, `SELLER-LICENSE.txt` and 7 listing images. Guide source: `guide/guide-seller.html` (adds page 8). |
| `scripts/` | How the files were made (see below). |

## Rebuild

1. STL and the plain 3MF: copy `scripts/etsy-pack.ts` into the modeler repo's `scripts/` and run
   `npx tsx scripts/etsy-pack.ts <outDir>` there (Small = `standard` preset, Large = `large` preset, `openerMode: "soda"`).
2. The Bambu editable-name 3MF was made by hand in Bambu Studio 2.8 (steps in `REPORT.md`), then
   `python3 -I scripts/strip_paint.py in.3mf out.3mf` removed the per-triangle colour painting Bambu adds on import.
3. Renders: `scripts/pose_text.py` puts the Bambu name onto the generator's folded/standing poses; render with the
   printable-launch-kit `render_3mf.mjs`.
4. PDF: `RENDER_DEPS=<dir with playwright-core> node scripts/build_pdf.mjs guide/guide.html guide/START-HERE-Phone-Stand-Keychain.pdf`
   (fails on page overflow); same for `guide/guide-seller.html`. Listing images: `cd listing-images && RENDER_DEPS=… node render.mjs`;
   seller images: `node render.mjs listing-seller.html i1,i6,i7 ../seller/listing-images/seller-`.
