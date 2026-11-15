// Craft-show orders: validation, the D1 table, and who may read the list.
// Pure functions where possible so `npm test` can run them in Node.
import { COOKIE, readCookie, verifySession } from './session.js';
import { tileFor } from './show.js';

/** Production status (what the printer side is doing). Unpaid orders stay "pending". */
export const PRODUCTION = ['pending', 'queued', 'printing', 'ready', 'completed', 'cancelled'];
/** Payment status, kept apart from production. */
export const PAYMENT = ['unpaid', 'paid', 'refunded'];
export const PAY_METHODS = ['cash', 'etransfer', 'card', 'other'];

export const SCHEMA = `CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  client_key TEXT UNIQUE,
  production_status TEXT NOT NULL DEFAULT 'pending',
  payment_status TEXT NOT NULL DEFAULT 'unpaid',
  payment_method TEXT NOT NULL DEFAULT '',
  amount_received REAL NOT NULL DEFAULT 0,
  paid_at TEXT NOT NULL DEFAULT '',
  status_changed_at TEXT NOT NULL DEFAULT '',
  due_date TEXT NOT NULL DEFAULT '',
  modeler TEXT NOT NULL,
  modeler_sha TEXT NOT NULL DEFAULT '',
  preset TEXT NOT NULL DEFAULT '',
  item TEXT NOT NULL,
  option TEXT NOT NULL,
  qty INTEGER NOT NULL,
  unit_cad REAL NOT NULL,
  total_cad REAL NOT NULL,
  customer TEXT NOT NULL,
  contact TEXT NOT NULL,
  fulfil TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  page_url TEXT NOT NULL DEFAULT '',
  settings TEXT NOT NULL DEFAULT '',
  screenshot TEXT NOT NULL DEFAULT '',
  shot_status TEXT NOT NULL DEFAULT '',
  user_agent TEXT NOT NULL DEFAULT '',
  ip_hash TEXT NOT NULL DEFAULT ''
)`;

export const SALES_SCHEMA = `CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  lines TEXT NOT NULL,
  total_cad REAL NOT NULL,
  payment_method TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT ''
)`;

const LIMITS = { customer: 80, contact: 120, notes: 1000, pageUrl: 2000, settings: 200_000, screenshot: 600_000, clientKey: 64 };

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
/** A phone number (7+ digits, any punctuation) or an email address. */
export const validContact = (s) => EMAIL.test(s) || s.replace(/\D/g, '').length >= 7;

/**
 * Checks an order from the phone and prices it from show.json (never from the
 * client). Returns { ok: true, order } or { ok: false, error }.
 */
export function validateOrder(body, show) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send the order as JSON.' };
  const tile = tileFor(show, str(body.modeler, 60));
  if (!tile) return { ok: false, error: 'That design is not on the show list.' };
  const priceIndex = Number(body.priceIndex);
  const price = Number.isInteger(priceIndex) ? tile.prices[priceIndex] : null;
  if (!price) return { ok: false, error: 'Pick a size / option.' };
  const qty = Number(body.qty);
  const maxQty = Number(show.maxQty) || 20;
  if (!Number.isInteger(qty) || qty < 1 || qty > maxQty) return { ok: false, error: `Quantity must be between 1 and ${maxQty}.` };
  const customer = str(body.customer, LIMITS.customer);
  if (customer.length < 1) return { ok: false, error: 'Please type your name so we can find your order.' };
  const contact = str(body.contact, LIMITS.contact);
  if (!validContact(contact)) return { ok: false, error: 'Please leave a phone number or an email address so we can reach you.' };
  const fulfil = body.fulfil === 'ship' ? 'ship' : 'pickup';
  let pageUrl = str(body.pageUrl, LIMITS.pageUrl);
  if (pageUrl && !pageUrl.startsWith('/')) {
    try { const u = new URL(pageUrl); pageUrl = u.pathname + u.search + u.hash; } catch { pageUrl = ''; }
  }
  let settings = '';
  if (body.settings !== undefined && body.settings !== null && body.settings !== '') {
    settings = typeof body.settings === 'string' ? body.settings : JSON.stringify(body.settings);
    if (settings.length > LIMITS.settings) settings = '';
  }
  let screenshot = str(body.screenshot, LIMITS.screenshot + 1);
  if (screenshot && !(/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(screenshot) && screenshot.length <= LIMITS.screenshot)) screenshot = '';
  const clientKey = str(body.clientKey, LIMITS.clientKey).replace(/[^A-Za-z0-9_-]/g, '');
  const unit = Number(price.cad);
  return {
    ok: true,
    order: {
      client_key: clientKey || null,
      modeler: tile.id,
      preset: `${tile.id}:${tile.prices[priceIndex].label}:${show.version || 1}`,
      item: tile.name,
      option: price.label,
      qty,
      unit_cad: unit,
      total_cad: Math.round(unit * qty * 100) / 100,
      customer,
      contact,
      fulfil,
      notes: str(body.notes, LIMITS.notes),
      page_url: pageUrl,
      settings,
      screenshot,
      shot_status: screenshot ? 'saved' : 'none',
    },
  };
}

/** A walk-up sale of ready-made stock: lines are [{ sku, qty }] priced from show.json's stock list. */
export function validateSale(body, show) {
  if (!body || typeof body !== 'object') return { ok: false, error: 'Send the sale as JSON.' };
  const stock = Array.isArray(show.stock) ? show.stock : [];
  const lines = Array.isArray(body.lines) ? body.lines : [];
  if (!lines.length) return { ok: false, error: 'Add at least one item.' };
  const out = [];
  let total = 0;
  for (const l of lines) {
    const item = stock.find((s) => s.sku === l?.sku);
    const qty = Number(l?.qty);
    if (!item) return { ok: false, error: 'Unknown stock item.' };
    if (!Number.isInteger(qty) || qty < 1 || qty > 100) return { ok: false, error: 'Bad quantity.' };
    out.push({ sku: item.sku, name: item.name, qty, unit_cad: Number(item.cad) });
    total += Number(item.cad) * qty;
  }
  if (!PAY_METHODS.includes(body.payment_method)) return { ok: false, error: 'Pick how they paid.' };
  return { ok: true, sale: { lines: JSON.stringify(out), total_cad: Math.round(total * 100) / 100, payment_method: body.payment_method, note: str(body.note, 300) } };
}

export const orderNumber = (id) => `VM${String(id).padStart(3, '0')}`;

/** The D1 database bound as ORDERS_DB, with the tables created on first use. */
let ready = null;
export async function ordersDb(env) {
  if (!env.ORDERS_DB) return null;
  ready ??= env.ORDERS_DB.batch([env.ORDERS_DB.prepare(SCHEMA), env.ORDERS_DB.prepare(SALES_SCHEMA)]).catch((e) => { ready = null; throw e; });
  await ready;
  return env.ORDERS_DB;
}

export const noDbResponse = () =>
  Response.json({ ok: false, error: 'The orders database is not connected yet. See docs/CRAFT_SHOW.md, step "Connect the database".' }, { status: 503 });

/** Owner check: the ORDERS_KEY as a bearer token, or a Patreon session whose email is in OWNER_EMAILS. */
export async function isOwner(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const key = auth.replace(/^Bearer\s+/i, '').trim();
  if (env.ORDERS_KEY && key && key.length === env.ORDERS_KEY.length && key === env.ORDERS_KEY) return true;
  if (!env.SESSION_SECRET) return false;
  const session = await verifySession(readCookie(request, COOKIE), env.SESSION_SECRET);
  const owners = (env.OWNER_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!(session && session.email && owners.includes(String(session.email).toLowerCase()));
}

/** Short hash of the caller's IP, for the rate limit only (the IP itself is not stored). */
export async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || '';
  if (!ip) return '';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('vm-orders:' + ip));
  return Array.from(new Uint8Array(buf).slice(0, 8)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** CSV cell that cannot run as a spreadsheet formula and keeps commas/quotes intact. */
export function csvCell(v) {
  let s = String(v ?? '');
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
