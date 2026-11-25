// The Workshop page (/workshop/): a playful way into the modelers.
// The rules live in workshop-game.js; this file only draws them and listens.
//
// A modeler opens inside this page in a frame. It is on the same website, so
// this page may look at its 3D preview to take the shelf picture. Nothing in
// the modelers themselves had to change, and the Patreon gate still decides
// what opens.
import manifest from '../modelers.json';
import { fillChrome, whoAmI, renderAccount } from './site.js';
import { SAVE_KEY, SHELF_MAX, benches, cleanSave, addDesign, removeDesign, jobs, rank, newlyDone, nextTip } from './workshop-game.js';

const { tiers, modelers } = manifest;
const ALL = benches(modelers);
const levelOf = (tier) => (tiers[tier] || tiers.free).level;
const $ = (id) => document.getElementById(id);

let save = load();
let me = { loggedIn: false, level: 0 };
let showTiles = {}; // craft-show mode: modeler id -> tile (those open without Patreon)
let making = null; // the modeler open in the frame

function load() {
  try { return cleanSave(JSON.parse(localStorage.getItem(SAVE_KEY) || 'null')); } catch (_) { return cleanSave(null); }
}
// Returns false when the device has no room left, so the caller can say so.
function store(next) {
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(next)); save = next; return true; } catch (_) { return false; }
}

// ---- small drawings (plain SVG, so there are no picture files to manage) ----
const PROPS = {
  keychain: '<circle cx="20" cy="18" r="9" fill="none" stroke="#c9ced8" stroke-width="4"/><rect x="24" y="24" width="30" height="20" rx="7" fill="#e5392f" transform="rotate(20 24 24)"/><circle cx="30" cy="33" r="2.6" fill="#15171b"/>',
  sign: '<rect x="8" y="16" width="48" height="24" rx="5" fill="#f3b43a"/><rect x="15" y="24" width="34" height="4" rx="2" fill="#15171b"/><rect x="21" y="31" width="22" height="3" rx="1.5" fill="#15171b" opacity=".55"/><path d="M18 40l-5 12h38l-5-12z" fill="#b9801a"/>',
  box: '<rect x="10" y="24" width="44" height="28" rx="4" fill="#4a8fe0"/><rect x="7" y="16" width="50" height="11" rx="4" fill="#77aef0"/><rect x="26" y="34" width="12" height="8" rx="2" fill="#15171b" opacity=".45"/>',
  cutter: '<path d="M32 8l6.5 14.5 15.5 1.7-11.6 10.6 3.3 15.4L32 42.3 18.3 50.2l3.3-15.4L10 24.2l15.5-1.7z" fill="none" stroke="#4fc07a" stroke-width="5" stroke-linejoin="round"/>',
  ornament: '<rect x="27" y="8" width="10" height="8" rx="2" fill="#f3b43a"/><circle cx="32" cy="36" r="19" fill="#e5392f"/><path d="M15 31c8 5 26 5 34 0" fill="none" stroke="#fff" stroke-width="3" opacity=".8"/><circle cx="25" cy="42" r="2.4" fill="#fff"/><circle cx="38" cy="45" r="2.4" fill="#fff"/>',
  spinner: '<circle cx="32" cy="15" r="11" fill="#9a6be0"/><circle cx="16" cy="43" r="11" fill="#4a8fe0"/><circle cx="48" cy="43" r="11" fill="#4fc07a"/><circle cx="32" cy="33" r="8" fill="#e8eaee"/><circle cx="32" cy="33" r="3" fill="#15171b"/>',
};
const propSvg = (name) => `<svg viewBox="0 0 64 60" width="72" height="68" aria-hidden="true">${PROPS[name] || PROPS.box}</svg>`;
// Spool, the helper: a reel of filament with a face.
const SPOOL = '<svg viewBox="0 0 80 80" width="76" height="76"><circle cx="40" cy="40" r="34" fill="#e5392f"/><circle cx="40" cy="40" r="34" fill="none" stroke="#ff6a5c" stroke-width="4" stroke-dasharray="3 7"/><circle cx="40" cy="40" r="21" fill="#f6efe2"/><circle cx="32" cy="36" r="3.4" fill="#15171b"/><circle cx="48" cy="36" r="3.4" fill="#15171b"/><path d="M32 45q8 7 16 0" fill="none" stroke="#15171b" stroke-width="3" stroke-linecap="round"/><path d="M70 56q10 8 2 18" fill="none" stroke="#e5392f" stroke-width="4" stroke-linecap="round"/></svg>';

// ---- who may open what ----
function access(m) {
  const need = levelOf(m.tier);
  if (need === 0 || showTiles[m.id] || (me.loggedIn && me.level >= need)) return 'open';
  return me.loggedIn ? 'upgrade' : 'login';
}

// ---- drawing the page ----
function renderHead() {
  $('shop-name').textContent = save.shopName || 'My Workshop';
  const r = rank(save, ALL.length);
  $('rank').textContent = `${r.name} · ${r.stickers} sticker${r.stickers === 1 ? '' : 's'}`;
  $('rank').title = r.next ? `${r.next.stickers - r.stickers} more for ${r.next.name}: ${r.next.perk}` : 'Top rank';
  document.querySelectorAll('.ws-mode button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.mode === save.mode)));
  document.querySelectorAll('.perk').forEach((p) => { p.hidden = r.level < Number(p.dataset.perk); });
  $('tip').textContent = nextTip(save, ALL.length);
}

function renderBenches() {
  const root = $('benches');
  root.innerHTML = '';
  for (const b of ALL) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bench' + (save.benchesUsed.includes(b.id) ? ' used' : '');
    btn.innerHTML = `<span class="bench-sign"></span><span class="bench-prop">${propSvg(b.prop)}</span><span class="bench-top"></span><span class="bench-count"></span>`;
    btn.querySelector('.bench-sign').textContent = b.name;
    btn.querySelector('.bench-count').textContent = `${b.modelers.length} to make` + (save.benchesUsed.includes(b.id) ? ' ✓' : '');
    btn.addEventListener('click', () => openBench(b));
    root.appendChild(btn);
  }
}

function renderShelf() {
  const root = $('shelf');
  root.innerHTML = '';
  $('shelf-count').textContent = `${save.shelf.length} of ${SHELF_MAX}`;
  if (!save.shelf.length) {
    root.innerHTML = '<p class="shelf-empty">Nothing here yet. Tap a bench and make your first design.</p>';
    return;
  }
  for (const d of save.shelf) {
    const m = modelers.find((x) => x.id === d.modeler);
    const el = document.createElement('article');
    el.className = 'design';
    el.innerHTML = `<div class="design-pic"></div><h3></h3><p class="muted"></p>
      <div class="design-foot"><button type="button" class="btn" data-again>Make another</button><button type="button" class="btn quiet" data-del>Remove</button></div>`;
    const pic = el.querySelector('.design-pic');
    if (d.shot) {
      const img = new Image();
      img.alt = '';
      img.src = d.shot;
      pic.appendChild(img);
    } else {
      pic.innerHTML = propSvg(ALL.find((b) => b.id === m?.category)?.prop);
    }
    el.querySelector('h3').textContent = d.name;
    el.querySelector('p').textContent = m ? m.name : 'Retired design';
    const again = el.querySelector('[data-again]');
    if (m) again.addEventListener('click', () => { location.hash = 'make/' + m.id; });
    else again.remove();
    const del = el.querySelector('[data-del]');
    del.addEventListener('click', () => {
      // Two taps, so a stray thumb does not throw a design away.
      if (del.dataset.sure) { store(removeDesign(save, d.id)); renderAll(); return; }
      del.dataset.sure = '1';
      del.textContent = 'Tap again to remove';
      setTimeout(() => { delete del.dataset.sure; del.textContent = 'Remove'; }, 3000);
    });
    root.appendChild(el);
  }
}

function renderJobs() {
  const list = jobs(save, ALL.length);
  $('jobs-count').textContent = `${list.filter((j) => j.done).length} of ${list.length} stickers`;
  const root = $('jobs');
  root.innerHTML = '';
  for (const j of list) {
    const el = document.createElement('div');
    el.className = 'job' + (j.done ? ' done' : '');
    el.innerHTML = `<span class="sticker" aria-hidden="true">${j.done ? '★' : ''}</span><div><h3></h3><p class="muted"></p></div><span class="job-have"></span>`;
    el.querySelector('h3').textContent = j.title;
    el.querySelector('p').textContent = j.what;
    el.querySelector('.job-have').textContent = j.done ? 'Done' : `${j.have} / ${j.need}`;
    root.appendChild(el);
  }
}

function renderAll() { renderHead(); renderBenches(); renderShelf(); renderJobs(); }

// ---- bench: pick what to make ----
function openBench(b) {
  $('bench-title').textContent = b.name;
  $('bench-says').textContent = b.says;
  const root = $('bench-picks');
  root.innerHTML = '';
  // What you can open first, so a beginner never starts on a locked one.
  const sorted = [...b.modelers].sort((x, y) => (access(x) === 'open' ? 0 : 1) - (access(y) === 'open' ? 0 : 1));
  for (const m of sorted) {
    const how = access(m);
    const el = document.createElement('div');
    el.className = 'pick' + (how === 'open' ? '' : ' locked');
    el.innerHTML = `<div><h3></h3><p class="muted"></p></div><span class="pick-go"></span>`;
    el.querySelector('h3').textContent = m.name;
    const tile = showTiles[m.id];
    const from = tile ? ` From $${Math.min(...tile.prices.map((p) => p.cad))}.` : '';
    el.querySelector('p').textContent = m.tagline + from;
    const go = el.querySelector('.pick-go');
    if (how === 'open') {
      go.innerHTML = '<button type="button" class="btn primary">Make it</button>';
      go.firstChild.addEventListener('click', () => { $('bench-dialog').close(); location.hash = 'make/' + m.id; });
    } else if (how === 'upgrade') {
      go.innerHTML = `<a class="btn" href="/pricing/">🔒 ${tiers[m.tier].label} plan</a>`;
    } else {
      go.innerHTML = `<a class="btn" href="/auth/login?next=${encodeURIComponent('/workshop/#make/' + m.id)}">🔒 Log in</a>`;
    }
    root.appendChild(el);
  }
  $('bench-dialog').showModal();
}

// ---- making: the modeler in a frame ----
function route() {
  const id = (location.hash.match(/^#make\/([\w-]+)$/) || [])[1];
  const m = id && modelers.find((x) => x.id === id && x.status !== 'hidden');
  if (m && access(m) === 'open') return openMake(m);
  if (id) history.replaceState(null, '', location.pathname);
  closeMake();
}

function openMake(m) {
  if (making?.id === m.id) return;
  making = m;
  $('make-title').textContent = m.name;
  $('make-hint').hidden = save.mode !== 'kid';
  $('make-hint').textContent = 'Spool says: change the words and colours until you love it, then tap the star to keep it.';
  // replace(), not src=: that way the phone's Back button leaves the modeler in
  // one press instead of stepping through the frame's own history first.
  $('make-frame').contentWindow.location.replace(`/m/${m.id}/`);
  $('make').hidden = false;
  document.body.classList.add('making');
}

function closeMake() {
  if (!making) return;
  making = null;
  $('make').hidden = true;
  $('make-frame').contentWindow.location.replace('about:blank');
  document.body.classList.remove('making');
  renderAll();
}

// If the frame wanders off the modeler (the gate sent it to the login page, or
// a "back to all designs" link was tapped inside it), take the whole page there
// instead of showing a website inside a website.
function watchFrame() {
  $('make-frame').addEventListener('load', () => {
    if (!making) return;
    let path;
    try { path = $('make-frame').contentWindow.location.pathname; } catch (_) { return; }
    if (path && path !== 'blank' && !path.startsWith(`/m/${making.id}/`)) location.href = path;
  });
}

// The picture for the shelf: the biggest canvas in the modeler is its 3D
// preview. Shrunk to a small JPEG so a dozen of them fit on the device.
function snapshot(doc) {
  let best = null;
  let area = 0;
  doc.querySelectorAll('canvas').forEach((c) => {
    const a = c.clientWidth * c.clientHeight;
    if (a > area && c.clientWidth > 50) { area = a; best = c; }
  });
  if (!best) return '';
  try {
    const scale = Math.min(1, 360 / Math.max(1, best.width));
    const out = document.createElement('canvas');
    out.width = Math.max(1, Math.round(best.width * scale));
    out.height = Math.max(1, Math.round(best.height * scale));
    const ctx = out.getContext('2d');
    ctx.fillStyle = '#1b1d22';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.drawImage(best, 0, 0, out.width, out.height);
    // A preview that was already cleared comes out as one flat colour: no picture.
    const px = ctx.getImageData(0, 0, out.width, out.height).data;
    let varied = false;
    for (let i = 0; i < px.length; i += 4 * 97) {
      if (Math.abs(px[i] - px[0]) + Math.abs(px[i + 1] - px[1]) + Math.abs(px[i + 2] - px[2]) > 24) { varied = true; break; }
    }
    return varied ? out.toDataURL('image/jpeg', 0.72) : '';
  } catch (_) { return ''; }
}

function takePicture() {
  return new Promise((done) => {
    let win;
    let doc;
    try { win = $('make-frame').contentWindow; doc = win.document; } catch (_) { return done(''); }
    // Ask the modeler to redraw and read straight away while the frame is
    // still there; if that was blank, try once more after its next frame.
    try { win.dispatchEvent(new win.Event('resize')); } catch (_) {}
    const shot = snapshot(doc);
    if (shot) return done(shot);
    win.requestAnimationFrame(() => done(snapshot(doc)));
    setTimeout(() => done(''), 800);
  });
}

let pendingShot = '';
async function askSave() {
  if (!making) return;
  if (save.shelf.length >= SHELF_MAX) return toast(`Your shelf holds ${SHELF_MAX}. Remove one in the workshop to make room.`);
  pendingShot = await takePicture();
  $('save-shot').hidden = !pendingShot;
  $('save-noshot').hidden = !!pendingShot;
  if (pendingShot) $('save-shot').src = pendingShot;
  $('save-err').hidden = true;
  $('save-input').value = '';
  $('save-input').placeholder = `${making.name} for Mia`;
  $('save-dialog').showModal();
}

function confirmSave(ev) {
  ev.preventDefault();
  const m = making;
  if (!m) return $('save-dialog').close();
  const before = save;
  const design = { id: newId(), modeler: m.id, name: $('save-input').value, shot: pendingShot, at: Date.now() };
  let r = addDesign(before, design, m.category);
  if (!r.ok) {
    $('save-err').textContent = r.reason === 'name' ? 'Give it a name first.' : 'Your shelf is full.';
    $('save-err').hidden = false;
    return;
  }
  let note = '';
  if (!store(r.save)) {
    // No room for the picture on this device: keep the design without it.
    r = addDesign(before, { ...design, shot: '' }, m.category);
    if (!store(r.save)) {
      $('save-err').textContent = 'This device has no room left to save. Remove a design and try again.';
      $('save-err').hidden = false;
      return;
    }
    note = ' (no room for the picture)';
  }
  $('save-dialog').close();
  const won = newlyDone(before, save, ALL.length);
  if (won.length) {
    party();
    toast(`★ New sticker: ${won.map((j) => j.title).join(' + ')}! It's on your shelf${note}.`);
  } else {
    toast(`On your shelf${note}. You can still download or order it here.`);
  }
}

function newId() {
  try { return crypto.randomUUID(); } catch (_) { return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
}

// ---- little celebrations ----
let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { t.hidden = true; }, 4500);
}

function party() {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const root = $('confetti');
  const colours = ['#e5392f', '#f3b43a', '#4fc07a', '#4a8fe0', '#9a6be0'];
  for (let i = 0; i < 36; i++) {
    const bit = document.createElement('i');
    bit.style.left = Math.random() * 100 + '%';
    bit.style.background = colours[i % colours.length];
    bit.style.animationDelay = Math.random() * 0.4 + 's';
    bit.style.setProperty('--drift', (Math.random() * 160 - 80).toFixed(0) + 'px');
    root.appendChild(bit);
    setTimeout(() => bit.remove(), 2600);
  }
}

// ---- naming the workshop ----
function askName(first) {
  $('name-title').textContent = first ? 'Name your workshop' : 'Rename your workshop';
  $('name-input').value = save.shopName;
  $('name-dialog').showModal();
}

export async function boot() {
  fillChrome();
  $('spool').innerHTML = SPOOL;
  renderAll();

  $('shop-name').addEventListener('click', () => askName(false));
  $('name-form').addEventListener('submit', () => {
    store({ ...save, shopName: $('name-input').value.trim().slice(0, 24) || 'My Workshop' });
    renderHead();
  });
  document.querySelectorAll('.ws-mode button').forEach((b) => b.addEventListener('click', () => {
    store({ ...save, mode: b.dataset.mode });
    renderHead();
  }));
  document.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => b.closest('dialog').close()));
  // A tap on the dark area around a dialog closes it.
  document.querySelectorAll('dialog').forEach((d) => d.addEventListener('click', (e) => { if (e.target === d && d.id !== 'name-dialog') d.close(); }));
  $('make-back').addEventListener('click', () => { location.hash = ''; });
  $('make-save').addEventListener('click', askSave);
  $('save-form').addEventListener('submit', confirmSave);
  watchFrame();

  me = await whoAmI();
  renderAccount(me);
  try {
    const res = await fetch('/api/show', { headers: { Accept: 'application/json' } });
    const show = res.ok && (res.headers.get('content-type') || '').includes('json') ? await res.json() : null;
    if (show?.enabled) for (const t of show.tiles || []) showTiles[t.id] = t;
  } catch (_) { /* no craft show running */ }

  window.addEventListener('hashchange', route);
  route();
  if (!save.shopName && !making) askName(true);
}
