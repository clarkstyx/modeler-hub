// The Workshop's rules, with no page code in it so `npm test` can run it in Node.
// The Workshop is the playful way into the modelers: a room of benches (one per
// category in modelers.json), a shelf of the designs you made, and a job board
// that hands out stickers. Everything is kept on the visitor's own device.

export const SAVE_KEY = 'vm-workshop';
export const SHELF_MAX = 12;

// How each category shows up as a bench. A category that is not listed here
// still gets a bench (see benchFor), so a new category never disappears.
const BENCH_LOOK = {
  Keychains: { name: 'Keychain bench', prop: 'keychain', says: 'Names, charms and clip-ons.' },
  'Tags & signs': { name: 'Sign wall', prop: 'sign', says: 'Name tags and desk signs.' },
  Home: { name: 'Home shelf', prop: 'box', says: 'Boxes, trays and labels.' },
  Kitchen: { name: 'Kitchen counter', prop: 'cutter', says: 'Cookie cutters in any shape.' },
  Seasonal: { name: 'Holiday corner', prop: 'ornament', says: 'Ornaments, toppers and tags.' },
  Toys: { name: 'Toy box', prop: 'spinner', says: 'Things that spin and click.' },
};

export function benchFor(category) {
  const look = BENCH_LOOK[category] || { name: category, prop: 'box', says: '' };
  return { id: category, ...look };
}

export function benches(modelers) {
  const live = modelers.filter((m) => m.status !== 'hidden');
  return [...new Set(live.map((m) => m.category))].map((cat) => ({
    ...benchFor(cat),
    modelers: live.filter((m) => m.category === cat),
  }));
}

export function newSave() {
  return { v: 1, shopName: '', mode: 'kid', shelf: [], made: 0, benchesUsed: [] };
}

// Anything can be in localStorage (an old version, a half-written value), so
// rebuild a clean save from whatever was found instead of trusting it.
export function cleanSave(raw) {
  const s = newSave();
  if (!raw || typeof raw !== 'object') return s;
  if (typeof raw.shopName === 'string') s.shopName = raw.shopName.slice(0, 24);
  if (raw.mode === 'kid' || raw.mode === 'maker') s.mode = raw.mode;
  if (Array.isArray(raw.shelf)) {
    s.shelf = raw.shelf
      .filter((d) => d && typeof d.id === 'string' && typeof d.modeler === 'string')
      .slice(0, SHELF_MAX)
      .map((d) => ({
        id: d.id,
        modeler: d.modeler,
        name: String(d.name || '').slice(0, 30),
        shot: typeof d.shot === 'string' ? d.shot : '',
        at: Number(d.at) || 0,
      }));
  }
  s.made = Math.max(Number(raw.made) || 0, s.shelf.length);
  if (Array.isArray(raw.benchesUsed)) s.benchesUsed = [...new Set(raw.benchesUsed.filter((b) => typeof b === 'string'))];
  return s;
}

// Puts a design on the shelf. Returns { ok, save } or { ok: false, reason }.
// `made` and `benchesUsed` only ever grow, so deleting a design to make room
// never takes a sticker away.
export function addDesign(save, design, category) {
  if (save.shelf.length >= SHELF_MAX) return { ok: false, reason: 'full' };
  const name = String(design.name || '').trim().slice(0, 30);
  if (!name) return { ok: false, reason: 'name' };
  const entry = { id: design.id, modeler: design.modeler, name, shot: design.shot || '', at: design.at || 0 };
  return {
    ok: true,
    save: {
      ...save,
      shelf: [entry, ...save.shelf],
      made: save.made + 1,
      benchesUsed: [...new Set([...save.benchesUsed, category])],
    },
  };
}

export function removeDesign(save, id) {
  return { ...save, shelf: save.shelf.filter((d) => d.id !== id) };
}

// The job board. `need` is how many it takes, `have` reads the progress.
export function jobs(save, benchCount) {
  const used = save.benchesUsed.length;
  const list = [
    { id: 'first', title: 'First make', what: 'Put your first design on the shelf.', need: 1, have: save.made },
    { id: 'pair', title: 'Two benches', what: 'Make something at two different benches.', need: Math.min(2, benchCount), have: used },
    { id: 'trio', title: 'On a roll', what: 'Make three designs.', need: 3, have: save.made },
    { id: 'tour', title: 'Grand tour', what: 'Make something at every bench.', need: benchCount, have: used },
    { id: 'six', title: 'Busy workshop', what: 'Make six designs.', need: 6, have: save.made },
    { id: 'dozen', title: 'Full shelf', what: `Make ${SHELF_MAX} designs.`, need: SHELF_MAX, have: save.made },
  ];
  return list.map((j) => ({ ...j, have: Math.min(j.have, j.need), done: j.need > 0 && j.have >= j.need }));
}

export const RANKS = [
  { stickers: 0, name: 'Apprentice', perk: '' },
  { stickers: 2, name: 'Maker', perk: 'Tools on the wall' },
  { stickers: 4, name: 'Pro', perk: 'String lights' },
  { stickers: 6, name: 'Master', perk: 'The gold trophy' },
];

export function rank(save, benchCount) {
  const stickers = jobs(save, benchCount).filter((j) => j.done).length;
  let level = 0;
  RANKS.forEach((r, i) => { if (stickers >= r.stickers) level = i; });
  return { level, stickers, ...RANKS[level], next: RANKS[level + 1] || null };
}

// Which jobs were finished by going from `before` to `after` (for the party).
export function newlyDone(before, after, benchCount) {
  const was = new Set(jobs(before, benchCount).filter((j) => j.done).map((j) => j.id));
  return jobs(after, benchCount).filter((j) => j.done && !was.has(j.id));
}

// What the helper says next. Short, one thing to do.
export function nextTip(save, benchCount) {
  const todo = jobs(save, benchCount).find((j) => !j.done);
  if (!save.made) return 'Tap a bench to pick what to make. When you like it, put it on your shelf.';
  if (!todo) return 'Every sticker earned. This workshop is yours, Master.';
  const left = todo.need - todo.have;
  return `Next sticker: ${todo.title}. ${todo.what} ${left} to go.`;
}
