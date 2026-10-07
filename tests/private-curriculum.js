// IP lockdown (owner decision 2026-10-07): the full curriculum (unit data, prep and family-week data, the Learning Steps crosswalk and
// the printables) lives in the PRIVATE platform repo, not in this public site. Tests that check that content read it from there:
//   FF_CURRICULUM_PRIVATE (default /Volumes/FFCRM/app/hub/content/curriculum-assets)/data/<file> and .../files/printables/...
// and are skipped, with the reason, on a machine where the private repo is not mounted. tests/ip-lockdown.test.js proves none of it is
// in the site.
const fs = require('node:fs');
const path = require('node:path');

const PRIV = process.env.FF_CURRICULUM_PRIVATE || '/Volumes/FFCRM/app/hub/content/curriculum-assets';
const dataPath = f => path.join(PRIV, 'data', f);
const filePath = f => path.join(PRIV, 'files', f);
const has = f => fs.existsSync(dataPath(f));
const readPriv = f => fs.readFileSync(dataPath(f), 'utf8');
// skip reason for a test that needs these private data files, or false when they are all here
const skipUnless = (...files) => (files.every(has) ? false : `private curriculum not mounted (${PRIV}): needs ${files.join(', ')}`);
// wraps node:test's test() so every test in a file is skipped (with the reason) when the private files are missing
function gated(test, ...files) {
  const skip = skipUnless(...files);
  return (name, opts, fn) => {
    if (typeof opts === 'function') { fn = opts; opts = {}; }
    return test(name, skip ? Object.assign({}, opts, { skip }) : opts, fn);
  };
}
module.exports = { PRIV, dataPath, filePath, has, readPriv, skipUnless, gated };
