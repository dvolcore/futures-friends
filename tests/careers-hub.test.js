'use strict';
// Careers from the Futures Hub (owner decision 2026-10-11: the Hub is the system of record; hub/ATS.md "Careers feeds").
//  - FF_HUB_URL set: the open positions come from <hub>/careers/jobs.json and each one's schema.org JobPosting JSON-LD
//    (<hub>/careers/<slug>/<id>.jsonld) is embedded in the page; an application carries the opening's center so the gateway files it
//    in that center's Hub hiring desk.
//  - FF_HUB_URL empty (today): "applications open soon" (or the gateway's own list) and NO JobPosting markup at all.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const read = file => fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
const HUB = 'https://hub.example.test';
const JOB = (id, slug, extra = {}) => ({ id, title: 'TEST Lead Teacher', title_es: 'TEST Maestra principal', role: 'lead_teacher', employment_type: 'full_time', pay_min: 15, pay_max: 18.5,
  pay_unit: 'hour', description: 'Lead a threes room.', posted_on: '2026-10-01', closes_on: '2026-11-01', center: { slug, name: 'TEST Center', city: 'Kansas City', state: 'MO' },
  jsonld_url: `/careers/${slug}/${id}.jsonld`, ...extra });

function load({ hub = '', gateway = '', feed = null, view = 'jobs', arg = null, lang = 'en' } = {}) {
  const calls = [], all = [], els = { ffiJobs: { innerHTML: '' }, ffiJob: { innerHTML: '' } };
  const fetch = async (u) => {
    calls.push(u);
    const p = u.replace(HUB, '');
    if (p === '/careers/jobs.json') return feed === 'down' ? { ok: false, status: 503, json: async () => ({}) } : { ok: true, status: 200, json: async () => ({ jobs: feed || [] }) };
    const m = p.match(/^\/careers\/([a-z0-9-]+)\/([0-9a-f]{16})\.jsonld(\?lang=es)?$/);
    if (m) return { ok: true, status: 200, json: async () => ({ '@context': 'https://schema.org', '@type': 'JobPosting', title: 'TEST Lead Teacher', identifier: m[2], description: '<p>x</p>' }) };
    throw new TypeError('network down');
  };
  const document = {
    getElementById: id => els[id] || null, querySelector: () => null, addEventListener() {},
    createElement: () => { const n = { attrs: {}, setAttribute(k, v) { this.attrs[k] = v; }, remove() { all.splice(all.indexOf(n), 1); } }; return n; },
    head: { appendChild(n) { all.push(n); } },
    querySelectorAll: sel => (sel === 'script[data-ff-jobposting]' ? all.filter(n => n.attrs && 'data-ff-jobposting' in n.attrs) : []),
  };
  const context = vm.createContext({ console, setTimeout, clearTimeout, AbortController, FormData, URLSearchParams, fetch, document, view, arg, location: { search: '' },
    V: {}, KEYS: [], phero: () => '', card: () => '', go: () => {}, PHONE: '(816) 988-5661', EMAIL: 'info@example.org',
    window: { FF_INTAKE: { url: gateway }, FF_HUB_URL: hub, FFi18n: { lang }, crypto: require('node:crypto').webcrypto } });
  vm.runInContext(read('intake.js'), context, { filename: 'intake.js' });
  // the JobPosting scripts in <head> (intake.js also adds its own <style> there)
  return { api: context.window.FFIntake, context, calls, els, get head() { return all.filter(n => n.attrs && 'data-ff-jobposting' in n.attrs); } };
}
const settle = () => new Promise(r => setTimeout(r, 60));

test('FF_HUB_URL empty: "applications open soon" and no JobPosting markup, even when a gateway lists jobs', async () => {
  const t = load(); const { api, els, calls } = t;
  assert.equal(api.hubBase(), '');
  await api.loadJobs();
  await settle();
  assert.match(els.ffiJobs.innerHTML, /Online requests open soon/);
  assert.equal(t.head.length, 0, 'no JSON-LD');
  assert.equal(calls.length, 0, 'nothing is fetched');
  for (const bad of ['http://hub.example.test', 'javascript:alert(1)', ' ', 'https://x y']) assert.equal(load({ hub: bad }).api.hubBase(), '', bad);
});

test('FF_HUB_URL set: the Hub feed lists the openings and every one gets its JobPosting JSON-LD', async () => {
  const feed = [JOB('0123456789abcdef', 'test-sunrise'), JOB('fedcba9876543210', 'test-moon', { pay_min: 40000, pay_max: 40000, pay_unit: 'year' })];
  const t = load({ hub: HUB + '/', feed }); const { api, els, calls } = t;
  assert.equal(api.hubBase(), HUB);
  await api.loadJobs(true);
  await settle();
  assert.match(els.ffiJobs.innerHTML, /2 open positions/);
  assert.match(els.ffiJobs.innerHTML, /\$15 - \$18\.50 per hour/);
  assert.match(els.ffiJobs.innerHTML, /\$40000 per year/);
  assert.match(els.ffiJobs.innerHTML, /data-job="test-sunrise--0123456789abcdef"/, 'the job page knows the center');
  assert.deepEqual(calls.slice(0, 1), [HUB + '/careers/jobs.json']);
  assert.equal(t.head.length, 2);
  for (const n of t.head) {
    assert.equal(n.type, 'application/ld+json');
    assert.equal(JSON.parse(n.textContent)['@type'], 'JobPosting');
    assert.doesNotMatch(n.textContent, /</, 'no raw < inside the script element');
  }
  assert.deepEqual(t.head.map(n => n.attrs['data-ff-jobposting']).sort(), ['test-moon--fedcba9876543210', 'test-sunrise--0123456789abcdef']);
});

test('an empty Hub feed or an outage shows no postings and removes any earlier markup', async () => {
  const one = load({ hub: HUB, feed: [JOB('0123456789abcdef', 'test-sunrise')] });
  await one.api.loadJobs(true); await settle();
  assert.equal(one.head.length, 1);
  const empty = load({ hub: HUB, feed: [] });
  await empty.api.loadJobs(true); await settle();
  assert.match(empty.els.ffiJobs.innerHTML, /No positions are open right now/);
  assert.equal(empty.head.length, 0);
  one.api.clearJobLd();
  assert.equal(one.head.length, 0, 'leaving the careers pages removes the postings');
  const down = load({ hub: HUB, feed: 'down' });
  await down.api.loadJobs(true); await settle();
  assert.match(down.els.ffiJobs.innerHTML, /could not load the open positions/);
  assert.equal(down.head.length, 0);
});

test('a Hub job page embeds its own posting and the application names the center (Spanish title in Spanish)', async () => {
  const feed = [JOB('0123456789abcdef', 'test-sunrise'), JOB('fedcba9876543210', 'test-moon')];
  const t = load({ hub: HUB, gateway: 'https://gw.example.test', feed, view: 'job', arg: 'test-sunrise--0123456789abcdef', lang: 'es' });
  await t.api.loadJob();
  await settle();
  assert.match(t.els.ffiJob.innerHTML, /data-job="0123456789abcdef" data-center="test-sunrise"/);
  assert.match(t.els.ffiJob.innerHTML, /TEST Maestra principal/);
  assert.deepEqual(t.head.map(n => n.attrs['data-ff-jobposting']), ['test-sunrise--0123456789abcdef'], 'only this job\'s posting');
  assert.ok(t.calls.includes(HUB + '/careers/test-sunrise/0123456789abcdef.jsonld?lang=es'), 'the Spanish posting');
  const gone = load({ hub: HUB, gateway: 'https://gw.example.test', feed, view: 'job', arg: 'test-sunrise--1111111111111111' });
  await gone.api.loadJob(); await settle();
  assert.match(gone.els.ffiJob.innerHTML, /closed or does not exist/);
  assert.equal(gone.head.length, 0);
  const noGw = load({ hub: HUB, feed, view: 'job', arg: 'test-moon--fedcba9876543210' });
  await noGw.api.loadJob(); await settle();
  assert.match(noGw.els.ffiJob.innerHTML, /Online requests open soon/, 'listed from the Hub; applying waits for the gateway');
  assert.doesNotMatch(noGw.els.ffiJob.innerHTML, /<form/);
});

test('the shipped hub-config keeps FF_HUB_URL empty until go-live, so the live site shows no JobPosting markup', () => {
  assert.match(read('hub-config.js'), /window\.FF_HUB_URL = '';/);
  assert.doesNotMatch(read('jobs.html'), /application\/ld\+json[^<]*JobPosting|"@type":"JobPosting"/, 'no prerendered posting');
});
