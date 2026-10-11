// The website's CI test run (tools/ci/site-tests.yml, installed into .github/workflows by the owner: tools/ci/README.md): every tests/*.test.js that needs no browser and no local services.
// Browser files (Playwright via the platform repo's hub/node_modules, the axe harness, tools/site-e2e.mjs, tools/site-map.mjs) run
// locally (`node --test tests/`) where Chromium and the platform repo are present. `node tools/ci-tests.mjs --list` prints the split.
import { readdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BROWSER = /a11y-harness|loadChromium|chromium|playwright|tools\/site-e2e|tools\/site-map\.mjs/;
const files = readdirSync(join(ROOT, 'tests')).filter((f) => f.endsWith('.test.js')).sort();
const unit = files.filter((f) => !BROWSER.test(readFileSync(join(ROOT, 'tests', f), 'utf8')));
if (process.argv.includes('--list')) {
  console.log(`no browser (${unit.length}):\n  ${unit.join('\n  ')}\nbrowser / local only (${files.length - unit.length}):\n  ${files.filter((f) => !unit.includes(f)).join('\n  ')}`);
  process.exit(0);
}
const r = spawnSync(process.execPath, ['--test', '--test-concurrency=4', ...unit.map((f) => join('tests', f))], { cwd: ROOT, stdio: 'inherit' });
process.exit(r.status ?? 1);
