// /c/<slug>/habits: "Habit cards" for the staff, directors and families of a center (online school workstream C).
// Pick the habits, the language (English, Spanish or both) and the paper (US Letter or A4); the page shows the sheet as it will print, six
// cards a page with dashed cut lines, and "Print or save as PDF" opens the browser's print dialog (only the sheet prints, on its own pages).
// Each card: the friend's art, the habit in both languages, a QR code made right here (qr.js, no outside service) that opens the public
// player https://<site>/habit-<id>[?l=es]. The codes carry no child, family, center or account (habits-core.js habitUrl).
// The art arrives from /api/habits/art (habits-server.mjs) only for a signed-in member of this center; it is never a public file.
// Families see this page in their language (Spanish = DRAFT); staff pages stay English like the rest of the staff Hub.
import { HABITS, PAPER, sheetHtml } from './habits-core.js';

const S = {
  en: {
    title: 'Habit cards', lede: 'Print these cards and put each one where the habit happens: by the sink, on the toy shelf, by the door. Scanning a card with a phone or tablet opens a short moment with a Futures Friend (15 to 45 seconds) on the Futures Friends website.',
    privacy: 'The QR codes hold only the habit and the language. No names, no child details, no account, no sign-in. Plays are counted anonymously.',
    keep: 'These cards use the Futures Friends characters. Print them for your classroom or your home; please do not post or share the printable sheet.',
    lang: 'Card language', en: 'English', es: 'Español', both: 'Both (one of each)', paper: 'Paper', habits: 'Habits', all: 'All', none: 'None',
    print: 'Print or save as PDF', count: (c, p) => `${c} ${c === 1 ? 'card' : 'cards'} on ${p} ${p === 1 ? 'page' : 'pages'}`, pick: 'Pick at least one habit.',
    loading: 'Getting the cards ready…', failed: 'The card art could not be loaded. Reload the page and try again.', tip: 'Tip: in the print dialog choose "Save as PDF" to keep a copy, and turn on "Background graphics" for the colours.',
  },
  es: {
    title: 'Tarjetas de hábitos', lede: 'Imprima estas tarjetas y ponga cada una donde ocurre el hábito: junto al lavabo, en el estante de juguetes, junto a la puerta. Al escanear una tarjeta con un teléfono o tableta se abre un momento corto con un amigo de Futures Friends (de 15 a 45 segundos) en el sitio web de Futures Friends.',
    privacy: 'Los códigos QR solo llevan el hábito y el idioma. Sin nombres, sin datos del niño, sin cuenta y sin iniciar sesión. Las reproducciones se cuentan de forma anónima.',
    keep: 'Estas tarjetas usan los personajes de Futures Friends. Imprímalas para su salón o su casa; por favor no publique ni comparta la hoja para imprimir.',
    lang: 'Idioma de las tarjetas', en: 'English', es: 'Español', both: 'Los dos (una de cada una)', paper: 'Papel', habits: 'Hábitos', all: 'Todos', none: 'Ninguno',
    print: 'Imprimir o guardar como PDF', count: (c, p) => `${c} ${c === 1 ? 'tarjeta' : 'tarjetas'} en ${p} ${p === 1 ? 'página' : 'páginas'}`, pick: 'Elija al menos un hábito.',
    loading: 'Preparando las tarjetas…', failed: 'No se pudo cargar el arte de las tarjetas. Vuelva a cargar la página e inténtelo otra vez.', tip: 'Consejo: en la ventana de impresión elija "Guardar como PDF" para guardar una copia y active "Gráficos de fondo" para los colores.',
  },
};

export function mountHabits({ esc, $, page, live, session }) {
  async function loadArt(c) {
    const s = await session();
    const r = await fetch('/api/habits/art', { headers: { Authorization: `Bearer ${s?.access_token || ''}`, 'X-Center': c.center_id } });
    const body = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(body.error || `HTTP ${r.status}`);
    return { art: body.art || {}, habits: body.habits || { pilot: false, keys: [] } };
  }

  async function viewHabits(c, shell, { family = false, lang = 'en' } = {}) {
    const ui = lang === 'es' ? 'es' : 'en';
    const t = S[ui];
    const site = (globalThis.FF_HUB_WEB && globalThis.FF_HUB_WEB.siteUrl) || undefined;
    const opt = (name, value, label, on) => `<label class="choice"><input type="radio" name="${name}" value="${value}"${on ? ' checked' : ''}><span><b>${esc(label)}</b></span></label>`;
    page(shell(`<div class="hc-wrap" id="habitCards">
      ${family ? `<p><a href="/c/${esc(c.slug)}/home" data-nav id="hcBack">${esc(ui === 'es' ? '← Volver al inicio' : '← Back to home')}</a></p>` : ''}
      <div class="card hc-intro"><h2>${esc(t.title)}</h2><p>${esc(t.lede)}</p>
        <p class="small muted">${esc(t.privacy)}</p><p class="small muted">${esc(t.keep)}</p></div>
      <form class="card hc-controls" id="hcForm" novalidate>
        <fieldset class="f"><legend>${esc(t.lang)}</legend><div class="choices three">${opt('lang', 'en', t.en, lang !== 'es')}${opt('lang', 'es', t.es, lang === 'es')}${opt('lang', 'both', t.both, false)}</div></fieldset>
        <fieldset class="f"><legend>${esc(t.paper)}</legend><div class="choices two">${Object.entries(PAPER).map(([k, p]) => opt('paper', k, p.label, k === 'letter')).join('')}</div></fieldset>
        <fieldset class="f hc-pick"><legend>${esc(t.habits)}</legend>
          <div class="hc-pick-all"><button class="btn link small" type="button" data-hc="all">${esc(t.all)}</button><button class="btn link small" type="button" data-hc="none">${esc(t.none)}</button></div>
          <div class="hc-checks">${HABITS.map((h) => `<label class="hc-check"><input type="checkbox" name="habit" value="${h.id}" checked><span>${esc(h.name[ui])}</span></label>`).join('')}</div></fieldset>
        <div class="hc-actions"><button class="btn gold" type="button" id="hcPrint" disabled>${esc(t.print)}</button><span class="small" id="hcCount" role="status"></span></div>
        <p class="small muted">${esc(t.tip)}</p>
      </form>
      <div class="hc-preview" id="hcPreview"><p class="muted" id="hcLoading">${esc(t.loading)}</p></div>
    </div>`), t.title, { english: !family });

    let art = null, ok = null;
    try { ({ art, habits: ok } = await loadArt(c)); } catch (e) {
      const p = $('#hcPreview'); if (p) p.innerHTML = `<p class="msg bad" role="alert" id="hcFail">${esc(t.failed)}</p>`;
      return;
    }
    if (!$('#hcForm')) return;                                       // the person went elsewhere meanwhile
    const form = $('#hcForm');
    // only the cards the content workflow approved (hub/CONTENT_WORKFLOW.md); a pilot center sees drafts with a Draft chip
    if (!ok.pilot) form.querySelectorAll('input[name="habit"]').forEach((i) => { if (!ok.keys.includes(i.value)) i.closest('label').remove(); });
    else form.querySelector('.hc-pick legend')?.insertAdjacentHTML('beforeend', ` <span class="chip warn">${esc(ui === 'es' ? 'Borrador' : 'Draft')}</span>`);
    if (!form.querySelector('input[name="habit"]')) { $('#hcPreview').innerHTML = `<p class="msg info" role="status" id="hcNone">${esc(ui === 'es' ? 'Todavía no hay tarjetas aprobadas.' : 'No habit cards are approved yet.')}</p>`; return; }
    const draw = () => {
      const f = new FormData(form);
      const l = f.get('lang'), langs = l === 'both' ? ['en', 'es'] : [l === 'es' ? 'es' : 'en'];
      const ids = f.getAll('habit');
      const paper = f.get('paper') === 'a4' ? 'a4' : 'letter';
      const n = ids.length * langs.length, pages = Math.ceil(n / PAPER[paper].perPage);
      $('#hcPreview').innerHTML = n ? sheetHtml({ ids, langs, paper, site, art }) : `<p class="msg" role="status">${esc(t.pick)}</p>`;
      $('#hcCount').textContent = n ? t.count(n, pages) : '';
      $('#hcPrint').disabled = !n;
    };
    form.addEventListener('change', draw);
    form.addEventListener('click', (e) => {
      const b = e.target.closest('[data-hc]'); if (!b) return;
      form.querySelectorAll('input[name="habit"]').forEach((i) => { i.checked = b.dataset.hc === 'all'; });
      draw();
    });
    $('#hcPrint').addEventListener('click', () => { live(t.print); window.print(); });
    draw();
  }
  return { viewHabits };
}
