// The family's billing page (hub/FAMILY_BILLING.md, migration 20261028210000_family_billing.sql).
//   /c/<slug>/billing-family   families (English + Spanish DRAFT): the balance, every invoice with its lines, payments, monthly
//                              statements and the year-end child care statement for taxes (both printable: the browser's "Save as PDF"),
//                              autopay status, and "Pay online" (Stripe Checkout) once the center turns online payment on.
//   ?invoice=<id> opens THAT invoice (the notification and the dashboard's tuition line link here); &payment=<id> highlights the payment.
// The database answers only for the signed-in guardian's own children (family_billing*: my_kids, so a custody restriction removes the
// child at once). Money is exact integer cents (billing.js fmt). No inline styles or handlers (strict CSP).

import { fmt } from './billing.js';
import { deepFocus, deepMiss } from './deeplink.js';

const W = {
  en: {
    title: 'Billing', lead: 'Your account with the center: invoices, payments and statements.', balance: 'Balance', pastDue: 'Past due', nothingDue: 'Nothing due right now.',
    nextDue: (amt, d) => `Next: ${amt} due ${d}`, payOnline: 'Pay online', paySoon: 'Online payment opens soon — pay at the front desk.', payWait: 'Opening the secure payment page…',
    payFail: 'The payment page could not be opened. Pay at the front desk, or try again later.',
    autopay: 'Autopay', autopayOn: 'On: the card on file pays each invoice.', autopayOff: 'Off: pay each invoice at the front desk.',
    plan: (p, f) => `${p} · ${f}`, freq: { weekly: 'weekly', biweekly: 'every two weeks', monthly: 'monthly' },
    invoices: 'Invoices', noInvoices: 'No invoices yet.', invoice: (n) => `Invoice ${n}`, period: (a, b) => `${a} to ${b}`, due: (d) => `Due ${d}`,
    status: { open: 'Open', past_due: 'Past due', paid: 'Paid', void: 'Void', written_off: 'Closed' },
    line: { tuition: 'Tuition', sibling: 'Sibling discount', subsidy: 'Paid by the child care assistance program', late_fee: 'Late fee' },
    days: (a, b) => `${a} of ${b} days`, yourShare: 'Your share', paid: 'Paid', left: 'Still due', receipt: (r) => `Receipt ${r}`,
    payments: 'Payments', noPayments: 'No payments yet.', date: 'Date', amount: 'Amount', method: 'How', ref: 'For',
    methods: { cash: 'Cash', check: 'Check', card: 'Card', ach: 'Bank transfer', agency: 'Agency' }, reversal: 'Returned',
    statements: 'Monthly statements', month: 'Month', show: 'Show', print: 'Print or save as PDF', opening: 'Balance at the start of the month',
    charges: 'Invoices this month', credits: 'Payments this month', closing: 'Balance at the end of the month', noActivity: 'Nothing this month.',
    tax: 'Year-end statement for taxes', year: 'Year', taxDraft: 'DRAFT: for your records. The center\'s accountant reviews this statement before tax season; ask your tax preparer how to use it.',
    taxLead: 'Child care paid by your family, for a dependent care FSA claim or IRS Form 2441 (Child and Dependent Care Expenses).',
    provider: 'Care provider', ein: 'Employer identification number (EIN)', einMissing: 'Not on file yet: ask the center', address: 'Address', child: 'Child',
    paidYear: 'Paid by your family', total: 'Total', agencyNote: 'Amounts paid by a child care assistance program are not included: they are not your expense.',
    statementFor: (m) => `Statement for ${m}`, taxFor: (y) => `Child care statement ${y}`, noKids: 'No child is linked to your account yet.',
    failed: 'Billing could not be loaded.', questions: 'Questions about a bill? Ask the center', back: 'Back to Home',
  },
  es: {
    title: 'Pagos', lead: 'Su cuenta con el centro: facturas, pagos y estados de cuenta.', balance: 'Saldo', pastDue: 'Vencido', nothingDue: 'No hay nada pendiente ahora.',
    nextDue: (amt, d) => `Próximo: ${amt} vence el ${d}`, payOnline: 'Pagar en línea', paySoon: 'El pago en línea abre pronto — pague en la recepción.', payWait: 'Abriendo la página de pago segura…',
    payFail: 'No se pudo abrir la página de pago. Pague en la recepción o intente más tarde.',
    autopay: 'Pago automático', autopayOn: 'Activado: la tarjeta registrada paga cada factura.', autopayOff: 'Desactivado: pague cada factura en la recepción.',
    plan: (p, f) => `${p} · ${f}`, freq: { weekly: 'semanal', biweekly: 'cada dos semanas', monthly: 'mensual' },
    invoices: 'Facturas', noInvoices: 'Todavía no hay facturas.', invoice: (n) => `Factura ${n}`, period: (a, b) => `${a} al ${b}`, due: (d) => `Vence el ${d}`,
    status: { open: 'Pendiente', past_due: 'Vencida', paid: 'Pagada', void: 'Anulada', written_off: 'Cerrada' },
    line: { tuition: 'Colegiatura', sibling: 'Descuento por hermanos', subsidy: 'Pagado por el programa de ayuda para el cuidado infantil', late_fee: 'Cargo por pago tardío' },
    days: (a, b) => `${a} de ${b} días`, yourShare: 'Su parte', paid: 'Pagado', left: 'Pendiente', receipt: (r) => `Recibo ${r}`,
    payments: 'Pagos', noPayments: 'Todavía no hay pagos.', date: 'Fecha', amount: 'Monto', method: 'Forma', ref: 'Para',
    methods: { cash: 'Efectivo', check: 'Cheque', card: 'Tarjeta', ach: 'Transferencia bancaria', agency: 'Agencia' }, reversal: 'Devuelto',
    statements: 'Estados de cuenta mensuales', month: 'Mes', show: 'Ver', print: 'Imprimir o guardar como PDF', opening: 'Saldo al inicio del mes',
    charges: 'Facturas del mes', credits: 'Pagos del mes', closing: 'Saldo al final del mes', noActivity: 'Nada este mes.',
    tax: 'Estado anual para impuestos', year: 'Año', taxDraft: 'BORRADOR: para sus registros. El contador del centro revisa este estado antes de la temporada de impuestos; pregunte a su preparador de impuestos cómo usarlo.',
    taxLead: 'Cuidado infantil pagado por su familia, para una cuenta FSA de cuidado de dependientes o el Formulario 2441 del IRS (Gastos de cuidado de niños y dependientes).',
    provider: 'Proveedor de cuidado', ein: 'Número de identificación del empleador (EIN)', einMissing: 'Todavía no está registrado: pregunte al centro', address: 'Dirección', child: 'Niño o niña',
    paidYear: 'Pagado por su familia', total: 'Total', agencyNote: 'No se incluyen los montos pagados por un programa de ayuda para el cuidado infantil: no son un gasto suyo.',
    statementFor: (m) => `Estado de cuenta de ${m}`, taxFor: (y) => `Estado de cuidado infantil ${y}`, noKids: 'Todavía no hay un niño o niña en su cuenta.',
    failed: 'No se pudieron cargar los pagos.', questions: '¿Preguntas sobre una factura? Pregunte al centro', back: 'Volver a Inicio',
  },
};
const L_ = (lang) => W[lang === 'es' ? 'es' : 'en'];

// ---- pure helpers (tests/family-billing-unit.test.mjs) ---------------------------------------------------------------------------
export function dayText(iso, lang = 'en', opts = { month: 'short', day: 'numeric', year: 'numeric' }) {
  if (!iso) return '';
  const [y, m, d] = String(iso).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString(lang === 'es' ? 'es-US' : 'en-US', { ...opts, timeZone: 'UTC' });
}
export const monthText = (ym, lang = 'en') => dayText(`${ym}-01`, lang, { month: 'long', year: 'numeric' });
// The words of one invoice line.
export function lineText(l, lang = 'en') {
  const L = L_(lang);
  if (l.key === 'tuition') return `${L.line.tuition}${l.plan ? ` (${l.plan})` : ''}${l.days_in_care && l.days_in_period && l.days_in_care !== l.days_in_period ? ` · ${L.days(l.days_in_care, l.days_in_period)}` : ''}`;
  if (l.key === 'subsidy') return L.line.subsidy;
  return L.line[l.key] || l.key;
}
// Pay online is offered only for an open / past-due invoice with money still due, and only when the server says it is on.
export const canPay = (inv, online) => !!online && ['open', 'past_due'].includes(inv?.status) && Number.isSafeInteger(inv?.balance_cents) && inv.balance_cents > 0;

export function mountFamilyBilling({ esc, $, rpc, page, live, friendly, getLang, session }) {
  async function payStatus() {
    try { const r = await fetch('/api/billing/family-pay/status', { headers: { Accept: 'application/json' } }); return r.ok ? await r.json() : { online: false }; }
    catch (_) { return { online: false }; }
  }

  async function viewFamily(c, shell) {
    const lang = getLang() === 'es' ? 'es' : 'en';
    const L = L_(lang);
    const q = new URLSearchParams(location.search);
    let d, pay;
    try { [d, pay] = await Promise.all([rpc('family_billing', { p_center: c.center_id }), payStatus()]); }
    catch (e) { page(shell(`<div class="card" id="familyBilling"><h2>${esc(L.title)}</h2><p class="msg bad" role="alert">${esc(L.failed)} ${esc(friendly(e))}</p></div>`), L.title); return; }
    const payOn = !!pay.online;
    const first = Object.fromEntries((d.kids || []).map((k) => [k.id, k.first]));
    const chip = (s) => `<span class="chip ${s === 'past_due' ? 'bad' : s === 'paid' ? 'ok' : s === 'open' ? 'gold' : ''}">${esc(L.status[s] || s)}</span>`;
    const payBtn = (inv) => (canPay(inv, payOn) ? `<button type="button" class="btn gold small fb-pay" data-pay="${esc(inv.id)}">${esc(L.payOnline)}</button>` : '');
    const invHtml = (inv) => `<li class="fb-inv" id="inv-${esc(inv.id)}" data-invoice="${esc(inv.id)}"><details${q.get('invoice') === inv.id ? ' open' : ''}>
        <summary><span class="fb-inv-h"><b>${esc(L.invoice(inv.invoice_no))}</b><span class="small muted">${esc(first[inv.kid] || inv.first || '')} · ${esc(L.period(dayText(inv.period_start, lang), dayText(inv.period_end, lang)))}</span></span>
          <span class="fb-inv-r"><b>${esc(fmt(inv.balance_cents > 0 ? inv.balance_cents : inv.family_cents))}</b>${chip(inv.status)}</span></summary>
        <table class="fb-lines"><caption class="small muted">${esc(L.due(dayText(inv.due_date, lang)))}</caption><tbody>
          ${(inv.lines || []).map((l) => `<tr><th scope="row">${esc(lineText(l, lang))}</th><td>${esc(fmt(l.cents))}</td></tr>`).join('')}
          <tr class="fb-sum"><th scope="row">${esc(L.yourShare)}</th><td>${esc(fmt(inv.family_cents))}</td></tr>
          <tr><th scope="row">${esc(L.paid)}</th><td>${esc(fmt(inv.paid_cents))}</td></tr>
          <tr class="fb-sum"><th scope="row">${esc(L.left)}</th><td>${esc(fmt(inv.balance_cents))}</td></tr></tbody></table>
        ${inv.receipt_no ? `<p class="small muted">${esc(L.receipt(inv.receipt_no))}</p>` : ''}${payBtn(inv)}</details></li>`;
    const payRows = (d.payments || []).map((p) => `<tr id="pay-${esc(p.id)}" data-payment="${esc(p.id)}"><td>${esc(dayText(p.date, lang))}</td>
        <td><a href="?invoice=${esc(p.invoice_id)}" data-inv="${esc(p.invoice_id)}">${esc(p.invoice_no)}</a>${p.receipt_no ? ` <span class="small muted">${esc(p.receipt_no)}</span>` : ''}</td>
        <td>${esc(L.methods[p.method] || p.method)}${p.kind === 'reversal' ? ` <span class="chip warn">${esc(L.reversal)}</span>` : ''}</td><td class="fb-num">${esc(fmt(p.amount_cents))}</td></tr>`).join('');
    const nowYear = Number(String(d.today || new Date().toISOString()).slice(0, 4));
    const years = [...new Set([...(d.years || []), nowYear, nowYear - 1])].sort((a, b) => b - a);
    const months = d.months && d.months.length ? d.months : [new Date().toISOString().slice(0, 7)];
    const acc = (d.accounts || []).map((a) => `<li><b>${esc(first[a.kid] || a.kid)}</b> <span class="small muted">${esc(L.plan(a.plan, L.freq[a.freq] || a.freq))}</span>
        <span class="small">${esc(L.autopay)}: ${esc(a.autopay ? L.autopayOn : L.autopayOff)}</span></li>`).join('');

    page(shell(`<section id="familyBilling" class="fb">
      <div class="card fb-top"><h2>${esc(L.title)}</h2><p class="small muted">${esc(L.lead)}</p>
        <div class="fb-balance" id="fbBalance"><span>${esc(L.balance)}</span><b>${esc(fmt(d.balance_cents))}</b>${d.past_due_cents > 0 ? `<span class="chip bad">${esc(L.pastDue)}: ${esc(fmt(d.past_due_cents))}</span>` : ''}</div>
        <p class="small">${d.next_due ? `<a href="?invoice=${esc(d.next_due.id)}" data-inv="${esc(d.next_due.id)}" id="fbNext">${esc(L.nextDue(fmt(d.next_due.balance_cents), dayText(d.next_due.due_date, lang)))}</a>` : esc(L.nothingDue)}</p>
        ${payOn ? '' : `<p class="msg info" id="fbPaySoon">${esc(L.paySoon)}</p>`}<p class="msg" id="fbMsg" role="status"></p>
        ${acc ? `<ul class="fb-acc" id="fbAutopay">${acc}</ul>` : ''}</div>
      <section class="card" id="fbInvoices" aria-labelledby="fbInvH"><h2 id="fbInvH">${esc(L.invoices)}</h2>
        ${(d.invoices || []).length ? `<ul class="fb-invs">${d.invoices.map(invHtml).join('')}</ul>` : `<p class="small muted">${esc((d.kids || []).length ? L.noInvoices : L.noKids)}</p>`}</section>
      <section class="card" id="fbPayments" aria-labelledby="fbPayH"><h2 id="fbPayH">${esc(L.payments)}</h2>
        ${payRows ? `<div class="fb-scroll"><table class="fb-table"><thead><tr><th scope="col">${esc(L.date)}</th><th scope="col">${esc(L.ref)}</th><th scope="col">${esc(L.method)}</th><th scope="col" class="fb-num">${esc(L.amount)}</th></tr></thead><tbody>${payRows}</tbody></table></div>` : `<p class="small muted">${esc(L.noPayments)}</p>`}</section>
      <section class="card" id="fbStatements" aria-labelledby="fbStH"><h2 id="fbStH">${esc(L.statements)}</h2>
        <form class="fb-pick" id="fbStForm"><label class="f"><span>${esc(L.month)}</span><select class="i" id="fbMonth">${months.map((m) => `<option value="${esc(m)}">${esc(monthText(m, lang))}</option>`).join('')}</select></label>
          <button class="btn soft small" type="submit">${esc(L.show)}</button></form><div id="fbStatement" class="fb-doc" hidden></div></section>
      <section class="card" id="fbTax" aria-labelledby="fbTaxH"><h2 id="fbTaxH">${esc(L.tax)}</h2><p class="small muted">${esc(L.taxLead)}</p>
        <form class="fb-pick" id="fbTaxForm"><label class="f"><span>${esc(L.year)}</span><select class="i" id="fbYear">${years.map((y) => `<option value="${y}">${y}</option>`).join('')}</select></label>
          <button class="btn soft small" type="submit">${esc(L.show)}</button></form><div id="fbTaxDoc" class="fb-doc" hidden></div></section>
      <p class="fb-foot"><a class="btn link" href="/c/${esc(c.slug)}/help" data-nav>${esc(L.questions)}</a> <a class="btn link" href="/c/${esc(c.slug)}/home" data-nav>${esc(L.back)}</a></p>
    </section>`), L.title);

    // deep links: the invoice (opened), the payment row
    const wantInv = q.get('invoice'), wantPay = q.get('payment');
    if (wantPay && document.getElementById(`pay-${wantPay}`)) deepFocus(document.getElementById(`pay-${wantPay}`));
    else if (wantInv) { const el = document.getElementById(`inv-${wantInv}`); if (el) { el.querySelector('details').open = true; deepFocus(el); } else deepMiss('any', lang); }

    // links to an invoice inside this page open it in place
    for (const a of document.querySelectorAll('#familyBilling a[data-inv]')) {
      a.addEventListener('click', (e) => {
        const el = document.getElementById(`inv-${a.dataset.inv}`); if (!el) return;
        e.preventDefault(); history.replaceState(null, '', `?invoice=${encodeURIComponent(a.dataset.inv)}`); el.querySelector('details').open = true; deepFocus(el);
      });
    }
    for (const b of document.querySelectorAll('#familyBilling [data-pay]')) {
      b.addEventListener('click', async () => {
        const m = $('#fbMsg'); b.disabled = true; m.className = 'msg info'; m.textContent = L.payWait;
        try {
          const s = await session();
          const r = await fetch('/api/billing/family-pay', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token || ''}` },
            body: JSON.stringify({ center: c.center_id, invoice: b.dataset.pay, lang }) });
          const body = await r.json().catch(() => ({}));
          if (r.ok && typeof body.url === 'string' && /^https:\/\/checkout\.stripe\.com\//.test(body.url)) { location.assign(body.url); return; }
          m.className = 'msg bad'; m.textContent = r.status === 503 ? L.paySoon : L.payFail;
        } catch (_) { m.className = 'msg bad'; m.textContent = L.payFail; }
        b.disabled = false;
      });
    }
    const printBtn = (id) => `<p class="fb-noprint"><button type="button" class="btn navy small" data-print="${id}">${esc(L.print)}</button></p>`;
    const head = (title) => `<header class="fb-doc-h"><b>${esc(d.center?.legal_name || d.center?.name || c.name)}</b>${d.center?.address ? `<span class="small">${esc(d.center.address)}</span>` : ''}<h3>${esc(title)}</h3></header>`;
    const bindPrint = (root) => root.querySelector('[data-print]')?.addEventListener('click', () => {
      document.body.classList.add('fb-printing'); root.classList.add('fb-print-target');
      const done = () => { document.body.classList.remove('fb-printing'); root.classList.remove('fb-print-target'); window.removeEventListener('afterprint', done); };
      window.addEventListener('afterprint', done); window.print(); setTimeout(done, 1500);
    });
    $('#fbStForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = $('#fbStatement'); box.hidden = false;
      try {
        const s = await rpc('family_billing_statement', { p_center: c.center_id, p_month: `${$('#fbMonth').value}-01` });
        const rows = [...(s.charges || []).map((x) => [x.date, `${L.invoice(x.invoice_no)} · ${first[x.kid] || ''}`, x.cents]),
          ...(s.payments || []).map((x) => [x.date, `${L.methods[x.method] || x.method}${x.receipt_no ? ` · ${x.receipt_no}` : ''}${x.kind === 'reversal' ? ` · ${L.reversal}` : ''}`, -x.cents])]
          .sort((a, b) => String(a[0]).localeCompare(String(b[0])));
        box.innerHTML = `${head(L.statementFor(monthText(s.month, lang)))}<table class="fb-table" id="fbStTable"><tbody>
          <tr class="fb-sum"><th scope="row" colspan="2">${esc(L.opening)}</th><td class="fb-num">${esc(fmt(s.opening_cents))}</td></tr>
          ${rows.length ? rows.map(([dt, what, cents]) => `<tr><td>${esc(dayText(dt, lang))}</td><td>${esc(what)}</td><td class="fb-num">${esc(fmt(cents))}</td></tr>`).join('') : `<tr><td colspan="3" class="small muted">${esc(L.noActivity)}</td></tr>`}
          <tr><th scope="row" colspan="2">${esc(L.charges)}</th><td class="fb-num">${esc(fmt(s.charges_cents))}</td></tr>
          <tr><th scope="row" colspan="2">${esc(L.credits)}</th><td class="fb-num">${esc(fmt(-s.payments_cents))}</td></tr>
          <tr class="fb-sum"><th scope="row" colspan="2">${esc(L.closing)}</th><td class="fb-num" id="fbClosing">${esc(fmt(s.closing_cents))}</td></tr></tbody></table>${printBtn('st')}`;
        bindPrint(box);
      } catch (err) { box.innerHTML = `<p class="msg bad" role="alert">${esc(friendly(err))}</p>`; }
    });
    $('#fbTaxForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const box = $('#fbTaxDoc'); box.hidden = false;
      try {
        const t = await rpc('family_tax_statement', { p_center: c.center_id, p_year: Number($('#fbYear').value) });
        box.innerHTML = `${head(L.taxFor(t.year))}<p class="msg warn fb-draft" id="fbTaxDraft">${esc(L.taxDraft)}</p>
          <dl class="fb-dl"><dt>${esc(L.provider)}</dt><dd>${esc(t.provider?.name || '')}</dd><dt>${esc(L.address)}</dt><dd>${esc(t.provider?.address || '—')}</dd>
            <dt>${esc(L.ein)}</dt><dd id="fbEin">${esc(t.provider?.ein || L.einMissing)}</dd></dl>
          <table class="fb-table"><thead><tr><th scope="col">${esc(L.child)}</th><th scope="col" class="fb-num">${esc(L.paidYear)}</th></tr></thead><tbody>
          ${(t.children || []).map((k) => `<tr><td>${esc([k.first, k.last].filter(Boolean).join(' '))}</td><td class="fb-num">${esc(fmt(k.paid_cents))}</td></tr>`).join('')}
          <tr class="fb-sum"><th scope="row">${esc(L.total)}</th><td class="fb-num" id="fbTaxTotal">${esc(fmt(t.total_cents))}</td></tr></tbody></table>
          <p class="small muted">${esc(L.agencyNote)}</p>${printBtn('tax')}`;
        bindPrint(box);
      } catch (err) { box.innerHTML = `<p class="msg bad" role="alert">${esc(friendly(err))}</p>`; }
    });
  }
  return { viewFamily };
}
