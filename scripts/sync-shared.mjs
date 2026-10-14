// Copies the shared engine code in packages/geometry/src/ into every local
// modeler that has opted in (has a src/shared/ folder), so each modeler stays
// a standalone Vite app that can move to its own repository.
//
//   npm run sync-shared            # write the copies
//   npm run sync-shared -- --check # only report copies that differ (used by npm test)
//
// Edit packages/geometry/src/, never a copy: the copies carry a GENERATED header.
import { existsSync, readdirSync, readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'packages/geometry/src');
const check = process.argv.includes('--check');

const header = (f) => `// GENERATED from packages/geometry/src/${f} by \`npm run sync-shared\` in the hub. Edit the source there, not this copy.\n`;
const sources = readdirSync(SRC).filter((f) => f.endsWith('.ts')).sort();
const targets = readdirSync(join(ROOT, 'modelers'))
  .map((d) => join(ROOT, 'modelers', d, 'src/shared'))
  .filter((d) => existsSync(d));

const problems = [];
for (const dir of targets) {
  const rel = dir.slice(ROOT.length + 1);
  for (const f of sources) {
    const want = header(f) + readFileSync(join(SRC, f), 'utf8');
    const path = join(dir, f);
    const have = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (have === want) continue;
    if (check) problems.push(`${rel}/${f} ${have === null ? 'is missing' : 'differs from packages/geometry/src/' + f}`);
    else { writeFileSync(path, want); console.log(`wrote ${rel}/${f}`); }
  }
  for (const f of readdirSync(dir)) {
    if (sources.includes(f)) continue;
    if (check) problems.push(`${rel}/${f} is not in packages/geometry/src/`);
    else { unlinkSync(join(dir, f)); console.log(`removed ${rel}/${f}`); }
  }
}
if (check && problems.length) {
  console.error('Shared code is out of sync. Run `npm run sync-shared`.\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`${check ? 'checked' : 'synced'} ${sources.length} files into ${targets.length} modeler(s)`);
