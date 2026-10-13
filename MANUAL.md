# The Manual: from repos to a paying membership

This is the complete to-do list, in order, for turning the modelers into a business:
free versions on MakerWorld that send people to the site, and Patreon tiers that unlock the full
web modelers. Each step says who does it (You or Claude), roughly how long it takes, and how you
know it is done. Keep this file open and tick things off.

The ladder we are building:

```
MakerWorld (free, limited)  →  modeler-hub site (free tier)  →  Patreon Maker $4  →  Patreon Seller $12
      exposure                      your own audience               recurring            Etsy sellers
```

---

## Part 1. One-time setup (about one evening)

### 1.1 Pick the brand (You, 20 min)

- One name used everywhere: site, Patreon, MakerWorld profile, TikTok/Instagram/YouTube.
  The repo currently says "Valencia Modelers"; change it in `modelers.json` → `site.name` if you want another.
- Buy the domain (Cloudflare Registrar is easiest since the site is on Cloudflare anyway).
- Make a simple logo: a square icon that reads at 32 px. Claude can make an SVG if you describe it.

Done when: you have a domain and a name you will not change.

### 1.2 Patreon page (You, 45 min)

1. Create the creator page at patreon.com. Category: "Software / Tools" or "3D printing".
2. Two paid tiers. Keep these prices unless you have a reason, the gate reads the pledge amount:
   - **Maker, $4 / month**: all web modelers, multi-colour 3MF, SVG and image upload, saved settings, personal use.
   - **Seller, $12 / month**: everything in Maker plus a commercial licence to sell prints, batch plates, early access, requests.
3. Page text (short, patrons skim):
   > Parametric 3D-print designers that run in your browser. Type a name, drag sliders, export a
   > multi-colour 3MF ready for the AMS. Free versions live on MakerWorld; members get the full tools,
   > uploads, batch plates and a licence to sell what they print. New modeler every month.
4. Register an API client at https://www.patreon.com/portal/registration/register-clients
   - Name: your brand. Redirect URIs: `https://YOUR-DOMAIN/auth/callback` and `http://localhost:8788/auth/callback`.
   - Copy **Client ID** and **Client Secret**. Keep the secret private.
5. Find your **campaign id**: open your creator dashboard, the number in URLs like `.../campaigns/1234567` is it.
   (If you cannot find it, ask Claude: "find my Patreon campaign id with the creator access token".)

Done when: you have Client ID, Client Secret, campaign id, and the two tiers are live.

### 1.3 Cloudflare Pages project (You, 30 min)

1. Cloudflare dashboard → Workers & Pages → Create → Pages → "Upload assets" (no git connection; the
   GitHub Action deploys). Project name must be exactly `modeler-hub`.
2. Settings → Environment variables → Production. Add:

   | Name | Value |
   |---|---|
   | `SITE_URL` | `https://YOUR-DOMAIN` (no trailing slash) |
   | `SESSION_SECRET` | any long random string (40+ characters), mark as Secret |
   | `PATREON_CLIENT_ID` | from 1.2 |
   | `PATREON_CLIENT_SECRET` | from 1.2, mark as Secret |
   | `PATREON_CAMPAIGN_ID` | from 1.2 |
   | `OWNER_EMAILS` | your Patreon login email (you always get Seller) |

   Only if your tier prices are not $4 / $12: `MAKER_MIN_CENTS`, `SELLER_MIN_CENTS`.
3. Custom domains → add your domain.
4. Create an API token: My Profile → API Tokens → "Edit Cloudflare Workers" template is enough.
   Copy the token and your Account ID (dashboard sidebar).

Done when: the project exists, variables are saved, the domain is attached.

### 1.4 GitHub secrets and first deploy (You 10 min, then automatic)

1. GitHub → Settings → Developer settings → Fine-grained tokens → new token. Repository access: all
   your modeler repos. Permissions: Contents **Read-only**. Copy it.
2. In the `modeler-hub` repo → Settings → Secrets and variables → Actions, add:
   `MODELER_PAT` (the token above), `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
3. Actions tab → "Pull modelers, build, deploy" → Run workflow. First run takes 10 to 15 minutes
   (it builds all eleven modelers).

Done when: the workflow is green and `https://YOUR-DOMAIN` shows the cards.

### 1.5 Test the gate (You, 15 min)

1. Open the site logged out. Name Keychain and Letter Beads open. Jerry Can sends you to the members page.
2. Press "Log in with Patreon" and log in with your own account (you are in `OWNER_EMAILS`, so you get Seller).
   Everything opens.
3. Ask a friend to join the Maker tier (or make a second Patreon account and pledge $4 to yourself).
   They should open Maker modelers but get "Upgrade to Seller" on Image Keychain.
4. If step 2 fails, read the error in the URL (`?error=state|token|identity|notier`) and tell Claude:
   "Patreon login fails with error=…, here is what I see". Expect one round of fixing here.

Done when: free, Maker and Seller behave differently.

### 1.6 Fill in the placeholders (You, 5 min)

In `modelers.json`: `site.patreonUrl`, `site.makerworldProfile`. Commit and push; the site redeploys.

---

## Part 2. What goes on MakerWorld vs what is members-only

The rule: **MakerWorld's Parametric Model Maker cannot do uploads, custom fonts, instant preview, saved
projects or batch plates.** Those are physically impossible there, so they are the paid features, and
nobody can accuse you of crippling the free version. Give MakerWorld a genuinely good, text-only,
two-colour version of each modeler so it gets boosted. Every MakerWorld description starts with:

> Free version. Full modeler with uploads, more fonts, batch plates and instant preview at
> https://YOUR-DOMAIN/m/<id>/

### The split, per modeler

| Modeler | MakerWorld free version (OpenSCAD) | Members-only (web) | Tier |
|---|---|---|---|
| **Name Keychain** (has `keychainv2.scad`) | name, MakerWorld's built-in fonts + bundled Waltograph, 3 base styles, keyring position, plate + text colours | 35+ Google fonts, SVG logo upload with its own colour, auto-fit, model scale, 4-part 3MF, saved projects | Free on site, so the funnel lands somewhere open |
| **Letter Beads** | one letter per render, 2 chunky fonts, hole size, body + face colours | whole word on one plate, upload your own .ttf, font fatness / width, spacer beads, 180 / 256 / 350 bed layouts | Free on site |
| **Name Tag** (has `makerworld/`) | name + position, built-in fonts, raised / cut-out / inlay, magnet recesses, 2 colours | PNG / JPG / SVG logo upload with colour tracing, layered logo depth, company name + divider, Google fonts | Maker |
| **Jerry Can** | lines 1 to 3 straight text, heart / star / simple leaf, body sliders, body + text colours | black cap as its own part, arched text, flag leaf, thicken icons, handle and cap Y / Z / tilt, rim, settings save | Maker |
| **Bubble Keychain** | text, speech + pill bubbles, 1 font, hole presets, 2 colours | 6 bubble styles with tails, 4 fonts, drag the hole anywhere, raised / flush outline, projects stored in the 3MF | Maker |
| **Icon Beads** | the 29 quick-pick icons, bead shape, hole | 280-charm library, Iconify search of 200k icons, logo upload, keep logo colours, both sides | Maker |
| **Desktop Sign** (has `desktop-sign.scad`) | name + title, 1 base style, lean angle, 2 colours | all base styles, logo, fonts, multi-line | Maker |
| **Trinket Tray** (has `makerworld/`) | text-only tray, shape presets, size, 2 colours | image upload → multi-colour emblem, ZIP of per-colour STLs | Maker |
| **Image Keychain** (has `makerworld/`) | 3 to 5 bundled sample emblems, size, keyring | upload any image, colour detection, recolour parts, projects | Seller |
| **Grinch / Dumpling Ornaments** | not parametric on MakerWorld: post 3 finished ornaments each as normal models with a blank name plate, "add your name at the site" | every pose / accessory, names, 4 colours, undo, save | Seller |

Two extra rules:

- **Commercial use** is a Seller perk. MakerWorld licence: Standard Digital File Licence (or CC BY-NC-ND).
  Say in the description: "Personal use. Commercial licence for sellers at the site."
- **Never upload the web app's best feature as a MakerWorld static model** (for example a 30-font
  pack). A static model cannot link back once it is downloaded and re-shared.

---

## Part 3. Publishing a modeler on MakerWorld (per modeler, 1 to 2 hours the first time)

1. **Get the OpenSCAD mirror.** Five repos already have one (see the table). For the others, ask Claude in
   that modeler's repo:
   > Write an OpenSCAD mirror of this modeler for MakerWorld's Parametric Model Maker with only these
   > features: [paste the "MakerWorld free version" cell]. Use `color()` blocks so the 3MF has one part per
   > colour, MakerWorld's built-in fonts, and put a comment at the top linking to https://YOUR-DOMAIN/m/<id>/.
   > Test it with `openscad` headless and give me a render.
2. **Set the defaults so the auto-thumbnail looks great**: a real name, two contrasting colours, nothing
   clipped. The thumbnail is 80 % of whether anyone clicks.
3. MakerWorld → Upload → "Parametric Model Maker" → upload the `.scad`. Check every slider shows and renders.
4. **Title**: "<Thing> Generator (Customizable)". Example: "Jerry Can Name Keychain Generator (Customizable)".
5. **Description**: the link line first, then 3 bullets of what the sliders do, then print settings
   (0.2 mm, no supports, flat side down, which parts get which filament).
6. **Photos**: one real print photo beats five renders. Print one before you post.
7. Licence and tags (parametric, customizable, keychain / sign / ornament, Bambu, AMS).
8. Put the MakerWorld URL into `modelers.json` → that modeler's `makerworld` field, push. The card now links there.
9. Post the same files on Printables with the same description.

Then run the launch routine in Part 5.

---

## Part 4. Build order for the next modelers (one per month)

Each is a new repo, same conventions as the others. Ask Claude with the prompt shown, then use the
`add-modeler` skill in the hub to put it on the site.

1. **Box with slide lid + sorting tray.** The most-downloaded generator type on MakerWorld.
   > Build a new modeler repo "box-modeler" like jerry-can-modeler: inner width / depth / height, wall,
   > corner radius, slide lid or no lid, divider rows and columns (sorting-tray mode), optional text on the
   > lid as a second colour, lid tolerance preset for Bambu. Multi-part 3MF, flat-bottom print, no supports.
2. **Gridfinity bin label generator with batch export.** Seller-tier magnet.
   > Build "gridfinity-label-modeler": standard Gridfinity label sizes, text + icon from the icon-bead
   > charm library, and a batch mode: paste many lines, get one plate with all labels laid out for a 256 mm bed.
3. **Sign / nameplate generator** reusing the jerry can text stack: multi-line text, arches, raised or
   engraved, built-in stand or magnet pockets or screw holes.
4. **Cookie cutter + stamp from SVG** (reuse the image-keychain SVG path).
5. **Cable clamp / cable label clip.** Small, fast, printed by the dozen.

---

## Part 5. The launch routine (every release, about 2 hours)

The `launch-checklist` skill in this repo has the full version. Short form:

1. MakerWorld post (Part 3) and Printables mirror.
2. One 15 to 30 second vertical video: typing the name, one slider, the preview spinning, the slicer
   showing the colour parts, the printed part in hand, link on screen. Post to TikTok, Reels, Shorts.
3. One Patreon post and one email to the list: what is new, one photo, the link.
4. One Reddit post (r/BambuLab, r/3Dprinting) with the print photo, then answer every comment for a day.

---

## Part 6. Numbers, pricing and what to ignore

- Watch two numbers weekly: MakerWorld downloads per model and new patrons. Nothing else for six months.
- Expect the first three months to be 10 to 30 patrons. The jump comes when a video lands, not from more features.
- Raise prices only after 50 patrons. Grandfather existing ones.
- If Seller is empty after three months, move "batch plates" into Maker and make Seller licence-only at $8.
- Sell prints yourself at local markets with the modelers; early on it can out-earn Patreon, and it
  produces the photos and videos you need anyway.

---

## Part 7. Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Workflow fails on "Pull and build" | `MODELER_PAT` missing or lacks a repo | re-create the token with Contents read on every modeler repo |
| A modeler page is blank or shows 404 assets | that repo's Vite build needs something the pull script does not know | ask Claude: "the hub build of <id> fails with …" |
| Login loops back to the members page with `?error=notier` | the pledge is to another campaign, or `PATREON_CAMPAIGN_ID` is wrong | check the campaign id; a patron must pledge to *this* page |
| `?error=state` | cookies blocked or the login took over 10 minutes | try again in a normal window |
| Patron cancelled but still has access | sessions last 7 days by design | nothing to do; it expires |
| You want to give someone free access | add their Patreon email to `OWNER_EMAILS` (comma-separated) | they get Seller |

When stuck, open a Claude Code session in `modeler-hub` and describe what you see. The repo's
CLAUDE.md and the copied modeler docs give it the full picture.
