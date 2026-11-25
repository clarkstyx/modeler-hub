// Memberships bought on the site itself (card checkout through Stripe).
//
// Nothing is stored on our side. Stripe remembers who pays for what; we ask it
// and write the answer into the same signed session cookie the Patreon login
// uses. A Stripe session cookie also carries `cus` (the Stripe customer id) and
// `chk` (when we last asked Stripe), so the gate can ask again once a day and a
// cancelled membership stops opening modelers.
//
// Every function takes `env` and a `fetch` so `npm test` can run them in Node.
//
// Env:
//   STRIPE_SECRET_KEY     sk_live_… or sk_test_…
//   STRIPE_PRICE_MAKER    price_… of the monthly Maker price
//   STRIPE_PRICE_SELLER   price_… of the monthly Seller price

import { COOKIE, cookieHeader, readCookie, signSession, verifySession } from './session.js';

const API = 'https://api.stripe.com/v1';
export const MEMBER_TTL = 30 * 24 * 3600; // a member stays signed in for 30 days of not visiting
export const RECHECK_AFTER = 24 * 3600; // ask Stripe again once a day
const PAYING = ['active', 'trialing', 'past_due']; // past_due = card retry period, keep them in

export const stripeReady = (env) => Boolean(env.STRIPE_SECRET_KEY);

/** Which Stripe price sells which level. Built from the STRIPE_PRICE_<TIER> variables. */
export function priceLevels(env, tiers) {
  const map = {};
  for (const [id, tier] of Object.entries(tiers)) {
    const price = env[`STRIPE_PRICE_${id.toUpperCase()}`];
    if (price && tier.level > 0) map[price] = tier.level;
  }
  return map;
}

/** Highest level among the subscriptions that are being paid for. */
export function levelFromSubscriptions(subscriptions, prices) {
  let level = 0;
  for (const sub of subscriptions || []) {
    if (!PAYING.includes(sub.status)) continue;
    for (const item of (sub.items && sub.items.data) || []) {
      level = Math.max(level, prices[item.price && item.price.id] || 0);
    }
  }
  return level;
}

/** Only ever send people back to a page on this site. */
export function safeNext(next) {
  return typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/';
}

export async function stripe(env, path, { method = 'GET', params, fetch: f = fetch } = {}) {
  const body = params ? new URLSearchParams(params).toString() : '';
  // STRIPE_API_BASE is only for local practice against a pretend Stripe; leave it unset on the live site.
  const url = (env.STRIPE_API_BASE || API) + path + (method === 'GET' && body ? '?' + body : '');
  const res = await f(url, {
    method,
    headers: {
      Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`,
      ...(method === 'GET' ? {} : { 'Content-Type': 'application/x-www-form-urlencoded' }),
    },
    body: method === 'GET' ? undefined : body,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((json.error && json.error.message) || `Stripe answered ${res.status}`);
  return json;
}

export async function levelForCustomer(env, tiers, customerId, f = fetch) {
  const subs = await stripe(env, '/subscriptions', { params: { customer: customerId, status: 'all', limit: '20' }, fetch: f });
  return levelFromSubscriptions(subs.data, priceLevels(env, tiers));
}

/** The paying customer behind an email address (the best one if they checked out twice). */
export async function bestCustomerByEmail(env, tiers, email, f = fetch) {
  const typed = email.trim();
  const tries = [...new Set([typed, typed.toLowerCase()])];
  let best = null;
  for (const e of tries) {
    const found = await stripe(env, '/customers', { params: { email: e, limit: '10' }, fetch: f });
    for (const c of found.data || []) {
      const level = await levelForCustomer(env, tiers, c.id, f);
      if (!best || level > best.level) best = { id: c.id, name: c.name || '', email: c.email || e, level };
    }
  }
  return best;
}

export function memberPayload({ id, name, email, level }) {
  return {
    sub: 'stripe:' + id,
    via: 'stripe',
    cus: id,
    name: name || (email ? email.split('@')[0] : 'Member'),
    email: email || '',
    level,
    chk: Math.floor(Date.now() / 1000),
  };
}

export async function memberCookie(payload, env, secure = true) {
  const token = await signSession(payload, env.SESSION_SECRET, MEMBER_TTL);
  return cookieHeader(COOKIE, token, { maxAge: MEMBER_TTL, secure });
}

/**
 * Who is asking, from the session cookie. A Stripe member whose last check is
 * over a day old is checked again; `setCookie` then holds the fresh cookie to
 * send back. If Stripe cannot be reached the old answer stands (a paying member
 * is never locked out by an outage).
 */
export async function currentSession(request, env, tiers, f = fetch) {
  if (!env.SESSION_SECRET) return { session: null, setCookie: null };
  const session = await verifySession(readCookie(request, COOKIE), env.SESSION_SECRET);
  if (!session || session.via !== 'stripe' || !stripeReady(env)) return { session, setCookie: null };
  const now = Math.floor(Date.now() / 1000);
  if (now - (session.chk || 0) < RECHECK_AFTER) return { session, setCookie: null };
  try {
    const level = await levelForCustomer(env, tiers, session.cus, f);
    const { exp, ...rest } = session;
    const fresh = { ...rest, level, chk: now };
    const secure = new URL(request.url).protocol === 'https:';
    return { session: fresh, setCookie: await memberCookie(fresh, env, secure) };
  } catch (_) {
    return { session, setCookie: null };
  }
}
