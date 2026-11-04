// POST /api/orders           a phone sends an order from the "Order this design" button
// GET  /api/orders           owner only: the list (newest first), ?status=paid, ?format=csv
import show from '../../../show.json';
import { validateOrder, ordersDb, noDbResponse, isOwner, orderNumber, STATUSES } from '../../_lib/orders.js';
import { showEnabled } from '../../_lib/show.js';

const LIST_COLUMNS = 'id, created_at, status, modeler, item, option, qty, unit_cad, total_cad, customer, contact, fulfil, notes, page_url, length(screenshot) > 0 AS has_shot, length(settings) > 0 AS has_settings';

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
  const r = await db
    .prepare(`INSERT INTO orders (created_at, status, modeler, item, option, qty, unit_cad, total_cad, customer, contact, fulfil, notes, page_url, settings, screenshot, user_agent)
              VALUES (?, 'new', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(new Date().toISOString(), o.modeler, o.item, o.option, o.qty, o.unit_cad, o.total_cad, o.customer, o.contact, o.fulfil, o.notes, o.page_url, o.settings, o.screenshot, (request.headers.get('User-Agent') || '').slice(0, 300))
    .run();
  const id = r.meta?.last_row_id;
  return Response.json({ ok: true, id, number: orderNumber(id), total_cad: o.total_cad, currency: show.currency || 'CAD', turnaround: show.turnaround, payNote: show.payNote }, { status: 201 });
}

export async function onRequestGet({ request, env }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const url = new URL(request.url);
  const status = url.searchParams.get('status');
  const limit = Math.min(500, Math.max(1, Number(url.searchParams.get('limit')) || 200));
  const where = status && STATUSES.includes(status) ? 'WHERE status = ?' : '';
  const stmt = db.prepare(`SELECT ${LIST_COLUMNS} FROM orders ${where} ORDER BY id DESC LIMIT ?`);
  const { results } = await (where ? stmt.bind(status, limit) : stmt.bind(limit)).all();
  const rows = results.map((r) => ({ ...r, number: orderNumber(r.id), has_shot: !!r.has_shot, has_settings: !!r.has_settings }));
  if (url.searchParams.get('format') === 'csv') {
    const cols = ['number', 'created_at', 'status', 'item', 'option', 'qty', 'unit_cad', 'total_cad', 'customer', 'contact', 'fulfil', 'notes', 'page_url'];
    const cell = (v) => { const s = String(v ?? ''); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\n') + '\n';
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="orders.csv"' } });
  }
  return Response.json({ ok: true, orders: rows, statuses: STATUSES }, { headers: { 'Cache-Control': 'no-store' } });
}
