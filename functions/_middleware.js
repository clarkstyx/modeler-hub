// Membership gate. Runs on every request; only /m/<id>/ paths are checked.
// A modeler's required tier comes from modelers.json. Free ones pass through,
// the rest need a valid session cookie at or above that tier.
//
// Craft-show mode (show.json, enabled: true): a phone that opened /show/ gets
// a signed mh_show cookie. With it, the modelers on the show tiles open with no
// Patreon login, and every one of them gets the "Order this design" button
// (show-overlay.js) added to its page.
//
// Env vars (Cloudflare Pages → Settings → Environment variables):
//   SESSION_SECRET   long random string, signs the cookies
//   DEV_BYPASS       "1" to skip the gate (local dev only)

import manifest from '../modelers.json';
import show from '../show.json';
import { COOKIE, readCookie, verifySession, signSession, cookieHeader } from './_lib/session.js';
import { SHOW_COOKIE, isShowModeler, showEnabled, showCookieTtl, verifyShowCookie } from './_lib/show.js';

const levelOf = (tier) => (manifest.tiers[tier] || manifest.tiers.free).level;
const byId = Object.fromEntries(manifest.modelers.map((m) => [m.id, m]));

/** Adds the order button to a modeler's HTML page. Other files pass through untouched. */
export function addShowOverlay(response, modelerId) {
  const type = response.headers.get('Content-Type') || '';
  if (!type.includes('text/html') || typeof HTMLRewriter === 'undefined') return response;
  const tag = `<script src="/show-overlay.js" data-modeler="${modelerId}" defer></script>`;
  return new HTMLRewriter().on('body', { element(el) { el.append(tag, { html: true }); } }).transform(response);
}

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);

  // The show page hands out the show cookie.
  if (/^\/show\/?(index\.html)?$/.test(url.pathname) && showEnabled(show) && env.SESSION_SECRET) {
    const res = await next();
    const out = new Response(res.body, res);
    const ttl = showCookieTtl(show);
    const token = await signSession({ show: 1 }, env.SESSION_SECRET, ttl);
    out.headers.append('Set-Cookie', cookieHeader(SHOW_COOKIE, token, { maxAge: ttl, secure: url.protocol === 'https:' }));
    return out;
  }

  const match = url.pathname.match(/^\/m\/([^/]+)\/?/);
  if (!match) return next();

  const modeler = byId[match[1]];
  if (!modeler) return new Response('No such modeler', { status: 404 });
  const need = levelOf(modeler.tier);
  const showing = isShowModeler(show, modeler.id) && (await verifyShowCookie(request, env.SESSION_SECRET));
  const pass = async () => (showing ? addShowOverlay(await next(), modeler.id) : next());

  if (need === 0 || env.DEV_BYPASS === '1' || showing) return pass();

  const session = env.SESSION_SECRET ? await verifySession(readCookie(request, COOKIE), env.SESSION_SECRET) : null;
  if (session && session.level >= need) return pass();

  // Not allowed: send the browser to the login page, remember where it was going.
  const dest = `/login/?next=${encodeURIComponent(url.pathname)}&need=${modeler.tier}${session ? '&upgrade=1' : ''}`;
  return Response.redirect(new URL(dest, url.origin).toString(), 302);
}
