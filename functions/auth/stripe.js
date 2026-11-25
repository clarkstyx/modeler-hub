// Stripe sends the buyer here right after paying. We ask Stripe whether that
// checkout really was paid, then set the session cookie so the modelers open.

import manifest from '../../modelers.json';
import { levelForCustomer, memberCookie, memberPayload, safeNext, stripe, stripeReady } from '../_lib/stripe.js';

const DAY = 24 * 3600;

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const fail = (why) => Response.redirect(new URL(`/login/?error=${why}`, url.origin).toString(), 302);
  const id = url.searchParams.get('session_id') || '';
  if (!stripeReady(env) || !env.SESSION_SECRET || !/^cs_[A-Za-z0-9_]+$/.test(id)) return fail('checkout');

  try {
    const checkout = await stripe(env, `/checkout/sessions/${id}`);
    const paid = checkout.status === 'complete' && checkout.payment_status !== 'unpaid';
    // The link only signs you in on the day of the purchase. Later, use the email login.
    const recent = Date.now() / 1000 - (checkout.created || 0) < DAY;
    if (!paid || !recent || !checkout.customer) return fail('checkout');

    const who = checkout.customer_details || {};
    const level = await levelForCustomer(env, manifest.tiers, checkout.customer);
    if (level === 0) return fail('notier');

    const payload = memberPayload({ id: checkout.customer, name: who.name, email: who.email, level });
    const next = safeNext(checkout.metadata && checkout.metadata.next);
    const headers = new Headers({ Location: new URL(next === '/' ? '/?welcome=1' : next, url.origin).toString() });
    headers.append('Set-Cookie', await memberCookie(payload, env, url.protocol === 'https:'));
    return new Response(null, { status: 302, headers });
  } catch (_) {
    return fail('checkout');
  }
}
