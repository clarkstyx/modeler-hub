import { COOKIE, cookieHeader } from '../_lib/session.js';

export async function onRequestGet({ request }) {
  const headers = new Headers({ Location: new URL('/', new URL(request.url).origin).toString() });
  headers.append('Set-Cookie', cookieHeader(COOKIE, '', { maxAge: 0 }));
  return new Response(null, { status: 302, headers });
}
