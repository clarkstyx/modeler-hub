// "Manage membership" link. Opens Stripe's own account page for the logged-in
// member: change card, switch plan, cancel, see invoices.

import manifest from '../../modelers.json';
import { currentSession, stripe, stripeReady } from '../_lib/stripe.js';

export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  const origin = env.SITE_URL || url.origin;
  const { session } = await currentSession(request, env, manifest.tiers);
  if (!session || !session.cus || !stripeReady(env)) return Response.redirect(`${origin}/login/`, 302);
  try {
    const portal = await stripe(env, '/billing_portal/sessions', {
      method: 'POST',
      params: { customer: session.cus, return_url: `${origin}/` },
    });
    return Response.redirect(portal.url, 303);
  } catch (_) {
    return Response.redirect(`${origin}/pricing/?error=stripe`, 302);
  }
}
