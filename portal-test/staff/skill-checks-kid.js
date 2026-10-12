// Skill checks inside Kid Mode (hub/SKILL_CHECKS.md, migration 20261026100000_skill_checks.sql).
//
// The Kid Mode home shows a "Let's play a check" card for each open check (kid_mode_checks). The child plays one item at a time:
// tap a picture, count and tap, match pairs, sort into two groups, or put three in order. Big targets (64px and up), the child's guide
// cheers, and there is NO fail sound (sound is off everywhere) and NO red X: a wrong answer gets one gentle "let's try once more",
// then the check simply moves on. The grade is computed by the database (kid_mode_check_answer); this page never knows the key.
// Every call goes through the adult's Kid Mode session (one child, consent re-checked). Owner decision 2026-10-10: no screen-time cap for
// skill checks; session time is recorded for teachers only and never limits or blocks a check.
// Plain ES module, no build step; the strict CSP forbids inline styles.
import { BADGE_SVG, avatarHtml } from './kid-mode.js';

const NAME = { booker: 'Booker', lumi: 'Lumi', zuri: 'Zuri', bop: 'Bop', nico: 'Nico', tilly: 'Tilly', poppy: 'Poppy', mimi: 'Mimi', tad: 'Tad',
  rory: 'Rory', nova: 'Nova', teo: 'Teo' };
export const SW = {
  en: { card: "Let's play a check!", play: 'Play', done: 'All done', yay: (f) => `You did it! ${f} is so happy.`, again: "Let's try once more!",
    onward: "Thank you! Let's go on.", finished: (f) => `All done! ${f} loved playing with you.`, home: 'Back', next: 'Next',
    ready: "I'm done", restart: 'Start over', counted: 'Counted', items: (n) => `${n} to play` },
  es: { card: '¡Vamos a jugar una prueba!', play: 'Jugar', done: 'Listo', yay: (f) => `¡Lo hiciste! ${f} está muy feliz.`, again: '¡Intentemos una vez más!',
    onward: '¡Gracias! Sigamos.', finished: (f) => `¡Terminamos! A ${f} le encantó jugar contigo.`, home: 'Atrás', next: 'Siguiente',
    ready: 'Terminé', restart: 'Empezar otra vez', counted: 'Contado', items: (n) => `${n} para jugar` },
};

// A picture token -> HTML. Only existing approved art (friend plush art, Kid Mode badge icons) or plain CSS geometry and colour.
const COLOURS = ['sky', 'sun', 'leaf', 'berry', 'coral', 'purple'];
export function pictureHtml(esc, token) {
  const t = String(token || '');
  let m = t.match(/^f:([a-z-]{3,30})$/);
  if (m) return `<img class="sc-pic-img" src="img/friends/${esc(m[1])}-480.webp" alt="" decoding="async">`;
  m = t.match(/^b:(star|heart|flower|rocket)$/);
  if (m) return `<span class="sc-badge km-b-${m[1]}">${BADGE_SVG[m[1]]}</span>`;
  m = t.match(/^s:(circle|square|triangle)-([a-z]+)(?:-(s|m|l))?$/);
  if (m && COLOURS.includes(m[2])) return `<span class="sc-shape sc-${m[1]} sc-col-${m[2]} sc-sz-${m[3] || 'm'}" aria-hidden="true"></span>`;
  m = t.match(/^c:([a-z]+)$/);
  if (m && COLOURS.includes(m[1])) return `<span class="sc-swatch sc-col-${m[1]}" aria-hidden="true"></span>`;
  return '<span class="sc-swatch" aria-hidden="true"></span>';
}
// dots under a numeral, so a number can be "read" without reading
export const dotsHtml = (n) => `<span class="sc-dots" aria-hidden="true">${'<i></i>'.repeat(Math.max(0, Math.min(10, n)))}</span>`;

// The checks card on the Kid Mode home. ctx: { box, rpc, esc, lang, session, guide, show, home, gate, ended }
export async function mountKidChecks(ctx) {
  const { box, rpc, esc, lang } = ctx;
  const L = SW[lang === 'es' ? 'es' : 'en'];
  let data;
  try { data = await rpc('kid_mode_checks', { p_session: ctx.session }); } catch (_) { return; }   // checks never block Kid Mode
  const open = (data?.checks || []).map((c) => ({ ...c, todo: c.items.filter((i) => !i.done) })).filter((c) => c.todo.length);
  if (!data?.enabled || !open.length || !box || !box.isConnected) return;   // nothing open, or the child already left the home screen
  box.hidden = false;
  box.innerHTML = `<ul class="sc-cards">${open.map((c) => `<li><button type="button" class="km-tile sc-card" data-check="${esc(c.id)}">
    ${avatarHtml(esc, ctx.guide, 'km-av-m')}<span class="km-tile-kind">${esc(L.card)}</span><span class="km-tile-title">${esc(c.title)}</span>
    <span class="sc-count">${esc(L.items(c.todo.length))}</span></button></li>`).join('')}</ul>`;
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-check]'); if (!b) return;
    const c = open.find((x) => x.id === b.dataset.check);
    if (c) playCheck(ctx, c, L);
  });
}

function playCheck(ctx, check, L) {
  const { esc, show, rpc, lang } = ctx;
  const g = ctx.guide; const f = NAME[g.friend] || 'Bop';
  const items = check.todo.slice();
  let i = 0;
  const header = (caption) => `<header class="km-top">${avatarHtml(esc, g, 'km-av-s')}<p class="km-hello sc-caption">${esc(caption)}</p>
    <button class="km-grown" type="button" id="kmGate">${esc(ctx.gateLabel)}</button></header>`;
  const bindGate = () => document.getElementById('kmGate').addEventListener('click', ctx.gate);
  const cheer = (words, then, mood = 'yay') => {
    show(`<div class="km-panel km-yay sc-cheer sc-${mood}">${avatarHtml(esc, g, 'km-av-xl')}<p class="km-say km-cheer" role="status">${esc(words)}</p>
      <button class="km-btn km-btn-go" type="button" id="scNext">${esc(L.next)}</button></div>`);
    document.getElementById('scNext').addEventListener('click', then);
  };
  const finish = () => {
    show(`<div class="km-panel km-yay sc-cheer">${avatarHtml(esc, g, 'km-av-xl')}<p class="km-say km-cheer" role="status">${esc(L.finished(f))}</p>
      <button class="km-btn km-btn-go" type="button" id="scHome">${esc(L.home)}</button></div>`);
    document.getElementById('scHome').addEventListener('click', () => ctx.home(false));
  };
  const next = () => { i += 1; if (i >= items.length) finish(); else item(); };

  function item(retry = false) {
    const it = items[i];
    const caption = (lang === 'es' && it.prompt_es) || it.prompt_en;
    const p = it.payload || {};
    const started = Date.now();
    const send = async (response) => {
      let r;
      try { r = await rpc('kid_mode_check_answer', { p_session: ctx.session, p_assignment: check.id, p_item: it.id, p_response: response, p_ms: Date.now() - started }); }
      catch (err) { if (/ended/.test(String(err.message))) return ctx.home(false); return next(); }
      if (r.correct) return cheer(L.yay(f), next);
      if (r.try_again) return cheer(L.again, () => item(true), 'again');
      return cheer(L.onward, next, 'onward');
    };
    let body = '';
    if (it.kind === 'tap_picture') {
      body = `${p.show ? `<div class="sc-row sc-show" aria-hidden="true">${p.show.map((t) => `<span class="sc-pic">${pictureHtml(esc, t)}</span>`).join('')}<span class="sc-pic sc-q">?</span></div>` : ''}
        <div class="sc-row sc-choices">${p.choices.map((t, k) => `<button type="button" class="sc-pic sc-btn" data-k="${k}" aria-label="${k + 1}">${pictureHtml(esc, t)}</button>`).join('')}</div>`;
    } else if (it.kind === 'count_tap') {
      body = `<div class="sc-row sc-count-row">${Array.from({ length: p.n }, (_, k) => `<button type="button" class="sc-pic sc-btn sc-countme" data-c="${k}" aria-pressed="false">${pictureHtml(esc, p.token)}</button>`).join('')}</div>
        <div class="sc-row sc-options">${p.options.map((n) => `<button type="button" class="sc-num sc-btn" data-n="${n}"><b>${n}</b>${dotsHtml(n)}</button>`).join('')}</div>`;
    } else if (it.kind === 'match_pairs') {
      body = `<div class="sc-match"><div class="sc-col" data-side="l">${p.left.map((t, k) => `<button type="button" class="sc-pic sc-btn" data-l="${k}">${pictureHtml(esc, t)}</button>`).join('')}</div>
        <div class="sc-col" data-side="r">${p.right.map((t, k) => `<button type="button" class="sc-pic sc-btn" data-r="${k}">${pictureHtml(esc, t)}</button>`).join('')}</div></div>
        <div class="km-row sc-actions"><button class="km-btn soft" type="button" id="scRestart">${esc(L.restart)}</button><button class="km-btn km-btn-go" type="button" id="scReady" disabled>${esc(L.ready)}</button></div>`;
    } else if (it.kind === 'sort_groups') {
      body = `<div class="sc-row sc-bins">${p.groups.map((t, k) => `<button type="button" class="sc-bin sc-btn" data-g="${k}"><span class="sc-pic">${pictureHtml(esc, t)}</span><span class="sc-binlist" id="scBin${k}"></span></button>`).join('')}</div>
        <div class="sc-row sc-cards-row">${p.cards.map((t, k) => `<button type="button" class="sc-pic sc-btn" data-card="${k}">${pictureHtml(esc, t)}</button>`).join('')}</div>
        <div class="km-row sc-actions"><button class="km-btn soft" type="button" id="scRestart">${esc(L.restart)}</button><button class="km-btn km-btn-go" type="button" id="scReady" disabled>${esc(L.ready)}</button></div>`;
    } else if (it.kind === 'put_in_order') {
      body = `<div class="sc-row sc-order">${p.cards.map((t, k) => `<button type="button" class="sc-pic sc-btn" data-o="${k}">${pictureHtml(esc, t)}<span class="sc-tag" hidden></span></button>`).join('')}</div>
        <div class="km-row sc-actions"><button class="km-btn soft" type="button" id="scRestart">${esc(L.restart)}</button><button class="km-btn km-btn-go" type="button" id="scReady" disabled>${esc(L.ready)}</button></div>`;
    }
    show(`${header(caption)}<div class="km-panel sc-stage sc-${esc(it.kind)}${retry ? ' sc-retry' : ''}" id="scStage" data-item="${esc(it.id)}">${body}</div>`);
    bindGate();
    const stage = document.getElementById('scStage');
    const ready = document.getElementById('scReady');
    const restart = document.getElementById('scRestart');
    if (restart) restart.addEventListener('click', () => item(retry));

    if (it.kind === 'tap_picture') {
      stage.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (b) send({ index: p.choice_map ? p.choice_map[Number(b.dataset.k)] : Number(b.dataset.k) }); });
    } else if (it.kind === 'count_tap') {
      let taps = 0;
      stage.addEventListener('click', (e) => {
        const c = e.target.closest('[data-c]');
        if (c && c.getAttribute('aria-pressed') === 'false') { c.setAttribute('aria-pressed', 'true'); c.classList.add('on'); taps += 1; return; }
        const n = e.target.closest('[data-n]'); if (n) send({ n: Number(n.dataset.n), taps });
      });
    } else if (it.kind === 'match_pairs') {
      const map = Array(p.left.length).fill(null); let sel = null;
      stage.addEventListener('click', (e) => {
        const l = e.target.closest('[data-l]'); const r = e.target.closest('[data-r]');
        if (l && map[Number(l.dataset.l)] === null) { stage.querySelectorAll('[data-l]').forEach((x) => x.classList.toggle('sel', x === l)); sel = Number(l.dataset.l); return; }
        if (r && sel !== null && !map.includes(Number(r.dataset.r))) {
          map[sel] = Number(r.dataset.r);
          const pair = `sc-pair-${sel}`;
          stage.querySelector(`[data-l="${sel}"]`).classList.remove('sel'); stage.querySelector(`[data-l="${sel}"]`).classList.add('paired', pair); r.classList.add('paired', pair);
          sel = null; ready.disabled = map.includes(null);
        }
      });
      ready.addEventListener('click', () => send({ map }));
    } else if (it.kind === 'sort_groups') {
      const groups = Array(p.cards.length).fill(null); let sel = null;
      stage.addEventListener('click', (e) => {
        const c = e.target.closest('[data-card]'); const g2 = e.target.closest('[data-g]');
        if (c && !c.classList.contains('placed')) { stage.querySelectorAll('[data-card]').forEach((x) => x.classList.toggle('sel', x === c)); sel = Number(c.dataset.card); return; }
        if (g2 && sel !== null) {
          const k = Number(g2.dataset.g); groups[sel] = k;
          const card = stage.querySelector(`[data-card="${sel}"]`); card.classList.remove('sel'); card.classList.add('placed');
          document.getElementById(`scBin${k}`).insertAdjacentHTML('beforeend', `<span class="sc-mini">${pictureHtml(esc, p.cards[sel])}</span>`);
          sel = null; ready.disabled = groups.includes(null);
        }
      });
      ready.addEventListener('click', () => send({ groups }));
    } else if (it.kind === 'put_in_order') {
      const order = [];
      stage.addEventListener('click', (e) => {
        const o = e.target.closest('[data-o]'); if (!o || order.includes(Number(o.dataset.o))) return;
        order.push(Number(o.dataset.o)); o.classList.add('placed');
        const tag = o.querySelector('.sc-tag'); tag.hidden = false; tag.textContent = String(order.length);
        ready.disabled = order.length < p.cards.length;
      });
      ready.addEventListener('click', () => send({ order }));
    }
  }
  item();
}
