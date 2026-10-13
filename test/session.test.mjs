import { test } from 'node:test';
import assert from 'node:assert/strict';
import { signSession, verifySession, readCookie, cookieHeader } from '../functions/_lib/session.js';

const secret = 'test-secret-please-change';

test('signed session round-trips', async () => {
  const tok = await signSession({ sub: '1', name: 'Clark', level: 2 }, secret);
  const body = await verifySession(tok, secret);
  assert.equal(body.level, 2);
  assert.equal(body.name, 'Clark');
});

test('tampered token is rejected', async () => {
  const tok = await signSession({ sub: '1', level: 0 }, secret);
  const [p, s] = tok.split('.');
  const forged = Buffer.from(JSON.stringify({ sub: '1', level: 2, exp: 9999999999 })).toString('base64url') + '.' + s;
  assert.equal(await verifySession(forged, secret), null);
  assert.equal(await verifySession(p + '.' + s, 'other-secret'), null);
});

test('expired token is rejected', async () => {
  const tok = await signSession({ sub: '1', level: 1 }, secret, -10);
  assert.equal(await verifySession(tok, secret), null);
});

test('cookie helpers', () => {
  const req = new Request('https://x.test/', { headers: { Cookie: 'a=1; mh_session=abc%2Edef; b=2' } });
  assert.equal(readCookie(req, 'mh_session'), 'abc.def');
  assert.match(cookieHeader('k', 'v'), /^k=v; Path=\/; HttpOnly; SameSite=Lax; Max-Age=\d+; Secure$/);
});
