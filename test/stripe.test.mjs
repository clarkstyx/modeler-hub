import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession, COOKIE } from '../functions/_lib/session.js';
import {
  priceLevels, levelFromSubscriptions, safeNext, currentSession, bestCustomerByEmail, memberPayload, RECHECK_AFTER,
} from '../functions/_lib/stripe.js';

const tiers = { free: { level: 0 }, maker: { level: 1 }, seller: { level: 2 } };
const env = { SESSION_SECRET: 's3cret', STRIPE_SECRET_KEY: 'sk_test_x', STRIPE_PRICE_MAKER: 'price_m', STRIPE_PRICE_SELLER: 'price_s' };
const sub = (status, price) => ({ status, items: { data: [{ price: { id: price } }] } });
const json = (body) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } });

test('prices map to levels, free tier is never for sale', () => {
  assert.deepEqual(priceLevels({ ...env, STRIPE_PRICE_FREE: 'price_f' }, tiers), { price_m: 1, price_s: 2 });
});

test('only paid-for subscriptions count, highest wins', () => {
  const prices = priceLevels(env, tiers);
  assert.equal(levelFromSubscriptions([sub('active', 'price_m')], prices), 1);
  assert.equal(levelFromSubscriptions([sub('active', 'price_m'), sub('trialing', 'price_s')], prices), 2);
  assert.equal(levelFromSubscriptions([sub('canceled', 'price_s'), sub('incomplete', 'price_s')], prices), 0);
  assert.equal(levelFromSubscriptions([sub('active', 'price_other')], prices), 0);
  assert.equal(levelFromSubscriptions(undefined, prices), 0);
});

test('safeNext only allows pages on this site', () => {
  assert.equal(safeNext('/m/clicker/'), '/m/clicker/');
  for (const bad of ['//evil.test', 'https://evil.test', '/\\evil.test', '', null, undefined]) assert.equal(safeNext(bad), '/');
});

async function requestWith(payload) {
  const token = await signSession(payload, env.SESSION_SECRET);
  return new Request('https://x.test/m/clicker/', { headers: { Cookie: `${COOKIE}=${encodeURIComponent(token)}` } });
}
const old = () => Math.floor(Date.now() / 1000) - RECHECK_AFTER - 60;

test('a fresh member cookie is trusted without asking Stripe', async () => {
  const req = await requestWith(memberPayload({ id: 'cus_1', email: 'a@b.co', level: 2 }));
  const out = await currentSession(req, env, tiers, () => { throw new Error('should not be called'); });
  assert.equal(out.session.level, 2);
  assert.equal(out.session.name, 'a');
  assert.equal(out.setCookie, null);
});

test('a day-old member cookie is re-checked: cancelled drops to free', async () => {
  const req = await requestWith({ ...memberPayload({ id: 'cus_1', level: 2 }), chk: old() });
  let asked = '';
  const out = await currentSession(req, env, tiers, async (url) => { asked = url; return json({ data: [sub('canceled', 'price_s')] }); });
  assert.match(asked, /subscriptions\?customer=cus_1/);
  assert.equal(out.session.level, 0);
  const token = decodeURIComponent(out.setCookie.split(';')[0].split('=')[1]);
  assert.equal((await verifySession(token, env.SESSION_SECRET)).level, 0);
});

test('a Stripe outage does not lock a member out', async () => {
  const req = await requestWith({ ...memberPayload({ id: 'cus_1', level: 1 }), chk: old() });
  const out = await currentSession(req, env, tiers, async () => { throw new Error('network down'); });
  assert.equal(out.session.level, 1);
  assert.equal(out.setCookie, null);
});

test('Patreon sessions are left alone', async () => {
  const req = await requestWith({ sub: '42', name: 'Pat', level: 1 });
  const out = await currentSession(req, env, tiers, () => { throw new Error('should not be called'); });
  assert.equal(out.session.level, 1);
});

test('email lookup picks the customer that is paying', async () => {
  const f = async (url) => {
    if (url.includes('/customers')) return json({ data: [{ id: 'cus_old', email: 'a@b.co' }, { id: 'cus_new', email: 'a@b.co', name: 'Ann' }] });
    return json({ data: url.includes('cus_new') ? [sub('active', 'price_m')] : [sub('canceled', 'price_s')] });
  };
  const best = await bestCustomerByEmail(env, tiers, ' a@b.co ', f);
  assert.deepEqual(best, { id: 'cus_new', name: 'Ann', email: 'a@b.co', level: 1 });
});

test('a sign-in link cannot be used as a session cookie', async () => {
  const link = await signSession({ mail: 'a@b.co', next: '/' }, env.SESSION_SECRET, 900);
  const req = new Request('https://x.test/', { headers: { Cookie: `${COOKIE}=${encodeURIComponent(link)}` } });
  const { session } = await currentSession(req, env, tiers);
  assert.ok(!(session.level >= 1));
});
