// POST /api/orders           a phone sends an order from the "Order this design" button
// GET  /api/orders           owner only: the list (newest first), ?payment=unpaid ?production=queued ?q=text ?format=csv
import show from '../../../show.json';
import { validateOrder, ordersDb, noDbResponse, isOwner, orderNumber, PRODUCTION, PAYMENT, ipHash, csvCell } from '../../_lib/orders.js';
import { showEnabled, cleanProduction } from '../../_lib/show.js';

const LIST_COLUMNS = 'id, created_at, production_status, payment_status, payment_method, amount_received, paid_at, status_changed_at, due_date, modeler, modeler_sha, preset, item, option, qty, unit_cad, total_cad, customer, contact, fulfil, notes, page_url, shot_status, length(settings) > 0 AS has_settings';
const RATE = { window: 10 * 60 * 1000, max: 8 };

const receipt = (row) => ({
  ok: true,
  id: row.id,
  number: orderNumber(row.id),
  total_cad: row.total_cad,
  currency: show.currency || 'CAD',
  shot_status: row.shot_status,
  payment_status: row.payment_status,
  production: cleanProduction(show),
  payNote: show.payNote,
});

/** The git sha the modeler was built from (public/build-info.json, written by `npm run pull`). */
async function modelerSha(env, request, id) {
  try {
    const res = await env.ASSETS.fetch(new URL('/build-info.json', request.url));
    if (!res.ok) return '';
    const info = await res.json();
    return info.results?.find((r) => r.id === id)?.sha || '';
  } catch { return ''; }
}

export async function onRequestPost({ request, env }) {
  if (!showEnabled(show)) return Response.json({ ok: false, error: 'Ordering is closed.' }, { status: 403 });
  if (Number(request.headers.get('Content-Length') || 0) > 1_000_000) return Response.json({ ok: false, error: 'Order too large.' }, { status: 413 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'Send the order as JSON.' }, { status: 400 }); }
  const v = validateOrder(body, show);
  if (!v.ok) return Response.json(v, { status: 400 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const o = v.order;

  // Same phone retrying the same order (lost connection, double tap): hand back the order it already made.
  if (o.client_key) {
    const dup = await db.prepare('SELECT id, total_cad, shot_status, payment_status FROM orders WHERE client_key = ?').bind(o.client_key).first();
    if (dup) return Response.json({ ...receipt(dup), duplicate: true }, { status: 200 });
  }
  const ip = await ipHash(request);
  if (ip) {
    const since = new Date(Date.now() - RATE.window).toISOString();
    const n = await db.prepare('SELECT COUNT(*) AS n FROM orders WHERE ip_hash = ? AND created_at > ?').bind(ip, since).first('n');
    if (n >= RATE.max) return Response.json({ ok: false, error: 'Too many orders from this connection. Please come to the booth and we will take it by hand.' }, { status: 429 });
  }
  const sha = await modelerSha(env, request, o.modeler);
  const now = new Date().toISOString();
  let r;
  try {
    r = await db
      .prepare(`INSERT INTO orders (created_at, client_key, modeler, modeler_sha, preset, item, option, qty, unit_cad, total_cad, customer, contact, fulfil, notes, page_url, settings, screenshot, shot_status, user_agent, ip_hash)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(now, o.client_key, o.modeler, sha, o.preset, o.item, o.option, o.qty, o.unit_cad, o.total_cad, o.customer, o.contact, o.fulfil, o.notes, o.page_url, o.settings, o.screenshot, o.shot_status, (request.headers.get('User-Agent') || '').slice(0, 300), ip)
      .run();
  } catch (e) {
    // Two retries raced on the same client_key: the first one won, return it.
    if (o.client_key && /UNIQUE/i.test(String(e))) {
      const dup = await db.prepare('SELECT id, total_cad, shot_status, payment_status FROM orders WHERE client_key = ?').bind(o.client_key).first();
      if (dup) return Response.json({ ...receipt(dup), duplicate: true }, { status: 200 });
    }
    throw e;
  }
  const id = r.meta?.last_row_id;
  return Response.json(receipt({ id, total_cad: o.total_cad, shot_status: o.shot_status, payment_status: 'unpaid' }), { status: 201 });
}

export async function onRequestGet({ request, env }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 200));
  const where = [], binds = [];
  const pay = url.searchParams.get('payment'), prod = url.searchParams.get('production'), q = (url.searchParams.get('q') || '').trim();
  if (pay && PAYMENT.includes(pay)) { where.push('payment_status = ?'); binds.push(pay); }
  if (prod && PRODUCTION.includes(prod)) { where.push('production_status = ?'); binds.push(prod); }
  if (q) {
    const num = q.match(/^vm0*(\d+)$/i);
    if (num) { where.push('id = ?'); binds.push(Number(num[1])); }
    else { where.push('(customer LIKE ? OR contact LIKE ? OR notes LIKE ?)'); binds.push(`%${q}%`, `%${q}%`, `%${q}%`); }
  }
  const sql = `SELECT ${LIST_COLUMNS} FROM orders ${where.length ? 'WHERE ' + where.join(' AND ') : ''} ORDER BY id DESC LIMIT ?`;
  const { results } = await db.prepare(sql).bind(...binds, limit).all();
  const rows = results.map((r) => ({ ...r, number: orderNumber(r.id), has_settings: !!r.has_settings }));
  if (url.searchParams.get('format') === 'csv') {
    const cols = ['number', 'created_at', 'payment_status', 'payment_method', 'amount_received', 'paid_at', 'production_status', 'due_date', 'item', 'option', 'qty', 'unit_cad', 'total_cad', 'customer', 'contact', 'fulfil', 'notes', 'preset', 'modeler_sha', 'page_url'];
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders.csv"' } });
  }
  return Response.json({ ok: true, orders: rows, production: PRODUCTION, payment: PAYMENT }, { headers: { 'Cache-Control': 'no-store' } });
}
