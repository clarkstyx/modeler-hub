// Private orders page. Talks to /api/orders and /api/sales with the ORDERS_KEY
// (kept in this browser's localStorage). Payment and production are separate:
// paying an order queues it; production moves queued → printing → ready → completed.
import { fillChrome } from './site.js';

const KEY = 'mh_orders_key';
const NEXT = { queued: ['printing', 'Start printing'], printing: ['ready', 'Mark ready'], ready: ['completed', 'Picked up / shipped'] };
const PAY_LABEL = { cash: 'Cash', etransfer: 'E-transfer', card: 'Card', other: 'Other' };
let filter = 'open';
let orders = [];
let salesData = { sales: [], stock: [] };
let cart = {};

const $ = (id) => document.getElementById(id);
const key = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const headers = () => ({ Accept: 'application/json', Authorization: `Bearer ${key()}` });
const money = (n) => `$${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;
const when = (iso) => (iso ? new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const contactLink = (c) => {
  const s = c.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return `<a href="mailto:${encodeURIComponent(s)}">${esc(s)}</a>`;
  const digits = s.replace(/[^\d+]/g, '');
  if (digits.length >= 7) return `<a href="tel:${digits}">${esc(s)}</a> · <a href="sms:${digits}">text</a>`;
  return esc(s);
};
async function api(path, opts = {}) {
  const res = await fetch(path, { ...opts, headers: { ...headers(), ...(opts.headers || {}) } });
  if (res.status === 401) throw new Error('That key was not accepted.');
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'Something went wrong.');
  return body;
}

async function load() {
  const q = $('q').value.trim();
  const body = await api(`/api/orders?limit=500${q ? '&q=' + encodeURIComponent(q) : ''}`);
  orders = body.orders;
}

const FILTERS = [['open', 'Open'], ['unpaid', 'Awaiting payment'], ['queued', 'Paid, to print'], ['printing', 'Printing'], ['ready', 'Ready'], ['completed', 'Completed'], ['cancelled', 'Cancelled'], ['all', 'All']];
const match = (o, f) =>
  f === 'all' ? true
  : f === 'open' ? !['completed', 'cancelled'].includes(o.production_status)
  : f === 'unpaid' ? o.payment_status === 'unpaid' && o.production_status !== 'cancelled'
  : o.production_status === f;

function renderChips() {
  $('chips').innerHTML = FILTERS.map(([f, l]) => `<button class="chip ${f === filter ? 'on' : ''}" data-f="${f}">${l} <span class="muted">${orders.filter((o) => match(o, f)).length}</span></button>`).join('');
  $('chips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
}

function render() {
  renderChips();
  const live = orders.filter((o) => o.production_status !== 'cancelled');
  const paid = live.filter((o) => o.payment_status === 'paid').reduce((s, o) => s + o.amount_received, 0);
  const owed = live.filter((o) => o.payment_status === 'unpaid').reduce((s, o) => s + o.total_cad, 0);
  const stock = salesData.sales.reduce((s, x) => s + x.total_cad, 0);
  $('sum').innerHTML = `<b>${live.length}</b> orders · received <b>${money(paid)}</b> · awaiting <b>${money(owed)}</b>${salesData.sales.length ? ` · stock sales <b>${money(stock)}</b>` : ''}`;
  const root = $('orders');
  const list = orders.filter((o) => match(o, filter));
  root.innerHTML = list.length ? '' : '<div class="empty">Nothing here.</div>';
  for (const o of list) root.appendChild(card(o));
  renderQueue();
  renderSales();
}

function card(o) {
  const el = document.createElement('article');
  el.className = `order ${o.production_status}`;
  const pay = o.payment_status === 'paid' ? `paid ${PAY_LABEL[o.payment_method] || ''} ${money(o.amount_received)}` : o.payment_status;
  el.innerHTML = `
    <div class="head"><span class="num">${o.number}</span><span class="status ${o.payment_status}">${esc(pay)}</span><span class="status ${o.production_status}">${o.production_status}</span><span class="when">${when(o.created_at)}</span></div>
    <div class="what"><b>${esc(o.item)}</b> · ${esc(o.option)} × ${o.qty} · <b>${money(o.total_cad)}</b> · ${o.fulfil === 'ship' ? 'ship (quote shipping)' : 'pickup'}</div>
    <div class="who"><span>${esc(o.customer)}</span><span>${contactLink(o.contact)}</span></div>
    ${o.notes ? `<div class="notes">${esc(o.notes)}</div>` : ''}
    <div class="meta">${o.paid_at ? `<span>paid ${when(o.paid_at)}</span>` : ''}${o.status_changed_at ? `<span>status ${when(o.status_changed_at)}</span>` : ''}${o.due_date ? `<span>due ${o.due_date}</span>` : ''}${o.shot_status !== 'saved' ? '<span>no preview picture</span>' : ''}${o.modeler_sha ? `<span>modeler ${o.modeler_sha}</span>` : ''}</div>
    <div class="actions"></div>
    <div class="detail" hidden></div>`;
  const actions = el.querySelector('.actions');
  const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = `btn ${cls}`; b.textContent = label; b.addEventListener('click', fn); actions.appendChild(b); };
  if (o.production_status !== 'cancelled') {
    if (o.payment_status === 'unpaid') btn('Mark paid…', 'primary', () => markPaid(o));
    else if (NEXT[o.production_status]) btn(NEXT[o.production_status][1], 'primary', () => patch(o, { production_status: NEXT[o.production_status][0] }));
  }
  btn('Design', '', () => toggleDetail(o, el));
  if (o.payment_status === 'paid' && o.production_status !== 'cancelled') btn('Due date…', '', async () => { const d = prompt('Due date (YYYY-MM-DD), blank to clear', o.due_date || ''); if (d !== null) patch(o, { due_date: d.trim() }); });
  if (o.production_status !== 'cancelled' && o.production_status !== 'completed') btn('Cancel', '', () => { if (confirm(`Cancel ${o.number}?`)) patch(o, { production_status: 'cancelled' }); });
  if (o.production_status === 'cancelled' || o.production_status === 'completed') btn('Reopen', '', () => patch(o, { production_status: o.payment_status === 'paid' ? 'queued' : 'pending' }));
  if (o.payment_status === 'paid' && o.production_status === 'cancelled') btn('Mark refunded', '', () => { if (confirm(`Refund ${o.number}?`)) patch(o, { payment_status: 'refunded' }); });
  return el;
}

async function markPaid(o) {
  const sel = document.createElement('select');
  sel.innerHTML = Object.entries(PAY_LABEL).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  const amt = document.createElement('input');
  amt.type = 'number'; amt.step = '0.01'; amt.value = o.total_cad; amt.style.width = '90px';
  const ok = document.createElement('button'); ok.className = 'btn primary'; ok.textContent = `Confirm ${o.number} paid`;
  const no = document.createElement('button'); no.className = 'btn'; no.textContent = 'Back';
  const row = document.createElement('div'); row.className = 'actions';
  row.append('How did they pay?', sel, '$', amt, ok, no);
  const cardEl = [...document.querySelectorAll('.order')].find((c) => c.querySelector('.num')?.textContent === o.number);
  const actions = cardEl.querySelector('.actions');
  actions.replaceWith(row);
  no.addEventListener('click', render);
  ok.addEventListener('click', () => patch(o, { payment_status: 'paid', payment_method: sel.value, amount_received: Number(amt.value) }));
}

async function patch(o, body) {
  try {
    const r = await api(`/api/orders/${o.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    Object.assign(o, r);
    if (body.payment_status === 'paid') { o.payment_method = body.payment_method; o.amount_received = body.amount_received; o.paid_at = new Date().toISOString(); }
    if (body.payment_status === 'refunded') o.payment_status = 'refunded';
    if (body.due_date !== undefined) o.due_date = body.due_date;
    render();
  } catch (e) { alert(e.message); }
}

async function toggleDetail(o, el) {
  const d = el.querySelector('.detail');
  if (!d.hidden) { d.hidden = true; return; }
  d.hidden = false;
  d.textContent = 'Loading…';
  try {
    const { order: full } = await api(`/api/orders/${o.id}`);
    d.innerHTML = '';
    if (full.screenshot) { const img = document.createElement('img'); img.src = full.screenshot; img.alt = 'Customer preview'; d.appendChild(img); }
    const links = document.createElement('div');
    links.className = 'links';
    if (full.page_url) links.innerHTML += `<a class="btn" href="${esc(full.page_url)}" target="_blank" rel="noopener">Open the modeler page</a>`;
    if (full.settings) {
      const blob = new Blob([full.settings], { type: 'application/json' });
      links.innerHTML += `<a class="btn" href="${URL.createObjectURL(blob)}" download="${o.number}-settings.json">Saved settings (JSON)</a>`;
    }
    d.appendChild(links);
    const meta = document.createElement('div'); meta.className = 'meta';
    meta.textContent = `preset ${full.preset || '?'} · modeler build ${full.modeler_sha || 'unknown'} · ${full.user_agent ? full.user_agent.slice(0, 60) : ''}`;
    d.appendChild(meta);
    if (!full.screenshot && !full.settings) d.append('No preview was captured. Build it from the notes.');
  } catch (e) { d.textContent = e.message; }
}

function renderQueue() {
  const root = $('queue');
  const q = orders.filter((o) => o.payment_status === 'paid' && ['queued', 'printing', 'ready'].includes(o.production_status)).sort((a, b) => a.id - b.id);
  if (!q.length) { root.innerHTML = '<div class="empty">Nothing paid and waiting.</div>'; return; }
  root.innerHTML = '';
  const groups = new Map();
  for (const o of q) { if (!groups.has(o.item)) groups.set(o.item, []); groups.get(o.item).push(o); }
  for (const [item, list] of groups) {
    const g = document.createElement('div'); g.className = 'qgroup';
    g.innerHTML = `<h3>${esc(item)} <span class="muted">· ${list.reduce((n, o) => n + o.qty, 0)} to print</span></h3>`;
    for (const o of list) {
      const row = document.createElement('div'); row.className = 'qrow';
      row.innerHTML = `<div class="nothumb">${o.shot_status === 'saved' ? 'tap Design' : 'no picture'}</div>
        <div><b>${o.number}</b> · ${esc(o.option)} × ${o.qty} · ${esc(o.customer)}${o.notes ? `<div class="muted">${esc(o.notes.slice(0, 120))}</div>` : ''}${o.due_date ? `<div class="muted">due ${o.due_date}</div>` : ''}</div>
        <span class="status ${o.production_status}">${o.production_status}</span>`;
      if (o.shot_status === 'saved') {
        api(`/api/orders/${o.id}`).then(({ order }) => { if (order.screenshot) { const img = document.createElement('img'); img.className = 'thumb'; img.src = order.screenshot; row.querySelector('.nothumb').replaceWith(img); } }).catch(() => {});
      }
      g.appendChild(row);
    }
    root.appendChild(g);
  }
}

function renderSales() {
  const sale = $('sale');
  const stock = salesData.stock;
  sale.innerHTML = stock.length ? '' : '<div class="muted">No stock items in show.json yet.</div>';
  for (const s of stock) {
    const line = document.createElement('div'); line.className = 'line';
    line.innerHTML = `<span>${esc(s.name)}</span><span class="price">${money(s.cad)}</span><div class="qty"><button type="button">−</button><span>${cart[s.sku] || 0}</span><button type="button">+</button></div>`;
    const [minus, plus] = line.querySelectorAll('button');
    minus.addEventListener('click', () => { cart[s.sku] = Math.max(0, (cart[s.sku] || 0) - 1); renderSales(); });
    plus.addEventListener('click', () => { cart[s.sku] = (cart[s.sku] || 0) + 1; renderSales(); });
    sale.appendChild(line);
  }
  const total = stock.reduce((t, s) => t + (cart[s.sku] || 0) * s.cad, 0);
  const foot = document.createElement('div'); foot.className = 'foot';
  foot.innerHTML = `<span class="total">${money(total)}</span><select id="paym">${Object.entries(PAY_LABEL).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select><input id="salenote" placeholder="note (optional)" /><button class="btn primary" id="salebtn" type="button" ${total > 0 ? '' : 'disabled'}>Record sale</button>`;
  sale.appendChild(foot);
  foot.querySelector('#salebtn').addEventListener('click', async () => {
    const lines = Object.entries(cart).filter(([, q]) => q > 0).map(([sku, qty]) => ({ sku, qty }));
    try {
      await api('/api/sales', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ lines, payment_method: foot.querySelector('#paym').value, note: foot.querySelector('#salenote').value }) });
      cart = {};
      salesData = await api('/api/sales');
      render();
    } catch (e) { alert(e.message); }
  });
  const list = $('sales');
  list.innerHTML = salesData.sales.length ? '' : '<div class="muted">No stock sales yet.</div>';
  for (const s of salesData.sales) {
    const row = document.createElement('div'); row.className = 'srow';
    row.innerHTML = `<span>${s.lines.map((l) => `${l.qty}× ${esc(l.name)}`).join(', ')}${s.note ? ` <span class="muted">${esc(s.note)}</span>` : ''}</span><span><b>${money(s.total_cad)}</b> <span class="muted">${PAY_LABEL[s.payment_method] || ''} · ${when(s.created_at)}</span></span>`;
    list.appendChild(row);
  }
}

export function bootOrders() {
  fillChrome();
  const show = async () => {
    try {
      await load();
      try { salesData = await api('/api/sales'); } catch { /* sales are optional */ }
      $('keypanel').hidden = true;
      $('list').hidden = false;
      render();
    } catch (e) {
      $('list').hidden = true;
      $('keypanel').hidden = false;
      if (key()) { $('keyerr').textContent = e.message; $('keyerr').hidden = false; }
    }
  };
  $('savekey').addEventListener('click', () => { try { localStorage.setItem(KEY, $('key').value.trim()); } catch {} show(); });
  $('key').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('savekey').click(); });
  $('refresh').addEventListener('click', show);
  let t; $('q').addEventListener('input', () => { clearTimeout(t); t = setTimeout(show, 300); });
  $('tabs').querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => {
    $('tabs').querySelectorAll('.tab').forEach((x) => x.classList.toggle('on', x === b));
    for (const v of ['orders', 'queue', 'sales']) $(`view-${v}`).hidden = v !== b.dataset.view;
  }));
  $('forget').addEventListener('click', (e) => { e.preventDefault(); try { localStorage.removeItem(KEY); } catch {} location.reload(); });
  const dl = (id, path, name) => $(id).addEventListener('click', async (e) => {
    e.preventDefault();
    const res = await fetch(path, { headers: headers() });
    const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = name; a.click();
  });
  dl('csv', '/api/orders?format=csv&limit=500', 'orders.csv');
  dl('salescsv', '/api/sales?format=csv', 'sales.csv');
  show();
}
