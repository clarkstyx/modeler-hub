import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { benches, newSave, cleanSave, addDesign, removeDesign, jobs, rank, newlyDone, nextTip, SHELF_MAX, RANKS } from '../src/workshop-game.js';

const manifest = JSON.parse(readFileSync(new URL('../modelers.json', import.meta.url), 'utf8'));
const all = benches(manifest.modelers);
const design = (n, modeler = 'name-keychain') => ({ id: 'd' + n, modeler, name: 'Design ' + n, shot: '', at: n });

test('every live modeler sits at exactly one bench', () => {
  const live = manifest.modelers.filter((m) => m.status !== 'hidden');
  const seated = all.flatMap((b) => b.modelers.map((m) => m.id));
  assert.deepEqual(seated.slice().sort(), live.map((m) => m.id).sort());
  for (const b of all) assert.ok(b.name && b.prop, `${b.id} has no bench look`);
});

test('a category nobody drew a bench for still gets one', () => {
  const [b] = benches([{ id: 'x', category: 'Garden', status: 'live' }]);
  assert.equal(b.name, 'Garden');
  assert.equal(b.modelers.length, 1);
});

test('saving a design fills the shelf and earns the first sticker', () => {
  const before = newSave();
  const r = addDesign(before, design(1), 'Keychains');
  assert.ok(r.ok);
  assert.equal(r.save.shelf.length, 1);
  assert.deepEqual(newlyDone(before, r.save, all.length).map((j) => j.id), ['first']);
});

test('a design needs a name, and the shelf stops at its limit', () => {
  assert.equal(addDesign(newSave(), { ...design(1), name: '   ' }, 'Home').reason, 'name');
  let s = newSave();
  for (let i = 0; i < SHELF_MAX; i++) s = addDesign(s, design(i), 'Home').save;
  assert.equal(addDesign(s, design(99), 'Home').reason, 'full');
});

test('deleting a design to make room never takes a sticker away', () => {
  let s = newSave();
  for (let i = 0; i < 3; i++) s = addDesign(s, design(i), 'Home').save;
  const stickers = rank(s, all.length).stickers;
  s = removeDesign(removeDesign(s, 'd0'), 'd1');
  assert.equal(s.shelf.length, 1);
  assert.equal(rank(s, all.length).stickers, stickers);
});

test('making something at every bench and a full shelf reaches Master', () => {
  let s = newSave();
  let n = 0;
  for (const b of all) s = addDesign(s, design(n++), b.id).save;
  assert.ok(jobs(s, all.length).find((j) => j.id === 'tour').done);
  while (s.made < SHELF_MAX) {
    if (s.shelf.length >= SHELF_MAX) s = removeDesign(s, s.shelf[0].id);
    s = addDesign(s, design(n++), all[0].id).save;
  }
  const r = rank(s, all.length);
  assert.equal(r.name, RANKS[RANKS.length - 1].name);
  assert.equal(r.next, null);
  assert.match(nextTip(s, all.length), /Master/);
});

test('a broken or old save is rebuilt instead of crashing the page', () => {
  assert.deepEqual(cleanSave(null), newSave());
  assert.deepEqual(cleanSave('nonsense'), newSave());
  const s = cleanSave({ shopName: 'x'.repeat(99), mode: 'weird', shelf: [null, { id: 'a', modeler: 'm', name: 5 }], benchesUsed: ['Home', 'Home', 7] });
  assert.equal(s.shopName.length, 24);
  assert.equal(s.mode, 'kid');
  assert.equal(s.shelf.length, 1);
  assert.equal(s.shelf[0].name, '5');
  assert.equal(s.made, 1);
  assert.deepEqual(s.benchesUsed, ['Home']);
});
