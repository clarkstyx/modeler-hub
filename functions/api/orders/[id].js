// GET   /api/orders/:id   owner only: one order with its preview picture and saved settings
// PATCH /api/orders/:id   owner only, one of:
//   { production_status }                                   pending | queued | printing | ready | completed | cancelled
//   { payment_status, payment_method?, amount_received? }   unpaid | paid | refunded   (paid also queues the order)
//   { due_date }                                             "2026-11-14" or ""
// The customer's settings, screenshot and prices are never changed here: an order stays what the customer approved.
import { ordersDb, noDbResponse, isOwner, orderNumber, PRODUCTION, PAYMENT, PAY_METHODS } from '../../_lib/orders.js';

export async function onRequestGet({ request, env, params }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  const row = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(Number(params.id)).first();
  if (!row) return Response.json({ ok: false, error: 'No such order.' }, { status: 404 });
  delete row.ip_hash;
  return Response.json({ ok: true, order: { ...row, number: orderNumber(row.id) } }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function onRequestPatch({ request, env, params }) {
  if (!(await isOwner(request, env))) return Response.json({ ok: false, error: 'Owner only.' }, { status: 401 });
  const db = await ordersDb(env);
  if (!db) return noDbResponse();
  let body;
  try { body = await request.json(); } catch { return Response.json({ ok: false, error: 'Send JSON.' }, { status: 400 }); }
  const id = Number(params.id);
  const now = new Date().toISOString();
  const row = await db.prepare('SELECT id, production_status, payment_status, total_cad FROM orders WHERE id = ?').bind(id).first();
  if (!row) return Response.json({ ok: false, error: 'No such order.' }, { status: 404 });

  if (body.payment_status !== undefined) {
    if (!PAYMENT.includes(body.payment_status)) return Response.json({ ok: false, error: `Payment must be one of ${PAYMENT.join(', ')}.` }, { status: 400 });
    const method = body.payment_status === 'paid' ? body.payment_method : '';
    if (body.payment_status === 'paid' && !PAY_METHODS.includes(method)) return Response.json({ ok: false, error: 'Say how they paid: cash, etransfer, card or other.' }, { status: 400 });
    const received = body.payment_status === 'paid' ? (Number.isFinite(Number(body.amount_received)) ? Number(body.amount_received) : row.total_cad) : 0;
    // Paying queues a pending order; un-paying or refunding takes it back out of the queue.
    const production = body.payment_status === 'paid' ? (row.production_status === 'pending' ? 'queued' : row.production_status)
      : (['queued', 'printing'].includes(row.production_status) ? 'pending' : row.production_status);
    await db.prepare('UPDATE orders SET payment_status = ?, payment_method = ?, amount_received = ?, paid_at = ?, production_status = ?, status_changed_at = ? WHERE id = ?')
      .bind(body.payment_status, method, received, body.payment_status === 'paid' ? now : '', production, now, id).run();
    return Response.json({ ok: true, id, payment_status: body.payment_status, production_status: production });
  }
  if (body.production_status !== undefined) {
    if (!PRODUCTION.includes(body.production_status)) return Response.json({ ok: false, error: `Status must be one of ${PRODUCTION.join(', ')}.` }, { status: 400 });
    if (row.payment_status !== 'paid' && ['queued', 'printing', 'ready', 'completed'].includes(body.production_status))
      return Response.json({ ok: false, error: 'This order is not paid yet. Mark it paid first.' }, { status: 409 });
    await db.prepare('UPDATE orders SET production_status = ?, status_changed_at = ? WHERE id = ?').bind(body.production_status, now, id).run();
    return Response.json({ ok: true, id, production_status: body.production_status });
  }
  if (body.due_date !== undefined) {
    const due = String(body.due_date || '');
    if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return Response.json({ ok: false, error: 'Date must look like 2026-11-14.' }, { status: 400 });
    await db.prepare('UPDATE orders SET due_date = ? WHERE id = ?').bind(due, id).run();
    return Response.json({ ok: true, id, due_date: due });
  }
  return Response.json({ ok: false, error: 'Nothing to change.' }, { status: 400 });
}
