#!/usr/bin/env node
// Pull every modeler listed in modelers.json, build it, and drop the built
// site into public/m/<id>/ so the hub can serve it at /m/<id>/.
//
//   node scripts/pull.mjs                 all modelers
//   node scripts/pull.mjs name-keychain   just one (by id)
//   node scripts/pull.mjs --keep          keep each repo's node_modules
//   node scripts/pull.mjs --no-fetch      don't git pull, just rebuild
//
// Private repos: set MODELER_PAT (a GitHub token with read access) and the
// script uses it for cloning. Locally your normal git credentials work too.
//
// Local modelers: an entry with "path" (e.g. "modelers/cookie-cutter") instead of
// "repo" is built straight from that folder inside this repo. Nothing is cloned.
// Moving one to its own repo later is a one-line change in modelers.json.
//
// Also copies each repo's README.md, CLAUDE.md and .claude/skills/* into the
// hub so Claude sessions in this repo know every modeler's conventions.

import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, rmSync, cpSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
// Read as a plain file: import() of a Windows path like D:\... fails ("Received protocol 'd:'").
const manifest = JSON.parse(readFileSync(join(ROOT, 'modelers.json'), 'utf8'));

const args = process.argv.slice(2);
const keep = args.includes('--keep');
const noFetch = args.includes('--no-fetch');
const only = args.filter((a) => !a.startsWith('--'));
const list = manifest.modelers.filter((m) => !only.length || only.includes(m.id));

const REPOS = join(ROOT, 'vendor', 'repos');
const SKILLS = join(ROOT, '.claude', 'skills');
const DOCS = join(ROOT, 'vendor', 'docs');
mkdirSync(REPOS, { recursive: true });
mkdirSync(DOCS, { recursive: true });

const sh = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: 'inherit', env: { ...process.env, CI: '1' } });

function cloneUrl(repo) {
  const pat = process.env.MODELER_PAT;
  return pat ? `https://x-access-token:${pat}@github.com/${repo}.git` : `https://github.com/${repo}.git`;
}

const results = [];
for (const m of list) {
  const local = !!m.path;
  const dir = local ? join(ROOT, m.path) : join(REPOS, m.id);
  console.log(`\n=== ${m.name} (${local ? m.path : m.repo}) → /m/${m.id}/`);
  try {
    if (local) {
      if (!existsSync(join(dir, 'package.json'))) throw new Error(`local modeler folder ${m.path} has no package.json`);
    } else if (!existsSync(join(dir, '.git'))) {
      sh(`git clone --depth 1 ${cloneUrl(m.repo)} "${dir}"`);
    } else if (!noFetch) {
      sh('git fetch --depth 1 origin && git reset --hard origin/HEAD', dir);
    }

    // install + build. `npm ci` when there is a lockfile, else `npm install`.
    sh(existsSync(join(dir, 'package-lock.json')) ? 'npm ci --no-audit --no-fund' : 'npm install --no-audit --no-fund', dir);
    const out = join(ROOT, 'public', 'm', m.id);
    rmSync(out, { recursive: true, force: true });
    // vite directly: every modeler is a Vite app, and --base makes the built
    // asset paths correct under /m/<id>/ even for repos without base './'.
    sh(`npx vite build --base=/m/${m.id}/ --outDir="${out}" --emptyOutDir`, dir);

    // docs + skills for Claude sessions in this repo
    const docDir = join(DOCS, m.id);
    rmSync(docDir, { recursive: true, force: true });
    mkdirSync(docDir, { recursive: true });
    for (const f of ['README.md', 'CLAUDE.md']) {
      if (existsSync(join(dir, f))) cpSync(join(dir, f), join(docDir, f));
    }
    const skillsDir = join(dir, '.claude', 'skills');
    if (existsSync(skillsDir)) {
      for (const s of readdirSync(skillsDir)) {
        const dest = join(SKILLS, `${m.id}--${s}`);
        rmSync(dest, { recursive: true, force: true });
        cpSync(join(skillsDir, s), dest, { recursive: true });
      }
    }
    // the OpenSCAD mirror for MakerWorld, when the repo has one
    if (m.scad && existsSync(join(dir, m.scad))) {
      cpSync(join(dir, m.scad), join(docDir, 'makerworld', m.scad.split('/').pop()), { recursive: true });
    }

    if (!keep && !local) rmSync(join(dir, 'node_modules'), { recursive: true, force: true });
    const sha = execSync('git rev-parse --short HEAD', { cwd: dir }).toString().trim();
    results.push({ id: m.id, ok: true, sha });
  } catch (e) {
    console.error(`!! ${m.id} failed: ${e.message}`);
    results.push({ id: m.id, ok: false, error: e.message });
  }
}

writeFileSync(join(ROOT, 'public', 'build-info.json'), JSON.stringify({ builtAt: new Date().toISOString(), results }, null, 2));
console.log('\nSummary:');
for (const r of results) console.log(`  ${r.ok ? 'ok ' : 'FAIL'} ${r.id}${r.sha ? ' @ ' + r.sha : ''}`);
if (results.some((r) => !r.ok)) process.exit(1);
