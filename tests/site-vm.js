// Shared harness for the pricing, talk-card and caption tests: loads the site scripts in index.html order into one VM
// (window is the global, as in a browser) and renders a route to an HTML string.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
const read = f => fs.readFileSync(path.join(ROOT, f), 'utf8');
const FILES = ['data.js', 'captions.js', 'plush-cast.js', 'supporting-cast.js', 'brand-art.js', 'views.js', 'talk-cards.js', 'features.js', 'store.js', 'release-manifest.js', 'pricing-all-in.js', 'release-truth.js', 'family-library-data.js', 'family-library.js'];

function site({ before } = {}) {
  const el = () => ({ style: {}, classList: { add() {}, remove() {}, toggle() {} }, setAttribute() {}, appendChild() {}, addEventListener() {}, querySelector: () => null, querySelectorAll: () => [] });
  const sb = {
    console, setTimeout: () => 0, clearTimeout() {}, setInterval: () => 0, clearInterval() {}, innerHeight: 800, innerWidth: 1280, FormData, URLSearchParams,
    location: { hostname: 'example.org', hash: '' }, navigator: {}, matchMedia: () => ({ matches: false, addEventListener() {} }),
    FFhooks: [], FF_INTAKE: { url: '' },
    document: { addEventListener() {}, getElementById: () => null, createElement: el, head: { appendChild() {} }, body: el(), documentElement: { dataset: {} }, querySelector: () => null, querySelectorAll: () => [] }
  };
  sb.window = sb;
  const context = vm.createContext(sb);
  for (const f of FILES) {
    vm.runInContext(read(f), context, { filename: f });
    if (before && before[f]) before[f](context);
  }
  context.render = (route, a) => vm.runInContext(`arg = ${JSON.stringify(a == null ? null : a)}; V[${JSON.stringify(route)}]()`, context);
  return context;
}
const text = html => html.replace(/<[^>]+>/g, ' ').replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

module.exports = { site, read, text, ROOT };
