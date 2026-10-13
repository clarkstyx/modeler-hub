// Signed session cookie helpers (Web Crypto, runs on Cloudflare Pages Functions).
// Cookie value = base64url(payload JSON) + "." + base64url(HMAC-SHA256(payload))
// payload = { sub, name, level, exp }   level: 0 free, 1 maker, 2 seller

export const COOKIE = 'mh_session';
const WEEK = 7 * 24 * 3600;

const enc = new TextEncoder();

function b64url(bytes) {
  return btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s) {
  s = s.replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

async function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function signSession(payload, secret, ttl = WEEK) {
  const body = { ...payload, exp: Math.floor(Date.now() / 1000) + ttl };
  const data = enc.encode(JSON.stringify(body));
  const sig = await crypto.subtle.sign('HMAC', await key(secret), data);
  return `${b64url(data)}.${b64url(sig)}`;
}

export async function verifySession(token, secret) {
  if (!token || !token.includes('.')) return null;
  const [p, s] = token.split('.');
  try {
    const data = unb64url(p);
    const ok = await crypto.subtle.verify('HMAC', await key(secret), unb64url(s), data);
    if (!ok) return null;
    const body = JSON.parse(new TextDecoder().decode(data));
    if (!body.exp || body.exp < Date.now() / 1000) return null;
    return body;
  } catch (_) {
    return null;
  }
}

export function readCookie(request, name) {
  const raw = request.headers.get('Cookie') || '';
  for (const part of raw.split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return null;
}

export function cookieHeader(name, value, { maxAge = WEEK, secure = true } = {}) {
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure ? '; Secure' : ''}`;
}

export function randomToken(bytes = 16) {
  const a = new Uint8Array(bytes);
  crypto.getRandomValues(a);
  return b64url(a);
}
