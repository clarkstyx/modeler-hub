// GET   /api/orders/:id   owner only: one order with its preview picture and saved settings
// PATCH /api/orders/:id   owner only: { status } → new | paid | printing | ready | done | cancelled
import { ordersDb, noDbResponse, isOwner, orderNumber, STATUSES } from '../../_lib/orders.js';

export async function onRequestGet({ request, env, params }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(params.id)).first();
  if (!row) return Response.json({ ok: false, error: 'No such order.' }, { status: 404 });
  return Response.json({ ok: true, order: { ...row, number: orderNumber(row.id) } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPatch({ request, env, params }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'Send JSON.' }, { status: 400 }); }
  if (!STATUSES.includes(body.status)) return Response.json({ ok: false, error: `Status must be one of ${STATUSES.join(', ')}.` }, { status: 400 });
  const r = await db.prepare('UPDATE orders SET status = ? WHERE id = ?').bind(body.status, Number(params.id)).run();
  if (!r.meta?.changes) return Response.json({ ok: false, error: 'No such order.' }, { status: 404 });
  return Response.json({ ok: true, id: Number(params.id), status: body.status });
}
