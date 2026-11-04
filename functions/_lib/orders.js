// Craft-show orders: validation, the D1 table, and who may read the list.
// Pure functions where possible so `npm test` can run them in Node.
import { COOKIE, readCookie, verifySession } from './session.js';
import { tileFor } from './show.js';

export const STATUSES = ['new', 'paid', 'printing', 'ready', 'done', 'cancelled'];

export const SCHEMA = `CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  modeler TEXT NOT NULL,
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
  user_agent TEXT NOT NULL DEFAULT ''
)`;

const LIMITS = { customer: 80, contact: 120, notes: 1000, pageUrl: 2000, settings: 200_000, screenshot: 600_000 };

const str = (v, max) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

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
  if (!Number.isInteger(qty) || qty < 1 || qty > 20) return { ok: false, error: 'Quantity must be between 1 and 20.' };
  const customer = str(body.customer, LIMITS.customer);
  if (customer.length < 1) return { ok: false, error: 'Please type your name so we can find your order.' };
  const contact = str(body.contact, LIMITS.contact);
  if (contact.length < 5) return { ok: false, error: 'Please leave a phone number or email so we can reach you.' };
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
  const unit = Number(price.cad);
  return {
    ok: true,
    order: {
      modeler: tile.id,
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
    },
  };
}

export const orderNumber = (id) => `VM${String(id).padStart(3, '0')}`;

/** The D1 database bound as ORDERS_DB, with the table created on first use. */
let ready = null;
export async function ordersDb(env) {
  if (!env.ORDERS_DB) return null;
  ready ??= env.ORDERS_DB.prepare(SCHEMA).run().catch((e) => { ready = null; throw e; });
  await ready;
  return env.ORDERS_DB;
}

export const noDbResponse = () =>
  Response.json({ ok: false, error: 'The orders database is not connected yet. See docs/CRAFT_SHOW.md, step "Connect the database".' }, { status: 503 });

/** Owner check: the ORDERS_KEY as a bearer token, or a Patreon session whose email is in OWNER_EMAILS. */
export async function isOwner(request, env) {
  const auth = request.headers.get('Authorization') || '';
  const key = auth.replace(/^Bearer\s+/i, '').trim();
  if (env.ORDERS_KEY && key && key === env.ORDERS_KEY) return true;
  if (!env.SESSION_SECRET) return false;
  const session = await verifySession(readCookie(request, COOKIE), env.SESSION_SECRET);
  const owners = (env.OWNER_EMAILS || '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return !!(session && session.email && owners.includes(String(session.email).toLowerCase()));
}
