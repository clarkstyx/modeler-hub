// The site asks this to show "Logged in as … (Maker)" and to unlock cards.
import manifest from '../../modelers.json';
import { currentSession } from '../_lib/stripe.js';

export async function onRequestGet({ request, env }) {
  if (env.DEV_BYPASS === '1') {
    return Response.json({ loggedIn: true, name: 'Dev', level: 2, dev: true });
  }
  const { session, setCookie } = await currentSession(request, env, manifest.tiers);
  if (!session) return Response.json({ loggedIn: false, level: 0 });
  const res = Response.json({
    loggedIn: true,
    name: session.name,
    level: session.level,
    status: session.status,
    via: session.via || 'patreon', // 'stripe' = bought on the site, shows the "Manage" link
  });
  if (setCookie) res.headers.append('Set-Cookie', setCookie);
  return res;
}
