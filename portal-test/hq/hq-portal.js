// The HQ / owner network portal at /hq (hub/HQ_PORTAL.md): the owner's view across every center, on the shared dashboard shell
// (ff-shell.js: rail, tabs, drawer, the one-at-a-time neon count-up) with the official grown-up cast on the hero.
//   Network      the hero, the "Needs HQ attention" band, six KPI rings, every center with its health score
//   Centers      list · lifecycle (onboarding / active / paused / closed) · license tiers; a center opens its operational summary
//   Quality      licensing countdowns · drills · staff credentials · inspection readiness
//   Curriculum   who adopted which update · publish an update to all or selected centers · the content review pipeline
//   Insights     de-identified Kids' corner totals (at least 5 children per figure; 1 to 4 hidden)
//   Break-glass  grants (live / waiting / past) · "Request emergency access" (never open by default) · the audit log
//   Settings     network users · roles · alert routing · the portal's character
// Every figure comes from the HQ functions of migration 20261031600000_hq_portal.sql (HQ at two-step only, audited). No tenant money and
// no child row is ever asked for: the database decides, this page only shows what it returns. The classic table stays at /hq?classic=1.
import { createShell, icon, glowRingSvg, glowBarHtml, countHtml, figureHtml, tableHtml } from './ff-shell.js';
import { CHARACTER, adultSrc, adultImg } from './ff-cast.js';   // the grown-up cast (one table, shared with every dashboard)
import * as H from './hq-core.js';
import { motionOn } from './family-scene.js';

export function mountHq({ esc, rpc, page, friendly, go, live, getLang }) {
  let cssLoad = null;
  function ensureCss() {   // the portal's own stylesheet, added once (index.html stays untouched)
    if (cssLoad) return cssLoad;
    if (document.querySelector('link[href="hq-portal.css"]')) return (cssLoad = Promise.resolve());
    const l = document.createElement('link');
    l.rel = 'stylesheet'; l.href = 'hq-portal.css';
    cssLoad = new Promise((res) => { l.onload = res; l.onerror = res; setTimeout(res, 2000); });
    document.head.appendChild(l);
    return cssLoad;
  }
  const getChar = () => { try { return H.pickCharacter(localStorage.getItem(H.HQ_CHARACTER_KEY)); } catch { return H.HQ_CHARACTER_DEFAULT; } };
  const setChar = (v) => { try { localStorage.setItem(H.HQ_CHARACTER_KEY, H.pickCharacter(v)); } catch { /* private mode */ } };
  const src = async (f) => { try { return { ok: true, data: await f() }; } catch (e) { return { ok: false, error: e }; } };
  // the first loads try once more after a pause when the hub is briefly unavailable (503 / schema cache reload); a refusal (42501) is final
  const srcRetry = async (f) => { const r = await src(f); if (r.ok || r.error?.code === '42501') return r; await new Promise((ok) => setTimeout(ok, 1500)); return src(f); };

  async function viewHq(s) {
    if (!s) return go('/', true);
    const lang = getLang() === 'es' ? 'es' : 'en';
    const S = H.hw(lang);
    const loc = lang === 'es' ? 'es-US' : 'en-US';
    const dfmt = (iso, o = { month: 'short', day: 'numeric', year: 'numeric' }) => (iso ? new Date(`${String(iso).slice(0, 10)}T12:00:00Z`).toLocaleDateString(loc, { ...o, timeZone: 'UTC' }) : '—');
    const tfmt = (iso) => (iso ? new Date(iso).toLocaleString(loc, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
    const host = (inner) => `<div class="wrap ffs-host hq-host" id="hqSpace">${inner}</div>`;
    const hostUp = () => document.body.classList.add('fp-fam', 'ffs-staff');
    await ensureCss();
    page(host(`<div class="ffs ffs-loading" id="hq" aria-busy="true"><p class="ffs-sr" role="status">${esc(S.loading)}</p><div class="ffs-stage">
      <h1 class="ffs-title">${esc(S.title)}</h1><div class="ffs-sk ffs-sk-hero" aria-hidden="true"></div><div class="ffs-sk-row" aria-hidden="true">${'<div class="ffs-sk ffs-sk-kpi"></div>'.repeat(4)}</div></div></div>`), S.title);
    hostUp();

    const list = await srcRetry(() => rpc('hq_portal_centers'));
    if (!list.ok) {
      page(host(`<div class="ffs" id="hq"><div class="ffs-stage"><section class="ffs-card hq-denied"><h1 class="ffs-title">${esc(S.title)}</h1>
        <p class="msg bad" role="alert">${esc(friendly(list.error))}</p><p>${esc(S.notHq)}</p></section></div></div>`), S.title);
      return hostUp();
    }
    const all = list.data || [];
    const demoIds = all.filter((c) => c.demo).map((c) => c.center_id);
    const scope = H.readScope(location.search, demoIds.length > 0);
    const [ov, grantsR] = await Promise.all([
      srcRetry(() => rpc('hq_portal_overview', { p_days: 30, p_centers: scope === 'demo' ? demoIds : null })),
      srcRetry(() => rpc('hq_break_glass_list')),
    ]);
    if (!ov.ok) {
      page(host(`<div class="ffs" id="hq"><div class="ffs-stage"><section class="ffs-card"><h1 class="ffs-title">${esc(S.title)}</h1><p class="msg bad" role="alert">${esc(S.couldNot)}: ${esc(friendly(ov.error))}</p></section></div></div>`), S.title);
      return hostUp();
    }
    const O = ov.data;
    const centers = (O.centers || []).map((c) => ({ ...c, name: H.displayName(c.name) }));
    const byId = new Map(centers.map((c) => [c.center_id, c]));
    const grants = (grantsR.ok ? grantsR.data || [] : []).map((g) => ({ ...g, center: H.displayName(g.center) }));
    const health = new Map(centers.map((c) => [c.center_id, H.healthScore(c)]));
    const K = H.networkKpis(O.network, centers);
    const attn = H.attentionItems(centers, grants.filter((g) => byId.has(g.center_id)), lang);
    const state = { pendingCenter: null, days: [7, 90].includes(Number(new URLSearchParams(location.search).get('days'))) ? Number(new URLSearchParams(location.search).get('days')) : 30 };

    // ---- small pieces ----
    const drawerHref = (kind) => { const q = new URLSearchParams(location.search); q.set('drawer', kind); return `${FFTest.pathname()}?${q}`; };
    const cardHead = (title, ic, right = '') => `<div class="ffs-ch"><h3>${ic ? icon(ic) : ''}${esc(title)}</h3>${right}</div>`;
    const nc = (why = '') => `<p class="ffs-nc">${icon('lock')}<span>${esc(S.nc)}${why ? ` · ${esc(why)}` : ''}</span></p>`;
    const hiddenChip = () => `<span class="ffs-chip ffs-chip-nc" title="${esc(S.hiddenTitle)}">${esc(S.hidden)}</span>`;
    const cell = (c, key, fmt = (v) => String(v)) => ((c.suppressed || []).includes(key) ? hiddenChip() : c[key] == null ? '<span class="hq-dash">—</span>' : esc(fmt(c[key])));
    const lifeChip = (st) => `<span class="ffs-chip hq-life hq-life-${esc(st)}">${esc(S.life[st] || st)}</span>`;
    const tierChip = (t) => `<span class="ffs-chip ffs-chip-bop">${esc(S.tier[t] || t || S.tierNone)}</span>`;
    const demoChip = () => '';   // demo / test markers stay in the data only (owner rule: nothing a tester sees says demo)
    const ring = (score, size = 52, stroke = 6) => glowRingSvg(score == null ? null : score / 100, { tone: H.healthTone(score), size, stroke });
    const scoreBadge = (cid, size = 52) => { const h = health.get(cid); return `<span class="hq-score" aria-label="${esc(`${S.health} ${h?.score ?? '—'}`)}">${ring(h?.score ?? null, size)}<b>${esc(h?.score == null ? '—' : String(h.score))}</b></span>`; };
    const centerRow = (c, extra = '') => `<li><a class="ffs-row hq-crow" href="${esc(drawerHref(`center:${c.center_id}`))}" data-drawer="center:${esc(c.center_id)}">
      ${scoreBadge(c.center_id)}<span class="ffs-row-t"><b>${esc(c.name)}</b><span>${esc([c.state, S.life[c.lifecycle?.status]].filter(Boolean).join(' · '))}${c.tier ? ` · ${esc(S.tier[c.tier] || c.tier)}` : ''}</span></span>
      ${extra}${demoChip(c)}${icon('arrow')}</a></li>`;
    function kpiHtml({ id, tone, ic, label, f, big, sub, drawer }) {
      return `<a class="ffs-kpi" id="${id}" href="${esc(drawerHref(drawer))}" data-drawer="${esc(drawer)}">
        <span class="ffs-kpi-label"><span class="ffs-kpi-ico ffs-t-${tone === 'warn' ? 'bad' : tone}">${icon(ic)}</span>${esc(label)}</span>
        <span class="ffs-kpi-body">${glowRingSvg(f, { tone, size: 120, stroke: 12 })}<span class="ffs-kpi-num"><span class="ffs-big ffs-gl-t-${tone}">${big}</span><span class="ffs-kpi-sub">${esc(sub)}</span></span></span></a>`;
    }
    const bigOrNc = (n, suffix = '', of = null) => (n == null ? `<span class="ffs-big-nc">${esc(S.nc)}</span>` : `${countHtml(n, suffix)}${of != null ? `<small> / ${esc(String(of))}</small>` : ''}`);

    // ---- the overview ----
    const active = centers.filter((c) => c.lifecycle?.status === 'active').length;
    const liveN = grants.filter((g) => H.grantState(g).key === 'active').length;
    const fullName = String(s.user?.user_metadata?.full_name || '').replace(/^TEST\s+/i, '').trim();
    const hi = fullName && !/@/.test(fullName) ? fullName.split(/\s+/)[0] : null;
    const states = [...new Set(centers.map((c) => c.state).filter(Boolean))].sort();
    const ch = getChar();
    function heroHtml() {
      return `<section class="ffs-hero hq-hero" id="hqHero" aria-labelledby="hqHello">
        <img class="ffs-hero-bg" src="img/scene/school-exterior-1600.webp" srcset="img/scene/school-exterior-800.webp 800w, img/scene/school-exterior-1600.webp 1600w" sizes="(max-width: 767px) 100vw, 70vw" alt="" width="1600" height="560">
        <img class="ffs-hero-sun" src="img/scene/felt-sun-320.webp" alt="" width="96" height="96">
        <img class="ffs-hero-friend ffs-hero-adult" src="${adultSrc(ch, 960)}" srcset="${adultSrc(ch, 480)} 480w, ${adultSrc(ch, 960)} 960w" sizes="200px" alt="${esc(lang === 'es' ? CHARACTER[ch].es : CHARACTER[ch].en)}" width="200" height="400">
        <div class="ffs-hero-in"><h1 class="ffs-hello" id="hqHello">${esc(S.hello(hi))}</h1><p class="ffs-date">${esc(S.title)} · ${esc(dfmt(O.as_of, { weekday: 'long', month: 'long', day: 'numeric' }))} · ${esc(S.window)}</p>
          <div class="ffs-herorow">
            <a class="ffs-pillbtn ffs-pill-ok" href="${esc(viewHrefSafe('centers'))}" data-view="centers"><span class="ffs-pill-ico">${icon('room')}</span><span class="ffs-pill-t"><b>${esc(S.centersPill(centers.length, active))}</b><span>${esc(S.inStates(states))}</span></span></a>
            <a class="ffs-pillbtn ${liveN ? 'ffs-pill-warn' : 'ffs-pill-ok'}" href="${esc(viewHrefSafe('breakglass'))}" data-view="breakglass"><span class="ffs-pill-ico">${icon('lock')}</span><span class="ffs-pill-t"><b>${esc(S.bgPill(liveN))}</b><span>${esc(S.bgPillSub)}</span></span></a>
          </div></div></section>`;
    }
    function bandHtml() {
      const FIRST = 4;   // the band wraps (no clipped card); the rest behind "Show all"
      return `<section class="ffs-band hq-band" id="hqAttn" aria-labelledby="hqAttnH"><div class="ffs-band-h"><span class="ffs-band-ico" aria-hidden="true">!</span>
        <div><h2 id="hqAttnH">${esc(S.attention)}</h2>${attn.length ? `<span class="ffs-band-n">${esc(S.attentionN(attn.length))}</span>` : ''}</div></div>
        ${attn.length ? `<ul class="hq-chips" id="hqAttnList" aria-label="${esc(S.attention)}">${attn.map((it, n) => `<li class="ffs-attn ffs-attn-${it.tone}" data-key="${esc(it.key)}"${n >= FIRST ? ' hidden' : ''}>
          <span class="ffs-dot ffs-t-${it.tone === 'now' ? 'bad' : it.tone === 'soon' ? 'gold' : 'booker'}">${icon(it.icon)}</span>
          <span class="ffs-attn-t"><b>${esc(it.title)}</b><span>${esc(it.sub)}</span></span>
          <a class="ffs-attn-go" href="${esc(drawerHref(it.drawer))}" data-drawer="${esc(it.drawer)}">${esc(S.open)}${icon('arrow')}</a></li>`).join('')}</ul>
          ${attn.length > FIRST ? `<button class="ffs-link hq-more" type="button" id="hqAttnMore" aria-expanded="false" aria-controls="hqAttnList" data-on="${esc(S.showFewer)}" data-off="${esc(S.showAll(attn.length))}">${esc(S.showAll(attn.length))}</button>` : ''}`
          : `<p class="ffs-attn-clear">${icon('check')}${esc(S.allClear)}</p>`}</section>`;
    }
    function kpisHtml() {
      const n = O.network || {};
      return `<div class="hq-kpis" id="hqKpis">
        ${kpiHtml({ id: 'kEnroll', tone: 'booker', ic: 'people', label: S.kEnroll, f: K.enroll.frac, big: bigOrNc(K.enroll.a, '', K.enroll.b), sub: K.enroll.a == null ? S.nc : S.kEnrollSub(K.enroll.a, K.enroll.b), drawer: 'kpi:enroll' })}
        ${kpiHtml({ id: 'kAttend', tone: 'zuri', ic: 'pickup', label: S.kAttend, f: K.attend.frac, big: bigOrNc(K.attend.a, '%'), sub: S.kAttendSub, drawer: 'kpi:attend' })}
        ${kpiHtml({ id: 'kStaff', tone: K.staff.frac != null && K.staff.frac < 1 ? 'warn' : 'lumi', ic: 'ratio', label: S.kStaff, f: K.staff.frac, big: bigOrNc(K.staff.a, '', K.staff.b), sub: K.staff.a == null ? S.nc : S.kStaffSub(K.staff.a, K.staff.b), drawer: 'kpi:staff' })}
        ${kpiHtml({ id: 'kComp', tone: 'gold', ic: 'shield', label: S.kComp, f: K.comp.frac, big: bigOrNc(K.comp.a, '%'), sub: S.kCompSub, drawer: 'kpi:comp' })}
        ${kpiHtml({ id: 'kInc', tone: 'warn', ic: 'incident', label: S.kInc, f: K.inc.a == null ? null : Math.min(1, K.inc.a / Math.max(1, K.inc.total || 1)), big: K.inc.a == null ? `<span class="ffs-big-nc">${esc(S.hidden)}</span>` : countHtml(K.inc.a), sub: S.kIncSub(n.incidents ?? S.hidden), drawer: 'kpi:inc' })}
        ${kpiHtml({ id: 'kContent', tone: 'bop', ic: 'doc', label: S.kContent, f: K.content.a == null ? null : Math.min(1, K.content.a / 20), big: bigOrNc(K.content.a), sub: S.kContentSub(K.content.a ?? 0, K.content.drafting), drawer: 'kpi:content' })}
      </div>`;
    }
    function centersCard(limit = 12) {
      const sorted = [...centers].sort((a, b) => (health.get(a.center_id)?.score ?? 101) - (health.get(b.center_id)?.score ?? 101) || a.name.localeCompare(b.name));
      return `<section class="ffs-card hq-centers" id="hqCenters">${cardHead(S.centersCard, 'room', `<a class="ffs-link" href="${esc(viewHrefSafe('centers'))}" data-view="centers">${esc(S.tabs.list)}${icon('arrow')}</a>`)}
        <p class="ffs-sub">${esc(S.centersSub)}</p><ul class="ffs-list hq-clist">${sorted.slice(0, limit).map((c) => centerRow(c, flagsHtml(c))).join('')}</ul></section>`;
    }
    function flagsHtml(c) {
      const f = [];
      if (c.critical_unreported) f.push(['bad', 'incident']);
      if (c.license?.days_left != null && c.license.days_left <= 60) f.push([c.license.days_left <= 30 ? 'bad' : 'gold', 'doc']);
      if (c.drills?.fire_overdue && c.lifecycle?.status === 'active') f.push(['bad', 'fire']);
      if (c.staff_needed != null && c.staff < c.staff_needed) f.push(['bad', 'ratio']);
      if (c.credentials?.expired || c.credentials?.expiring_60) f.push([c.credentials.expired ? 'bad' : 'gold', 'badge']);
      return f.length ? `<span class="hq-flags" aria-hidden="true">${f.map(([t, i]) => `<span class="hq-flag hq-flag-${t}">${icon(i)}</span>`).join('')}</span>` : '';
    }

    // ---- views ----
    let sh = null;
    function viewHrefSafe(view, tab = null) { return sh ? sh.viewHref(view, tab) : `/hq?view=${view}${tab ? `&tab=${tab}` : ''}`; }
    let building = null;   // the view being built: its panels carry its id
    const P = (tab, html) => sh.panel(building, tab, html);
    function buildView(id) {
      building = id;
      if (id === 'overview') {
        return `<div class="hq-cockpit">${heroHtml()}${bandHtml()}<div class="hq-main">${kpisHtml()}${centersCard()}</div></div>`;
      }
      if (id === 'centers') {
        const rows = [...centers].sort((a, b) => a.name.localeCompare(b.name));
        const table = `<div class="ffs-tblwrap"><table class="ffs-table hq-table" id="hqCenterTable"><thead><tr><th scope="col">${esc(S.center)}</th><th scope="col">${esc(S.health)}</th><th scope="col">${esc(S.state)}</th><th scope="col">${esc(S.tabs.lifecycle)}</th><th scope="col">${esc(S.tabs.licenses)}</th>
          <th scope="col">${esc(S.enrolled)}</th><th scope="col">${esc(S.capacity)}</th><th scope="col">${esc(S.attendance)}</th><th scope="col">${esc(S.staff)}</th><th scope="col">${esc(S.compliance)}</th><th scope="col">${esc(S.incidents)}</th></tr></thead><tbody>
          ${rows.map((c) => `<tr data-center="${esc(c.center_id)}"><th scope="row"><a class="hq-tlink" href="${esc(drawerHref(`center:${c.center_id}`))}" data-drawer="center:${esc(c.center_id)}">${esc(c.name)}</a> ${demoChip(c)}</th>
            <td>${esc(health.get(c.center_id)?.score ?? '—')}</td><td>${esc(c.state || '—')}</td><td>${lifeChip(c.lifecycle?.status)}</td><td>${esc(S.tier[c.tier] || c.tier || '—')}</td>
            <td>${c.small_center ? `<span class="ffs-chip ffs-chip-nc" title="${esc(S.small)}">${esc(S.hidden)}</span>` : cell(c, 'enrolled')}</td><td>${esc(c.capacity ?? '—')}</td><td>${cell(c, 'attendance_rate', (v) => `${v}%`)}</td>
            <td>${esc(c.staff ?? '—')}${c.staff_needed != null ? ` / ${esc(c.staff_needed)}` : ''}</td><td>${c.compliance?.score != null ? `${esc(c.compliance.score)}%` : '—'}</td><td>${cell(c, 'incidents')}</td></tr>`).join('')}
          </tbody></table></div>`;
        const byLife = Object.fromEntries(H.LIFECYCLE.map((l) => [l, centers.filter((c) => c.lifecycle?.status === l)]));
        const tiers = {};
        for (const c of centers) tiers[c.tier || ''] = (tiers[c.tier || ''] || 0) + 1;
        return P('list', `<section class="ffs-card">${cardHead(S.tabs.list, 'room', `<a class="ffs-link" href="/hq?classic=1" data-nav>${esc(S.classic)}${icon('arrow')}</a>`)}<p class="ffs-sub">${esc(S.centersSub)}</p>${table}
            <p class="ffs-note">${icon('lock')} ${esc(S.noMoney)}</p></section>`)
          + P('lifecycle', `<div class="hq-life-cols">${H.LIFECYCLE.map((l) => `<section class="ffs-card hq-lifecol hq-lifecol-${l}">${cardHead(`${S.life[l]} · ${byLife[l].length}`, l === 'active' ? 'check' : l === 'onboarding' ? 'plus' : 'lock', '')}
              <p class="ffs-sub">${esc(S.lifeSub[l])}</p>${byLife[l].length ? `<ul class="ffs-list">${byLife[l].map((c) => centerRow(c, c.lifecycle?.offboarding ? `<span class="ffs-row-end">${esc(dfmt(c.lifecycle.offboarding.delete_on))}</span>` : '')).join('')}</ul>` : `<p class="ffs-empty">—</p>`}</section>`).join('')}</div>`)
          + P('licenses', `<section class="ffs-card">${cardHead(S.tabs.licenses, 'badge', '')}<ul class="hq-bars">${Object.entries(tiers).sort((a, b) => b[1] - a[1]).map(([t, n]) => `<li><span class="hq-bar-l">${esc(S.tier[t] || t || S.tierNone)}</span>${glowBarHtml(n / Math.max(1, centers.length), 'bop')}<b>${countHtml(n)}</b></li>`).join('')}</ul>
              <ul class="ffs-list">${rows.map((c) => centerRow(c, tierChip(c.tier))).join('')}</ul><p class="ffs-note">${esc(S.tierDraft)}</p></section>`);
      }
      if (id === 'quality') {
        const lic = [...centers].filter((c) => c.lifecycle?.status !== 'closed').sort((a, b) => (a.license?.days_left ?? 1e6) - (b.license?.days_left ?? 1e6));
        const drillCell = (c, k) => { const d = c.drills || {}; const od = d[`${k}_overdue`]; return `<span class="ffs-chip ${od ? 'ffs-chip-bad' : 'ffs-chip-ok'}">${esc(od ? S.overdue : S.ok)}</span> <span class="ffs-note">${esc(S.lastDrill(d[`${k}_last`] ? dfmt(d[`${k}_last`]) : null))} · ${esc(S.every(d[`${k}_every_months`]))}</span>`; };
        return P('licensing', `<section class="ffs-card">${cardHead(S.tabs.licensing, 'doc', '')}<ul class="hq-bars hq-countdown">${lic.map((c) => { const d = c.license?.days_left; const f = d == null ? null : Math.max(0, Math.min(1, d / 365));
              return `<li><a class="hq-bar-l hq-tlink" href="${esc(drawerHref(`center:${c.center_id}`))}" data-drawer="center:${esc(c.center_id)}">${esc(c.name)}</a>${glowBarHtml(f, d == null ? 'navy' : d <= 30 ? 'warn' : d <= 60 ? 'gold' : 'zuri')}<span class="hq-bar-r ${d != null && d <= 60 ? 'hq-warn' : ''}">${esc(S.licenceDays(d))}${c.license?.expires_on ? ` · ${esc(dfmt(c.license.expires_on))}` : ''}</span></li>`; }).join('')}</ul></section>`)
          + P('drills', `<section class="ffs-card">${cardHead(S.tabs.drills, 'fire', '')}<div class="ffs-tblwrap"><table class="ffs-table"><thead><tr><th scope="col">${esc(S.center)}</th><th scope="col">${esc(S.fire)}</th><th scope="col">${esc(S.tornado)}</th></tr></thead><tbody>
              ${lic.map((c) => `<tr><th scope="row">${esc(c.name)}</th><td>${drillCell(c, 'fire')}</td><td>${drillCell(c, 'tornado')}</td></tr>`).join('')}</tbody></table></div>
              <p class="ffs-note">MO-ALL-FIRE-DRILL-MONTHLY · KS-ALL-FIRE-DRILL-MONTHLY · KS-ALL-TORNADO-DRILL-MONTHLY · MO-ALL-DISASTER-DRILL-QUARTERLY</p></section>`)
          + P('credentials', `<section class="ffs-card">${cardHead(S.tabs.credentials, 'badge', '')}<ul class="ffs-list">${lic.map((c) => { const cr = c.credentials || {};
              return centerRow(c, `<span class="ffs-row-end">${cr.expired ? `<span class="ffs-chip ffs-chip-bad">${esc(S.expired)} ${esc(cr.expired)}</span>` : ''}${cr.expiring_60 ? `<span class="ffs-chip ffs-chip-warn">${esc(S.expiring)} ${esc(cr.expiring_60)}</span>` : ''}${!cr.expired && !cr.expiring_60 ? `<span class="ffs-chip ffs-chip-ok">${esc(S.credOk)}</span>` : ''}</span>`); }).join('')}</ul></section>`)
          + P('readiness', `<section class="ffs-card">${cardHead(S.readiness, 'shield', '')}<p class="ffs-sub">${esc(S.readinessSub)}</p><ul class="hq-bars">${lic.map((c) => { const r = H.readiness(c);
              return `<li><span class="hq-bar-l">${esc(c.name)}</span>${glowBarHtml(r == null ? null : r / 100, r == null ? 'navy' : r >= 80 ? 'zuri' : r >= 60 ? 'gold' : 'warn')}<b>${r == null ? esc(S.nc) : `${countHtml(r)}%`}</b></li>`; }).join('')}</ul></section>`);
      }
      if (id === 'curriculum') {
        const opts = centers.filter((c) => c.status === 'active').map((c) => `<label class="hq-check"><input type="checkbox" name="center" value="${esc(c.center_id)}"> <span>${esc(c.name)}</span></label>`).join('');
        return P('adoption', `<div id="hqReleases"><section class="ffs-card"><p class="ffs-empty">${esc(S.loading)}</p></section></div>`)
          + P('publish', `<section class="ffs-card">${cardHead(S.publishTitle, 'announcement', '')}<form class="hq-form" id="hqPublish" novalidate>
              <label class="hq-field"><span>${esc(S.kind)}</span><select name="kind"><option value="curriculum">${esc(S.kindCurriculum)}</option><option value="content">${esc(S.kindContent)}</option></select></label>
              <label class="hq-field"><span>${esc(S.relTitle)}</span><input name="title" required minlength="3" maxlength="140" autocomplete="off"></label>
              <label class="hq-field"><span>${esc(S.relVersion)}</span><input name="version" required pattern="[A-Za-z0-9][A-Za-z0-9._-]{0,30}" maxlength="31" autocomplete="off" placeholder="2026.11"></label>
              <label class="hq-field hq-wide"><span>${esc(S.relNotes)}</span><textarea name="notes" rows="3" maxlength="1000"></textarea></label>
              <fieldset class="hq-field hq-wide"><legend>${esc(S.audience)}</legend><label class="hq-check"><input type="radio" name="aud" value="all"> <span>${esc(S.audAll)}</span></label>
                <label class="hq-check"><input type="radio" name="aud" value="sel" checked> <span>${esc(S.audSel)}</span></label><div class="hq-checks" id="hqPubCenters">${opts}</div></fieldset>
              <div class="hq-actions hq-wide"><button class="ffs-btn ffs-btn-bop" type="submit">${icon('announcement')}${esc(S.publishBtn)}</button></div>
              <div class="hq-confirm hq-wide" id="hqPubConfirm" hidden><p></p><button class="ffs-btn ffs-btn-bop" type="button" data-yes>${esc(S.publishBtn)}</button> <button class="ffs-btn ffs-btn-soft" type="button" data-no>${esc(S.close)}</button></div>
              <p class="msg hq-wide" id="hqPubMsg" role="status"></p></form></section>`)
          + P('pipeline', `<div id="hqPipeline"><section class="ffs-card"><p class="ffs-empty">${esc(S.loading)}</p></section></div>`);
      }
      if (id === 'insights') {
        const chips = `<span class="hq-days" role="group" aria-label="${esc(S.window)}">${[7, 30, 90].map((d) => `<a class="ffs-chip ${d === state.days ? 'ffs-chip-booker' : ''}" href="${esc(`${FFTest.pathname()}?${(() => { const q = new URLSearchParams(location.search); q.set('days', String(d)); return q; })()}`)}" data-days="${d}"${d === state.days ? ' aria-current="true"' : ''}>${esc(S.days(d))}</a>`).join('')}</span>`;
        return ['likes', 'dropoff', 'gaps', 'time'].map((t) => P(t, `<div class="hq-ins-head">${chips}<p class="ffs-note hq-privacy">${icon('shield')} ${esc(S.insightsNote(O.min_cell || 5))}</p></div><div data-fill="ins-${t}"><section class="ffs-card"><p class="ffs-empty">${esc(S.loading)}</p></section></div>`)).join('');
      }
      if (id === 'breakglass') {
        return P('grants', `<section class="ffs-card hq-bg-intro">${cardHead(S.views.breakglass, 'lock', '')}<p class="ffs-sub">${esc(S.bgIntro)}</p></section><div id="hqGrants">${grantsHtml()}</div>`)
          + P('request', `<section class="ffs-card">${cardHead(S.bgRequestBtn, 'lock', '')}<p class="ffs-sub">${esc(S.bgIntro)}</p>
              <p><button class="ffs-btn ffs-btn-navy" type="button" id="hqBgOpen" aria-expanded="false" aria-controls="hqBgForm">${icon('lock')}${esc(S.bgRequestBtn)}</button></p>
              <form class="hq-form" id="hqBgForm" hidden novalidate>
                <label class="hq-field"><span>${esc(S.bgCenter)}</span><select name="center"><option value="">—</option>${[...centers].sort((a, b) => a.name.localeCompare(b.name)).filter((c) => c.status !== 'suspended').map((c) => `<option value="${esc(c.center_id)}">${esc(c.name)}</option>`).join('')}</select></label>
                <label class="hq-field"><span>${esc(S.bgTicket)}</span><input name="ticket" maxlength="60" autocomplete="off" placeholder="HQ-1234"></label>
                <label class="hq-field hq-wide"><span>${esc(S.bgReason)}</span><textarea name="reason" rows="3" maxlength="1000"></textarea></label>
                <fieldset class="hq-field hq-wide"><legend>${esc(S.bgScopes)}</legend><div class="hq-checks">${H.SCOPES.map((k) => `<label class="hq-check"><input type="checkbox" name="scope" value="${k}"> <span>${esc(S.scope[k])}</span></label>`).join('')}</div></fieldset>
                <label class="hq-field"><span>${esc(S.bgHours)}</span><input name="hours" type="number" min="1" max="72" value="4" inputmode="numeric"></label>
                <label class="hq-check hq-wide hq-em"><input type="checkbox" name="emergency"> <span>${esc(S.bgEmergency)}</span></label>
                <ul class="hq-errs hq-wide" id="hqBgErrs" role="alert"></ul>
                <div class="hq-actions hq-wide"><button class="ffs-btn ffs-btn-navy" type="submit" id="hqBgSend">${esc(S.bgSend)}</button></div>
                <div class="hq-confirm hq-wide" id="hqBgConfirm" hidden><p>${esc(S.bgConfirm)}</p><button class="ffs-btn ffs-btn-navy" type="button" data-yes>${esc(S.bgSend)}</button> <button class="ffs-btn ffs-btn-soft" type="button" data-no>${esc(S.close)}</button></div>
                <p class="msg hq-wide" id="hqBgMsg" role="status"></p></form></section>`)
          + P('log', `<div id="hqLog"><section class="ffs-card"><p class="ffs-empty">${esc(S.loading)}</p></section></div>`);
      }
      if (id === 'settings') {
        return ['users', 'roles', 'alerts'].map((t) => P(t, t === 'roles' ? `<section class="ffs-card">${cardHead(S.tabs.roles, 'people', '')}<dl class="hq-roles">${S.rolesBody.map(([a, b]) => `<dt>${esc(a)}</dt><dd>${esc(b)}</dd>`).join('')}</dl><p class="ffs-note">${icon('lock')} ${esc(S.noMoney)}</p></section>`
            : `<div data-fill="set-${t}"><section class="ffs-card"><p class="ffs-empty">${esc(S.loading)}</p></section></div>`)).join('')
          + P('look', `<section class="ffs-card">${cardHead(S.lookTitle, 'star', '')}<p class="ffs-sub">${esc(S.lookSub)}</p><div class="hq-chars" role="radiogroup" aria-label="${esc(S.lookTitle)}">
              ${H.HQ_CHARACTERS.map((k) => `<label class="hq-char"><input type="radio" name="hqChar" value="${k}"${k === ch ? ' checked' : ''}><img src="${adultSrc(k, 480)}" alt="" width="120" height="240" loading="lazy"><span>${esc(S.character[k])}</span></label>`).join('')}</div></section>`);
      }
      return '';
    }

    function grantsHtml() {
      const mine = grants.filter((g) => byId.has(g.center_id) || scope === 'all');
      if (!mine.length) return `<section class="ffs-card"><p class="ffs-empty">${esc(S.bgNone)}</p></section>`;
      return `<section class="ffs-card"><ul class="ffs-list">${mine.map((g) => { const st = H.grantState(g);
        return `<li><a class="ffs-row" href="${esc(drawerHref(`grant:${g.id}`))}" data-drawer="grant:${esc(g.id)}"><span class="ffs-dot ffs-t-${st.key === 'active' ? 'bad' : st.key === 'requested' ? 'gold' : 'navy'}">${icon(g.emergency ? 'alert' : 'lock')}</span>
          <span class="ffs-row-t"><b>${esc(g.center)} · ${esc((g.scopes || []).map((k) => S.scope[k] || k).join(', '))}</b><span>${esc(S.gStatus[st.key] || st.key)}${st.key === 'active' ? ` · ${esc(S.gLeft(st.left))}` : ''} · ${esc(g.ticket)} · ${esc(S.gBy(g.requested_by || '—'))} · ${esc(tfmt(g.requested_at))}</span></span>
          <span class="ffs-row-end">${g.emergency ? '<span class="ffs-chip ffs-chip-bad">!</span>' : ''}${esc(S.gReads(g.reads || 0))}</span>${icon('arrow')}</a></li>`; }).join('')}</ul></section>`;
    }

    // ---- views that load on first show ----
    async function fill(id, el) {
      if (id === 'curriculum') {
        const r = await src(() => rpc('hq_content_overview'));
        const box = el.querySelector('#hqReleases'), pipe = el.querySelector('#hqPipeline');
        if (!r.ok) { const m = `<section class="ffs-card"><p class="msg bad">${esc(S.couldNot)}: ${esc(friendly(r.error))}</p></section>`; box.innerHTML = m; pipe.innerHTML = m; return; }
        const d = r.data;
        const rel = (d.releases || []).map((x) => ({ ...x, centers: (x.centers || []).filter((c) => scope === 'all' || byId.has(c.center_id)) })).filter((x) => x.centers.length);
        box.innerHTML = rel.length ? rel.map((x) => { const a = x.centers.filter((c) => c.status === 'adopted').length;
          return `<section class="ffs-card hq-release" data-release="${esc(x.id)}">${cardHead(`${x.title}`, x.kind === 'curriculum' ? 'book' : 'video', `<span class="ffs-chip ${x.withdrawn ? 'ffs-chip-nc' : 'ffs-chip-bop'}">${esc(x.version)}${x.withdrawn ? ` · ${esc(S.withdrawn)}` : ''}</span>`)}
            <p class="ffs-sub">${esc(x.kind === 'curriculum' ? S.kindCurriculum : S.kindContent)} · ${esc(dfmt(x.published_at))}${x.notes ? ` · ${esc(x.notes)}` : ''}</p>
            <div class="hq-adopt">${glowBarHtml(a / Math.max(1, x.centers.length), 'zuri')}<b>${esc(S.adoptedOf(a, x.centers.length))}</b></div>
            <ul class="hq-adopt-list">${x.centers.map((c) => `<li><span class="ffs-chip ${c.status === 'adopted' ? 'ffs-chip-ok' : c.status === 'declined' ? 'ffs-chip-bad' : 'ffs-chip-warn'}">${esc(c.status === 'adopted' ? S.adopted : c.status === 'declined' ? S.declined : S.pending)}</span> ${esc(H.displayName(c.name))}</li>`).join('')}</ul>
            ${x.withdrawn ? '' : `<p><button class="ffs-link" type="button" data-withdraw="${esc(x.id)}">${esc(S.withdraw)}</button></p>`}</section>`; }).join('')
          : `<section class="ffs-card"><p class="ffs-empty">${esc(S.noReleasesNet)}</p></section>`;
        box.querySelectorAll('[data-withdraw]').forEach((b) => b.addEventListener('click', async () => {
          if (b.dataset.armed !== '1') { b.dataset.armed = '1'; b.textContent = `${S.withdraw}?`; return; }
          const w = await src(() => rpc('hq_content_release_withdraw', { p_release: b.dataset.withdraw }));
          if (w.ok) { live(S.withdrawn); fill('curriculum', el); } else b.textContent = friendly(w.error);
        }));
        const pl = d.pipeline || [];
        const max = Math.max(1, ...pl.map((p) => p.items));
        pipe.innerHTML = `<section class="ffs-card">${cardHead(S.tabs.pipeline, 'doc', `<a class="ffs-link" href="/hq/content" data-nav>${esc(S.openQueue)}${icon('arrow')}</a>`)}<p class="ffs-sub">${esc(S.pipelineSub)} ${esc(S.liveItems(d.live || 0))}</p>
          ${figureHtml(esc, { id: 'hqPipeFig', words: S, summary: pl.map((p) => `${p.kind} ${S.state_[p.state] || p.state}: ${p.items}`).join('; '),
            art: `<ul class="hq-bars">${pl.map((p) => `<li><span class="hq-bar-l">${esc(p.kind.replace(/_/g, ' '))} · ${esc(S.state_[p.state] || p.state)}</span>${glowBarHtml(p.items / max, p.state === 'approved' ? 'zuri' : 'bop')}<b>${countHtml(p.items)}</b></li>`).join('')}</ul>`,
            table: tableHtml(esc, { head: [S.kind, S.what, S.items, S.who], rows: pl.map((p) => [p.kind, S.state_[p.state] || p.state, p.items, p.waiting_for ? S.waitingFor[p.waiting_for] || p.waiting_for : '—']) }) })}</section>`;
        sh.settle(pipe); sh.settle(box);
        bindPublish(el);
      }
      if (id === 'insights') await fillInsights(el);
      if (id === 'breakglass') {
        const r = await src(() => rpc('hq_break_glass_audit', { p_limit: 100 }));
        const box = el.querySelector('#hqLog');
        const rows = r.ok ? (r.data || []).filter((a) => scope === 'all' || !a.center || [...byId.values()].some((c) => c.name === H.displayName(a.center))).map((a) => ({ ...a, center: a.center && H.displayName(a.center) })) : [];
        box.innerHTML = !r.ok ? `<section class="ffs-card"><p class="msg bad">${esc(friendly(r.error))}</p></section>` : `<section class="ffs-card">${cardHead(S.tabs.log, 'doc', '')}${rows.length ? `<div class="ffs-tblwrap"><table class="ffs-table" id="hqLogTable"><thead><tr><th scope="col">${esc(S.when)}</th><th scope="col">${esc(S.what)}</th><th scope="col">${esc(S.center)}</th><th scope="col">${esc(S.who)}</th><th scope="col">${esc(S.why)}</th></tr></thead><tbody>
          ${rows.map((a) => `<tr><th scope="row">${esc(tfmt(a.at))}</th><td>${esc(S.logEvent[a.event] || a.event)}${a.scopes ? ` · ${esc([].concat(a.scopes).map((k) => S.scope[k] || k).join(', '))}` : ''}</td><td>${esc(a.center || '—')}</td><td>${esc(a.actor || '—')}${a.aal ? ` (${esc(a.aal)})` : ''}</td><td>${esc([a.ticket, a.reason || a.what].filter(Boolean).join(' · ') || '—')}</td></tr>`).join('')}</tbody></table></div>` : `<p class="ffs-empty">${esc(S.logNone)}</p>`}</section>`;
        bindRequest(el);
      }
      if (id === 'settings') await fillSettings(el);
      if (id === 'centers' || id === 'quality') sh.settle(el);
    }

    async function fillInsights(el) {
      const r = await src(() => rpc('hq_learning_insights', { p_days: state.days }));
      const put = (t, html) => { const b = el.querySelector(`[data-fill="ins-${t}"]`); if (b) { b.innerHTML = html; sh.settle(b); } };
      if (!r.ok) { for (const t of ['likes', 'dropoff', 'gaps', 'time']) put(t, `<section class="ffs-card"><p class="msg bad">${esc(S.couldNot)}: ${esc(friendly(r.error))}</p></section>`); return; }
      const d = r.data, L = H.insightLists(d);
      const title = (i) => (i.title?.[lang] || i.title?.en || i.item_id);
      const empty = `<section class="ffs-card"><p class="ffs-empty">${esc(S.noInsights)}</p></section>`;
      const tbl = (rows) => tableHtml(esc, { head: [S.what, S.children, S.opened, S.finishRate, S.leftEarly, S.likes], rows: rows.map((i) => [title(i), i.children, i.opens ?? S.hidden, i.finish_rate == null ? '—' : `${i.finish_rate}%`, i.left_early ?? S.hidden, i.hearts ?? S.hidden]) });
      const sup = `<p class="ffs-note">${esc(S.suppressedItems(d.suppressed_items || 0))}</p>`;
      put('likes', L.liked.length ? `<section class="ffs-card">${cardHead(S.tabs.likes, 'heart', `<span class="ffs-chip">${esc(S.childrenN(d.children))}</span>`)}${figureHtml(esc, { id: 'hqLikes', words: S, summary: L.liked.map((i) => `${title(i)}: ${i.hearts} ${S.likes}`).join('; '),
        art: `<ul class="hq-bars">${L.liked.map((i) => `<li><span class="hq-bar-l">${esc(title(i))}</span>${glowBarHtml(i.hearts / Math.max(...L.liked.map((x) => x.hearts)), 'lumi')}<b>${icon('heart')} ${countHtml(i.hearts)}</b></li>`).join('')}</ul>`, table: tbl(L.liked) })}${sup}</section>` : empty);
      put('dropoff', L.stops.length ? `<section class="ffs-card">${cardHead(S.tabs.dropoff, 'pulse', '')}${figureHtml(esc, { id: 'hqStops', words: S, summary: L.stops.map((i) => `${title(i)}: ${i.finish_rate}%`).join('; '),
        art: `<ul class="hq-bars">${L.stops.map((i) => `<li><span class="hq-bar-l">${esc(title(i))}</span>${glowBarHtml(i.finish_rate / 100, i.finish_rate < 50 ? 'warn' : 'booker')}<b>${countHtml(i.finish_rate, '%')}</b></li>`).join('')}</ul>`, table: tbl(L.stops) })}${sup}</section>` : empty);
      put('gaps', `<div class="ffs-two"><section class="ffs-card">${cardHead(S.comingSoon, 'star', '')}${L.asks.length ? `<ul class="ffs-list">${L.asks.map((i) => `<li class="ffs-row"><span class="ffs-dot ffs-t-gold">${icon('video')}</span><span class="ffs-row-t"><b>${esc(title(i))}</b><span>${esc(S.childrenN(i.children))}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noInsights)}</p>`}</section>
        <section class="ffs-card">${cardHead(S.lowFinish, 'alert', '')}${L.fix.length ? `<ul class="ffs-list">${L.fix.map((i) => `<li class="ffs-row"><span class="ffs-dot ffs-t-bad">${icon('pulse')}</span><span class="ffs-row-t"><b>${esc(title(i))}</b><span>${esc(`${i.finish_rate}% · ${S.childrenN(i.children)}`)}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">—</p>`}</section></div>${sup}`);
      const kinds = [...(d.by_kind || [])].sort((a, b) => b.minutes - a.minutes), hours = [...(d.hours || [])].sort((a, b) => a.hour - b.hour);   // hours morning-first
      const maxH = Math.max(1, ...hours.map((h) => h.children)), maxK = Math.max(1, ...kinds.map((k) => k.minutes));
      const dist = (obj, words) => { const tot = Object.values(obj || {}).reduce((a, b) => a + b, 0); return Object.keys(obj || {}).length ? `<ul class="hq-bars">${Object.entries(obj).sort((a, b) => b[1] - a[1]).map(([k, n]) => `<li><span class="hq-bar-l">${esc(words[k] || k)}</span>${glowBarHtml(n / Math.max(1, tot), 'booker')}<b>${countHtml(n)}</b></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.hidden)}</p>`; };
      put('time', `<div class="hq-ins-time"><section class="ffs-card hq-ins-kpi">${cardHead(S.minutesWeek, 'clock', '')}<p class="ffs-big ffs-gl-t-bop">${d.avg_minutes_per_child_week == null ? esc(S.hidden) : countHtml(Math.round(d.avg_minutes_per_child_week))}</p><p class="ffs-sub">${esc(S.childrenN(d.children))} · ${esc(S.days(d.days))}</p></section>
        <section class="ffs-card">${cardHead(S.byKind, 'learn', '')}${figureHtml(esc, { id: 'hqKinds', words: S, summary: kinds.map((k) => `${S.kindW[k.kind] || k.kind}: ${k.minutes} min`).join('; '),
          art: `<ul class="hq-bars">${kinds.map((k) => `<li><span class="hq-bar-l">${esc(S.kindW[k.kind] || k.kind)}</span>${glowBarHtml(k.minutes / maxK, k.kind === 'watch' ? 'lumi' : k.kind === 'read' ? 'booker' : 'zuri')}<b>${countHtml(k.minutes)} min</b></li>`).join('')}</ul>`,
          table: tableHtml(esc, { head: [S.kind, 'min', S.children], rows: kinds.map((k) => [S.kindW[k.kind] || k.kind, k.minutes, k.children]) }) })}</section>
        <section class="ffs-card hq-wide2">${cardHead(S.hours, 'clock', '')}${hours.length ? figureHtml(esc, { id: 'hqHours', words: S, summary: hours.map((h) => `${h.hour}:00 ${h.children}`).join('; '),
          art: `<ol class="hq-cols">${hours.map((h) => `<li><b>${countHtml(h.children)}</b><span class="hq-col"><span class="hq-col-fill" data-h="${Math.max(6, Math.round((h.children / maxH) * 100))}"></span></span><span class="hq-col-l">${esc(String(h.hour).padStart(2, '0'))}:00</span></li>`).join('')}</ol>`,
          table: tableHtml(esc, { head: [S.when, S.children], rows: hours.map((h) => [`${h.hour}:00`, h.children]) }) }) : `<p class="ffs-empty">${esc(S.hidden)}</p>`}</section>
        <section class="ffs-card">${cardHead(S.devices, 'grid', '')}${dist(d.devices, S.device)}</section>
        <section class="ffs-card">${cardHead(S.captions, 'chat', '')}${dist(d.captions, S.caption)}</section>
        <section class="ffs-card">${cardHead(S.places, 'home', '')}${dist(d.places, S.place)}</section></div>`);
      el.querySelectorAll('[data-days]').forEach((a) => a.addEventListener('click', (e) => {
        e.preventDefault(); state.days = Number(a.dataset.days);
        const q = new URLSearchParams(location.search); q.set('days', String(state.days)); history.replaceState(history.state, '', `${FFTest.pathname()}?${q}`);
        el.querySelectorAll('[data-days]').forEach((x) => { const on = Number(x.dataset.days) === state.days; x.classList.toggle('ffs-chip-booker', on); if (on) x.setAttribute('aria-current', 'true'); else x.removeAttribute('aria-current'); });
        fillInsights(el);
      }, { once: false }));
    }

    async function fillSettings(el) {
      const r = await src(() => rpc('hq_settings'));
      const put = (t, html) => { const b = el.querySelector(`[data-fill="set-${t}"]`); if (b) b.innerHTML = html; };
      if (!r.ok) { put('users', `<section class="ffs-card"><p class="msg bad">${esc(friendly(r.error))}</p></section>`); put('alerts', ''); return; }
      const users = r.data.users || [], routes = r.data.routes || [];
      const uname = new Map(users.map((u) => [u.user_id, u.email]));
      put('users', `<section class="ffs-card">${cardHead(S.tabs.users, 'people', '')}<p class="ffs-sub">${esc(S.usersSub)}</p><ul class="ffs-list">${users.map((u) => `<li class="ffs-row"><span class="ffs-dot ffs-t-navy">${icon('badge')}</span>
        <span class="ffs-row-t"><b>${esc(u.email)}${u.me ? ` · ${esc(S.you)}` : ''}</b><span>${esc((u.roles || []).map((k) => S.role[k] || k).join(' · '))} · ${esc(S.lastIn)} ${esc(tfmt(u.last_sign_in))}</span></span>
        <span class="ffs-chip ${u.two_step ? 'ffs-chip-ok' : 'ffs-chip-warn'}">${esc(u.two_step ? S.twoStep : S.noTwoStep)}</span></li>`).join('')}</ul></section>`);
      put('alerts', `<section class="ffs-card">${cardHead(S.tabs.alerts, 'announcement', '')}<p class="ffs-sub">${esc(S.alertsSub)}</p><div class="hq-routes">${routes.map((a) => `<form class="hq-route" data-kind="${esc(a.kind)}">
        <h4>${esc(S.alertKind[a.kind] || a.kind)}</h4><p class="ffs-note">${esc((a.user_ids || []).map((u) => uname.get(u) || '—').join(', ') || S.nobody)}</p>
        <details><summary>${esc(S.save)}…</summary><div class="hq-checks">${users.map((u) => `<label class="hq-check"><input type="checkbox" name="u" value="${esc(u.user_id)}"${(a.user_ids || []).includes(u.user_id) ? ' checked' : ''}> <span>${esc(u.email)}</span></label>`).join('')}</div>
        <label class="hq-field"><span>${esc(S.channel.in_app)} / ${esc(S.channel.email)}</span><select name="channel">${['in_app', 'email', 'both'].map((c) => `<option value="${c}"${a.channel === c ? ' selected' : ''}>${esc(S.channel[c])}</option>`).join('')}</select></label>
        <button class="ffs-btn ffs-btn-soft" type="submit">${esc(S.save)}</button> <span class="msg" role="status"></span></details></form>`).join('')}</div></section>`);
      el.querySelectorAll('.hq-route').forEach((f) => f.addEventListener('submit', async (e) => {
        e.preventDefault();
        const ids = [...f.querySelectorAll('input[name=u]:checked')].map((i) => i.value);
        const w = await src(() => rpc('hq_alert_route_save', { p_kind: f.dataset.kind, p_user_ids: ids, p_channel: f.querySelector('select').value }));
        f.querySelector('.msg').textContent = w.ok ? S.saved : friendly(w.error);
        if (w.ok) { f.querySelector('.ffs-note').textContent = ids.map((u) => uname.get(u)).join(', ') || S.nobody; live(S.saved); }
      }));
      el.querySelectorAll('input[name=hqChar]').forEach((i) => i.addEventListener('change', () => { setChar(i.value); live(S.character[i.value]); }));
    }

    function bindPublish(el) {
      const f = el.querySelector('#hqPublish'); if (!f || f.dataset.bound) return; f.dataset.bound = '1';
      const box = f.querySelector('#hqPubConfirm'), msg = f.querySelector('#hqPubMsg'), cbox = f.querySelector('#hqPubCenters');
      const sync = () => { cbox.hidden = f.aud.value === 'all'; };
      f.querySelectorAll('input[name=aud]').forEach((r) => r.addEventListener('change', sync)); sync();
      const values = () => ({ kind: f.kind.value, title: f.title.value.trim(), version: f.version.value.trim(), notes: f.notes.value.trim(),
        centers: f.aud.value === 'all' ? null : [...f.querySelectorAll('input[name=center]:checked')].map((i) => i.value) });
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const v = values();
        if (v.title.length < 3 || !/^[A-Za-z0-9][A-Za-z0-9._-]{0,30}$/.test(v.version) || (v.centers && !v.centers.length)) { msg.className = 'msg bad hq-wide'; msg.textContent = `${S.relTitle} · ${S.relVersion} · ${S.audience}`; return; }
        box.querySelector('p').textContent = S.publishConfirm(v.centers ? v.centers.length : 'all'); box.hidden = false; box.querySelector('[data-yes]').focus();
      });
      box.querySelector('[data-no]').addEventListener('click', () => { box.hidden = true; });
      box.querySelector('[data-yes]').addEventListener('click', async () => {
        const v = values(); box.hidden = true;
        const w = await src(() => rpc('hq_content_release_publish', { p_kind: v.kind, p_title: v.title, p_version: v.version, p_notes: v.notes || null, p_centers: v.centers }));
        msg.className = `msg hq-wide ${w.ok ? 'ok' : 'bad'}`; msg.textContent = w.ok ? S.published(w.data.centers) : friendly(w.error);
        if (w.ok) { live(msg.textContent); f.reset(); sync(); fill('curriculum', el); }
      });
    }

    function bindRequest(el) {
      const open = el.querySelector('#hqBgOpen'), f = el.querySelector('#hqBgForm'); if (!f || f.dataset.bound) return; f.dataset.bound = '1';
      const errs = f.querySelector('#hqBgErrs'), msg = f.querySelector('#hqBgMsg'), box = f.querySelector('#hqBgConfirm');
      const show = () => { f.hidden = false; open.setAttribute('aria-expanded', 'true'); open.hidden = true; if (state.pendingCenter) { f.center.value = state.pendingCenter; state.pendingCenter = null; } f.center.focus(); };
      open.addEventListener('click', show);
      if (state.pendingCenter) show();
      const vals = () => ({ center: f.center.value, ticket: f.ticket.value, reason: f.reason.value, scopes: [...f.querySelectorAll('input[name=scope]:checked')].map((i) => i.value), hours: Number(f.hours.value), emergency: f.emergency.checked });
      const syncEm = () => { const em = f.emergency.checked; f.querySelector('#hqBgSend').textContent = em ? S.bgSendEm : S.bgSend; box.querySelector('[data-yes]').textContent = em ? S.bgSendEm : S.bgSend;
        f.querySelectorAll('input[name=scope]').forEach((i) => { if (i.value === 'health_records' || i.value === 'special_education' || i.value === 'financials') { i.disabled = em; if (em) i.checked = false; } }); if (em) f.hours.max = '4'; else f.hours.max = '72'; };
      f.emergency.addEventListener('change', syncEm);
      f.addEventListener('submit', (e) => {
        e.preventDefault(); const er = H.grantFormErrors(vals(), lang);
        errs.innerHTML = Object.values(er).map((x) => `<li>${esc(x)}</li>`).join('');
        if (Object.keys(er).length) return;
        box.hidden = false; box.querySelector('[data-yes]').focus();
      });
      box.querySelector('[data-no]').addEventListener('click', () => { box.hidden = true; });
      box.querySelector('[data-yes]').addEventListener('click', async () => {
        const v = vals(); box.hidden = true;
        const w = await src(() => rpc('support_grant_request', { p_center: v.center, p_ticket: v.ticket.trim(), p_reason: v.reason.trim(), p_scopes: v.scopes, p_hours: v.hours, p_emergency: v.emergency }));
        msg.className = `msg hq-wide ${w.ok ? 'ok' : 'bad'}`; msg.textContent = w.ok ? (v.emergency ? S.bgOpened : S.bgSent) : friendly(w.error);
        if (w.ok) { live(msg.textContent); grants.unshift({ ...w.data, center: byId.get(v.center)?.name || '', mine: true, reads: 0 }); const g = el.querySelector('#hqGrants'); if (g) g.innerHTML = grantsHtml(); f.reset(); syncEm(); fill('breakglass', el); }
      });
    }

    // ---- drawers ----
    function drawer(kind) {
      const [k, arg] = kind.split(':');
      if (k === 'center') {
        const c = byId.get(arg); if (!c) return null;
        const h = health.get(c.center_id);
        return { title: c.name, html: `<div class="hq-dr-hero">${scoreBadge(c.center_id, 120)}<div><p>${lifeChip(c.lifecycle?.status)} ${tierChip(c.tier)} ${demoChip(c)}</p><p class="ffs-sub">${esc(S.drawerSummary)}</p>
            ${c.lifecycle?.why ? `<p class="ffs-note">${esc(c.lifecycle.why)}</p>` : ''}${c.lifecycle?.offboarding ? `<p class="ffs-note">${esc(S.offboard({ ...c.lifecycle.offboarding, contract_end_on: dfmt(c.lifecycle.offboarding.contract_end_on), suspend_on: dfmt(c.lifecycle.offboarding.suspend_on), delete_on: dfmt(c.lifecycle.offboarding.delete_on) }))}</p>` : ''}</div></div>
          ${tableHtml(esc, { head: ['', ''], rows: [[S.enrolled, c.small_center ? S.small : c.enrolled ?? S.hidden], [S.capacity, c.capacity ?? '—'], [S.attendance, c.attendance_rate == null ? '—' : `${c.attendance_rate}%`],
              [S.staff, `${c.staff ?? '—'}${c.staff_needed != null ? ` / ${c.staff_needed} ${S.needed.toLowerCase()}` : ''}`], [S.compliance, c.compliance?.score == null ? S.nc : `${c.compliance.score}% · ${S.overdue} ${c.compliance.overdue ?? 0}`],
              [S.licence, S.licenceDays(c.license?.days_left)], [S.fire, c.drills?.fire_overdue ? S.overdue : S.ok], [S.tornado, c.drills?.tornado_overdue ? S.overdue : S.ok],
              [S.tabs.credentials, `${S.expired} ${c.credentials?.expired ?? 0} · ${S.expiring} ${c.credentials?.expiring_60 ?? 0}`], [S.incidents, c.incidents ?? S.hidden]] })}
          ${h?.why?.length ? `<p class="ffs-note">${esc(S.health)}: ${esc(h.why.map(([w, n]) => `${S.why_[w] || w} −${n}`).join(' · '))}</p>` : ''}
          <div id="hqDrDetail"><p class="ffs-empty">${esc(S.loading)}</p></div>
          <p class="ffs-note">${icon('lock')} ${esc(S.noMoney)}</p>
          <a class="ffs-btn ffs-btn-soft" href="${esc(viewHrefSafe('breakglass', 'request'))}" data-view="breakglass" data-tab="request" data-bg-center="${esc(c.center_id)}">${icon('lock')}${esc(S.requestHere)}</a>`,
          bind: (el) => {
            el.querySelector('[data-bg-center]')?.addEventListener('click', () => { state.pendingCenter = c.center_id; const f = document.querySelector('#hqBgForm'); if (f) { f.hidden = false; f.center.value = c.center_id; const o = document.querySelector('#hqBgOpen'); if (o) o.hidden = true; } }, { capture: true });
            rpc('hq_center_detail', { p_center: c.center_id, p_days: 30 }).then((d) => {
              const box = el.querySelector('#hqDrDetail'); if (!box) return;
              const ent = d.entitlements || {};
              box.innerHTML = `<h3>${esc(S.rooms)}</h3>${(d.rooms || []).length ? tableHtml(esc, { head: [S.rooms, S.ageGroup, S.capacity, S.enrolled], rows: d.rooms.map((r) => [r.name, r.age_group || '—', r.capacity ?? '—', r.enrolled ?? S.hidden]) }) : `<p class="ffs-empty">${esc(S.noRooms)}</p>`}
                <h3>${esc(S.due)}</h3>${(d.due || []).length ? `<ul class="ffs-list">${d.due.slice(0, 8).map((x) => `<li class="ffs-row"><span class="ffs-dot ffs-t-${x.bucket === 'overdue' ? 'bad' : x.bucket === 'due_soon' ? 'gold' : 'navy'}">${icon('doc')}</span><span class="ffs-row-t"><b>${esc(x.title)}</b><span>${esc(`${x.items ?? S.hidden} ${S.items}${x.next_due ? ` · ${S.nextDue} ${dfmt(x.next_due)}` : ''}`)}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noDue)}</p>`}
                <h3>${esc(S.entitlements)}</h3><p>${(ent.rows || []).filter((r) => r.active).map((r) => `<span class="ffs-chip ffs-chip-bop">${esc(r.key.startsWith('tier:') ? S.tier[r.key.slice(5)] || r.key : r.key)}</span>`).join(' ') || esc(S.tierNone)}</p>
                <p class="ffs-note">${esc(S.effective)}: ${esc((ent.effective || []).length)} · ${esc(S.tierDraft)}</p>
                <h3>${esc(S.releases)}</h3>${(d.releases || []).length ? `<ul class="ffs-list">${d.releases.map((x) => `<li class="ffs-row"><span class="ffs-dot ffs-t-bop">${icon('book')}</span><span class="ffs-row-t"><b>${esc(x.title)}</b><span>${esc(x.version)}</span></span><span class="ffs-chip ${x.status === 'adopted' ? 'ffs-chip-ok' : 'ffs-chip-warn'}">${esc(x.status === 'adopted' ? S.adopted : x.status === 'declined' ? S.declined : S.pending)}</span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.noReleases)}</p>`}
                <h3>${esc(S.grantsOn)}</h3>${(d.grants || []).length ? `<ul class="ffs-list">${d.grants.map((g) => `<li class="ffs-row"><span class="ffs-dot ffs-t-${g.live ? 'bad' : 'navy'}">${icon('lock')}</span><span class="ffs-row-t"><b>${esc((g.scopes || []).map((s2) => S.scope[s2] || s2).join(', '))}</b><span>${esc(S.gStatus[H.grantState(g).key] || g.status)} · ${esc(tfmt(g.requested_at))}</span></span></li>`).join('')}</ul>` : `<p class="ffs-empty">${esc(S.bgNone)}</p>`}`;
            }).catch((e) => { const box = el.querySelector('#hqDrDetail'); if (box) box.innerHTML = `<p class="msg bad">${esc(friendly(e))}</p>`; });
          } };
      }
      if (k === 'grant') {
        const g = grants.find((x) => x.id === arg); if (!g) return null;
        const st = H.grantState(g);
        return { title: `${g.center} · ${g.ticket}`, html: `<p><span class="ffs-chip ${st.key === 'active' ? 'ffs-chip-bad' : st.key === 'requested' ? 'ffs-chip-warn' : ''}">${esc(S.gStatus[st.key] || st.key)}</span>${st.key === 'active' ? ` <b>${esc(S.gLeft(st.left))}</b>` : ''}${g.emergency ? ' <span class="ffs-chip ffs-chip-bad">!</span>' : ''}</p>
            ${tableHtml(esc, { head: ['', ''], rows: [[S.center, g.center], [S.bgScopes, (g.scopes || []).map((k2) => S.scope[k2] || k2).join(', ')], [S.why, g.reason], [S.bgTicket, g.ticket], [S.bgHours, g.hours],
              [S.who, g.requested_by || '—'], [S.when, tfmt(g.requested_at)], ['→', g.expires_at ? tfmt(g.expires_at) : '—'], [S.tabs.log, S.gReads(g.reads || 0)]] })}
            ${g.decision_note ? `<p class="ffs-note">${esc(g.decision_note)}</p>` : ''}
            ${g.mine && (st.key === 'active' || st.key === 'requested') ? `<button class="ffs-btn ffs-btn-navy" type="button" id="hqEnd">${esc(S.bgEnd)}</button> <span class="msg" role="status" id="hqEndMsg"></span>` : ''}`,
          bind: (el) => el.querySelector('#hqEnd')?.addEventListener('click', async (e) => {
            const w = await src(() => rpc('support_grant_revoke', { p_grant: g.id }));
            el.querySelector('#hqEndMsg').textContent = w.ok ? S.bgEnded : friendly(w.error);
            if (w.ok) { Object.assign(g, w.data); e.target.remove(); live(S.bgEnded); const b = document.querySelector('#hqGrants'); if (b) b.innerHTML = grantsHtml(); }
          }) };
      }
      if (k === 'kpi') {
        const rows = [...centers].sort((a, b) => a.name.localeCompare(b.name));
        const T = {
          enroll: [S.kEnroll, [S.center, S.enrolled, S.capacity], (c) => [c.name, c.small_center ? S.hidden : c.enrolled ?? S.hidden, c.capacity ?? '—'], K.enroll.frac, 'booker'],
          attend: [S.kAttend, [S.center, S.attendance], (c) => [c.name, c.attendance_rate == null ? '—' : `${c.attendance_rate}%`], K.attend.frac, 'zuri'],
          staff: [S.kStaff, [S.center, S.staff, S.needed], (c) => [c.name, c.staff ?? '—', c.staff_needed ?? S.nc], K.staff.frac, 'lumi'],
          comp: [S.kComp, [S.center, S.compliance, S.overdue], (c) => [c.name, c.compliance?.score == null ? S.nc : `${c.compliance.score}%`, c.compliance?.overdue ?? '—'], K.comp.frac, 'gold'],
          inc: [S.kInc, [S.center, S.incidents, S.kInc], (c) => [c.name, c.incidents ?? S.hidden, c.incidents_open ?? S.hidden], null, 'warn'],
        }[arg];
        if (arg === 'content') return { title: S.kContent, href: '/hq/content', go: S.contentQueue, html: `<div class="hq-dr-hero">${glowRingSvg(null, { tone: 'bop', size: 150, stroke: 14 })}<p><b class="ffs-big">${esc(K.content.a ?? '—')}</b><br>${esc(S.kContentSub(K.content.a ?? 0, K.content.drafting))}</p></div>
            ${tableHtml(esc, { head: [S.what, S.items], rows: Object.entries(O.network?.content_backlog?.by_state || {}).map(([k2, n]) => [S.state_[k2] || k2, n]) })}` };
        if (!T) return null;
        return { title: T[0], html: `<div class="hq-dr-hero">${glowRingSvg(T[3], { tone: T[4], size: 150, stroke: 14 })}<p class="ffs-note">${esc(O.network?.note || '')}</p></div>${tableHtml(esc, { head: T[1], rows: rows.map(T[2]) })}` };
      }
      return null;
    }

    sh = createShell({ rootId: 'hq', views: H.HQ_VIEWS, words: S, phoneBar: H.HQ_BAR, esc, live, buildView, drawer, motionOn,
      reveal: { key: 'hq:overview', cards: '.hq-cockpit .ffs-kpi' },
      afterBuild: (id, el) => { fill(id, el); } });
    const actions = `<nav class="ffs-actions" id="hqActions" aria-label="${esc(S.actions)}">
      <a class="ffs-action ffs-action-gold" id="qaPublish" href="${esc(sh.viewHref('curriculum', 'publish'))}" data-view="curriculum" data-tab="publish"><span class="ffs-aico">${icon('announcement')}</span><span class="ffs-a-long">${esc(S.tabs.publish)}</span><span class="ffs-a-short">${esc(S.views.curriculum)}</span></a>
      <a class="ffs-action" id="qaQueue" href="/hq/content" data-nav><span class="ffs-aico">${icon('doc')}</span><span class="ffs-a-long">${esc(S.contentQueue)}</span><span class="ffs-a-short">${esc(S.tabs.pipeline)}</span></a>
      <a class="ffs-action" id="qaClassic" href="/hq?classic=1" data-nav><span class="ffs-aico">${icon('grid')}</span><span class="ffs-a-long">${esc(S.classic)}</span><span class="ffs-a-short">${esc(S.tabs.list)}</span></a></nav>`;
    const badges = attn.length ? { overview: { n: attn.length, label: S.attentionN(attn.length) } } : {};
    page(host(`<div class="ffs ffs-director ffs-hq" id="hq" data-view="${esc(sh.ui.view)}">${sh.railHtml({ actions, badges })}
      <div class="ffs-stage" id="hqStage">${sh.barHtml()}${sh.viewsHtml()}</div>${sh.tabbarHtml()}</div>`), S.title);
    hostUp();
    sh.bind();
    headerName();
    const more = document.getElementById('hqAttnMore');
    more?.addEventListener('click', () => {
      const open = more.getAttribute('aria-expanded') !== 'true';
      document.querySelectorAll('#hqAttnList > li').forEach((li, n) => { if (n >= 4) li.hidden = !open; });
      more.setAttribute('aria-expanded', String(open)); more.textContent = open ? more.dataset.on : more.dataset.off;
    });
    // the header's account link: the person's name and the portal's character, not the sign-in email (as the staff and parent dashboards)
    function headerName() {
      const a = document.getElementById('accountLink'); if (!a || !fullName || /@/.test(fullName)) return;
      a.title = s.user.email || '';
      a.classList.add('sv2-who');
      a.innerHTML = `${adultImg(ch, { cls: 'sv2-who-img', w: 18, h: 36 })}<span>${esc(fullName)}</span>`;
      a.setAttribute('aria-label', `${fullName} · ${lang === 'es' ? 'Mi cuenta' : 'My account'}`);
    }
  }

  return { viewHq };
}
