// Step 1 of "Log in with Patreon": send the browser to Patreon's consent page.
// Env: PATREON_CLIENT_ID, SITE_URL (e.g. https://modelers.example.com)

import { cookieHeader, randomToken } from '../_lib/session.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const next = url.searchParams.get('next') || '/';
  const state = randomToken();
  const redirectUri = `${env.SITE_URL || url.origin}/auth/callback`;
  const authorize = new URL('https://www.patreon.com/oauth2/authorize');
  authorize.searchParams.set('response_type', 'code');
  authorize.searchParams.set('client_id', env.PATREON_CLIENT_ID);
  authorize.searchParams.set('redirect_uri', redirectUri);
  authorize.searchParams.set('scope', 'identity identity[email] identity.memberships');
  authorize.searchParams.set('state', state);

  const headers = new Headers({ Location: authorize.toString() });
  headers.append('Set-Cookie', cookieHeader('mh_state', state, { maxAge: 600 }));
  headers.append('Set-Cookie', cookieHeader('mh_next', next, { maxAge: 600 }));
  return new Response(null, { status: 302, headers });
}
