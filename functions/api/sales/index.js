// Walk-up sales of ready-made stock (not custom orders). Owner only.
// POST /api/sales { lines: [{ sku, qty }], payment_method, note }   priced from show.json "stock"
// GET  /api/sales            list, ?format=csv
import show from '../../../show.json';
import { validateSale, ordersDb, noDbResponse, isOwner, csvCell } from '../../_lib/orders.js';

export async function onRequestPost({ request, env }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'Send JSON.' }, { status: 400 }); }
  const v = validateSale(body, show);
  if (!v.ok) return Response.json(v, { status: 400 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const s = v.sale;
  const r = await db.prepare('INSERT INTO sales (created_at, lines, total_cad, payment_method, note) VALUES (?, ?, ?, ?, ?)')
    .bind(new Date().toISOString(), s.lines, s.total_cad, s.payment_method, s.note).run();
  return Response.json({ ok: true, id: r.meta?.last_row_id, total_cad: s.total_cad }, { status: 201 });
}

export async function onRequestGet({ request, env }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const { results } = await db.prepare('SELECT * FROM sales ORDER BY id DESC LIMIT 500').all();
  const rows = results.map((r) => ({ ...r, lines: JSON.parse(r.lines) }));
  if (new URL(request.url).searchParams.get('format') === 'csv') {
    const cols = ['id', 'created_at', 'items', 'total_cad', 'payment_method', 'note'];
    const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(c === 'items' ? r.lines.map((l) => `${l.qty}× ${l.name}`).join('; ') : r[c])).join(','))].join('\n') + '\n';
    return new Response(csv, { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="sales.csv"' } });
  }
  return Response.json({ ok: true, sales: rows, stock: show.stock || [] }, { headers: { 'Cache-Control': 'no-store' } });
}
