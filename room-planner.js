/* Futures Friends: the Room Planner (#room-planner, and a "Plan your own room" section on #room-kit), owner 2026-10-07:
   "It needs to be customizable. They can move things around and set it up for their space, putting in their own measurements ...
   line it all out so when they see it they can put it together the proper way ... have my back."
   The model (geometry, licensing space rules, fit check, auto-arrange, bill of materials, share encoding) is room-planner-core.js;
   this file draws the page and handles the visitor. Client-side only: it sends nothing. Layouts are kept on this device
   (localStorage, every access in try/catch), in a share link (the layout encoded in the address after #room-planner/), in a
   downloaded file (JSON or PNG) or on paper (print / save as PDF). "Send my layout for a quote" only fills the site's existing
   intake form (FFIntake.contactHtml); when online requests are not open yet it gives the summary to copy, or to email from the
   visitor's own mail app.
   Rules: approved prices only (see the core); Bop purple; story-world characters labelled; no curriculum lesson content;
   keyboard: every item is a button, arrow keys move the selected one (Shift = 1 ft, Alt = 1 in), R rotates, Delete removes,
   Ctrl/Cmd+Z undoes; a text description of the whole layout sits under the plan; nothing moves under reduced motion.
   Public: window.FFRoomPlanner = { state, set, load, refresh, select, move, band }. */
(function () {
'use strict';
if (typeof V === 'undefined') return;
const W = window, C = W.FFRoomPlannerCore;
if (!C) return;
const E = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const money = n => '$' + Number(n).toLocaleString('en-US');
const KEY = 'ff-room-planner-v1', SAVES = 'ff-room-planner-saves-v1';
const PHONE = '(816) 988-5661', EMAIL = 'info@futureslearningcenter.com';
const store = {
  get(k) { try { return W.localStorage ? W.localStorage.getItem(k) : null; } catch (_) { return null; } },
  set(k, v) { try { if (!W.localStorage) return false; W.localStorage.setItem(k, v); return true; } catch (_) { return false; } }
};
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
const reduced = () => { try { return W.matchMedia && W.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { return false; } };

// ---------------------------------------------------------------- state
let S = null, sel = null, hist = [], fut = [], lastArg = null, issues = [];
const ui = { tab: 'room', sight: false, paths: true, snap: 6 };
const tiers = () => (W.FFRoomKit && W.FFRoomKit.TIERS ? W.FFRoomKit.TIERS() : C.TIERS);
function initial() {
  const a = typeof arg !== 'undefined' ? arg : null;
  if (a && a !== lastArg) { lastArg = a; const d = C.decode(String(a)); if (d) { S = d; sel = null; note('Loaded the layout from your link.'); return; } }
  if (S) return;
  const saved = store.get(KEY), d = saved ? C.fromJSON(saved) : null;
  S = d || C.template('classroom');
}
const snap = () => JSON.stringify(S);
const unsnap = j => C.sanitize(JSON.parse(j));
function commit(before) { if (before && before !== snap()) { hist.push(before); if (hist.length > 60) hist.shift(); fut = []; } autosave(); refresh(); }
function change(fn) { const before = snap(); fn(); commit(before); }
let saveMsg = '';
function autosave() { saveMsg = store.set(KEY, JSON.stringify(C.pack(S))) ? 'Saved on this device.' : 'This browser is not keeping layouts (private window?). Use Download or Copy link to keep it.'; const m = $('[data-rp-saved]'); if (m) m.textContent = saveMsg; }
let noteTimer = 0;
function note(msg) { const l = $('[data-rp-live]'); if (l) { l.textContent = ''; clearTimeout(noteTimer); noteTimer = setTimeout(() => { l.textContent = msg; }, 30); } }
const item = id => S.items.find(i => i.id === id);
const units = () => S.setup.units;
const len = n => C.fmtLen(n, units());

// ---------------------------------------------------------------- the page
const ICON = {
  undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 0 12h-3"/>',
  redo: '<path d="M15 14l5-5-5-5"/><path d="M20 9H10a6 6 0 0 0 0 12h3"/>',
  rotate: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
  trash: '<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',
  copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M4 16V4h12"/>',
  magic: '<path d="M4 20L16 8M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.7 1.3L21 13l-1.3.7L19 15l-.7-1.3L17 13l1.3-.7z"/>',
  eye: '<path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"/><circle cx="12" cy="12" r="2.6"/>',
  paw: '<ellipse cx="12" cy="15" rx="4.5" ry="3.8"/><circle cx="6.5" cy="9.5" r="1.8"/><circle cx="10" cy="6.5" r="1.8"/><circle cx="14" cy="6.5" r="1.8"/><circle cx="17.5" cy="9.5" r="1.8"/>',
  link: '<path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1"/><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1"/>',
  down: '<path d="M12 4v11M7 10l5 5 5-5M5 20h14"/>',
  print: '<path d="M7 9V3h10v6M7 17H4v-7h16v7h-3"/><rect x="7" y="14" width="10" height="7"/>',
  up: '<path d="M12 20V9M7 14l5-5 5 5M5 4h14"/>',
  save: '<path d="M5 3h11l3 3v15H5z"/><path d="M8 3v6h8V3M8 21v-7h8v7"/>',
  send: '<path d="M4 12l16-8-6 16-2-7z"/>'
};
const ico = k => `<svg class="rp-ico" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON[k] || ''}</svg>`;
const opt = (v, l, cur) => `<option value="${E(v)}"${String(v) === String(cur) ? ' selected' : ''}>${E(l)}</option>`;

function hero() {
  return `<header class="wc-hero rk-hero rp-hero"><div class="wrap rp-herogrid"><div class="wc-hero-copy">
   <span class="rk-kick rk-kick-dark">Learning Zones Kit · Room Planner</span>
   <h1>Plan your room</h1>
   <p class="lede">Put in your room’s real measurements, mark the doors and windows, then place each friend’s zone. The planner checks the fit as you go: space per child, a 36 in clear path to every exit, walkways, door swings and what an adult can see from where they sit.</p>
   <ul class="rk-facts"><li>Your measurements, feet or metres</li><li>Fit check as you move</li><li>Saves on this device</li><li>Print it or send it for a quote</li></ul>
   <div class="wc-acts"><button type="button" class="btn gold" data-anchor="rp-app">Start planning</button><a class="btn ghost" href="#room-kit">About the kit</a></div></div>
   <figure class="rp-heroplan" aria-hidden="true">${C.svg(C.template('home'), { idp: 'rp-hero', title: 'Example: a 12 x 14 ft home daycare room' })}</figure></div></header>`;
}

function app() {
  return `<section class="rp-sec rp-app band-paper" id="rp-app" aria-labelledby="rp-app-h"><div class="wrap">
   <div class="rp-head"><span class="rk-kick">Step by step</span><h2 id="rp-app-h">Your room, to scale</h2>
    <p class="lede">1. Room: your measurements and who you serve. 2. Add: doors, windows and the kit. 3. Move things into place. 4. Check: fix anything red. 5. Quote: see what arrives and send it to us.</p></div>
   <div class="rp-toolbar" role="toolbar" aria-label="Plan tools" data-rp-toolbar>${toolbar()}</div>
   <div class="rp-grid">
    <div class="rp-stage">
     <div class="rp-canvas" data-rp-canvas>${canvas()}</div>
     <div class="rp-status" data-rp-status>${status()}</div>
     <p class="rp-help" id="rp-help">Drag to move. Or select an item and use the arrow keys (Shift moves 1 ft, Alt moves 1 in). R turns it, Delete removes it, Ctrl or Cmd + Z undoes.</p>
    </div>
    <div class="rp-side">
     <div class="rp-tabs" role="tablist" aria-label="Planner steps">${TABS.map(([k, l], i) => `<button type="button" role="tab" id="rp-tab-${k}" aria-controls="rp-panel-${k}" aria-selected="${ui.tab === k}" tabindex="${ui.tab === k ? 0 : -1}" data-rp-tab="${k}"><span class="rp-tabn" aria-hidden="true">${i + 1}</span>${l}</button>`).join('')}</div>
     ${TABS.map(([k]) => `<div class="rp-panel" role="tabpanel" id="rp-panel-${k}" aria-labelledby="rp-tab-${k}" tabindex="0" data-rp-panel="${k}"${ui.tab === k ? '' : ' hidden'}>${PANELS[k]()}</div>`).join('')}
    </div>
   </div>
   <div class="rp-files" data-rp-files>${files()}</div>
   <details class="rp-words"><summary>The layout in words (for screen readers and printing)</summary><div data-rp-words>${words()}</div></details>
   <p class="wc-vh" aria-live="polite" data-rp-live></p>
  </div></section>`;
}
const TABS = [['room', 'Room'], ['add', 'Add'], ['item', 'Selected'], ['check', 'Check'], ['quote', 'Quote']];

function toolbar() {
  const tpl = Object.entries(C.TEMPLATES).map(([k, t]) => opt(k, t.name, '')).join('');
  return `<label class="rp-tpl"><span>Start from</span><select class="i" data-rp-template aria-label="Start from a layout"><option value="">Choose a layout…</option>${tpl}</select></label>
   <button type="button" class="btn soft rp-tb" data-rp-act="arrange" title="Place the kit for this room size">${ico('magic')}Auto-arrange</button>
   <span class="rp-tbgroup"><button type="button" class="btn soft rp-tb rp-icon" data-rp-act="undo" aria-label="Undo"${hist.length ? '' : ' disabled'}>${ico('undo')}</button><button type="button" class="btn soft rp-tb rp-icon" data-rp-act="redo" aria-label="Redo"${fut.length ? '' : ' disabled'}>${ico('redo')}</button></span>
   <span class="rp-tbgroup"><button type="button" class="btn soft rp-tb rp-icon" data-rp-act="rotate" aria-label="Turn the selected item"${sel && C.cat(item(sel) || {}) !== 'wall' ? '' : ' disabled'}>${ico('rotate')}</button><button type="button" class="btn soft rp-tb rp-icon" data-rp-act="dup" aria-label="Duplicate the selected item"${sel ? '' : ' disabled'}>${ico('copy')}</button><button type="button" class="btn soft rp-tb rp-icon" data-rp-act="del" aria-label="Remove the selected item"${sel ? '' : ' disabled'}>${ico('trash')}</button></span>
   <button type="button" class="btn soft rp-tb" data-rp-act="sight" aria-pressed="${ui.sight}">${ico('eye')}Sightlines</button>
   <button type="button" class="btn soft rp-tb" data-rp-act="paths" aria-pressed="${ui.paths}">${ico('paw')}Paths</button>
   <label class="rp-snap"><span>Snap</span><select class="i" data-rp-snap aria-label="Snap to grid">${[[1, '1 in'], [3, '3 in'], [6, '6 in'], [12, '1 ft']].map(([v, l]) => opt(v, units() === 'm' ? { 1: '2.5 cm', 3: '7.5 cm', 6: '15 cm', 12: '30 cm' }[v] : l, ui.snap)).join('')}</select></label>`;
}

function canvas() {
  const r = S.room;
  return `<div class="rp-svgbox" style="aspect-ratio:${(r.w + 2 * pad()) / (r.l + 2 * pad())}">${C.svg(S, { interactive: true, selected: sel, issues, sight: ui.sight, paths: ui.paths, idp: 'rp-plan', title: `Your room plan, ${len(r.w)} wide by ${len(r.l)} long. ${S.items.length} items. Use Tab to reach each item.` })}</div>`;
}
const pad = () => Math.max(30, Math.min(S.room.w, S.room.l) * 0.12);

// the compliance meter and the fit-check headline
function status() {
  const sp = C.space(S), sm = C.summary(issues), st = C.STATES[S.setup.state];
  const pc = sp.children ? sp.perChild : null, pct = pc ? Math.min(100, Math.round((pc / (sp.min * 2)) * 100)) : 0;
  const cls = !sp.children ? 'is-none' : sp.ok ? 'is-ok' : 'is-stop';
  const head = sm.stop ? `<b class="rp-bad">${sm.stop} to fix</b>` : '<b class="rp-good">Nothing blocking</b>';
  return `<div class="rp-meterwrap ${cls}">
    <div class="rp-meterhead"><b>Space per child</b><span>${pc ? `${Math.round(pc * 10) / 10} sq ft · ${st} minimum ${sp.min}` : 'Enter how many children use the room'}</span></div>
    <div class="rp-meter" role="meter" aria-label="Usable square feet per child" aria-valuemin="0" aria-valuemax="${sp.min * 2}" aria-valuenow="${pc ? Math.round(pc) : 0}" aria-valuetext="${pc ? `${Math.round(pc)} square feet per child, minimum ${sp.min}` : 'not set'}"><span class="rp-meterfill" style="width:${pct}%"></span><span class="rp-metermin" style="left:50%"></span></div>
    <p class="rp-meterfoot">${Math.round(sp.usableSqft)} sq ft usable${sp.fixedSqft >= 1 ? ` (${Math.round(sp.fixedSqft)} sq ft of fixed equipment taken off)` : ''}. Fits up to <b>${sp.capacity}</b> children here (${E(sp.cite)}).</p></div>
   <div class="rp-fit"><p class="rp-fithead">${head}${sm.warn ? ` · <b class="rp-warn">${sm.warn} to review</b>` : ''} <button type="button" class="rl" data-rp-goto="check">See the fit check</button></p>
    <ul class="rp-chips">${FITS.map(([k, l]) => { const n = issues.filter(i => i.level !== 'tip' && k.includes(i.kind)).length, bad = issues.some(i => i.level === 'stop' && k.includes(i.kind)); return `<li class="${n ? (bad ? 'is-stop' : 'is-warn') : 'is-ok'}"><span aria-hidden="true">${n ? (bad ? '✕' : '!') : '✓'}</span>${l}${n ? `: ${n}` : ''}</li>`; }).join('')}</ul></div>
   <p class="rp-saved" data-rp-saved>${E(saveMsg)}</p>`;
}
const FITS = [[['fit'], 'Fits the room'], [['walk'], 'Walkways 36 in'], [['exit'], 'Clear exit path'], [['sight'], 'Sightlines'], [['space'], 'Space per child'], [['safety', 'calm', 'access', 'age'], 'Safety and comfort']];

// ---------------------------------------------------------------- side panels
const lenInput = (key, inches, label) => units() === 'm'
  ? `<label class="f">${label} (m)<input class="i" type="number" inputmode="decimal" min="1" max="30" step="0.01" data-rp-room="${key}" data-u="m" value="${(inches * 0.0254).toFixed(2)}"></label>`
  : `<div class="rp-ftin" role="group" aria-labelledby="rp-l-${key}"><span class="rp-ftlabel" id="rp-l-${key}">${label}</span><label class="f"><span class="wc-vh">${label}, </span>feet<input class="i" type="number" inputmode="numeric" min="4" max="99" step="1" data-rp-room="${key}" data-u="ft" value="${Math.floor(inches / 12)}"></label><label class="f"><span class="wc-vh">${label}, </span>inches<input class="i" type="number" inputmode="numeric" min="0" max="11" step="1" data-rp-room="${key}" data-u="in" value="${Math.round(inches % 12)}"></label></div>`;
const PANELS = {
  room() {
    const su = S.setup;
    return `<h3 class="rp-ph">Your room</h3>
     <fieldset class="rp-fs"><legend>Measure in</legend><div class="rp-seg">${[['ft', 'Feet and inches'], ['m', 'Metres']].map(([v, l]) => `<label><input type="radio" name="rp-units" value="${v}" data-rp-units${su.units === v ? ' checked' : ''}><span>${l}</span></label>`).join('')}</div></fieldset>
     <div class="rp-dims">${lenInput('w', S.room.w, 'Width (west to east wall)')}${lenInput('l', S.room.l, 'Length (north to south wall)')}</div>
     <p class="rp-note">Measure wall to wall at floor level, at the narrowest point. <button type="button" class="rl" data-anchor="rp-measure">How to measure</button></p>
     <div class="rp-two"><label class="f">State<select class="i" data-rp-setup="state">${Object.entries(C.STATES).map(([k, v]) => opt(k, v, su.state)).join('')}</select></label>
      <label class="f">Room type<select class="i" data-rp-setup="type">${Object.entries(C.ROOM_TYPES).map(([k, v]) => opt(k, v, su.type)).join('')}</select></label></div>
     <fieldset class="rp-fs"><legend>Ages in this room</legend><div class="rp-checks">${Object.entries(C.AGES).map(([k, v]) => `<label><input type="checkbox" value="${k}" data-rp-age${(su.ages || []).includes(k) ? ' checked' : ''}><span>${v}</span></label>`).join('')}</div></fieldset>
     <div class="rp-two"><label class="f">Most children in the room at once<input class="i" type="number" inputmode="numeric" min="0" max="500" data-rp-setup="children" value="${su.children || ''}"></label>
      <label class="f">Rooms you are setting up<input class="i" type="number" inputmode="numeric" min="1" max="99" data-rp-setup="rooms" value="${su.rooms || 1}"></label></div>
     <p class="rp-note">The space check uses usable floor: the planner takes off bathrooms, sinks, built-ins, cubbies and columns you add. Your licensing specialist has the final word.</p>
     <button type="button" class="btn gold" data-rp-act="arrange">${ico('magic')}Auto-arrange the kit for this room</button>`;
  },
  add() {
    const fr = C.FRIENDS.map(k => opt(k, C.ZONES[k].short + ' · ' + C.ZONES[k].name, '')).join('');
    const btn = (t, l, extra) => `<button type="button" class="rp-add" data-rp-add="${t}"${extra || ''}>${E(l)}</button>`;
    return `<h3 class="rp-ph">Add to the plan</h3>
     <h4 class="rp-sh">Your room’s fixed features</h4><div class="rp-addgrid">${btn('door', 'Door')}${btn('exitdoor', 'Exit door')}${btn('window', 'Window')}${btn('outlet', 'Outlet')}${btn('heater', 'Heater or radiator')}${btn('sink', 'Sink and counter')}${btn('bath', 'Bathroom')}${btn('builtin', 'Built-in shelves')}${btn('cubbies', 'Cubbies')}${btn('column', 'Column')}</div>
     <h4 class="rp-sh">Furniture you already own</h4><div class="rp-addgrid">${btn('table', 'Table')}${btn('lowshelf', 'Low shelf (up to 30 in)')}${btn('tallshelf', 'Tall shelf')}${btn('piano', 'Piano or stage edge')}</div>
     <h4 class="rp-sh">Learning Zones Kit</h4>
     <div class="rp-kitrow"><label class="f">Friends Circle rug<select class="i" data-rp-pick="circle">${C.TYPES.circle.sizes.map(s => opt(s[0], s[1], 'r8')).join('')}</select></label>${btn('circle', 'Add rug')}</div>
     <div class="rp-kitrow"><label class="f">Zone mat for<select class="i" data-rp-pick="matz">${fr}</select></label><label class="f">Size<select class="i" data-rp-pick="mat">${C.TYPES.mat.sizes.map(s => opt(s[0], s[1], S.setup.type === 'home' ? '35' : '46')).join('')}</select></label>${btn('mat', 'Add mat')}</div>
     <div class="rp-kitrow"><label class="f">Friend Fence for<select class="i" data-rp-pick="fencez">${fr}</select></label><label class="f">Piece<select class="i" data-rp-pick="fence">${opt('36', '36 in panel', '36')}${opt('24', '24 in short panel', '')}${opt('corner', 'Corner piece', '')}</select></label>${btn('fence', 'Add fence')}</div>
     <div class="rp-kitrow"><label class="f">Sign, poster or basket for<select class="i" data-rp-pick="wallz">${fr}</select></label><div class="rp-addgrid rp-add3">${btn('sign', S.setup.type === 'church' ? 'Sign (banner stand)' : 'Zone sign')}${btn('poster', S.setup.type === 'church' ? 'Poster (banner stand)' : 'Poster')}${btn('basket', 'Puppet basket')}</div></div>
     <p class="rp-note">Fences are 24 in high with a see-through top, so a seated adult sees over them. Paw-print paths draw themselves from the Friends Circle to each mat. Shelf Bands go on your own low shelves: add a low shelf, then pick its friend.</p>
     <h4 class="rp-sh">Planning marks</h4><div class="rp-addgrid">${btn('teacher', 'Teacher position')}</div>`;
  },
  item() {
    const it = sel && item(sel);
    if (!it) return `<h3 class="rp-ph">Selected item</h3><p class="rp-note">Tap or click anything on the plan (or Tab to it) to change its size, turn it, or type its exact position.</p>${list()}`;
    const T0 = C.TYPES[it.t], wall = C.cat(it) === 'wall', b = C.box(it, S.room), u = units();
    const num = (k, v, l, extra) => `<label class="f">${l} (${u === 'm' ? 'cm' : 'in'})<input class="i" type="number" inputmode="decimal" step="${u === 'm' ? '1' : '1'}" data-rp-it="${k}" value="${u === 'm' ? Math.round(v * 2.54) : Math.round(v)}"${extra || ''}></label>`;
    const out = [`<h3 class="rp-ph">${E(C.label(it))}</h3>`];
    if (T0.friend) out.push(`<label class="f">Friend<select class="i" data-rp-it="z">${C.FRIENDS.map(k => opt(k, C.ZONES[k].short, it.z)).join('')}</select></label>`);
    if (T0.sizes && it.t !== 'door') out.push(`<label class="f">Size<select class="i" data-rp-it="sz">${T0.sizes.map(s => opt(s[0], s[1], it.sz)).join('')}</select></label>`);
    if (it.t === 'door') out.push(`<label class="f">Width<select class="i" data-rp-it="w">${T0.sizes.map(s => opt(s[0], s[1], it.w)).join('')}${T0.sizes.some(s => s[0] === +it.w) ? '' : opt(it.w, len(it.w), it.w)}</select></label>
      <div class="rp-checks"><label><input type="checkbox" data-rp-it="exit"${it.exit ? ' checked' : ''}><span>This is an exit</span></label></div>
      <div class="rp-two"><label class="f">Opens<select class="i" data-rp-it="swing">${opt('in', 'Into the room', it.swing)}${opt('out', 'Out of the room', it.swing)}</select></label><label class="f">Hinge<select class="i" data-rp-it="hinge">${opt('L', 'Left side', it.hinge)}${opt('R', 'Right side', it.hinge)}</select></label></div>`);
    if (it.t === 'lowshelf') out.push(`<label class="f">Friend Shelf Band<select class="i" data-rp-it="band">${opt('', 'None', it.band || '')}${C.FRIENDS.map(k => opt(k, C.ZONES[k].short, it.band || '')).join('')}</select></label>`);
    if (wall) out.push(`<div class="rp-two"><label class="f">Wall<select class="i" data-rp-it="wall">${Object.entries(C.WALLS).map(([k, v]) => opt(k, v[0].toUpperCase() + v.slice(1), it.wall)).join('')}</select></label>${num('at', +it.at || 0, `From the ${it.wall === 'N' || it.wall === 'S' ? 'west' : 'north'} corner`)}</div>`
      + (it.t !== 'door' && it.t !== 'outlet' ? num('w', +it.w || T0.w, 'Width') : ''));
    else {
      const fixedSize = (it.t === 'mat' || it.t === 'circle') && it.sz !== 'custom';
      out.push(`<div class="rp-two">${num('x', b.x, 'From the west wall')}${num('y', b.y, 'From the north wall')}</div>`);
      if (!fixedSize && it.t !== 'teacher' && it.t !== 'basket' && it.t !== 'fence') out.push(`<div class="rp-two">${num('w', +it.w, it.t === 'circle' && C.isRound(it) ? 'Diameter' : 'Width')}${C.isRound(it) ? '' : num('l', +it.l, 'Depth')}</div>`);
      if (it.t === 'circle' && it.sz === 'custom') out.push(`<div class="rp-checks"><label><input type="checkbox" data-rp-it="round"${it.round ? ' checked' : ''}><span>Round</span></label></div>`);
      if (['builtin', 'tallshelf', 'cubbies', 'lowshelf', 'table', 'piano'].includes(it.t)) out.push(num('hgt', it.hgt != null ? it.hgt : T0.h, 'Height', ' min="1" max="120"'));
      out.push(`<p class="rp-note">${E(len(b.w))} by ${E(len(b.h))}${T0.h ? `, ${E(len(it.hgt != null ? it.hgt : T0.h))} high${(it.hgt != null ? it.hgt : T0.h) > C.SIGHT_H ? ': tall enough to block an adult’s view' : ''}` : ''}.</p>`);
      out.push(`<div class="wc-acts"><button type="button" class="btn soft" data-rp-act="rotate">${ico('rotate')}Turn 90°</button><button type="button" class="btn soft" data-rp-act="dup">${ico('copy')}Duplicate</button><button type="button" class="btn soft" data-rp-act="del">${ico('trash')}Remove</button></div>`);
    }
    if (wall) out.push(`<div class="wc-acts"><button type="button" class="btn soft" data-rp-act="dup">${ico('copy')}Duplicate</button><button type="button" class="btn soft" data-rp-act="del">${ico('trash')}Remove</button></div>`);
    const mine = issues.filter(i => i.ids.includes(it.id));
    if (mine.length) out.push(`<ul class="rp-issues">${mine.map(issueLi).join('')}</ul>`);
    out.push(list());
    return out.join('');
  },
  check() {
    const groups = [['stop', 'Fix before you install'], ['warn', 'Review with us'], ['tip', 'Good to know']];
    const body = groups.map(([l, h]) => { const xs = issues.filter(i => i.level === l); return xs.length ? `<h4 class="rp-sh rp-sh-${l}">${h} (${xs.length})</h4><ul class="rp-issues">${xs.map(issueLi).join('')}</ul>` : ''; }).join('');
    const sp = C.space(S);
    return `<h3 class="rp-ph">Fit check</h3>
     ${issues.some(i => i.level === 'stop') ? '' : '<p class="rp-allok">Nothing blocks this layout. Check the notes below, then send it to us.</p>'}
     ${body}
     <h4 class="rp-sh">What the planner checks</h4>
     <ul class="rp-checklist"><li>Everything fits inside your walls and nothing overlaps</li><li>A 36 in clear route from every zone and adult position to an exit, and nothing in a door swing</li><li>36 in walkways between furniture, fences and shelves</li><li>An adult position sees every zone over the 24 in fences; Lumi’s Calm Corner is fully in view</li><li>${sp.min} sq ft of usable floor per child (${E(C.STATES[S.setup.state])}, ${E(C.ROOM_TYPES[S.setup.type].toLowerCase())}, ${E(sp.cite)})</li><li>Rugs, mats, fences and paper 36 in from heaters; signs off doors and windows; wall art under 20 percent</li><li>A 60 in turning circle for a wheelchair; the calm zone away from doors and from Bop’s Movement Zone</li><li>Missouri infant and toddler rooms: washable mats instead of carpet</li></ul>
     <p class="rp-note">This is a planning aid, not a licensing approval or legal advice. Your licensing specialist and fire marshal have the final word.</p>`;
  },
  quote() {
    const b = C.bom(S, tiers());
    const groups = [['package', 'Your package'], ['starter', 'Zones Starter (in every package)'], ['boundaries', 'Zone Boundaries add-on (carpets and fences)'], ['addon', 'Other add-ons'], ['install', 'Set-up']];
    const STAT = { now: 'Available now', dev: 'In development', later: 'Coming later' };
    const price = l => l.price != null ? `<b data-price="${l.price}">${money(l.price)}</b>${l.monthly ? `<span class="rp-mo"> + <b data-price="${l.monthly}">${money(l.monthly)}</b>/mo</span>` : ''}` : `<span class="rp-q rp-q-${l.note === 'Quote' ? 'quote' : l.note === 'Included' ? 'inc' : 'later'}">${E(l.note)}</span>`;
    const rows = groups.map(([g, h]) => { const ls = b.lines.filter(l => l.group === g); return ls.length ? `<tr class="rp-grp"><th colspan="3" scope="colgroup">${h}</th></tr>${ls.map(l => `<tr><th scope="row">${E(l.name)}${l.detail ? `<span class="rp-det">${E(l.detail)}</span>` : ''}${l.status ? `<span class="rk-status rk-status-${l.status}">${STAT[l.status]}</span>` : ''}</th><td class="n">${l.qty || '–'}</td><td class="n">${price(l)}</td></tr>`).join('')}` : ''; }).join('');
    return `<h3 class="rp-ph">What arrives, and the estimate</h3>
     <label class="f">Package<select class="i" data-rp-setup="pkg">${opt('auto', `Suggested for you (${b.tier.name})`, S.setup.pkg)}${tiers().map(t => opt(t.id, t.name, S.setup.pkg)).join('')}</select></label>
     <div class="tw rp-bom" tabindex="0" role="region" aria-label="Bill of materials"><table><caption class="wc-vh">Bill of materials for this room, with approved prices</caption><thead><tr><th scope="col">Piece</th><th scope="col" class="n">Qty</th><th scope="col" class="n">Price</th></tr></thead><tbody>${rows}</tbody></table></div>
     <p class="rp-total">Estimate: <b>${money(b.startup)}</b> startup + <b>${money(b.monthly)}</b> / month${b.quoted ? `, plus ${b.quoted} item${b.quoted > 1 ? 's' : ''} we quote for your room` : ''}.</p>
     <p class="rp-note">Prices are the published packages and the Zone Boundaries add-on ($1,195 home, $1,995 classroom), before tax and delivery. Anything marked Quote is priced in your written quote once vendor prices are confirmed. This page does not take orders or payments.</p>
     <div class="rp-checks"><label><input type="checkbox" data-rp-setup="install"${S.setup.install ? ' checked' : ''}><span>I would like white-glove installation (quoted)</span></label></div>
     <div class="wc-acts"><button type="button" class="btn gold" data-rp-act="send">${ico('send')}Send my layout for a quote</button><button type="button" class="btn soft" data-rp-act="print">${ico('print')}Print or save as PDF</button></div>`;
  }
};
const issueLi = i => `<li class="rp-is rp-is-${i.level}"><span class="rp-isk">${i.level === 'stop' ? 'Fix' : i.level === 'warn' ? 'Review' : 'Tip'}</span><span>${E(i.msg)}</span>${i.ids.length && item(i.ids[0]) ? `<button type="button" class="rl" data-rp-show="${E(i.ids[0])}">Show</button>` : ''}</li>`;
function list() {
  const groups = [['fixed', 'Room'], ['own', 'Your furniture'], ['kit', 'Learning Zones Kit'], ['mark', 'Planning marks']];
  return `<h4 class="rp-sh">Everything on the plan</h4><div class="rp-list">${groups.map(([g, h]) => { const xs = S.items.filter(i => C.TYPES[i.t].g === g); return xs.length ? `<p class="rp-lh">${h}</p><ul>${xs.map(i => `<li><button type="button" class="rp-li${i.id === sel ? ' is-sel' : ''}" data-rp-show="${E(i.id)}" aria-pressed="${i.id === sel}">${E(C.label(i))}</button></li>`).join('')}</ul>` : ''; }).join('')}</div>`;
}
function words() {
  const lines = C.describe(S, issues).split('\n');
  const head = lines.filter(l => !l.startsWith('- ') && l !== 'Layout:'), it = lines.filter(l => l.startsWith('- '));
  return `${head.map(l => `<p>${E(l)}</p>`).join('')}<ul>${it.map(l => `<li>${E(l.slice(2))}</li>`).join('')}</ul>${issues.length ? `<p>Fit check notes:</p><ul>${issues.map(i => `<li>${E((i.level === 'stop' ? 'Fix: ' : i.level === 'warn' ? 'Review: ' : 'Tip: ') + i.msg)}</li>`).join('')}</ul>` : ''}`;
}
function files() {
  let saves = [];
  try { saves = JSON.parse(store.get(SAVES) || '[]'); if (!Array.isArray(saves)) saves = []; } catch (_) { saves = []; }
  return `<div class="rp-filerow"><label class="f rp-name">Layout name<input class="i" maxlength="60" data-rp-name value="${E(S.name || '')}" placeholder="e.g. Room 2, the toddler room"></label>
    <button type="button" class="btn soft" data-rp-act="save">${ico('save')}Save</button>
    ${saves.length ? `<label class="f rp-name">My saved layouts<select class="i" data-rp-saves>${saves.map((x, i) => opt(i, x.n || `Layout ${i + 1}`, '')).join('')}</select></label><button type="button" class="btn soft" data-rp-act="open">Open</button><button type="button" class="btn soft" data-rp-act="forget">Delete</button>` : ''}</div>
   <div class="rp-filerow"><button type="button" class="btn soft" data-rp-act="link">${ico('link')}Copy share link</button><button type="button" class="btn soft" data-rp-act="json">${ico('down')}Download layout file</button><button type="button" class="btn soft" data-rp-act="png">${ico('down')}Download picture</button><button type="button" class="btn soft" data-rp-act="print">${ico('print')}Print or PDF</button>
    <label class="btn soft rp-upload">${ico('up')}Open a layout file<input type="file" accept=".json,application/json" data-rp-file class="wc-vh"></label></div>
   <div class="rp-linkout" data-rp-linkout hidden></div>`;
}

// ---------------------------------------------------------------- "have my back": the logistics guide
const MEASURE_SVG = `<svg viewBox="0 0 360 230" role="img" aria-labelledby="rp-msr-t" class="rp-msr"><title id="rp-msr-t">How to measure: width wall to wall, length wall to wall, then each door, window and fixed item from the nearest corner</title>
  <rect x="40" y="30" width="250" height="160" fill="#FFFDF8" stroke="#0A2B38" stroke-width="5"/>
  <rect x="200" y="186" width="44" height="8" fill="#FBE3E1" stroke="#B3261E"/><path d="M200 186 v-44 a44 44 0 0 1 44 44" fill="none" stroke="#B3261E" stroke-dasharray="4 3"/>
  <rect x="90" y="26" width="70" height="8" fill="#DCEFF7" stroke="#2F6FC0"/>
  <rect x="44" y="120" width="18" height="50" fill="#D9D3C4" stroke="#6E675B"/>
  <g stroke="#0A2B38" stroke-width="1.5" fill="none"><path d="M40 14h250M40 8v12M290 8v12"/><path d="M308 30v160M302 30h12M302 190h12"/><path d="M40 210h160M40 204v12M200 204v12"/><path d="M40 44h50M90 38v12"/></g>
  <g font-family="Poppins, Arial, sans-serif" font-size="11" fill="#0A2B38" font-weight="600" text-anchor="middle"><text x="165" y="10">1. Width, wall to wall</text><text x="330" y="114" transform="rotate(90 330 110)">2. Length</text><text x="120" y="226">3. Corner to door edge</text><text x="66" y="58" font-size="9.5">corner to window</text><text x="222" y="168" font-size="9.5" fill="#B3261E">door swing</text><text x="78" y="148" font-size="9.5" transform="rotate(-90 78 148)">cubbies</text></g></svg>`;
const GUIDE = [
  ['measure', 'How to measure your room', `${MEASURE_SVG}<ol class="rp-steps"><li>Measure wall to wall at floor level, along two walls. Use the shorter number if the room is not square.</li><li>Mark north (any wall you choose) and keep it the same for every room.</li><li>For each door and window, measure from the nearest corner to its edge, and its width. Note which way each door opens and which doors are exits.</li><li>Add what cannot move: bathrooms, sinks, built-in shelves, cubbies, columns, heaters, radiators and outlets.</li><li>Take one photo of each wall. Send the photos with your layout and we check the plan against them.</li></ol>`],
  ['floors', 'Hard floors and carpet', '<ul><li><b>Hard floor (tile, vinyl, wood):</b> zone mats have a non-slip back built in, so no loose rug pad. Rug grippers at the corners keep the Friends Circle flat. Floor-path prints are removable anti-slip vinyl.</li><li><b>Existing carpet:</b> mats lie on low-pile carpet (half an inch or less). On thicker carpet, use the sit spots and skip the floor prints, which are made for hard floors.</li><li><b>Edges:</b> every mat edge is bound and beveled so wheelchairs and walkers roll over it. Never tape an edge down with duct tape; it leaves residue and a ridge. If an edge curls, ask us for a replacement.</li><li><b>Trip hazards:</b> no cords across mats or paths, no mat in a door swing, and no doubled-up mat edges.</li></ul>'],
  ['clean', 'Cleaning and sanitizing', '<table class="rp-mini"><caption class="wc-vh">Cleaning schedule</caption><thead><tr><th scope="col">When</th><th scope="col">What</th></tr></thead><tbody><tr><th scope="row">Every day</th><td>Vacuum mats and the circle rug. Wipe fence tops and hand-height surfaces with your program’s sanitizer. Missouri infant and toddler rooms: launder the washable mats.</td></tr><tr><th scope="row">Every week</th><td>Spot-clean mats; wipe signs and bin labels; check floor prints for lifting corners.</td></tr><tr><th scope="row">Every month</th><td>Machine-wash the fence sleeves; deep-clean the rug by the care label; check every edge and seam.</td></tr><tr><th scope="row">After an illness or a spill</th><td>Clean the area first, then sanitize, following your licensing rules and the care label.</td></tr></tbody></table><p>Kansas asks that carpet stays clean and in good repair (K.A.R. 28-4-423). Washable mats are available for any room on request (quoted).</p>'],
  ['packaway', 'Churches: pack-away and storage', '<ul><li><b>What packs away:</b> mats roll into carry bags, fences fold flat (under 2 in each), banner stands retract, and bins stack on the rolling cart. Nothing is taped or hung.</li><li><b>Time:</b> plan about 15 minutes for two adults to reset the room for Sunday, and about the same to set it up. Allow longer the first two weeks; the Sunday reset card has a photo of the correct set-up.</li><li><b>Storage:</b> the cart needs a closet floor about 2 x 4 ft. Store rugs rolled, never folded, and off a damp floor.</li><li><b>Fire marshal:</b> keep the stored cart out of corridors and exits.</li><li>Missouri faith programs that are license-exempt still follow the space rule and a fire inspection. Kansas has no religious exemption.</li></ul>'],
  ['delivery', 'Delivery, lead times and what is in each box', '<table class="rp-mini"><caption class="wc-vh">Boxes and lead times</caption><thead><tr><th scope="col">Box</th><th scope="col">What is in it</th><th scope="col">When</th></tr></thead><tbody><tr><th scope="row">1. Print pieces</th><td>Zone signs, posters, printed friend stick puppets, bin labels, the cue kit and the set-up card</td><td>Available now; ships first</td></tr><tr><th scope="row">2. Friends Circle rug</th><td>Rolled in a tube, with its flammability report</td><td>In development; made to order</td></tr><tr><th scope="row">3. Zone mats</th><td>Rolled, one per friend, with care labels</td><td>In development; made to order</td></tr><tr><th scope="row">4. Friend Fences and Shelf Bands</th><td>Flat-packed panels, sleeves and bands</td><td>In development; after the prototype passes its tip test</td></tr><tr><th scope="row">Later</th><td>Friend plush</td><td>Coming later, after toy-safety testing</td></tr></tbody></table><p>Made-to-order pieces are planned at about 6 to 10 weeks from your signed quote (an estimate until vendor quotes are in). Your written quote gives the dates for each box. Check every box on arrival and tell us right away if anything is damaged or missing.</p>'],
  ['install', 'Installation: do it yourself or with us', '<ul><li><b>Self-install:</b> every kit comes with a printed set-up guide and the layout you made here. Plan on about two hours for two adults (an estimate until our pilot rooms confirm it). Start with the Friends Circle, then the mats, then the fences, then paths, then the wall pieces.</li><li><b>With us:</b> Home Daycare includes a room-map call, Center Starter a video room walk, and Center Complete a setup visit in the Kansas City area or a live video walk.</li><li><b>White-glove:</b> we set up the room with you. Quoted per site.</li><li><b>Before children arrive:</b> walk the exit path, sit where the teacher sits and look at every zone, and photograph each zone for your records.</li></ul>'],
  ['parts', 'Replacement parts, reorders and warranty', '<ul><li><b>Parts sold singly:</b> fence sleeves, signs, posters, bin labels, floor-path prints, sit spots and puppets. Floor prints wear and are usually replaced every 6 to 12 months.</li><li><b>Reorders:</b> send your saved layout or the layout file; we match every colour and size.</li><li><b>Warranty (proposed):</b> one year on rugs, mats and fences against defects in materials and workmanship. Final terms are in your written quote.</li></ul>'],
  ['inspector', 'For your licensing inspector and fire marshal', '<ul class="rp-checklist"><li>This layout, printed, with the room’s measurements and usable square feet per child</li><li>A 36 in clear exit path; nothing in a door swing; exits marked</li><li>Sightlines: the adult positions on the plan, and fences 24 in or lower with see-through tops</li><li>Flammability reports for each rug and mat design (16 CFR 1630 or 1631) and the Children’s Product Certificates, kept in a folder in the room. We send them with each rug.</li><li>Wall art under the 20 percent planning cap (Missouri allows 30 percent), nothing hung from ceilings or doors</li><li>Missouri infant and toddler rooms: washable mats, laundered daily</li><li>Bin labels for under-3 rooms marked “no small parts”</li></ul>'],
  ['access', 'Accessibility and comfort', '<ul><li><b>Wheelchairs and walkers:</b> keep 36 in routes between zones and one open 60 in circle where a wheelchair can turn. At least one zone entrance stays full width.</li><li><b>Sensory-friendly calm zone:</b> put Lumi’s Calm Corner away from doors and busy walkways, in full view of an adult, with soft light and no flashing items. It is a choice, never a time-out.</li><li><b>Noise:</b> Bop’s Movement Zone goes on the opposite side of the room from Lumi’s Calm Corner and Booker’s Reading Area.</li><li><b>Natural light:</b> Booker’s Reading Area works best near a window, out of glare.</li><li><b>Outlets:</b> tamper-resistant covers, no cords across mats, paths or walkways, and nothing plugged in inside the calm corner.</li><li><b>Colour is never the only cue:</b> every zone has its friend’s icon and a word, for colour-blind children and adults.</li></ul>'],
  ['multi', 'More than one room or site', '<ul><li>Plan each room on its own: set it up here, name it, press Save, then start the next one. Every saved layout stays on this device.</li><li>Send each room’s layout with one quote request; we combine them into one quote per site.</li><li>Center Starter covers up to 3 rooms and Center Complete 4. Extra rooms and other sites are quoted.</li><li>Multi-site groups: one contact per site for delivery, and one person who signs off every layout.</li></ul>']
];
function guide() {
  return `<section class="rp-sec" id="rp-guide" aria-labelledby="rp-guide-h"><div class="wrap">
   <div class="rp-head"><span class="rk-kick">We have your back</span><h2 id="rp-guide-h">Before, during and after set-up</h2><p class="lede">The practical things that make a room work on day one and keep it working: measuring, floors, cleaning, storage, delivery, installation, parts, inspections and access.</p></div>
   <div class="rp-guide">${GUIDE.map(([k, h, body]) => `<article class="rp-card" id="rp-${k}" aria-labelledby="rp-${k}-h"><h3 id="rp-${k}-h">${h}</h3>${body}</article>`).join('')}</div>
   <p class="rp-note">Booker, Lumi, Zuri and Bop are story-world characters. Planning guidance only: your licensing specialist, fire marshal and the care labels have the final word.</p></div></section>`;
}

const PRESET = { id: 'room-planner', heading: 'Send my layout for a quote', interest: 'quote', what: 'quote requests',
  message: 'I would like a quote for the Learning Zones Kit. My room layout is below.\n' };
function ask() {
  const I = W.FFIntake, on = !!(I && I.enabled && I.enabled());
  const form = I && I.contactHtml ? I.contactHtml('quote', PRESET)
    : `<div class="card"><h3>${PRESET.heading}</h3><p class="small">Online requests open soon. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b>.</p></div>`;
  return `<section class="rp-sec band-paper" id="rp-ask" aria-labelledby="rp-ask-h"><div class="wrap rk-askgrid"><div>
    <div class="rp-head"><span class="rk-kick">Talk to us</span><h2 id="rp-ask-h">Send us your layout</h2><p class="lede">“Send my layout for a quote” puts a summary of your room into the message below: the measurements, the ages, every piece and where it goes, and a link that reopens this exact layout. Nothing else is collected.</p></div>
    ${on ? '' : `<div class="rp-offline" data-rp-offline hidden><label class="f">Your layout summary<textarea class="i" readonly rows="8" data-rp-summary></textarea></label><div class="wc-acts"><button type="button" class="btn soft" data-rp-act="copysum">${ico('copy')}Copy the summary</button><a class="btn gold" data-rp-mailto href="mailto:${EMAIL}">Email it to us</a></div><p class="rp-note">The email opens in your own mail app with the summary filled in; you choose whether to send it.</p></div>`}
    <p class="rp-note">Or call <a class="rl" href="tel:+18169885661">${PHONE}</a> or email <a class="rl" href="mailto:${EMAIL}">${EMAIL}</a>.</p></div>
   <div class="wc-partner-form">${form}</div></div></section>`;
}

V['room-planner'] = () => { initial(); issues = C.check(S); return `<div class="wc rk rp">${hero()}${app()}${guide()}${ask()}<p class="wrap rk-foot">Learn. Move. Explore. Belong. Booker, Lumi, Zuri and Bop are story-world characters. Prices as of October 2026.</p></div>`; };

// ---------------------------------------------------------------- repaint (parts only, so focus and scroll stay put)
let raf = 0;
function refresh(opts = {}) {
  if (!S || !$('[data-rp-canvas]')) return;
  issues = C.check(S);
  paintCanvas();
  const st = $('[data-rp-status]'); if (st) st.innerHTML = status();
  const tb = $('[data-rp-toolbar]'); if (tb) { const f = document.activeElement && tb.contains(document.activeElement) ? document.activeElement.getAttribute('data-rp-act') : null; tb.innerHTML = toolbar(); if (f) { const b = tb.querySelector(`[data-rp-act="${f}"]`); if (b && !b.disabled) b.focus(); } }
  for (const k of Object.keys(PANELS)) if (!opts.keep || opts.keep !== k) paintPanel(k);
  const w = $('[data-rp-words]'); if (w) w.innerHTML = words();
}
function paintPanel(k) {
  const p = $(`[data-rp-panel="${k}"]`); if (!p) return;
  const a = document.activeElement, inside = a && p.contains(a), key = inside ? keyOf(a) : null;
  p.innerHTML = PANELS[k]();
  if (key) { const n = p.querySelector(key); if (n) n.focus(); }
}
const keyOf = el => { for (const at of ['data-rp-room', 'data-rp-setup', 'data-rp-it', 'data-rp-add', 'data-rp-act', 'data-rp-show', 'data-rp-pick']) { const v = el.getAttribute(at); if (v != null) return `[${at}="${v}"]${el.getAttribute('data-u') ? `[data-u="${el.getAttribute('data-u')}"]` : ''}`; } if (el.hasAttribute('data-rp-age')) return `[data-rp-age][value="${el.value}"]`; return null; };
function paintCanvas() {
  const c = $('[data-rp-canvas]'); if (!c) return;
  const focused = document.activeElement && c.contains(document.activeElement);
  c.innerHTML = canvas();
  if (focused && sel) { const g = c.querySelector(`.rp-it[data-id="${sel}"]`); if (g) g.focus({ preventScroll: true }); }
}
function paintSoon() { if (raf) return; raf = (W.requestAnimationFrame || (f => setTimeout(f, 16)))(() => { raf = 0; paintCanvas(); }); }
function setTab(k, focus) {
  ui.tab = k;
  $$('[data-rp-tab]').forEach(b => { const on = b.dataset.rpTab === k; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; if (on && focus) b.focus(); });
  $$('[data-rp-panel]').forEach(p => { p.hidden = p.dataset.rpPanel !== k; });
}
function select(id, opts = {}) {
  sel = id && item(id) ? id : null;
  paintCanvas(); paintPanel('item');
  const tb = $('[data-rp-toolbar]'); if (tb) tb.innerHTML = toolbar();
  if (sel && opts.tab !== false && (ui.tab === 'room' || ui.tab === 'add')) setTab('item');
  if (sel && opts.focus) { const g = $(`.rp-it[data-id="${sel}"]`); if (g) g.focus({ preventScroll: !!opts.noscroll }); }
  if (sel) note(`${C.label(item(sel))} selected. ${where(item(sel))}`);
}
function where(it) {
  if (!it) return '';
  if (C.cat(it) === 'wall') return `On the ${C.WALLS[it.wall]} wall, ${len(+it.at || 0)} from the corner.`;
  const b = C.box(it, S.room); return `${len(b.x)} from the west wall, ${len(b.y)} from the north wall.`;
}

// ---------------------------------------------------------------- editing
const step = () => ui.snap;
const snapTo = (v, s) => Math.round(v / s) * s;
function move(id, dx, dy) {
  const it = item(id); if (!it) return;
  change(() => {
    if (C.cat(it) === 'wall') { const lenW = it.wall === 'N' || it.wall === 'S' ? S.room.w : S.room.l; it.at = Math.max(0, Math.min(lenW - (+it.w || 0), (+it.at || 0) + (it.wall === 'N' || it.wall === 'S' ? dx : dy))); }
    else { const b = C.box(it, S.room); it.x = Math.max(-b.w / 2, Math.min(S.room.w - b.w / 2, (+it.x || 0) + dx)); it.y = Math.max(-b.h / 2, Math.min(S.room.l - b.h / 2, (+it.y || 0) + dy)); }
  });
  note(`${C.label(it)}: ${where(it)}${issues.some(i => i.level === 'stop' && i.ids.includes(id)) ? ' Needs a fix: see the fit check.' : ''}`);
}
function rotate(id) {
  const it = item(id); if (!it || C.cat(it) === 'wall') return;
  change(() => { const b = C.box(it, S.room), cx = b.x + b.w / 2, cy = b.y + b.h / 2; it.rot = ((+it.rot || 0) + 90) % 360; const nb = C.box(it, S.room); it.x = snapTo(cx - nb.w / 2, 1); it.y = snapTo(cy - nb.h / 2, 1); });
  note(`${C.label(it)} turned.`);
}
function remove(id) { const it = item(id); if (!it) return; change(() => { S.items = S.items.filter(i => i.id !== id); sel = null; }); note(`${C.label(it)} removed.`); }
function dup(id) {
  const it = item(id); if (!it) return;
  const copy = Object.assign({}, it, { id: C.make(it.t).id });
  change(() => { S.items.push(C.placeNew(S, copy)); sel = copy.id; });
  note(`Copy of ${C.label(it)} added.`);
}
function add(kind) {
  const pick = k => { const s = $(`[data-rp-pick="${k}"]`); return s ? s.value : ''; };
  let it;
  if (kind === 'exitdoor') it = C.make('door', { exit: true, swing: 'in', hinge: 'L' });
  else if (kind === 'door') it = C.make('door', { exit: false, swing: 'in', hinge: 'L' });
  else if (kind === 'circle') { const sz = pick('circle') || 'r8', s = C.TYPES.circle.sizes.find(x => x[0] === sz); it = C.make('circle', { sz, w: s[2] || 84, l: s[3] || 84, round: sz === 'custom' }); }
  else if (kind === 'mat') { const sz = pick('mat') || '46', s = C.TYPES.mat.sizes.find(x => x[0] === sz); it = C.make('mat', { sz, z: pick('matz') || 'booker', w: s[2] || 48, l: s[3] || 72 }); }
  else if (kind === 'fence') { const p = pick('fence') || '36'; it = p === 'corner' ? C.make('corner', { z: pick('fencez') || 'booker' }) : C.make('fence', { sz: p, w: +p, l: 3, z: pick('fencez') || 'booker' }); }
  else if (kind === 'sign' || kind === 'poster') it = C.make(kind, { z: pick('wallz') || 'booker', w: kind === 'sign' ? (S.setup.type === 'home' ? 9 : 12) : 18 });
  else if (kind === 'basket') it = C.make('basket', { z: pick('wallz') || 'booker' });
  else if (C.TYPES[kind]) it = C.make(kind);
  if (!it) return;
  change(() => { S.items.push(C.placeNew(S, it)); sel = it.id; });
  note(`${C.label(it)} added. ${where(it)} Drag it, or use the arrow keys, to put it in place.`);
  const g = $(`.rp-it[data-id="${it.id}"]`); if (g && g.scrollIntoView) g.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' });
}
function setItem(field, raw, el) {
  const it = sel && item(sel); if (!it) return;
  const fromU = v => (units() === 'm' ? Number(v) / 2.54 : Number(v));
  change(() => {
    if (field === 'z') it.z = C.FRIENDS.includes(raw) ? raw : it.z;
    else if (field === 'band') { if (C.FRIENDS.includes(raw)) it.band = raw; else delete it.band; }
    else if (field === 'exit') it.exit = !!el.checked;
    else if (field === 'round') it.round = !!el.checked;
    else if (field === 'swing') it.swing = raw === 'out' ? 'out' : 'in';
    else if (field === 'hinge') it.hinge = raw === 'R' ? 'R' : 'L';
    else if (field === 'wall') { if (C.WALLS[raw]) { it.wall = raw; const lw = raw === 'N' || raw === 'S' ? S.room.w : S.room.l; it.at = Math.max(0, Math.min(lw - (+it.w || 0), +it.at || 0)); } }
    else if (field === 'sz') {
      const s = (C.TYPES[it.t].sizes || []).find(x => x[0] === raw); if (!s) return;
      const b = C.box(it, S.room), cx = b.x + b.w / 2, cy = b.y + b.h / 2;
      it.sz = raw;
      if (s[2]) { it.w = s[2]; it.l = s[3]; }
      if (it.t === 'circle') it.round = raw === 'custom' ? true : it.round;
      const nb = C.box(it, S.room); it.x = Math.round(cx - nb.w / 2); it.y = Math.round(cy - nb.h / 2);
    } else if (field === 'w' && it.t === 'door') it.w = Math.max(24, Math.min(96, Number(raw) || 36));
    else {
      const v = fromU(raw); if (!Number.isFinite(v)) return;
      if (field === 'x' || field === 'y') { const turned = (+it.rot || 0) % 180 !== 0; it[field] = Math.round(v * 10) / 10; void turned; }
      else if (field === 'at') it.at = Math.max(0, Math.round(v));
      else if (field === 'w' || field === 'l') { const k = (+it.rot || 0) % 180 !== 0 && C.cat(it) !== 'wall' ? (field === 'w' ? 'l' : 'w') : field; void k; it[field] = Math.max(2, Math.min(600, Math.round(v))); if (C.isRound(it)) it.l = it.w; if ((it.t === 'mat' || it.t === 'circle')) it.sz = 'custom'; }
      else if (field === 'hgt') it.hgt = Math.max(1, Math.min(120, Math.round(v)));
    }
  });
}

// ---------------------------------------------------------------- pointer: drag to move, drag the handle to resize
let drag = null;
function toRoom(svg, e) {
  const m = svg.getScreenCTM && svg.getScreenCTM(); if (!m) return null;
  const p = svg.createSVGPoint(); p.x = e.clientX; p.y = e.clientY;
  const q = p.matrixTransform(m.inverse()); return { x: q.x, y: q.y };
}
function onDown(e) {
  const svg = e.target.closest && e.target.closest('[data-rp-canvas] svg'); if (!svg || e.button > 0) return;
  const h = e.target.closest('[data-handle]'), g = e.target.closest('.rp-it');
  if (!g) { if (sel) select(null); return; }
  const id = h ? h.getAttribute('data-handle') : g.getAttribute('data-id'), it = item(id); if (!it) return;
  e.preventDefault();
  const p = toRoom(svg, e); if (!p) return;
  if (sel !== id) { sel = id; paintPanel('item'); const tb = $('[data-rp-toolbar]'); if (tb) tb.innerHTML = toolbar(); }
  const b = C.box(it, S.room);
  drag = { id, mode: h ? 'size' : 'move', before: snap(), p0: p, b0: b, it0: Object.assign({}, it), moved: false, pid: e.pointerId };
  try { svg.setPointerCapture(e.pointerId); } catch (_) { /* older browsers */ }
  paintCanvas();
}
function onMove(e) {
  if (!drag || e.pointerId !== drag.pid) return;
  const svg = $('[data-rp-canvas] svg'); if (!svg) return;
  const p = toRoom(svg, e); if (!p) return;
  const it = item(drag.id); if (!it) return;
  const dx = p.x - drag.p0.x, dy = p.y - drag.p0.y, s = step();
  if (!drag.moved && Math.hypot(dx, dy) < 2) return;
  drag.moved = true;
  if (drag.mode === 'size') {
    const turned = (+it.rot || 0) % 180 !== 0 && C.cat(it) !== 'wall';
    if (C.cat(it) === 'wall') { const along = it.wall === 'N' || it.wall === 'S' ? dx : dy; it.w = Math.max(4, snapTo(drag.it0.w + along, s)); }
    else {
      const nw = Math.max(6, snapTo(drag.b0.w + dx, s)), nh = Math.max(3, snapTo(drag.b0.h + dy, s));
      if (C.isRound(it)) { it.w = it.l = Math.max(nw, nh); } else if (turned) { it.l = nw; it.w = nh; } else { it.w = nw; it.l = nh; }
      if (it.t === 'mat' || it.t === 'circle') it.sz = 'custom';
    }
  } else if (C.cat(it) === 'wall') {
    // follow the pointer to the nearest wall
    const d = { N: p.y, S: S.room.l - p.y, W: p.x, E: S.room.w - p.x }, wall = Object.keys(d).sort((a, b) => d[a] - d[b])[0];
    const lw = wall === 'N' || wall === 'S' ? S.room.w : S.room.l, along = wall === 'N' || wall === 'S' ? p.x : p.y;
    it.wall = wall; it.at = Math.max(0, Math.min(lw - (+it.w || 0), snapTo(along - (+it.w || 0) / 2, s)));
  } else {
    it.x = snapTo(drag.b0.x + dx, s); it.y = snapTo(drag.b0.y + dy, s);
  }
  paintSoon();
}
function onUp(e) {
  if (!drag || (e && e.pointerId !== drag.pid)) return;
  const d = drag; drag = null;
  if (d.moved) { commit(d.before); const it = item(d.id); if (it) note(`${C.label(it)}: ${where(it)}${issues.some(i => i.level === 'stop' && i.ids.includes(d.id)) ? ' Needs a fix: see the fit check.' : ''}`); }
  else { refresh(); }
  const g = $(`.rp-it[data-id="${d.id}"]`); if (g) g.focus({ preventScroll: true });
}

// ---------------------------------------------------------------- files: save, share, download, print, open
function download(name, blob) {
  try {
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = name; a.rel = 'noopener'; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
    return true;
  } catch (_) { return false; }
}
const fileBase = () => 'futures-friends-room-plan' + (S.name ? '-' + S.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30) : '');
function shareLink() { const base = String(location.href).split('#')[0]; return base + '#room-planner/' + C.encode(S); }
function showLink(msg, url) {
  const box = $('[data-rp-linkout]'); if (!box) return;
  box.hidden = false;
  box.innerHTML = `<p>${E(msg)}</p>${url ? `<label class="f">Share link<input class="i" readonly value="${E(url)}" data-rp-linkval></label>` : ''}`;
  const v = box.querySelector('[data-rp-linkval]'); if (v) { v.focus(); v.select(); }
}
function act(a, el) {
  if (a === 'undo') { if (!hist.length) return; fut.push(snap()); S = unsnap(hist.pop()); if (sel && !item(sel)) sel = null; autosave(); refresh(); note('Undone.'); return; }
  if (a === 'redo') { if (!fut.length) return; hist.push(snap()); S = unsnap(fut.pop()); autosave(); refresh(); note('Redone.'); return; }
  if (a === 'arrange') {
    change(() => { S = C.autoArrange(S); sel = null; });
    const sm = C.summary(issues);
    note(`The kit is arranged for ${len(S.room.w)} by ${len(S.room.l)}. ${sm.stop ? sm.stop + ' things still need a fix.' : 'Nothing blocks the layout.'}`);
    return;
  }
  if (a === 'rotate') return sel && rotate(sel);
  if (a === 'dup') return sel && dup(sel);
  if (a === 'del') return sel && remove(sel);
  if (a === 'sight') { ui.sight = !ui.sight; refresh(); note(ui.sight ? 'Sightlines shown: green dashes are clear, red dots are blocked.' : 'Sightlines hidden.'); return; }
  if (a === 'paths') { ui.paths = !ui.paths; refresh(); return; }
  if (a === 'save') {
    let saves = []; try { saves = JSON.parse(store.get(SAVES) || '[]'); if (!Array.isArray(saves)) saves = []; } catch (_) { saves = []; }
    const p = C.pack(S), i = saves.findIndex(x => x.n && x.n === p.n);
    if (i >= 0) saves[i] = p; else saves.unshift(p);
    const ok = store.set(SAVES, JSON.stringify(saves.slice(0, 20)));
    const f = $('[data-rp-files]'); if (f) f.innerHTML = files();
    showLink(ok ? `Saved “${S.name || 'Untitled layout'}” on this device.` : 'This browser is not keeping layouts. Use Download layout file or Copy share link instead.');
    return;
  }
  if (a === 'open' || a === 'forget') {
    const sx = $('[data-rp-saves]'); if (!sx) return;
    let saves = []; try { saves = JSON.parse(store.get(SAVES) || '[]'); } catch (_) { saves = []; }
    const i = +sx.value;
    if (a === 'open') { const d = C.unpack(saves[i]); if (d) { const before = snap(); S = d; sel = null; commit(before); const f = $('[data-rp-files]'); if (f) f.innerHTML = files(); note(`Opened ${S.name || 'the layout'}.`); } return; }
    saves.splice(i, 1); store.set(SAVES, JSON.stringify(saves)); const f = $('[data-rp-files]'); if (f) f.innerHTML = files(); showLink('Removed from this device.'); return;
  }
  if (a === 'link') {
    const url = shareLink();
    const done = () => showLink('Link copied. Anyone with it sees this layout (the room, not you): nothing else is in it.', url);
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(done, () => showLink('Copy this link:', url)); else showLink('Copy this link:', url); } catch (_) { showLink('Copy this link:', url); }
    return;
  }
  if (a === 'json') { const ok = download(fileBase() + '.json', new Blob([JSON.stringify(Object.assign({ app: 'Futures Friends Room Planner' }, C.pack(S)), null, 1)], { type: 'application/json' })); showLink(ok ? 'Layout file downloaded. Open it here later with “Open a layout file”.' : 'This browser could not download the file. Use Copy share link instead.'); return; }
  if (a === 'png') { png(); return; }
  if (a === 'print') { printIt(); return; }
  if (a === 'send') { sendQuote(); return; }
  if (a === 'copysum') { const t = $('[data-rp-summary]'); if (t) { t.focus(); t.select(); try { if (navigator.clipboard) navigator.clipboard.writeText(t.value); } catch (_) { /* select is enough */ } note('Summary copied.'); } }
}
function png() {
  try {
    const svgStr = C.svg(S, { issues: [], paths: ui.paths, width: 1600, title: S.name || 'Room plan' });
    const img = new Image(), cv = document.createElement('canvas');
    img.onload = () => {
      cv.width = img.width || 1600; cv.height = img.height || Math.round(1600 * S.room.l / S.room.w);
      const x = cv.getContext('2d'); x.fillStyle = '#FBF6EC'; x.fillRect(0, 0, cv.width, cv.height); x.drawImage(img, 0, 0, cv.width, cv.height);
      cv.toBlob(b => { const ok = b && download(fileBase() + '.png', b); showLink(ok ? 'Picture downloaded.' : 'This browser could not make the picture. Use Print or PDF instead.'); }, 'image/png');
    };
    img.onerror = () => showLink('This browser could not make the picture. Use Print or PDF instead.');
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgStr);
  } catch (_) { showLink('This browser could not make the picture. Use Print or PDF instead.'); }
}
function printIt() {
  let box = $('[data-rp-print]');
  if (!box) { box = document.createElement('div'); box.setAttribute('data-rp-print', ''); box.className = 'rp-print'; document.body.appendChild(box); }
  const b = C.bom(S, tiers());
  box.innerHTML = `<h1>${E(S.name || 'Futures Friends room plan')}</h1><p>${E(len(S.room.w))} by ${E(len(S.room.l))} · ${E(C.ROOM_TYPES[S.setup.type])} · ${E(C.STATES[S.setup.state])}</p>
   <div class="rp-print-plan">${C.svg(S, { issues, paths: true, idp: 'rp-pr', title: 'Room plan' })}</div>
   <h2>Fit check</h2><ul>${issues.length ? issues.map(i => `<li>${E((i.level === 'stop' ? 'Fix: ' : i.level === 'warn' ? 'Review: ' : 'Tip: ') + i.msg)}</li>`).join('') : '<li>Nothing to fix.</li>'}</ul>
   <h2>What arrives</h2><table><thead><tr><th>Piece</th><th>Qty</th><th>Price</th></tr></thead><tbody>${b.lines.map(l => `<tr><td>${E(l.name)}${l.detail ? ` (${E(l.detail)})` : ''}</td><td>${l.qty || '–'}</td><td>${l.price != null ? money(l.price) + (l.monthly ? ' + ' + money(l.monthly) + '/mo' : '') : E(l.note)}</td></tr>`).join('')}</tbody></table>
   <p>Estimate: ${money(b.startup)} startup + ${money(b.monthly)}/month${b.quoted ? `, plus ${b.quoted} quoted item(s)` : ''}. Approved published prices only; your written quote confirms every line.</p>
   <h2>The layout in words</h2>${words()}
   <p>Reopen this layout: ${E(shareLink())}</p><p>Booker, Lumi, Zuri and Bop are story-world characters. Planning aid only; your licensing specialist and fire marshal have the final word.</p>`;
  document.documentElement.classList.add('rp-printing');
  const done = () => { document.documentElement.classList.remove('rp-printing'); W.removeEventListener('afterprint', done); };
  W.addEventListener('afterprint', done);
  try { W.print(); } catch (_) { done(); }
  setTimeout(() => { if (!W.matchMedia || !W.matchMedia('print').matches) done(); }, 1500);
}
function sendQuote() {
  const text = PRESET.message + '\n' + C.describe(S, issues) + '\n\nReopen the layout: ' + shareLink();
  const m = $('#cMsg');
  if (m) {
    m.value = text.slice(0, 6000); m.dispatchEvent(new Event('input', { bubbles: true }));
    const s = $('#cInterest'); if (s) { s.value = 'quote'; s.dispatchEvent(new Event('change', { bubbles: true })); }
    const t = $('#cType'); if (t && !t.value) { t.value = S.setup.type === 'home' ? 'homeDaycare' : S.setup.type === 'church' ? 'church' : 'center'; }
    const k = $('#cKids'); if (k && !k.value && S.setup.children) k.value = String(S.setup.children);
    const card = $('#ffiContactCard'); if (card && card.scrollIntoView) card.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
    note('Your layout is in the message. Add your name and email, then send.');
    const n = $('#cName'); if (n) setTimeout(() => n.focus(), reduced() ? 0 : 400);
    return;
  }
  const off = $('[data-rp-offline]');
  if (off) {
    off.hidden = false;
    const t = $('[data-rp-summary]'); if (t) t.value = text;
    const mt = $('[data-rp-mailto]'); if (mt) mt.setAttribute('href', `mailto:${EMAIL}?subject=${encodeURIComponent('Learning Zones Kit quote: my room layout')}&body=${encodeURIComponent(text.slice(0, 1800))}`);
    const ask = $('#rp-ask'); if (ask && ask.scrollIntoView) ask.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' });
    if (t) setTimeout(() => t.focus(), reduced() ? 0 : 400);
    note('Online requests open soon. Your layout summary is ready to copy or email.');
  }
}
function openFile(input) {
  const f = input.files && input.files[0]; if (!f) return;
  if (f.size > 400000) { showLink('That file is too large to be a layout file.'); return; }
  const r = new FileReader();
  r.onload = () => { const d = C.fromJSON(String(r.result || '')); if (!d) { showLink('That file is not a Futures Friends layout.'); return; } const before = snap(); S = d; sel = null; commit(before); showLink(`Opened ${S.name || 'the layout'}.`); };
  r.onerror = () => showLink('This browser could not read that file.');
  r.readAsText(f);
  input.value = '';
}

// ---------------------------------------------------------------- events (delegated; nothing runs until a visitor acts)
function onRoomInput(el) {
  const key = el.getAttribute('data-rp-room'), u = el.getAttribute('data-u');
  const grp = $$(`[data-rp-room="${key}"]`);
  let inches;
  if (u === 'm') inches = C.fromMetres(el.value);
  else { const ft = Number((grp.find(g => g.getAttribute('data-u') === 'ft') || {}).value) || 0, inch = Number((grp.find(g => g.getAttribute('data-u') === 'in') || {}).value) || 0; inches = ft * 12 + inch; }
  if (!Number.isFinite(inches) || inches < 48 || inches > 1200) { el.setAttribute('aria-invalid', 'true'); return; }
  el.removeAttribute('aria-invalid');
  const before = snap(); S.room[key] = Math.round(inches); commit(before);
}
if (typeof document !== 'undefined' && document.addEventListener) {
  document.addEventListener('click', e => {
    const t = e.target; if (!t || !t.closest || !t.closest('.rp')) return;
    const tab = t.closest('[data-rp-tab]'); if (tab) { setTab(tab.dataset.rpTab); return; }
    const go = t.closest('[data-rp-goto]'); if (go) { setTab(go.dataset.rpGoto, true); const s = $('.rp-side'); if (s && s.scrollIntoView) s.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); return; }
    const a = t.closest('[data-rp-act]'); if (a && !a.disabled) { act(a.dataset.rpAct, a); return; }
    const ad = t.closest('[data-rp-add]'); if (ad) { add(ad.dataset.rpAdd); return; }
    const sh = t.closest('[data-rp-show]'); if (sh) { const id = sh.dataset.rpShow; select(id, { tab: false }); const g = $(`.rp-it[data-id="${id}"]`); if (g) { if (g.scrollIntoView) g.scrollIntoView({ block: 'nearest', behavior: reduced() ? 'auto' : 'smooth' }); g.focus({ preventScroll: true }); } return; }
  });
  document.addEventListener('change', e => {
    const el = e.target; if (!el || !el.closest || !el.closest('.rp')) return;
    if (el.hasAttribute('data-rp-units')) { change(() => { S.setup.units = el.value === 'm' ? 'm' : 'ft'; }); paintPanel('room'); return; }
    if (el.hasAttribute('data-rp-age')) { change(() => { const set = new Set(S.setup.ages || []); if (el.checked) set.add(el.value); else set.delete(el.value); S.setup.ages = Object.keys(C.AGES).filter(a => set.has(a)); }); return; }
    const su = el.getAttribute('data-rp-setup');
    if (su) { change(() => { if (su === 'install') S.setup.install = el.checked; else if (su === 'children' || su === 'rooms') S.setup[su] = Math.max(su === 'rooms' ? 1 : 0, Math.min(su === 'rooms' ? 99 : 500, Math.round(Number(el.value) || 0))); else S.setup[su] = el.value; }); return; }
    if (el.hasAttribute('data-rp-room')) { onRoomInput(el); return; }
    const f = el.getAttribute('data-rp-it'); if (f) { setItem(f, el.value, el); return; }
    if (el.hasAttribute('data-rp-template') && el.value) { const before = snap(); const keepUnits = S.setup.units, keepState = S.setup.state; S = C.template(el.value, { units: keepUnits, state: keepState }); S.setup.units = keepUnits; S.setup.state = keepState; sel = null; commit(before); note(`Started from ${C.TEMPLATES[el.value].name}.`); return; }
    if (el.hasAttribute('data-rp-snap')) { ui.snap = Math.max(1, Number(el.value) || 6); return; }
    if (el.hasAttribute('data-rp-file')) { openFile(el); return; }
    if (el.hasAttribute('data-rp-name')) { change(() => { S.name = String(el.value || '').replace(/[\u0000-\u001f<>]/g, '').slice(0, 60); }); }
  });
  document.addEventListener('keydown', e => {
    const t = e.target; if (!t || !t.closest || !t.closest('.rp')) return;
    // tabs: arrow keys move between them
    const tab = t.closest('[data-rp-tab]');
    if (tab) {
      const ks = TABS.map(x => x[0]), i = ks.indexOf(tab.dataset.rpTab);
      const n = e.key === 'ArrowRight' ? (i + 1) % ks.length : e.key === 'ArrowLeft' ? (i + ks.length - 1) % ks.length : e.key === 'Home' ? 0 : e.key === 'End' ? ks.length - 1 : -1;
      if (n >= 0) { e.preventDefault(); setTab(ks[n], true); } return;
    }
    const inField = /^(INPUT|SELECT|TEXTAREA)$/.test(t.tagName);
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z') && !inField) { e.preventDefault(); act(e.shiftKey ? 'redo' : 'undo'); return; }
    const g = t.closest('.rp-it'); if (!g) return;
    const id = g.getAttribute('data-id');
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(id, { focus: true, noscroll: true }); return; }
    const d = e.altKey ? 1 : e.shiftKey ? 12 : step();
    const mv = { ArrowLeft: [-d, 0], ArrowRight: [d, 0], ArrowUp: [0, -d], ArrowDown: [0, d] }[e.key];
    if (mv) { e.preventDefault(); if (sel !== id) sel = id; move(id, mv[0], mv[1]); return; }
    if (e.key === 'r' || e.key === 'R') { e.preventDefault(); sel = id; rotate(id); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); remove(id); const c = $('[data-rp-canvas] svg'); if (c) { const first = c.querySelector('.rp-it'); if (first) first.focus({ preventScroll: true }); } }
  });
  document.addEventListener('focusin', e => {
    const g = e.target && e.target.closest && e.target.closest('.rp-it');
    if (g && g.getAttribute('data-id') !== sel && !drag) { sel = g.getAttribute('data-id'); const tb = $('[data-rp-toolbar]'); if (tb) tb.innerHTML = toolbar(); paintPanel('item'); $$('.rp-it').forEach(x => { const on = x === g; x.classList.toggle('is-sel', on); x.setAttribute('aria-pressed', String(on)); }); note(`${C.label(item(sel))}. ${where(item(sel))} Arrow keys move it.`); }
  });
  document.addEventListener('pointerdown', onDown);
  document.addEventListener('pointermove', onMove);
  document.addEventListener('pointerup', onUp);
  document.addEventListener('pointercancel', onUp);
}
W.FFhooks = W.FFhooks || [];
W.FFhooks.push(() => { try { if (typeof view !== 'undefined' && view === 'room-planner') { const m = $('[data-rp-saved]'); if (m && !m.textContent) m.textContent = store.get(KEY) ? 'Your last layout is kept on this device.' : ''; } } catch (e) { console.warn(e); } });

// ---------------------------------------------------------------- "Plan your own room" on #room-kit (wrap, never edit its source)
function band() {
  return `<section class="rk-sec rp-band" id="rk-planner" aria-labelledby="rk-planner-h"><div class="wrap rp-bandgrid">
   <div><div class="rk-head"><span class="rk-kick">Every room is different</span><h2 id="rk-planner-h">Plan your own room</h2><p class="lede">Type in your room’s measurements, mark the doors, windows and sinks, then drag each friend’s zone into place. The planner checks space per child, a 36 in clear exit path, walkways and what an adult can see, and lists every piece that arrives.</p></div>
    <ul class="rp-bandlist"><li>Feet and inches or metres</li><li>Home, center or church that packs away</li><li>Mats in three sizes; fences, signs and paths placed for you</li><li>Save it, print it, or send it for a quote</li></ul>
    <div class="wc-acts"><a class="btn gold" href="#room-planner">Open the Room Planner</a><a class="btn soft" href="#room-planner" data-rp-jump="rp-guide">Measuring, delivery and set-up help</a></div></div>
   <figure class="rp-bandplan">${C.svg(C.template('classroom'), { idp: 'rk-pl', title: 'Example plan made with the Room Planner: a 20 x 25 ft center classroom' })}<figcaption>An example made with the planner: a 20 x 25 ft classroom.</figcaption></figure></div></section>`;
}
(function wrapKit() {
  const base = V['room-kit'];
  if (typeof base !== 'function') return;
  V['room-kit'] = function () {
    const h = base.apply(this, arguments), at = h.indexOf('<section class="rk-sec " id="rk-packages"');
    const at2 = at >= 0 ? at : h.indexOf('id="rk-packages"');
    if (at2 < 0) return h + band();
    const start = h.lastIndexOf('<section', at2);
    return h.slice(0, start) + band() + h.slice(start);
  };
})();
if (typeof document !== 'undefined' && document.addEventListener) document.addEventListener('click', e => {
  const j = e.target && e.target.closest && e.target.closest('[data-rp-jump]'); if (!j) return;
  const id = j.getAttribute('data-rp-jump');
  setTimeout(() => { const n = document.getElementById(id); if (n && n.scrollIntoView) n.scrollIntoView({ block: 'start' }); }, 120);
});

W.FFRoomPlanner = { get state() { return S; }, set(s) { const d = C.sanitize(s); if (d) { S = d; sel = null; refresh(); } }, load: code => { const d = C.decode(code); if (d) { S = d; refresh(); } return !!d; }, refresh, select, move, band, act };
})();
