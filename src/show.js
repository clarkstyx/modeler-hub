// Craft-show pages: the tile page (/show/) and the printable booth sign (/show/sign/).
// Both read show.json at build time, so a price change is a push away.
import show from '../show.json';
import manifest from '../modelers.json';
import { fillChrome } from './site.js';

const money = (n, cur = show.currency || 'CAD') => `$${Number(n).toFixed(Number(n) % 1 ? 2 : 0)} ${cur}`;
const priceLine = (t) => {
  const vals = t.prices.map((p) => p.cad);
  const lo = Math.min(...vals), hi = Math.max(...vals);
  return lo === hi ? money(lo) : `${money(lo).replace(/ \w+$/, '')} to ${money(hi)}`;
};

function fillShowText() {
  fillChrome();
  document.querySelectorAll('[data-show-title]').forEach((el) => { el.textContent = show.title; });
  document.querySelectorAll('[data-show-tagline]').forEach((el) => { el.textContent = show.tagline; });
  document.querySelectorAll('[data-show-turnaround]').forEach((el) => { el.textContent = show.turnaround; });
}

export function renderTiles() {
  const root = document.querySelector('[data-tiles]');
  if (!root) return;
  root.innerHTML = '';
  for (const t of show.tiles) {
    const known = manifest.modelers.some((m) => m.id === t.id);
    const a = document.createElement('a');
    a.className = 'tile';
    a.href = `/m/${t.id}/`;
    a.innerHTML = `
      <div class="emoji"></div>
      <div><h3></h3><p></p></div>
      <div class="price"><small>${t.prices.length > 1 ? 'from' : ''}</small></div>
      <span class="go">Design it ›</span>`;
    a.querySelector('.emoji').textContent = t.emoji || '✨';
    a.querySelector('h3').textContent = t.name;
    a.querySelector('p').textContent = t.blurb + (known ? '' : ' (not on the site yet)');
    a.querySelector('.price').append(t.prices.length > 1 ? money(Math.min(...t.prices.map((p) => p.cad))) : priceLine(t));
    root.appendChild(a);
  }
}

export function bootShow() {
  fillShowText();
  const closed = document.querySelector('[data-closed]');
  if (!show.enabled) {
    if (closed) closed.hidden = false;
    document.querySelector('[data-tiles]')?.remove();
    document.querySelector('.steps')?.remove();
    document.querySelector('[data-show-pill]')?.remove();
    return;
  }
  renderTiles();
}

export async function bootSign() {
  fillShowText();
  const { default: QRCode } = await import('qrcode');
  const input = document.getElementById('url');
  const box = document.querySelector('[data-qr]');
  const params = new URLSearchParams(location.search);
  input.value = params.get('url') || `${location.origin}/show/`;
  const draw = async () => {
    try { box.innerHTML = await QRCode.toString(input.value, { type: 'svg', margin: 1, errorCorrectionLevel: 'M', color: { dark: '#111111', light: '#ffffff' } }); }
    catch { box.textContent = 'Type a full link (https://…)'; }
  };
  input.addEventListener('input', draw);
  await draw();
  const prices = document.querySelector('[data-prices]');
  for (const t of show.tiles) {
    const li = document.createElement('li');
    const name = document.createElement('span');
    name.textContent = t.name;
    const val = document.createElement('span');
    if (t.prices.length > 1) {
      val.innerHTML = t.prices.map((p) => `<span class="opt">${p.label}</span> ${money(p.cad).replace(/ \w+$/, '')}`).join(' · ');
    } else val.textContent = money(t.prices[0].cad);
    li.append(name, val);
    prices.appendChild(li);
  }
  document.getElementById('print').addEventListener('click', () => window.print());
}
