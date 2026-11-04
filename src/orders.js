// Private orders page. Talks to /api/orders with the ORDERS_KEY (kept in this
// browser's localStorage) and lets Clark move each order through its statuses.
import { fillChrome } from './site.js';

const KEY = 'mh_orders_key';
const NEXT = { new: 'paid', paid: 'printing', printing: 'ready', ready: 'done' };
const LABEL = { new: 'Mark paid', paid: 'Start printing', printing: 'Mark ready', ready: 'Mark picked up / shipped' };
let filter = 'open';
let orders = [];

const $ = (id) => document.getElementById(id);
const key = () => { try { return localStorage.getItem(KEY) || ''; } catch { return ''; } };
const headers = () => ({ Accept: 'application/json', Authorization: `Bearer ${key()}` });
const money = (n) => `$${Number(n).toFixed(Number(n) % 1 ? 2 : 0)}`;
const when = (iso) => new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
const contactLink = (c) => {
  const s = c.trim();
  if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s)) return `<a href="mailto:${encodeURIComponent(s)}">${esc(s)}</a>`;
  const digits = s.replace(/[^\d+]/g, '');
  if (digits.length >= 7) return `<a href="tel:${digits}">${esc(s)}</a> · <a href="sms:${digits}">text</a>`;
  return esc(s);
};
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

async function load() {
  const res = await fetch('/api/orders?limit=500', { headers: headers() });
  if (res.status === 401) throw new Error('That key was not accepted.');
  const body = await res.json();
  if (!body.ok) throw new Error(body.error || 'Could not load the orders.');
  orders = body.orders;
}

function renderChips() {
  const count = (f) => orders.filter((o) => match(o, f)).length;
  const chips = [['open', 'Open'], ['new', 'New'], ['paid', 'Paid'], ['printing', 'Printing'], ['ready', 'Ready'], ['done', 'Done'], ['all', 'All']];
  $('chips').innerHTML = chips.map(([f, l]) => `<button class="chip ${f === filter ? 'on' : ''}" data-f="${f}">${l} <span class="muted">${count(f)}</span></button>`).join('');
  $('chips').querySelectorAll('.chip').forEach((b) => b.addEventListener('click', () => { filter = b.dataset.f; render(); }));
}
const match = (o, f) => f === 'all' || (f === 'open' ? !['done', 'cancelled'].includes(o.status) : o.status === f);

function render() {
  renderChips();
  const paid = orders.filter((o) => ['paid', 'printing', 'ready', 'done'].includes(o.status)).reduce((s, o) => s + o.total_cad, 0);
  const owed = orders.filter((o) => o.status === 'new').reduce((s, o) => s + o.total_cad, 0);
  $('sum').innerHTML = `<b>${orders.length}</b> orders · paid <b>${money(paid)}</b> · unpaid <b>${money(owed)}</b>`;
  const root = $('orders');
  const list = orders.filter((o) => match(o, filter));
  root.innerHTML = list.length ? '' : '<div class="empty">Nothing here yet.</div>';
  for (const o of list) root.appendChild(card(o));
}

function card(o) {
  const el = document.createElement('article');
  el.className = `order ${o.status}`;
  el.innerHTML = `
    <div class="head"><span class="num">${o.number}</span><span class="status ${o.status}">${o.status}</span><span class="when">${when(o.created_at)}</span></div>
    <div class="what"><b>${esc(o.item)}</b> · ${esc(o.option)} × ${o.qty} · <b>${money(o.total_cad)}</b> · ${o.fulfil === 'ship' ? 'ship' : 'pickup'}</div>
    <div class="who"><span>${esc(o.customer)}</span><span>${contactLink(o.contact)}</span></div>
    ${o.notes ? `<div class="notes">${esc(o.notes)}</div>` : ''}
    <div class="actions"></div>
    <div class="detail" hidden></div>`;
  const actions = el.querySelector('.actions');
  const btn = (label, cls, fn) => { const b = document.createElement('button'); b.className = `btn ${cls}`; b.textContent = label; b.addEventListener('click', fn); actions.appendChild(b); };
  if (NEXT[o.status]) btn(LABEL[o.status], 'primary', () => setStatus(o, NEXT[o.status]));
  if (o.has_shot || o.has_settings || o.page_url) btn('Design', '', () => toggleDetail(o, el));
  if (o.status !== 'cancelled' && o.status !== 'done') btn('Cancel', '', () => { if (confirm(`Cancel ${o.number}?`)) setStatus(o, 'cancelled'); });
  if (o.status === 'cancelled' || o.status === 'done') btn('Reopen', '', () => setStatus(o, 'paid'));
  return el;
}

async function setStatus(o, status) {
  const res = await fetch(`/api/orders/${o.id}`, { method: 'PATCH', headers: { ...headers(), 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
  const body = await res.json();
  if (!body.ok) return alert(body.error || 'Could not update.');
  o.status = status;
  render();
}

async function toggleDetail(o, el) {
  const d = el.querySelector('.detail');
  if (!d.hidden) { d.hidden = true; return; }
  d.hidden = false;
  d.textContent = 'Loading…';
  const res = await fetch(`/api/orders/${o.id}`, { headers: headers() });
  const body = await res.json();
  if (!body.ok) { d.textContent = body.error || 'Could not load.'; return; }
  const full = body.order;
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
  if (!full.screenshot && !full.settings) d.append('No preview was captured. Build it from the notes.');
}

export function bootOrders() {
  fillChrome();
  const show = async () => {
    try {
      await load();
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
  $('forget').addEventListener('click', (e) => { e.preventDefault(); try { localStorage.removeItem(KEY); } catch {} location.reload(); });
  $('csv').addEventListener('click', async (e) => {
    e.preventDefault();
    const res = await fetch('/api/orders?format=csv&limit=500', { headers: headers() });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(await res.blob());
    a.download = 'orders.csv';
    a.click();
  });
  show();
}
