// Membership gate. Runs on every request; only /m/<id>/ paths are checked.
// A modeler's required tier comes from modelers.json. Free ones pass through,
// the rest need a valid session cookie at or above that tier.
//
// Env vars (Cloudflare Pages → Settings → Environment variables):
//   SESSION_SECRET   long random string, signs the cookie
//   DEV_BYPASS       "1" to skip the gate (local dev only)

import manifest from '../modelers.json';
import { COOKIE, readCookie, verifySession } from './_lib/session.js';

const levelOf = (tier) => (manifest.tiers[tier] || manifest.tiers.free).level;
const byId = Object.fromEntries(manifest.modelers.map((m) => [m.id, m]));

export async function onRequest({ request, env, next }) {
  const url = new URL(request.url);
  const match = url.pathname.match(/^\/m\/([^/]+)\/?/);
  if (!match) return next();

  const modeler = byId[match[1]];
  if (!modeler) return new Response('No such modeler', { status: 404 });
  const need = levelOf(modeler.tier);
  if (need === 0 || env.DEV_BYPASS === '1') return next();

  const session = env.SESSION_SECRET ? await verifySession(readCookie(request, COOKIE), env.SESSION_SECRET) : null;
  if (session && session.level >= need) return next();

  // Not allowed: send the browser to the login page, remember where it was going.
  const dest = `/login/?next=${encodeURIComponent(url.pathname)}&need=${modeler.tier}${session ? '&upgrade=1' : ''}`;
  return Response.redirect(new URL(dest, url.origin).toString(), 302);
}
