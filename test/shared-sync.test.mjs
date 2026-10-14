import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('modelers carry an unchanged copy of packages/geometry', () => {
  const r = spawnSync(process.execPath, ['scripts/sync-shared.mjs', '--check'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
});
