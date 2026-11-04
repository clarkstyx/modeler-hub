# Craft-show mode: the booth setup

Customers scan a QR code, pick a design on their phone, make it theirs in the real modeler, press
**Order this design**, and the order lands in your private list. You take the money at the booth,
mark the order paid, and print it within 3 to 5 business days.

```
booth sign (QR)  →  /show/  tiles  →  /m/<id>/ with the "Order this design" button
                                              ↓
                      /orders/ (you, with ORDERS_KEY)  ←  Cloudflare D1 "orders" table
```

Everything is driven by **`show.json`** at the repo root: which modelers are tiles, their prices,
the wording, and `enabled`. Edit it, push to `main`, and the site rebuilds (about 10 minutes).

## One-time setup (about 15 minutes, before Saturday)

The site must already be live on Cloudflare Pages (MANUAL.md part 1). Then:

### 1. Connect the database

In the `modeler-hub` folder on your computer:

```bash
npx wrangler login
npx wrangler d1 create modeler-hub-orders
```

It prints a `database_id`. Open `wrangler.toml`, remove the `#` in front of the four
`[[d1_databases]]` lines at the bottom and paste the id. Commit and push. The `orders` table is
created by itself on the first order.

(If `wrangler login` gives you trouble: Cloudflare dashboard → Storage & Databases → D1 → Create
→ name `modeler-hub-orders`, then copy the id from the database's page.)

### 2. Set the owner key

Cloudflare dashboard → Workers & Pages → modeler-hub → Settings → Environment variables → Production:

| Name | Value |
|---|---|
| `ORDERS_KEY` | any long password you make up (this opens `/orders/`), mark it Secret |

`SESSION_SECRET` from the manual must also be set: it signs the show cookie.
Redeploy once after adding variables (Deployments → Retry, or push anything).

### 3. Check it on your phone

1. Open `https://YOUR-DOMAIN/show/`. Tiles appear. Tap one: the modeler opens **without** a login
   and has a red **Order this design** button at the bottom.
2. Place a test order. You get a number like `VM001`.
3. Open `https://YOUR-DOMAIN/orders/`, paste the `ORDERS_KEY`. The order is there with its
   preview picture. Press **Mark paid**, then **Cancel** it so it does not count.

If step 1 sends you to the login page, `SESSION_SECRET` is missing. If step 2 says "orders
database is not connected", step 1 above was not finished.

### 4. Print the sign

Open `https://YOUR-DOMAIN/show/sign/` on a computer, press **Print this sign** (letter or A4,
margins minimum). The QR code points at `/show/`. Print two: one for the table, one at eye level.

## Decisions still open (confirm before Saturday)

All of these live in `show.json` and are safe defaults until you change them:

- **Prices** for Grinch ($12), Dumpling ($12), Name Ornament ($10) and Phone Stand ($10) are placeholders.
  The pop socket prices ($7 / $8 / $10) are yours. Ready-made stock prices under `stock` are placeholders
  except the clicker ($5 + $1.50 per extra letter).
- **Tax**: the site adds no tax and shows prices as charged (`tax.mode = "none"`). Confirm with your
  accountant whether PST/GST must be shown or added. Nothing is computed until that is decided.
- **Production wording** says *business days* (`production.dayType`). Change the two sentences if you
  mean calendar days.
- **Bulk orders**: `production.bulkThreshold` is `null`, so the bulk sentence (7 to 10 business days)
  is never shown. Set it to a quantity (for example 5) to show it on orders of that size and up.
- **Shipping** is "quoted separately". The form never asks for an address; you get it when you contact them.

## What the hub can and cannot lock down

The order button lives in the hub; the modelers are separate apps. The hub records exactly what the
customer set (settings JSON, preview JPEG, modeler build sha, preset name) and prices only from
`show.json`, so a customer can never change a price or submit an order for a product that is not on the
list. What the hub **cannot** do is remove sliders inside a modeler: a customer can still open "Print" or
"Advanced" sections in the modeler itself. That is why **production starts only after you look at the
saved design**: open "Design" on the order, check size and colours, and load the settings JSON in the
modeler if needed. A real "customer mode" (fixed geometry, approved fonts and palettes, four-colour
limit) has to be built inside each modeler repo and is planned after the show. The modelers already refuse
to export unprintable geometry, so the saved settings are at least printable.

## Saturday

- Your phone: keep `/orders/` open (it remembers the key). Pull down / press Refresh to see new
  orders. The **Open** chip shows what still needs attention.
- Customer shows their number → take the money → **Mark paid…**, pick cash / e-transfer / card and the
  amount. Paying moves the order into the **Production queue** tab; unpaid orders never appear there.
- Ready-made items sold off the table go in the **Quick sale** tab (tap + on each item, pick how they
  paid, Record sale). They are counted apart from custom orders.
- The search box finds an order by number (VM012), name, phone or notes.
- **Design** on an order shows the preview picture the customer saw, a link to the modeler page they
  were on, and their saved settings (JSON). Open the modeler, load that JSON with **Open settings**
  (where the modeler supports it) and export the 3MF. The notes field has what they typed.
- No signal at the venue? The phone's order page still shows the order number and preview after
  saving. If saving failed, the customer's screen says to show it to you: write it down.
- Keep a paper backup list: number, name, phone, item, paid.

## After the show

- Work through the **Production queue** (paid only, grouped by product): **Start printing** → **Mark ready** →
  **Picked up / shipped**. **Due date…** sets a promised date on an order.
- **Download everything as CSV** for your records.
- When you are done taking orders, set `"enabled": false` in `show.json` and push. The show page
  then says "The show is over", the Order button disappears, and the show modelers are back behind
  the Patreon gate. (Phones keep their show cookie for `cookieDays`, 3 days, but it is ignored once
  show mode is off.)

## Changing prices or tiles

`show.json` → `tiles`. Each tile: `id` (must exist in `modelers.json`), `name`, `emoji`, `blurb`,
`hint` (placeholder text in the order notes), `prices` (a list of `{ "label", "cad" }`: one entry
for a single price, several for options like "1 line / 2 lines / 3 lines"). The server prices
every order from this file, never from the phone. `npm test` checks the file.

## How it works (for Claude sessions)

- `functions/_middleware.js`: visiting `/show/` sets a signed `mh_show` cookie. With it, the
  modelers listed in `show.json` open regardless of tier, and their HTML gets
  `<script src="/show-overlay.js">` appended (HTMLRewriter).
- `public/show-overlay.js`: the button and the order sheet, in a shadow root. On submit it grabs a
  JPEG of the largest canvas (if it is not blank), the modeler's `localStorage` (where most modelers
  keep their settings) and `window.__valenciaState()` if the modeler defines it, then POSTs to
  `/api/orders`.
- `functions/api/orders/`: `POST` validates and inserts (prices from `show.json`), is idempotent on the
  phone's `clientKey` (a retry or double tap returns the same order), and allows 8 orders per
  connection per 10 minutes. `GET`/`PATCH` need the `ORDERS_KEY` bearer token or a Patreon session
  whose email is in `OWNER_EMAILS`. Payment (`unpaid/paid/refunded`, method, amount, time) and
  production (`pending/queued/printing/ready/completed/cancelled`) are separate columns; production
  cannot advance on an unpaid order. Settings, screenshot and prices are never editable.
- `functions/api/sales/`: walk-up sales of ready-made stock, priced from `show.json → stock`.
- CSV exports quote cells that start with `=`, `+`, `-` or `@` so a note cannot run as a formula.
- `functions/_lib/orders.js` has the table and the validation; `test/show.test.mjs` covers it.
- The modelers themselves are untouched. A modeler can make the saved design exact by exposing
  `window.__valenciaState = () => currentSettings` (the Mistletoe Ornament does).

Local run with the gate and a throwaway database:

```bash
npm run pull mistletoe-ornament && npm run build
npx wrangler pages dev dist --compatibility-date=2025-01-01 --d1 ORDERS_DB=local
```

with `.dev.vars` holding `SESSION_SECRET=anything-long` and `ORDERS_KEY=anything` (no `DEV_BYPASS`).
