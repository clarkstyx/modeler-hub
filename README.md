# Modeler Hub

**Start with [MANUAL.md](MANUAL.md)**: the ordered to-do list from accounts to the first paying patron,
plus which features go on MakerWorld and which stay members-only.

The home site for all of Clark's parametric 3D-print modelers. It pulls every modeler repo,
builds it, and serves it at `/m/<id>/` behind a Patreon membership gate. Free modelers are open,
Maker and Seller modelers need a logged-in patron on that tier.

```
modelers.json          the list: id, repo (or path), tagline, category, tier  ← edit this to add a modeler
modelers/<id>/         modelers that live in this repo for now (gridfinity-labels, cookie-cutter); built like any other
docs/                  gap analysis vs Create.Blitch, roadmap, engine architecture, print validation
scripts/pull.mjs       clones + builds every modeler into public/m/<id>/ (also copies their docs + skills)
index.html             home page: cards grouped by category, locked/unlocked per tier
pricing/, login/       plans page, members-only page
functions/             Cloudflare Pages Functions: the gate + Patreon login
  _middleware.js         checks the session cookie on /m/<id>/
  auth/login.js          sends the browser to Patreon
  auth/callback.js       reads the patron's tier, sets the signed cookie
  api/me.js              "who am I" for the pages
vendor/docs/<id>/      each modeler's README + CLAUDE.md (+ its MakerWorld .scad), refreshed by pull
.claude/skills/        hub skills + each modeler's skills (copied as <id>--<skill>)
.github/workflows/     nightly + on-push: pull, build, deploy to Cloudflare Pages
```

## Run it locally

```bash
npm install
npm run pull                           # build every modeler (takes a while), or `npm run pull jerry-can`
npm run dev                            # http://localhost:5173, every modeler unlocked, no login
# with the gate + Patreon login:
cp .dev.vars.example .dev.vars         # fill in, or leave DEV_BYPASS=1
npm run build && npm run pages:dev     # http://localhost:8788
```

On your own computer without the login server (`npm run dev`), the hub shows "Local preview · all
unlocked" instead of the login button and every card opens. A modeler you have not pulled yet shows
the `npm run pull <id>` command to build it. The live site still needs a Patreon login.

## One-time setup

1. **Patreon**: create your page with two tiers (Maker $4, Seller $12). Then at
   https://www.patreon.com/portal/registration/register-clients create a client:
   redirect URI `https://YOUR-SITE/auth/callback` (and `http://localhost:8788/auth/callback` for local).
   Note the Client ID, Client Secret, and your campaign id (in the URL of your Patreon creator dashboard,
   or from the API's `/api/oauth2/v2/campaigns`).
2. **Cloudflare Pages**: create a project named `modeler-hub` (no git connection needed, the GitHub
   Action deploys). Settings → Environment variables (production):
   `SITE_URL`, `SESSION_SECRET` (any long random string), `PATREON_CLIENT_ID`, `PATREON_CLIENT_SECRET`
   (encrypt), `PATREON_CAMPAIGN_ID`, `OWNER_EMAILS` (your email, always gets Seller).
   Optional: `MAKER_MIN_CENTS`, `SELLER_MIN_CENTS` if your tier prices differ from $4 / $12.
3. **GitHub secrets** on this repo: `MODELER_PAT` (fine-grained token, read-only Contents on the modeler
   repos), `CLOUDFLARE_API_TOKEN` (Pages edit), `CLOUDFLARE_ACCOUNT_ID`.
4. Point your domain at the Pages project. Done: every push to `main`, every night, and every manual run
   rebuilds all modelers and redeploys.

## Add a modeler

Add an entry to `modelers.json` (the `add-modeler` skill walks through it), run `npm run pull <id>`,
check it at `/m/<id>/`, commit. An entry can point at a folder in this repo with `"path": "modelers/<id>"`
instead of `"repo"`; the pull script builds it in place. The modeler repo itself needs nothing special beyond being a Vite app;
the pull script passes `--base=/m/<id>/` so asset paths work.

To redeploy when a modeler changes, run the "Pull modelers, build, deploy" workflow by hand, or add this
step to the modeler repo's own CI:

```yaml
- run: |
    curl -X POST -H "Authorization: Bearer ${{ secrets.HUB_DISPATCH_TOKEN }}" \
      -H "Accept: application/vnd.github+json" \
      https://api.github.com/repos/clarkstyx/modeler-hub/dispatches \
      -d '{"event_type":"modeler-updated"}'
```

## How the gate decides

Patreon tells us the patron's current pledge in cents for *your* campaign. `>= SELLER_MIN_CENTS` →
Seller, `>= MAKER_MIN_CENTS` → Maker, otherwise no access. Emails in `OWNER_EMAILS` always get Seller.
The result is stored in a signed, HttpOnly cookie for 7 days; after that the user logs in again and
the tier is re-checked, so cancelled patrons lose access within a week.
