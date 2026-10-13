// Step 2: Patreon sends the user back here with a code. We swap it for a
// token, ask Patreon which tier they are on, and set the signed session cookie.
//
// Env:
//   PATREON_CLIENT_ID, PATREON_CLIENT_SECRET   from https://www.patreon.com/portal/registration/register-clients
//   PATREON_CAMPAIGN_ID                        your campaign's numeric id
//   MAKER_MIN_CENTS   (default 400)            pledge in cents that unlocks Maker
//   SELLER_MIN_CENTS  (default 1200)           pledge in cents that unlocks Seller
//   OWNER_EMAILS      comma-separated emails that always get Seller (you)
//   SESSION_SECRET, SITE_URL

import { COOKIE, cookieHeader, readCookie, signSession } from '../_lib/session.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const next = readCookie(request, 'mh_next') || '/';
  if (!code || !state || state !== readCookie(request, 'mh_state')) {
    return Response.redirect(new URL('/login/?error=state', url.origin).toString(), 302);
  }

  const redirectUri = `${env.SITE_URL || url.origin}/auth/callback`;
  const tokenRes = await fetch('https://www.patreon.com/api/oauth2/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      grant_type: 'authorization_code',
      client_id: env.PATREON_CLIENT_ID,
      client_secret: env.PATREON_CLIENT_SECRET,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenRes.ok) return Response.redirect(new URL('/login/?error=token', url.origin).toString(), 302);
  const { access_token } = await tokenRes.json();

  const idUrl = new URL('https://www.patreon.com/api/oauth2/v2/identity');
  idUrl.searchParams.set('include', 'memberships,memberships.campaign');
  idUrl.searchParams.set('fields[user]', 'email,full_name');
  idUrl.searchParams.set('fields[member]', 'patron_status,currently_entitled_amount_cents');
  const idRes = await fetch(idUrl, { headers: { Authorization: `Bearer ${access_token}` } });
  if (!idRes.ok) return Response.redirect(new URL('/login/?error=identity', url.origin).toString(), 302);
  const identity = await idRes.json();

  const user = identity.data;
  const email = (user.attributes && user.attributes.email) || '';
  const name = (user.attributes && user.attributes.full_name) || 'Patron';

  // find the membership for OUR campaign
  let cents = 0;
  let status = 'none';
  for (const inc of identity.included || []) {
    if (inc.type !== 'member') continue;
    const campaign = inc.relationships && inc.relationships.campaign && inc.relationships.campaign.data;
    if (!campaign || String(campaign.id) !== String(env.PATREON_CAMPAIGN_ID)) continue;
    status = inc.attributes.patron_status || 'none';
    if (status === 'active_patron') cents = inc.attributes.currently_entitled_amount_cents || 0;
  }

  const makerMin = Number(env.MAKER_MIN_CENTS || 400);
  const sellerMin = Number(env.SELLER_MIN_CENTS || 1200);
  let level = 0;
  if (cents >= sellerMin) level = 2;
  else if (cents >= makerMin) level = 1;
  const owners = (env.OWNER_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (email && owners.includes(email.toLowerCase())) level = 2;

  const token = await signSession({ sub: user.id, name, email, level, status, cents }, env.SESSION_SECRET);
  const headers = new Headers({ Location: new URL(level > 0 ? next : '/login/?error=notier', url.origin).toString() });
  headers.append('Set-Cookie', cookieHeader(COOKIE, token));
  headers.append('Set-Cookie', cookieHeader('mh_state', '', { maxAge: 0 }));
  headers.append('Set-Cookie', cookieHeader('mh_next', '', { maxAge: 0 }));
  return new Response(null, { status: 302, headers });
}
