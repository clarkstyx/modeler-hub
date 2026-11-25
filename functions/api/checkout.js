// "Choose this plan" button. Makes a Stripe Checkout page for the plan and
// sends the browser there. Stripe takes the card; we never see it.
//   /api/checkout?plan=maker            (plan = a paid tier id from modelers.json)
//   /api/checkout?plan=seller&next=/m/clicker/
// After paying, Stripe sends the buyer to /auth/stripe, which unlocks the site.

import manifest from '../../modelers.json';
import { currentSession, safeNext, stripe, stripeReady } from '../_lib/stripe.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = env.SITE_URL || url.origin;
  const plan = url.searchParams.get('plan') || '';
  const tier = manifest.tiers[plan];
  const price = env[`STRIPE_PRICE_${plan.toUpperCase()}`];
  const back = (why) => Response.redirect(`${origin}/pricing/?error=${why}`, 302);

  if (!tier || tier.level === 0) return back('plan');
  if (!stripeReady(env) || !price || !env.SESSION_SECRET) return back('setup');

  const params = {
    mode: 'subscription',
    'line_items[0][price]': price,
    'line_items[0][quantity]': '1',
    allow_promotion_codes: 'true',
    success_url: `${origin}/auth/stripe?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/pricing/`,
    'metadata[next]': safeNext(url.searchParams.get('next')),
    'metadata[plan]': plan,
  };
  // Already a member (upgrading)? Keep it on the same Stripe customer.
  const { session } = await currentSession(request, env, manifest.tiers);
  if (session && session.cus) params.customer = session.cus;

  try {
    const checkout = await stripe(env, '/checkout/sessions', { method: 'POST', params });
    return Response.redirect(checkout.url, 303);
  } catch (_) {
    return back('stripe');
  }
}
