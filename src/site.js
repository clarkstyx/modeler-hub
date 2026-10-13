// Shared page script: fills the brand + nav, renders the modeler cards on the
// home page, and shows who is logged in (asks /api/me, which only exists on
// Cloudflare Pages; on plain `vite dev` it just shows the logged-out state).
import manifest from '../modelers.json';

const { site, tiers, modelers } = manifest;
const levelOf = (tier) => (tiers[tier] || tiers.free).level;

export function fillChrome() {
  document.querySelectorAll('[data-site-name]').forEach((el) => { el.textContent = site.name; });
  document.querySelectorAll('[data-patreon]').forEach((el) => { el.href = site.patreonUrl; });
  document.querySelectorAll('[data-makerworld]').forEach((el) => { el.href = site.makerworldProfile; });
  document.querySelectorAll('[data-email]').forEach((el) => { el.textContent = site.contactEmail; el.href = 'mailto:' + site.contactEmail; });
  document.querySelectorAll('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
}

export async function whoAmI() {
  try {
    const res = await fetch('/api/me', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (_) {
    return { loggedIn: false, level: 0 };
  }
}

export function renderAccount(me) {
  const slot = document.querySelector('[data-account]');
  if (!slot) return;
  if (me.loggedIn) {
    const tierName = Object.values(tiers).find((t) => t.level === me.level)?.label || 'Member';
    slot.innerHTML = `<span class="who">Hi <b></b> · ${tierName}</span> <a class="btn" href="/auth/logout">Log out</a>`;
    slot.querySelector('b').textContent = me.name || 'there';
  } else {
    slot.innerHTML = `<a class="btn primary" href="/auth/login?next=${encodeURIComponent(location.pathname)}">Log in with Patreon</a>`;
  }
}

function card(m, me) {
  const need = levelOf(m.tier);
  const unlocked = need === 0 || (me.loggedIn && me.level >= need);
  const el = document.createElement('article');
  el.className = 'card' + (unlocked ? '' : ' locked');
  const open = unlocked
    ? `<a class="btn primary" href="/m/${m.id}/">Open</a>`
    : me.loggedIn
      ? `<a class="btn primary" href="/pricing/">Upgrade to ${tiers[m.tier].label}</a>`
      : `<a class="btn primary" href="/auth/login?next=${encodeURIComponent('/m/' + m.id + '/')}">Log in to open</a>`;
  const mw = m.makerworld ? `<a class="mw" href="${m.makerworld}" target="_blank" rel="noopener">Free version on MakerWorld ↗</a>` : '';
  el.innerHTML = `
    <div class="head"><h3></h3><span class="pill ${m.tier}">${tiers[m.tier].label}</span></div>
    <p></p>
    <div class="foot">${open}${mw}</div>`;
  el.querySelector('h3').textContent = m.name;
  el.querySelector('p').textContent = m.tagline;
  return el;
}

export function renderCards(me) {
  const root = document.querySelector('[data-cards]');
  if (!root) return;
  root.innerHTML = '';
  const live = modelers.filter((m) => m.status !== 'hidden');
  const cats = [...new Set(live.map((m) => m.category))];
  for (const cat of cats) {
    const sec = document.createElement('section');
    sec.className = 'group';
    sec.innerHTML = `<h2></h2><div class="grid"></div>`;
    sec.querySelector('h2').textContent = cat;
    const grid = sec.querySelector('.grid');
    for (const m of live.filter((x) => x.category === cat)) grid.appendChild(card(m, me));
    root.appendChild(sec);
  }
}

export function renderTiers() {
  const root = document.querySelector('[data-tiers]');
  if (!root) return;
  const count = (tier) => modelers.filter((m) => levelOf(m.tier) <= levelOf(tier)).length;
  root.innerHTML = `
    <div class="tier">
      <h3>Free</h3><div class="price">$0</div>
      <ul><li>${count('free')} free modelers</li><li>Single-colour STL and 3MF</li><li>Free versions on MakerWorld</li></ul>
      <a class="btn" href="/">Browse</a>
    </div>
    <div class="tier hot">
      <h3>Maker</h3><div class="price">$4 <small>/ month</small></div>
      <ul><li>All ${count('maker')} Maker modelers</li><li>Multi-colour 3MF, parts pre-split for the AMS</li><li>SVG and image upload</li><li>Save and load settings</li><li>Personal use</li></ul>
      <a class="btn primary" data-patreon href="#" target="_blank" rel="noopener">Join on Patreon</a>
    </div>
    <div class="tier">
      <h3>Seller</h3><div class="price">$12 <small>/ month</small></div>
      <ul><li>Everything in Maker, all ${count('seller')} modelers</li><li>Commercial licence to sell prints</li><li>Batch plates (many names, one file)</li><li>Early access and requests</li></ul>
      <a class="btn primary" data-patreon href="#" target="_blank" rel="noopener">Join on Patreon</a>
    </div>`;
  fillChrome();
}

export async function boot() {
  fillChrome();
  renderTiers();
  const me = await whoAmI();
  renderAccount(me);
  renderCards(me);
}
