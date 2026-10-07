#!/usr/bin/env node
// Builds release-manifest.js (the site's copy of the release asset manifest) and ASSET_MANIFEST.md from the CRM repo's
// docs/release/ASSET_MANIFEST.json, the single source of what a buyer can receive.
//   node tools/build-release-manifest.mjs /Volumes/FFCRM/app/docs/release/ASSET_MANIFEST.json
// Only public fields reach the site; owner notes, file paths and checklist ids stay in the CRM repo.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const src = process.argv[2];
if (!src) { console.error('usage: node tools/build-release-manifest.mjs <path to ASSET_MANIFEST.json>'); process.exit(2); }
const m = JSON.parse(fs.readFileSync(src, 'utf8'));
const APPROVAL = ['not_started', 'draft', 'internally_complete', 'externally_approved'];
const AVAIL = ['available_now', 'in_development', 'coming_later'];
const ids = new Set();
for (const a of m.assets) {
  if (ids.has(a.id)) throw new Error('duplicate asset id ' + a.id);
  ids.add(a.id);
  if (!APPROVAL.includes(a.approval_status)) throw new Error(`${a.id}: bad approval_status ${a.approval_status}`);
  if (!AVAIL.includes(a.availability)) throw new Error(`${a.id}: bad availability ${a.availability}`);
}
for (const [k, p] of Object.entries(m.packages)) for (const [label, id] of p.items) if (!ids.has(id)) throw new Error(`package ${k}: "${label}" maps to unknown asset ${id}`);
const byId = Object.fromEntries(m.assets.map(a => [a.id, a]));
for (const a of m.assets) {
  if (a.availability === 'available_now' && !(Array.isArray(a.delivers_today) && a.delivers_today.length)) throw new Error(`${a.id}: available_now needs delivers_today (the exact files or pages)`);
  if (a.availability !== 'available_now' && a.delivers_today) throw new Error(`${a.id}: only available_now assets deliver anything today`);
}
// Commercial block (E1/E2/E9): the status strip, the proposed launch package, annual-bundle terms and the shared coverage rules.
const C = m.commercial;
if (!C) throw new Error('commercial block missing');
const need = (id, where) => { if (!ids.has(id)) throw new Error(`${where}: unknown asset ${id}`); return byId[id]; };
for (const [label, id] of C.strip.available_now) if (need(id, 'strip.available_now').availability !== 'available_now') throw new Error(`strip: "${label}" is not available now`);
for (const [label, id] of C.strip.planned) if (need(id, 'strip.planned').availability === 'available_now') throw new Error(`strip: "${label}" is available now, not planned`);
const LP = C.launch_package, launchIds = new Set([...LP.items, ...LP.optional].map(([, id]) => id));
for (const [label, id] of C.strip.at_launch) { need(id, 'strip.at_launch'); if (!launchIds.has(id)) throw new Error(`strip: "${label}" is not in the launch package`); }
for (const [label, id] of [...LP.items, ...LP.optional]) { const a = need(id, 'launch_package'); if (a.availability !== 'available_now' && a.family !== 'service') throw new Error(`launch package: "${label}" is neither available now nor a service delivered at signing`); }
for (const id of LP.excludes) if (launchIds.has(need(id, 'launch_package.excludes').id)) throw new Error(`launch package both includes and excludes ${id}`);
for (const p of LP.prices) { need(p.asset, 'launch_package.prices'); if (!launchIds.has(p.asset) || !(p.amount > 0) || !p.source) throw new Error(`launch price ${p.label}: needs an included asset, an amount and an owner-document source`); }
if (LP.status !== 'proposed' || LP.label !== C.price_label) throw new Error('the launch package stays labelled as a proposal until the owner confirms it');
for (const id of C.annual.depends_on) if (need(id, 'annual.depends_on').availability === 'available_now') throw new Error(`annual bundle "depends on" ${id}, which is already available`);
for (const k of Object.keys(C.package_terms)) if (k !== 'store' && !m.packages[k]) throw new Error(`package_terms: unknown package ${k}`);
for (const k of Object.keys(m.packages)) if (!C.package_terms[k]) throw new Error(`package ${k} has no start and recurring-billing terms`);

// ---------------------------------------------------------------- release-manifest.js
const pick = a => ({ id: a.id, family: a.family, name: a.name, count: a.count, version: a.version, age: a.age_band,
  approval: a.approval_status, availability: a.availability, note: a.buyer_note, ...(a.feature_state ? { feature: a.feature_state } : {}),
  ...(a.delivers_today ? { delivers: a.delivers_today } : {}) });
const out = {
  version: m.version, generated: m.generated,
  assets: Object.fromEntries(m.assets.map(a => [a.id, pick(a)])),
  packages: m.packages,
  commercial: { ...C, launch_package: Object.fromEntries(Object.entries(C.launch_package).filter(([k]) => k !== 'owner_questions')) },
  screenTime: Object.fromEntries(Object.entries(m.screen_time).filter(([k]) => !['external_guidance_verified', 'accessed'].includes(k))),
  guidance: m.screen_time.external_guidance_verified.map(g => ({ body: g.body, url: g.url, says: g.says })), accessed: m.screen_time.accessed
};
const js = `/* GENERATED by tools/build-release-manifest.mjs from the CRM repo's docs/release/ASSET_MANIFEST.json (${m.version}).
   Do not edit by hand: change the JSON and rebuild. Read by release-truth.js and pricing-all-in.js. */
(function (data) {
  if (typeof window !== 'undefined') window.FFReleaseData = data;
  if (typeof module !== 'undefined' && module.exports) module.exports = data;
})(${JSON.stringify(out, null, 1)});
`;
const site = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
fs.writeFileSync(path.join(site, 'release-manifest.js'), js);

// ---------------------------------------------------------------- ASSET_MANIFEST.md
const W = { not_started: 'Not started', draft: 'Draft', internally_complete: 'Internally complete', externally_approved: 'Externally approved',
  available_now: 'Available now', in_development: 'In development', coming_later: 'Coming later' };
const cell = s => String(s == null ? '' : s).replace(/\|/g, '\\|').replace(/\n/g, ' ');
const count = (k, v) => m.assets.filter(a => a[k] === v).length;
const L = [];
L.push(`# ${m.title}`, '', `Version ${m.version}, ${m.generated}. ${m.ticket}.`, '',
  'Generated from `ASSET_MANIFEST.json` by `tools/build-release-manifest.mjs` in the website repo. Edit the JSON, not this file.', '', '## Rules', '');
for (const r of m.rules) L.push(`- ${r}`);
L.push('', '## Counts', '', '| Approval status | Assets |', '|---|---|');
for (const s of APPROVAL) L.push(`| ${W[s]} | ${count('approval_status', s)} |`);
L.push('', '| Availability to a buyer today | Assets |', '|---|---|');
for (const s of AVAIL) L.push(`| ${W[s]} | ${count('availability', s)} |`);
L.push(`| **Total** | **${m.assets.length}** |`, '');
L.push('## Screen time: scheduled minutes are not a ceiling', '');
for (const [k, v] of Object.entries(m.screen_time)) if (v && v.label) L.push(`- **${v.label}: ${v.value} ${v.unit}.** ${v.definition} Applies to: ${v.applies_to || 'children through age 2'}. Source: ${v.source}`);
L.push('', `External guidance checked ${m.screen_time.accessed}:`, '');
for (const g of m.screen_time.external_guidance_verified) L.push(`- [${g.body}](${g.url}): ${g.says} *${g.status}.*`);
L.push('', '## Packages (one scope for the site, quotes, teacher packet and onboarding)', '');
for (const [k, p] of Object.entries(m.packages)) {
  L.push(`### ${p.name} (\`${k}\`)`, '', `Source: ${p.source}`, '', '| Item | Asset | Availability | Approval |', '|---|---|---|---|');
  for (const [label, id] of p.items) { const a = m.assets.find(x => x.id === id); L.push(`| ${cell(label)} | \`${id}\` | ${W[a.availability]} | ${W[a.approval_status]} |`); }
  L.push('');
}
L.push('## Commercial terms (E1, E2, E9)', '', `Price label: **${C.price_label}**. Price basis: ${C.price_basis}. Ordering open: ${C.ordering_open ? 'yes' : 'no'}.`, '',
  `### Status strip: ${C.strip.title}`, '');
for (const [k, h] of [['available_now', 'Available now'], ['at_launch', 'Included at launch'], ['planned', 'Planned']]) {
  L.push(`**${h}**: ${C.strip.definitions[k]}`, '');
  for (const [label, id] of C.strip[k]) L.push(`- ${label} (\`${id}\`)`);
  L.push('');
}
L.push(`### ${C.launch_package.name} (${C.launch_package.label})`, '', `For: ${C.launch_package.who}.`, '');
for (const [label, id] of C.launch_package.items) L.push(`- ${label} (\`${id}\`, ${W[byId[id].availability]})`);
for (const [label, id] of C.launch_package.optional) L.push(`- Optional: ${label} (\`${id}\`)`);
L.push('', '| Price line | Amount | Source |', '|---|---|---|');
for (const p of C.launch_package.prices) L.push(`| ${cell(p.label)} | ${p.amount} dollars ${p.unit} | ${cell(p.source)} |`);
L.push('', `- ${C.launch_package.free}`, `- Start: ${C.launch_package.start}`, `- Billing: ${C.launch_package.billing}`,
  `- Not included: ${C.launch_package.excludes.map(id => byId[id].name).join('; ')}.`, '', 'Owner questions:', '');
for (const q of C.launch_package.owner_questions) L.push(`- ${q}`);
L.push('', `### ${C.annual.name}`, '', `- Start: ${C.annual.start}`, `- ${C.annual.catalog_terms}`, `- ${C.annual.proposed_billing}`,
  `- Depends on unfinished work: ${C.annual.depends_on.map(id => `${byId[id].name} (${W[byId[id].availability]})`).join('; ')}.`, '',
  '### Start and recurring billing by package', '', '| Package | Start | Recurring billing |', '|---|---|---|');
for (const [k, t] of Object.entries(C.package_terms)) L.push(`| \`${k}\` | ${cell(t.start === 'annual' ? C.annual.start : t.start)} | ${cell(t.recurring === 'annual' ? C.annual.proposed_billing : t.recurring)} |`);
L.push('', '### Coverage rules (the calculator and the written quote use the same list)', '');
for (const r of C.coverage) L.push(`- ${r}`);
L.push('');
const fams = [...new Set(m.assets.map(a => a.family))];
L.push('## Assets', '');
for (const f of fams) {
  L.push(`### ${f}`, '', '| Id | Asset | Count | Owner | Source and rights | Version | Ages | Approval | Availability | Format | Buyer receives it | Evidence |', '|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const a of m.assets.filter(x => x.family === f)) {
    const s = a.source;
    const rights = `Creator: ${s.creator}. AI: ${s.ai}. License: ${s.license}. Chain of title: ${s.chain_of_title}.`;
    L.push(`| \`${a.id}\` | ${cell(a.name)} | ${a.count} | ${cell(a.owner_role)} | ${cell(rights)} | ${cell(a.version)} | ${cell(a.age_band)} | ${W[a.approval_status]}${a.owner_signoff ? ' (owner signed)' : ''}${a.feature_state ? ` · ${a.feature_state.replace(/_/g, ' ')}` : ''} | ${W[a.availability]} | ${cell(a.delivery_format)} | ${cell(a.buyer_receives)} | ${cell(a.approval_evidence)}${a.checklist.length ? ` (checklist ${a.checklist.join(', ')})` : ''} |`);
  }
  L.push('');
}
fs.writeFileSync(path.join(path.dirname(src), 'ASSET_MANIFEST.md'), L.join('\n') + '\n');
console.log(`release-manifest.js and ASSET_MANIFEST.md written: ${m.assets.length} assets, ${Object.keys(m.packages).length} packages`);
