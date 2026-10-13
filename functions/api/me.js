// The site asks this to show "Logged in as … (Maker)" and to unlock cards.
import { COOKIE, readCookie, verifySession } from '../_lib/session.js';

export async function onRequestGet({ request, env }) {
  if (env.DEV_BYPASS === '1') {
    return Response.json({ loggedIn: true, name: 'Dev', level: 2, dev: true });
  }
  const session = env.SESSION_SECRET ? await verifySession(readCookie(request, COOKIE), env.SESSION_SECRET) : null;
  if (!session) return Response.json({ loggedIn: false, level: 0 });
  return Response.json({ loggedIn: true, name: session.name, level: session.level, status: session.status });
}
