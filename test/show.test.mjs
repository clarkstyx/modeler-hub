import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateOrder, validateSale, orderNumber, isOwner, PRODUCTION, PAYMENT, csvCell, validContact } from '../functions/_lib/orders.js';
import { isShowModeler, publicShow, showCookieTtl, verifyShowCookie } from '../functions/_lib/show.js';
import { signSession, cookieHeader } from '../functions/_lib/session.js';

const show = JSON.parse(readFileSync(new URL('../show.json', import.meta.url), 'utf8'));
const manifest = JSON.parse(readFileSync(new URL('../modelers.json', import.meta.url), 'utf8'));
const firstTile = show.tiles[0];
const good = { modeler: firstTile.id, priceIndex: 0, qty: 2, customer: 'Sam', contact: '555-123-4567', fulfil: 'pickup', notes: 'Name: SAM, pink and white' };

test('every show tile is a modeler the hub knows, with at least one price', () => {
  for (const t of show.tiles) {
    assert.ok(manifest.modelers.some((m) => m.id === t.id), `${t.id} is not in modelers.json`);
    assert.ok(Array.isArray(t.prices) && t.prices.length > 0, `${t.id} has no prices`);
    for (const p of t.prices) assert.ok(typeof p.label === 'string' && Number(p.cad) > 0, `${t.id}: bad price ${JSON.stringify(p)}`);
  }
});

test('show mode only covers the tiles', () => {
  assert.equal(isShowModeler(show, firstTile.id), show.enabled);
  assert.equal(isShowModeler(show, 'name-keychain'), false);
  assert.equal(isShowModeler(show, 'nope'), false);
  assert.equal(publicShow(show).tiles.length, show.tiles.length);
  assert.ok(!('_comment' in publicShow(show)));
  assert.ok(showCookieTtl(show) >= 24 * 3600);
});

test('a good order is priced from show.json, not from the phone', () => {
  const r = validateOrder({ ...good, unit_cad: 0.01, total_cad: 0.01 }, show);
  assert.equal(r.ok, true);
  assert.equal(r.order.unit_cad, firstTile.prices[0].cad);
  assert.equal(r.order.total_cad, firstTile.prices[0].cad * 2);
  assert.equal(r.order.item, firstTile.name);
  assert.equal(r.order.option, firstTile.prices[0].label);
  assert.equal(r.order.fulfil, 'pickup');
});

test('bad orders are refused with a plain message', () => {
  assert.equal(validateOrder(null, show).ok, false);
  assert.equal(validateOrder({ ...good, modeler: 'name-keychain' }, show).ok, false);
  assert.equal(validateOrder({ ...good, priceIndex: 99 }, show).ok, false);
  assert.equal(validateOrder({ ...good, qty: 0 }, show).ok, false);
  assert.equal(validateOrder({ ...good, qty: 2.5 }, show).ok, false);
  assert.equal(validateOrder({ ...good, customer: '  ' }, show).ok, false);
  assert.equal(validateOrder({ ...good, contact: '12' }, show).ok, false);
  assert.match(validateOrder({ ...good, contact: '12' }, show).error, /phone|email/i);
});

test('page url is kept as a path, screenshots must be small images, settings are stringified', () => {
  const r = validateOrder({ ...good, pageUrl: 'https://evil.example/m/x/?pose=gift#a', screenshot: 'javascript:alert(1)', settings: { a: 1 } }, show);
  assert.equal(r.order.page_url, '/m/x/?pose=gift#a');
  assert.equal(r.order.screenshot, '');
  assert.equal(r.order.settings, '{"a":1}');
  const ok = validateOrder({ ...good, screenshot: 'data:image/jpeg;base64,/9j/4AAQ' }, show);
  assert.equal(ok.order.screenshot, 'data:image/jpeg;base64,/9j/4AAQ');
  const huge = validateOrder({ ...good, screenshot: 'data:image/png;base64,' + 'A'.repeat(700_000) }, show);
  assert.equal(huge.order.screenshot, '');
});

test('order numbers and statuses', () => {
  assert.equal(orderNumber(7), 'VM007');
  assert.equal(orderNumber(1234), 'VM1234');
  assert.deepEqual(PRODUCTION.slice(0, 2), ['pending', 'queued']);
  assert.deepEqual(PAYMENT, ['unpaid', 'paid', 'refunded']);
});

test('contact must be a real phone number or email', () => {
  assert.equal(validContact('416-555-0100'), true);
  assert.equal(validContact('(306) 555 0199'), true);
  assert.equal(validContact('sam@example.com'), true);
  assert.equal(validContact('sam@example'), false);
  assert.equal(validContact('call me'), false);
  assert.equal(validContact('12345'), false);
});

test('the client key is kept for idempotency, the preset names the product and price option', () => {
  const r = validateOrder({ ...good, clientKey: 'abc-123_XYZ!!' }, show);
  assert.equal(r.order.client_key, 'abc-123_XYZ');
  assert.equal(validateOrder(good, show).order.client_key, null);
  assert.equal(r.order.preset, `${firstTile.id}:${firstTile.prices[0].label}:${show.version || 1}`);
  assert.equal(r.order.shot_status, 'none');
  assert.equal(validateOrder({ ...good, qty: 21 }, show).ok, false);
});

test('csv cells cannot start a spreadsheet formula', () => {
  assert.equal(csvCell('=1+1'), "'=1+1");
  assert.equal(csvCell('+1'), "'+1");
  assert.equal(csvCell('-5'), "'-5");
  assert.equal(csvCell('@x'), "'@x");
  assert.equal(csvCell('a,b'), '"a,b"');
  assert.equal(csvCell('say "hi"'), '"say ""hi"""');
  assert.equal(csvCell('plain'), 'plain');
});

test('a quick sale is priced from the stock list', () => {
  const stock = show.stock[0];
  const r = validateSale({ lines: [{ sku: stock.sku, qty: 2 }], payment_method: 'cash' }, show);
  assert.equal(r.ok, true);
  assert.equal(r.sale.total_cad, stock.cad * 2);
  assert.equal(validateSale({ lines: [{ sku: 'nope', qty: 1 }], payment_method: 'cash' }, show).ok, false);
  assert.equal(validateSale({ lines: [{ sku: stock.sku, qty: 1 }], payment_method: 'bitcoin' }, show).ok, false);
  assert.equal(validateSale({ lines: [], payment_method: 'cash' }, show).ok, false);
});

test('the show cookie opens the gate, anything else does not', async () => {
  const env = { SESSION_SECRET: 'test-secret-please-change' };
  const token = await signSession({ show: 1 }, env.SESSION_SECRET, 3600);
  const withCookie = new Request('https://x.test/m/grinch-ornament/', { headers: { Cookie: cookieHeader('mh_show', token).split(';')[0] } });
  assert.equal(await verifyShowCookie(withCookie, env.SESSION_SECRET), true);
  const patron = await signSession({ sub: '1', level: 2 }, env.SESSION_SECRET, 3600);
  const wrongPayload = new Request('https://x.test/m/grinch-ornament/', { headers: { Cookie: `mh_show=${patron}` } });
  assert.equal(await verifyShowCookie(wrongPayload, env.SESSION_SECRET), false);
  assert.equal(await verifyShowCookie(new Request('https://x.test/m/grinch-ornament/'), env.SESSION_SECRET), false);
  assert.equal(await verifyShowCookie(withCookie, undefined), false);
});

test('owner check: ORDERS_KEY bearer or an owner email session', async () => {
  const env = { SESSION_SECRET: 'test-secret-please-change', ORDERS_KEY: 'k3y', OWNER_EMAILS: 'clark@example.com' };
  assert.equal(await isOwner(new Request('https://x.test/api/orders', { headers: { Authorization: 'Bearer k3y' } }), env), true);
  assert.equal(await isOwner(new Request('https://x.test/api/orders', { headers: { Authorization: 'Bearer nope' } }), env), false);
  assert.equal(await isOwner(new Request('https://x.test/api/orders'), env), false);
  const owner = await signSession({ sub: '1', level: 2, email: 'Clark@Example.com' }, env.SESSION_SECRET, 3600);
  assert.equal(await isOwner(new Request('https://x.test/api/orders', { headers: { Cookie: `mh_session=${owner}` } }), env), true);
  const patron = await signSession({ sub: '2', level: 2, email: 'someone@else.com' }, env.SESSION_SECRET, 3600);
  assert.equal(await isOwner(new Request('https://x.test/api/orders', { headers: { Cookie: `mh_session=${patron}` } }), env), false);
  assert.equal(await isOwner(new Request('https://x.test/api/orders', { headers: { Authorization: 'Bearer ' } }), { ORDERS_KEY: '' }), false);
  assert.equal(await isOwner(new Request('https://x.test/api/orders', { headers: { Authorization: 'Bearer k3' } }), env), false);
});
