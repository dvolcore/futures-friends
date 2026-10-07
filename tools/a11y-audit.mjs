// Runs axe-core on EVERY route in route-meta.js (plus the argument routes in tests/a11y-harness.mjs) at 1280 and 390 px, with reduced
// motion on so in-progress fades cannot cause false contrast failures, and prints violations per route and size.
//   node tools/a11y-audit.mjs [--root <folder>] [--out <file.json>] [--only <regex>]
// --root audits another checkout (for before/after counts). Needs playwright-core (see tests/a11y-harness.mjs).
import { writeFileSync } from 'node:fs';
import { EXTRA_ROUTES, SITE, axe, goto, loadChromium, open, routeList, startSite } from '../tests/a11y-harness.mjs';

const arg = (name) => { const i = process.argv.indexOf(name); return i > -1 ? process.argv[i + 1] : null; };
const root = arg('--root') || SITE, out = arg('--out'), only = arg('--only') ? new RegExp(arg('--only')) : null;
const site = await startSite(root);
const browser = await loadChromium().launch();
const result = {};
for (const width of [1280, 390]) {
  const { ctx, page } = await open(browser, width);
  await page.goto(`${site.base}?fresh=a11y#home`);
  const routes = [...(await routeList(page)), ...EXTRA_ROUTES].filter((r) => !only || only.test(r));
  for (const route of routes) {
    await goto(page, site.base, route, 500);
    const v = await axe(page);
    result[`${route}@${width}`] = v;
    const sc = v.filter((x) => ['serious', 'critical'].includes(x.impact)).reduce((a, x) => a + x.n, 0), all = v.reduce((a, x) => a + x.n, 0);
    console.log(`${route}@${width}\tserious/critical ${sc}\tall ${all}\t${v.map((x) => `${x.id}(${x.impact[0]}${x.n})`).join(' ')}`);
  }
  await ctx.close();
}
await browser.close(); await site.close();
if (out) writeFileSync(out, JSON.stringify(result, null, 1));
