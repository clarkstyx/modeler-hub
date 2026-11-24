// Shared page script: fills the brand + nav, renders the modeler cards on the
// home page, and shows who is logged in (asks /api/me, which only exists on
// Cloudflare Pages).
//
// Local preview: on your own computer with no login server (`npm run dev` or
// `npm run preview`) there is no gate at all, so every modeler opens and the
// login button is hidden. Same with `npm run pages:dev` and DEV_BYPASS=1.
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

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]'];
const LOCAL_PREVIEW = { loggedIn: true, name: 'Local preview', level: 2, dev: true };

export async function whoAmI() {
  try {
    const res = await fetch('/api/me', { headers: { Accept: 'application/json' } });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (_) {
    // No /api/me means no Pages Functions, so no gate. Only trust that on your own machine.
    return LOCAL_HOSTS.includes(location.hostname) ? LOCAL_PREVIEW : { loggedIn: false, level: 0 };
  }
}

export function renderAccount(me) {
  const slot = document.querySelector('[data-account]');
  if (!slot) return;
  if (me.dev) {
    slot.innerHTML = `<span class="who" title="Running on this computer: every modeler is unlocked and login is off.">Local preview · all unlocked</span>`;
  } else if (me.loggedIn) {
    const tierName = Object.values(tiers).find((t) => t.level === me.level)?.label || 'Member';
    const manage = me.via === 'stripe' ? `<a href="/api/portal" title="Change card, switch plan or cancel">Manage</a> ` : '';
    slot.innerHTML = `<span class="who">Hi <b></b> · ${tierName}</span> ${manage}<a class="btn" href="/auth/logout">Log out</a>`;
    slot.querySelector('b').textContent = me.name || 'there';
  } else {
    slot.innerHTML = `<a class="btn" href="/login/?next=${encodeURIComponent(location.pathname)}">Log in</a>`;
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
      ? `<a class="btn primary" href="/pricing/?next=${encodeURIComponent('/m/' + m.id + '/')}">Upgrade to ${tiers[m.tier].label}</a>`
      : `<a class="btn primary" href="/pricing/?next=${encodeURIComponent('/m/' + m.id + '/')}">Get ${tiers[m.tier].label}</a>`;
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

// The plan cards. Names, prices and bullet points live in modelers.json
// ("tiers"), so changing them there changes the page. The amount really charged
// is set on the Stripe price: keep the two the same.
const patreonLive = () => site.patreonUrl && !site.patreonUrl.includes('REPLACE_ME');

export function renderTiers() {
  const root = document.querySelector('[data-tiers]');
  if (!root) return;
  const next = new URLSearchParams(location.search).get('next');
  const count = (tier) => modelers.filter((m) => m.status !== 'hidden' && levelOf(m.tier) <= levelOf(tier)).length;
  root.innerHTML = '';
  for (const [id, t] of Object.entries(tiers)) {
    const paid = t.level > 0;
    const el = document.createElement('div');
    el.className = 'tier' + (t.featured ? ' hot' : '');
    el.dataset.tier = id;
    const checkout = `/api/checkout?plan=${id}` + (next ? `&next=${encodeURIComponent(next)}` : '');
    el.innerHTML = `
      <h3></h3>
      <div class="price">$${Number(t.price) || 0}${paid ? ' <small>/ month</small>' : ''}</div>
      <ul><li>${count(id)} modelers</li></ul>
      ${paid
        ? `<a class="btn primary" data-checkout href="${checkout}">Choose ${t.label}</a>`
        : `<a class="btn" href="/#modelers">Browse</a>`}
      ${paid && patreonLive() ? `<a class="alt" data-patreon href="#" target="_blank" rel="noopener">or join on Patreon</a>` : ''}`;
    el.querySelector('h3').textContent = t.label;
    const list = el.querySelector('ul');
    for (const line of t.perks || [t.blurb]) {
      const li = document.createElement('li');
      li.textContent = line;
      list.appendChild(li);
    }
    root.appendChild(el);
  }
  fillChrome();
}

/** Marks the plan a member already has. On your own computer there is no payment server, so the button says so. */
export function markPlans(me) {
  document.querySelectorAll('.tier[data-tier]').forEach((el) => {
    const t = tiers[el.dataset.tier];
    const btn = el.querySelector('[data-checkout]');
    if (!btn) return;
    if (me.dev) {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        btn.textContent = 'Checkout runs on the live site';
      });
    } else if (me.loggedIn && me.level >= t.level) {
      btn.outerHTML = `<span class="btn current">${me.level === t.level ? 'Your plan ✓' : 'Included in your plan'}</span>`;
    }
  });
}

export async function boot() {
  fillChrome();
  renderTiers();
  const me = await whoAmI();
  renderAccount(me);
  markPlans(me);
  renderCards(me);
}
