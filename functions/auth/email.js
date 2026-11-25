// Email login for members who paid on the site (new phone, cleared cookies…).
//   POST /auth/email   form field "email"  → we email a sign-in link
//   GET  /auth/email?token=…               → the link; sets the session cookie
//
// The link is a signed note ("this email, valid 15 minutes"), so nothing is
// stored. Emails go out through Resend (https://resend.com).
//
// Env:
//   RESEND_API_KEY   re_…
//   MAIL_FROM        e.g. "Let's Make <login@letsmake.ca>" (a domain verified in Resend)

import manifest from '../../modelers.json';
import { signSession, verifySession } from '../_lib/session.js';
import { bestCustomerByEmail, memberCookie, memberPayload, safeNext, stripeReady } from '../_lib/stripe.js';

const LINK_TTL = 15 * 60;
const go = (url, path) => Response.redirect(new URL(path, url.origin).toString(), 303);

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const email = String((form && form.get('email')) || '').trim();
  const next = safeNext(String((form && form.get('next')) || '/'));
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return go(url, '/login/?error=email');
  if (!stripeReady(env) || !env.RESEND_API_KEY || !env.MAIL_FROM || !env.SESSION_SECRET) return go(url, '/login/?error=mailsetup');

  try {
    // Only members get an email, but the page says the same thing either way,
    // so nobody can use this form to find out who is a member.
    const member = await bestCustomerByEmail(env, manifest.tiers, email);
    if (member && member.level > 0) {
      const token = await signSession({ mail: member.email, next }, env.SESSION_SECRET, LINK_TTL);
      const link = `${env.SITE_URL || url.origin}/auth/email?token=${encodeURIComponent(token)}`;
      const name = manifest.site.name;
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.MAIL_FROM,
          to: [member.email],
          subject: `Your ${name} sign-in link`,
          text: `Open this link to sign in to ${name}. It works for 15 minutes.\n\n${link}\n\nIf you did not ask for it, ignore this email.`,
        }),
      });
      if (!res.ok) return go(url, '/login/?error=mail');
    }
  } catch (_) {
    return go(url, '/login/?error=mail');
  }
  return go(url, '/login/?sent=1');
}

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const note = env.SESSION_SECRET ? await verifySession(url.searchParams.get('token'), env.SESSION_SECRET) : null;
  if (!note || !note.mail || !stripeReady(env)) return go(url, '/login/?error=state');
  try {
    const member = await bestCustomerByEmail(env, manifest.tiers, note.mail);
    if (!member || member.level === 0) return go(url, '/login/?error=nomember');
    const headers = new Headers({ Location: new URL(safeNext(note.next), url.origin).toString() });
    headers.append('Set-Cookie', await memberCookie(memberPayload(member), env, url.protocol === 'https:'));
    return new Response(null, { status: 302, headers });
  } catch (_) {
    return go(url, '/login/?error=mail');
  }
}
