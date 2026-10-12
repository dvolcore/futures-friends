// Futures Hub front-end: the Billing desk (migrations 20261020100000..20261021100000). DIRECTORS AND OWNERS ONLY.
//   /c/<slug>/billing   plans, accounts, invoices, payments, ledger reports, QuickBooks files
// The tab is not shown to teachers, hours-only teachers or families, and app.js sends them home if they type the address; the database
// refuses them anyway (every function checks director/owner + two-step verification, the tables show them no row). English only.
// Money is shown and typed as EXACT integer cents: nothing here uses floating point for an amount.

import { centerToday, centerTz } from './center-time.js';   // the center's day and zone (hub/TIME_ZONES.md)

export const fmt = (cents) => {
  if (!Number.isSafeInteger(cents)) return '—';
  const a = Math.abs(cents);
  return `${cents < 0 ? '-' : ''}$${String(Math.floor(a / 100)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${String(a % 100).padStart(2, '0')}`;
};
// "$1,234.5" -> 123450; anything that is not a plain non-negative amount with at most two decimals -> null
export const parseCents = (text) => {
  const m = /^\s*\$?\s*(\d{1,7})(?:\.(\d{1,2}))?\s*$/.exec(String(text ?? '').replace(/,/g, ''));
  return m ? Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0')) : null;
};
// The program serves ages 2 to 5 only (owner order 2026-10-08): the database still accepts the 'retired_program' program value, but the screen never offers it.
const PROGRAM_LABELS = [['retired_program', 'Retired program'], ['toddler', 'Toddler'], ['preschool', 'Preschool'], ['school_age', 'School-age'], ['summer', 'Summer'], ['part_time', 'Part-time']];
export const PROGRAMS = PROGRAM_LABELS.filter(([v]) => v !== 'retired_program');
const FREQ = [['weekly', 'Weekly'], ['biweekly', 'Every two weeks'], ['monthly', 'Monthly']];
const DUE = [['mon', 'Monday'], ['tue', 'Tuesday'], ['wed', 'Wednesday'], ['thu', 'Thursday'], ['fri', 'Friday'], ['sat', 'Saturday'], ['sun', 'Sunday'], ...Array.from({ length: 28 }, (_, i) => [String(i + 1), `Day ${i + 1} of the month`])];
const STATUS_CHIP = { open: '', paid: 'gold', past_due: 'warn', void: '', written_off: 'warn', draft: '' };
const uuid = () => (globalThis.crypto?.randomUUID ? crypto.randomUUID() : '00000000-0000-4000-8000-' + String(Date.now()).padStart(12, '0').slice(-12));

export function mountBilling(h) {
  const { esc, $, $$, rpc, page, live, friendly, client, session } = h;
  let sub = 'invoices';

  async function viewBilling(c, shell) {
    const cid = c.center_id;
    const bill = (await client().from('center_billing').select('*').eq('center_id', cid).maybeSingle()).data;
    const frame = (body) => page(shell(`<div class="card" id="billingIntro"><h2>Billing</h2>
      <p class="small muted" id="moneyOnly">Directors and owners only. Teachers and Futures Friends support never see this; families see only their own child's invoices. Card and bank numbers are never stored here.</p></div>${body}`), `Billing · ${c.name}`, { english: true });
    const msg = (t, bad) => { const m = $('#billingMsg'); if (m) { m.className = `msg ${bad ? 'bad' : 'ok'}`; m.textContent = t; } live(t); };
    const guard = async (fn) => { try { await fn(); } catch (e) { msg(friendly(e), true); } };

    if (!bill?.ledger_ready) {
      frame(`<form class="card" id="billingSetup" novalidate><h3>Set up billing</h3>
        <p class="small muted">The name, address and EIN appear on the statements families receive for their taxes. This also creates your chart of accounts.</p>
        <label class="f"><span>Legal name</span><input class="i" id="bLegal" maxlength="200" autocomplete="off"></label>
        <label class="f"><span>Address</span><input class="i" id="bAddr" maxlength="400" autocomplete="off"></label>
        <div class="row two"><label class="f"><span>EIN <span class="hint">12-3456789</span></span><input class="i" id="bEin" maxlength="10" autocomplete="off"></label>
        <label class="f"><span>Time zone</span><input class="i" id="bTz" value="${esc(centerTz())}" maxlength="60" aria-describedby="bTzHint"><span class="hint" id="bTzHint">the center's time zone (also in Center settings)</span></label></div>
        <div class="row two"><label class="f"><span>Late fee ($, 0 for none)</span><input class="i" id="bFee" value="0" inputmode="decimal"></label>
        <label class="f"><span>Grace days after the due date</span><input class="i" id="bGrace" value="5" inputmode="numeric"></label></div>
        <p class="msg" id="billingMsg" role="status"></p><button class="btn center" type="submit">Save and set up</button></form>`);
      $('#billingSetup').addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
        const fee = parseCents($('#bFee').value); if (fee === null) throw new Error('enter the late fee as dollars, for example 25 or 25.00');
        await rpc('center_billing_save', { p_center: cid, p_legal_name: $('#bLegal').value, p_address: $('#bAddr').value, p_ein: $('#bEin').value, p_timezone: $('#bTz').value,
          p_late_fee_cents: fee, p_late_fee_grace_days: Number($('#bGrace').value || 0) });
        viewBilling(c, shell);
      }); });
      return;
    }

    const tabs = [['invoices', 'Invoices'], ['payments', 'Payments'], ['accounts', 'Children'], ['plans', 'Plans'], ['reports', 'Ledger and reports'], ['quickbooks', 'QuickBooks'], ['settings', 'Settings']];
    const nav = `<nav class="tabs" id="billingTabs" aria-label="Billing sections">${tabs.map(([t, l]) => `<a href="#${t}" data-sub="${t}"${t === sub ? ' aria-current="page"' : ''}>${esc(l)}</a>`).join('')}</nav>`;
    const draw = async () => {
      let body = '';
      if (sub === 'plans') body = await plansView(cid);
      else if (sub === 'accounts') body = await accountsView(cid);
      else if (sub === 'payments') body = await paymentsView(cid);
      else if (sub === 'reports') body = reportsView();
      else if (sub === 'quickbooks') body = quickbooksView();
      else if (sub === 'settings') body = settingsView(bill);
      else body = await invoicesView(cid);
      frame(`${nav}${body}<p class="msg" id="billingMsg" role="status"></p>`);
      $$('#billingTabs a').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); sub = a.dataset.sub; guard(draw); }));
      const wire = { plans: wirePlans, accounts: wireAccounts, payments: wirePayments, reports: wireReports, quickbooks: wireQuickbooks, settings: wireSettings, invoices: wireInvoices }[sub];
      wire(cid, msg, guard, draw, c);
    };
    await draw();
  }

  // ---- plans -------------------------------------------------------------------------------------------------------------------
  async function plansView(cid) {
    const { data, error } = await client().from('tuition_plans').select('*').eq('center_id', cid).order('name'); if (error) throw error;
    return `<div class="grid two"><div class="card"><h3>Tuition plans</h3>${data.length ? `<ul class="list" id="planList">${data.map((p) => `<li><span class="who"><b>${esc(p.name)}</b>
      <span class="small muted">${esc((PROGRAM_LABELS.find(([v]) => v === p.program) || [, p.program])[1])} · ${fmt(p.amount_cents)} ${esc(p.freq)}${p.active ? '' : ' · retired'}</span></span>
      <button class="btn soft small" type="button" data-edit-plan="${esc(p.id)}">Edit</button></li>`).join('')}</ul>` : '<p class="empty">No plans yet. Add the first one.</p>'}
      <p class="small muted">Changing a plan changes future invoices only; issued invoices keep their amounts.</p></div>
      <form class="card" id="planForm" novalidate data-plans='${esc(JSON.stringify(data.map((p) => ({ id: p.id, name: p.name, program: p.program, amount_cents: p.amount_cents, freq: p.freq, active: p.active }))))}'><h3 id="planTitle">Add a plan</h3>
        <input type="hidden" id="plId"><label class="f"><span>Name</span><input class="i" id="plName" maxlength="80" required></label>
        <div class="row two"><label class="f"><span>Program</span><select class="i" id="plProg">${PROGRAMS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>
        <label class="f"><span>Billed</span><select class="i" id="plFreq">${FREQ.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label></div>
        <label class="f"><span>Amount per period ($)</span><input class="i" id="plAmt" inputmode="decimal" required></label>
        <label class="choice"><input type="checkbox" id="plActive" checked><span><b>In use</b></span></label>
        <button class="btn center" type="submit">Save plan</button></form></div>`;
  }
  function wirePlans(cid, msg, guard, draw) {
    const f = $('#planForm'); const plans = JSON.parse(f.dataset.plans);
    $$('[data-edit-plan]').forEach((b) => b.addEventListener('click', () => {
      const p = plans.find((x) => x.id === b.dataset.editPlan);
      $('#planTitle').textContent = 'Edit plan'; $('#plId').value = p.id; $('#plName').value = p.name; $('#plProg').value = p.program; $('#plFreq').value = p.freq;
      $('#plAmt').value = (p.amount_cents / 100).toFixed(2); $('#plActive').checked = p.active;
    }));
    f.addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const cents = parseCents($('#plAmt').value); if (!cents) throw new Error('enter the amount as dollars, for example 300 or 300.00');
      await rpc('billing_plan_save', { p_center: cid, p_id: $('#plId').value || null, p_name: $('#plName').value, p_program: $('#plProg').value, p_amount_cents: cents, p_freq: $('#plFreq').value, p_active: $('#plActive').checked });
      await draw(); msg('Plan saved.');
    }); });
  }

  // ---- children's billing accounts ------------------------------------------------------------------------------------------
  const kidName = (kids, id) => { const k = kids.find((x) => x.id === id); return k?.data?.first || k?.data?.name || id; };
  async function accountsView(cid) {
    const [accts, plans, kids, fams] = await Promise.all([
      client().from('billing_accounts').select('*').eq('center_id', cid).order('kid'), client().from('tuition_plans').select('id, name, active').eq('center_id', cid).order('name'),
      client().from('kids').select('id, data').eq('center_id', cid).order('id'), rpc('center_family_list', { p_center: cid })]);
    for (const r of [accts, plans, kids]) if (r.error) throw r.error;
    const state = { accts: accts.data, fams };
    return `<div class="grid two"><div class="card"><h3>Children's billing</h3>${accts.data.length ? `<ul class="list" id="acctList">${accts.data.map((a) => `<li><span class="who"><b>${esc(kidName(kids.data, a.kid))}</b>
      <span class="small muted">${esc((plans.data.find((p) => p.id === a.plan_id) || {}).name || '')} · ${a.sibling_pct ? `sibling ${a.sibling_pct}% · ` : ''}${a.subsidy_amount_cents ? `${esc(a.subsidy_agency)} pays ${fmt(a.subsidy_amount_cents)} · ` : ''}from ${esc(a.start_date)}${a.end_date ? ` to ${esc(a.end_date)}` : ''}</span></span>
      <span><span class="chip ${a.state === 'active' ? 'gold' : 'warn'}">${esc(a.state)}</span> <button class="btn soft small" type="button" data-edit-acct="${esc(a.id)}">Edit</button></span></li>`).join('')}</ul>` : '<p class="empty">No children are being billed yet.</p>'}</div>
      <form class="card" id="acctForm" novalidate data-state='${esc(JSON.stringify(state))}'><h3 id="acctTitle">Bill a child</h3><input type="hidden" id="acId">
        <label class="f"><span>Child</span><select class="i" id="acKid">${kids.data.map((k) => `<option value="${esc(k.id)}">${esc(kidName(kids.data, k.id))}</option>`).join('')}</select></label>
        <label class="f"><span>Who pays (a guardian of this child)</span><select class="i" id="acPayer"></select></label>
        <label class="f"><span>Plan</span><select class="i" id="acPlan">${plans.data.filter((p) => p.active).map((p) => `<option value="${esc(p.id)}">${esc(p.name)}</option>`).join('')}</select></label>
        <div class="row two"><label class="f"><span>Due</span><select class="i" id="acDue">${DUE.map(([v, l]) => `<option value="${v}"${v === 'fri' ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select></label>
        <label class="f"><span>Sibling discount % (0 to 50)</span><input class="i" id="acSib" value="0" inputmode="numeric"></label></div>
        <div class="row two"><label class="f"><span>Subsidy agency (optional)</span><input class="i" id="acAgency" maxlength="60" autocomplete="off"></label>
        <label class="f"><span>Agency pays per period ($)</span><input class="i" id="acSub" value="0" inputmode="decimal"></label></div>
        <div class="row two"><label class="f"><span>Start date</span><input class="i" type="date" id="acStart" required></label><label class="f"><span>End date (optional)</span><input class="i" type="date" id="acEnd"></label></div>
        <label class="f"><span>Status</span><select class="i" id="acState"><option value="active">Active</option><option value="paused">Paused (no invoices)</option><option value="stopped">Stopped</option></select></label>
        <button class="btn center" type="submit">Save</button></form></div>`;
  }
  function wireAccounts(cid, msg, guard, draw) {
    const f = $('#acctForm'); const { accts, fams } = JSON.parse(f.dataset.state);
    const fillPayers = (kid, keep) => { $('#acPayer').innerHTML = fams.filter((x) => (x.kids || []).includes(kid)).map((x) => `<option value="${esc(x.user_id)}">${esc(x.full_name)} (${esc(x.email)})</option>`).join('') || '<option value="">No family is linked to this child yet</option>'; if (keep) $('#acPayer').value = keep; };
    fillPayers($('#acKid').value); $('#acKid').addEventListener('change', () => fillPayers($('#acKid').value));
    $$('[data-edit-acct]').forEach((b) => b.addEventListener('click', () => {
      const a = accts.find((x) => x.id === b.dataset.editAcct);
      $('#acctTitle').textContent = 'Edit billing'; $('#acId').value = a.id; $('#acKid').value = a.kid; $('#acKid').disabled = true; fillPayers(a.kid, a.payer_user_id);
      $('#acPlan').value = a.plan_id; $('#acDue').value = a.due_day; $('#acSib').value = a.sibling_pct; $('#acAgency').value = a.subsidy_agency || ''; $('#acSub').value = (a.subsidy_amount_cents / 100).toFixed(2);
      $('#acStart').value = a.start_date; $('#acEnd').value = a.end_date || ''; $('#acState').value = a.state;
    }));
    f.addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const sub$ = parseCents($('#acSub').value); if (sub$ === null) throw new Error('enter the agency amount as dollars');
      await rpc('billing_account_save', { p_center: cid, p_id: $('#acId').value || null, p_kid: $('#acKid').value, p_payer: $('#acPayer').value || null, p_plan: $('#acPlan').value,
        p_recurring: true, p_due_day: $('#acDue').value, p_sibling_pct: Number($('#acSib').value || 0), p_subsidy_agency: $('#acAgency').value || null, p_subsidy_amount_cents: sub$,
        p_start: $('#acStart').value || null, p_end: $('#acEnd').value || null, p_state: $('#acState').value });
      await draw(); msg('Saved.');
    }); });
  }

  // ---- invoices ------------------------------------------------------------------------------------------------------------------
  async function invoicesView(cid) {
    const [inv, kids] = await Promise.all([client().from('invoices').select('*').eq('center_id', cid).order('period_start', { ascending: false }).order('invoice_no', { ascending: false }).limit(150),
      client().from('kids').select('id, data').eq('center_id', cid)]);
    if (inv.error) throw inv.error;
    const ids = inv.data.map((i) => i.id);
    const pays = ids.length ? (await client().from('payments').select('invoice_id, amount_cents, kind, payer_kind').eq('center_id', cid).in('invoice_id', ids)).data || [] : [];
    const paid = (i, kind) => pays.filter((p) => p.invoice_id === i.id && p.payer_kind === kind).reduce((a, p) => a + (p.kind === 'reversal' ? -p.amount_cents : p.amount_cents), 0);
    const today = centerToday();   // the center's day
    return `<div class="card"><h3>Create this period's invoices</h3>
      <form id="genForm" class="row two" novalidate><label class="f"><span>A date inside the period</span><input class="i" type="date" id="genDate" value="${today}"></label>
        <label class="f"><span>Invoice date (optional, to bill ahead)</span><input class="i" type="date" id="genInv"></label></form>
      <p class="small muted">Weekly, every-two-weeks and monthly plans each get the period that contains this date. Part periods are charged by weekdays in care. Running it twice never bills twice.</p>
      <div class="row"><button class="btn center" type="button" id="genGo">Create invoices</button><button class="btn soft" type="button" id="lateGo">Apply late fees</button><button class="btn soft" type="button" id="recGo">Recognize prepaid tuition</button></div></div>
      <div class="card"><h3>Invoices</h3>${inv.data.length ? `<ul class="list" id="invList">${inv.data.map((i) => {
        const fam = i.family_cents - paid(i, 'family'); const ag = i.subsidy_cents - paid(i, 'agency');
        return `<li data-id="${esc(i.id)}"><span class="who"><b>${esc(i.invoice_no)} · ${esc(kidName(kids.data || [], i.kid))}</b>
        <span class="small muted">${esc(i.period_start)} to ${esc(i.period_end)} · due ${esc(i.due_date)} · gross ${fmt(i.gross_cents)}${i.sibling_cents ? ` · sibling −${fmt(i.sibling_cents)}` : ''}${i.subsidy_cents ? ` · agency ${fmt(i.subsidy_cents)}` : ''}${i.late_fee_cents ? ` · late fee ${fmt(i.late_fee_cents)}` : ''}</span>
        <span class="small">Family owes <b>${fmt(i.family_cents)}</b>${['open', 'past_due'].includes(i.status) ? ` (still ${fmt(fam)})` : ''}${i.subsidy_cents && ['open', 'past_due'].includes(i.status) ? ` · agency still ${fmt(ag)}` : ''}${i.receipt_no ? ` · ${esc(i.receipt_no)}` : ''}</span></span>
        <span><span class="chip ${STATUS_CHIP[i.status] || ''}">${esc(i.status.replace('_', ' '))}</span>
        ${i.status === 'draft' ? `<button class="btn soft small" type="button" data-issue="${esc(i.id)}">Issue</button>` : ''}
        ${['open', 'past_due'].includes(i.status) ? `<button class="btn soft small" type="button" data-void="${esc(i.id)}">Void</button><button class="btn link" type="button" data-writeoff="${esc(i.id)}">Write off</button>` : ''}</span></li>`; }).join('')}</ul>` : '<p class="empty">No invoices yet. Add plans and children, then create the first invoices.</p>'}</div>`;
  }
  function wireInvoices(cid, msg, guard, draw) {
    $('#genGo').addEventListener('click', () => guard(async () => {
      const d = $('#genDate').value; if (!d) throw new Error('choose a date inside the billing period');
      const r = await rpc('billing_generate_invoices', { p_center: cid, p_period_date: d, p_invoice_date: $('#genInv').value || null, p_draft: false });
      await draw(); msg(`${r.created} invoice${r.created === 1 ? '' : 's'} created, ${r.existing} already existed${r.skipped.length ? `, ${r.skipped.length} children skipped (paused, stopped or outside their dates)` : ''}.`);
    }));
    $('#lateGo').addEventListener('click', () => guard(async () => { const r = await rpc('billing_apply_late_fees', { p_center: cid, p_as_of: null }); await draw(); msg(`${r.marked_past_due} marked past due, ${r.fees_added} late fee${r.fees_added === 1 ? '' : 's'} added (${fmt(r.total_cents)}).`); }));
    $('#recGo').addEventListener('click', () => guard(async () => { const r = await rpc('billing_recognize_revenue', { p_center: cid, p_as_of: null }); await draw(); msg(`${r.recognized} invoice${r.recognized === 1 ? '' : 's'} moved from prepaid to income.`); }));
    $$('[data-issue]').forEach((b) => b.addEventListener('click', () => guard(async () => { await rpc('billing_invoice_issue', { p_center: cid, p_invoice: b.dataset.issue }); await draw(); msg('Invoice issued.'); })));
    $$('[data-void]').forEach((b) => b.addEventListener('click', () => guard(async () => {
      if (!confirm('Void this invoice? It stays in the records, marked void, and the ledger gets a reversing entry. Payments must be reversed first.')) return;
      await rpc('billing_void_invoice', { p_center: cid, p_invoice: b.dataset.void, p_reason: 'voided from the billing desk' }); await draw(); msg('Invoice voided.');
    })));
    $$('[data-writeoff]').forEach((b) => b.addEventListener('click', () => guard(async () => {
      if (!confirm('Write off what is still owed on this invoice as bad debt? This cannot be undone.')) return;
      await rpc('billing_write_off', { p_center: cid, p_invoice: b.dataset.writeoff, p_reason: 'written off from the billing desk' }); await draw(); msg('Written off.');
    })));
  }

  // ---- payments --------------------------------------------------------------------------------------------------------------------
  async function paymentsView(cid) {
    const [inv, pays, kids] = await Promise.all([
      client().from('invoices').select('id, invoice_no, kid, family_cents, subsidy_cents, status, period_start').eq('center_id', cid).in('status', ['open', 'past_due']).order('period_start').limit(300),
      client().from('payments').select('*').eq('center_id', cid).order('created_at', { ascending: false }).limit(40), client().from('kids').select('id, data').eq('center_id', cid)]);
    if (inv.error) throw inv.error;
    const all = (await client().from('payments').select('invoice_id, amount_cents, kind, payer_kind').eq('center_id', cid).in('invoice_id', inv.data.map((i) => i.id).concat(['00000000-0000-0000-0000-000000000000']))).data || [];
    const net = (i, k) => all.filter((p) => p.invoice_id === i.id && p.payer_kind === k).reduce((a, p) => a + (p.kind === 'reversal' ? -p.amount_cents : p.amount_cents), 0);
    const invById = Object.fromEntries(inv.data.map((i) => [i.id, i]));
    const today = centerToday();   // the center's day
    return `<div class="grid two"><form class="card" id="payForm" novalidate><h3>Record a payment</h3>
      <p class="small muted">Cash, checks and agency payments. Card and bank payments arrive by themselves when Stripe is turned on. A payment can never be more than what is owed.</p>
      <label class="f"><span>Invoice</span><select class="i" id="pyInv">${inv.data.map((i) => `<option value="${esc(i.id)}" data-fam="${i.family_cents - net(i, 'family')}" data-ag="${i.subsidy_cents - net(i, 'agency')}">${esc(i.invoice_no)} · ${esc(kidName(kids.data || [], i.kid))} · family ${fmt(i.family_cents - net(i, 'family'))}${i.subsidy_cents ? ` · agency ${fmt(i.subsidy_cents - net(i, 'agency'))}` : ''}</option>`).join('') || '<option value="">Nothing is owed</option>'}</select></label>
      <div class="row two"><label class="f"><span>Paid by</span><select class="i" id="pyMethod"><option value="cash">Cash</option><option value="check">Check</option><option value="agency">Subsidy agency</option></select></label>
      <label class="f"><span>Amount ($)</span><input class="i" id="pyAmt" inputmode="decimal" required></label></div>
      <div class="row two"><label class="f"><span>Received on</span><input class="i" type="date" id="pyDate" value="${today}"></label><label class="f"><span>Check number or note</span><input class="i" id="pyRef" maxlength="60" autocomplete="off"></label></div>
      <button class="btn center" type="submit">Record payment</button></form>
      <div><div class="card"><h3>Recent payments</h3>${pays.data?.length ? `<ul class="list" id="payList">${pays.data.map((p) => `<li><span class="who"><b>${p.kind === 'reversal' ? '−' : ''}${fmt(p.amount_cents)} · ${esc(p.method)}</b>
        <span class="small muted">${esc(p.received_on)}${p.receipt_no ? ` · ${esc(p.receipt_no)}` : ''}${p.kind === 'reversal' ? ' · reversal' : ''}${invById[p.invoice_id] ? ` · ${esc(invById[p.invoice_id].invoice_no)}` : ''}</span></span>
        ${p.kind === 'payment' && !pays.data.some((r) => r.reversal_of === p.id) && !p.stripe_payment_intent_id ? `<button class="btn link" type="button" data-reverse="${esc(p.id)}">Reverse</button>` : ''}</li>`).join('')}</ul>` : '<p class="empty">No payments yet.</p>'}</div>
      <form class="card" id="depForm" novalidate><h3>Take cash and checks to the bank</h3><div class="row two"><label class="f"><span>Amount ($)</span><input class="i" id="dpAmt" inputmode="decimal"></label>
        <label class="f"><span>Deposit date</span><input class="i" type="date" id="dpDate" value="${today}"></label></div><button class="btn soft" type="submit">Record deposit</button></form></div></div>`;
  }
  function wirePayments(cid, msg, guard, draw) {
    let clientRef = uuid();                  // one id per form fill: pressing the button twice cannot record twice
    const sel = $('#pyInv'); const method = $('#pyMethod'); const amt = $('#pyAmt');
    const suggest = () => { const o = sel.selectedOptions[0]; if (!o || !o.dataset) return; const c = Number(method.value === 'agency' ? o.dataset.ag : o.dataset.fam); if (Number.isSafeInteger(c) && c > 0) amt.value = (c / 100).toFixed(2); };
    sel.addEventListener('change', suggest); method.addEventListener('change', suggest); suggest();
    $('#payForm').addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const cents = parseCents(amt.value); if (!cents) throw new Error('enter the amount as dollars, for example 125 or 125.50');
      if (!sel.value) throw new Error('choose an invoice');
      const r = await rpc('billing_record_payment', { p_center: cid, p_invoice: sel.value, p_amount_cents: cents, p_method: method.value, p_received_on: $('#pyDate').value || null, p_client_ref: clientRef, p_reference: $('#pyRef').value || null, p_memo: null });
      clientRef = uuid(); await draw(); msg(`Recorded ${fmt(cents)}. Receipt ${r.receipt_no}. Invoice is ${r.invoice_status.replace('_', ' ')}.`);
    }); });
    $$('[data-reverse]').forEach((b) => b.addEventListener('click', () => guard(async () => {
      if (!confirm('Reverse this payment (for example a bounced check)? The invoice is owed again and the ledger gets a reversing entry.')) return;
      await rpc('billing_reverse_payment', { p_center: cid, p_payment: b.dataset.reverse, p_reason: 'reversed from the billing desk' }); await draw(); msg('Payment reversed.');
    })));
    $('#depForm').addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const cents = parseCents($('#dpAmt').value); if (!cents) throw new Error('enter the deposit as dollars');
      await rpc('billing_record_deposit', { p_center: cid, p_amount_cents: cents, p_date: $('#dpDate').value || null, p_client_ref: uuid() }); await draw(); msg(`Deposit of ${fmt(cents)} recorded.`);
    }); });
  }

  // ---- ledger and reports ------------------------------------------------------------------------------------------------------
  const REPORTS = [['trial_balance', 'Trial balance'], ['profit_and_loss', 'Profit and loss'], ['balance_sheet', 'Balance sheet'], ['ar_aging', 'Who owes what (aging)'], ['revenue_by_program', 'Income by program']];
  function reportsView() {
    const y = new Date().getFullYear();
    return `<form class="card" id="repForm" novalidate><h3>Ledger and reports</h3><p class="small muted">Every report you open is recorded in the audit log. The books are a double-entry ledger: nothing is edited, corrections are reversing entries.</p>
      <div class="row two"><label class="f"><span>Report</span><select class="i" id="rpKind">${REPORTS.map(([v, l]) => `<option value="${v}">${esc(l)}</option>`).join('')}</select></label>
      <div class="row two"><label class="f"><span>From</span><input class="i" type="date" id="rpFrom" value="${y}-01-01"></label><label class="f"><span>To / as of</span><input class="i" type="date" id="rpTo" value="${y}-12-31"></label></div></div>
      <button class="btn center" type="submit">Show report</button></form><div class="card" id="repOut" aria-live="polite"><p class="empty">Choose a report.</p></div>`;
  }
  const table = (head, rows, foot) => `<div class="tablewrap"><table class="t"><thead><tr>${head.map((x, i) => `<th scope="col"${i ? ' class="num"' : ''}>${esc(x)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((x, i) => `<td${i ? ' class="num"' : ''}>${esc(x)}</td>`).join('')}</tr>`).join('')}</tbody>${foot ? `<tfoot><tr>${foot.map((x, i) => `<th${i ? ' class="num"' : ''}>${esc(x)}</th>`).join('')}</tr></tfoot>` : ''}</table></div>`;
  function renderReport(kind, r) {
    if (kind === 'trial_balance') return table(['Account', 'Debit', 'Credit'], r.rows.map((x) => [`${x.account} ${x.name}`, fmt(x.debit_cents), fmt(x.credit_cents)]), ['Total', fmt(r.total_debit_cents), fmt(r.total_credit_cents)]) + `<p class="small ${r.balanced ? 'muted' : 'msg bad'}">${r.balanced ? 'The books balance.' : 'THE BOOKS DO NOT BALANCE.'}</p>`;
    if (kind === 'profit_and_loss') return `<h4>Income</h4>${table(['Account', 'Amount'], r.income.map((x) => [`${x.account} ${x.name}`, fmt(x.amount_cents)]), ['Total income', fmt(r.total_income_cents)])}<h4>Expenses</h4>${table(['Account', 'Amount'], r.expenses.map((x) => [`${x.account} ${x.name}`, fmt(x.amount_cents)]), ['Total expenses', fmt(r.total_expenses_cents)])}<p><b>Net income ${fmt(r.net_income_cents)}</b></p>`;
    if (kind === 'balance_sheet') return `<h4>Assets</h4>${table(['Account', 'Amount'], r.assets.map((x) => [`${x.account} ${x.name}`, fmt(x.amount_cents)]), ['Total assets', fmt(r.total_assets_cents)])}<h4>Liabilities</h4>${table(['Account', 'Amount'], r.liabilities.map((x) => [`${x.account} ${x.name}`, fmt(x.amount_cents)]), ['Total liabilities', fmt(r.total_liabilities_cents)])}<h4>Equity</h4>${table(['Account', 'Amount'], r.equity.map((x) => [`${x.account} ${x.name}`, fmt(x.amount_cents)]).concat([['Earnings to date', fmt(r.earnings_to_date_cents)]]), ['Total equity', fmt(r.total_equity_cents)])}<p class="small muted">${r.balanced ? 'Assets equal liabilities plus equity.' : 'DOES NOT BALANCE.'}</p>`;
    if (kind === 'ar_aging') { const b = r.buckets_cents; return table(['Invoice', 'Child', 'Days past due', 'Family owes', 'Agency owes'], r.rows.map((x) => [x.invoice_no, x.child_first || x.kid, String(Math.max(0, x.days_past_due)), fmt(x.family_balance_cents), fmt(x.agency_balance_cents)]), ['Total', '', '', fmt(b.family_total), fmt(b.agency_total)]) + `<p class="small muted">Current ${fmt(b.current)} · 1–30 days ${fmt(b.d1_30)} · 31–60 ${fmt(b.d31_60)} · 61–90 ${fmt(b.d61_90)} · over 90 ${fmt(b.d91_plus)}. Ledger receivables: families ${fmt(r.ledger_ar_families_cents)}, agencies ${fmt(r.ledger_ar_agency_cents)}.</p>`; }
    return table(['Program', 'Income'], r.rows.map((x) => [`${x.account} ${x.name}`, fmt(x.amount_cents)]), ['Total', fmt(r.total_cents)]);
  }
  function wireReports(cid, msg, guard) {
    $('#repForm').addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const kind = $('#rpKind').value; const from = $('#rpFrom').value || null; const to = $('#rpTo').value || null;
      const args = { trial_balance: { p_center: cid, p_as_of: to }, balance_sheet: { p_center: cid, p_as_of: to }, ar_aging: { p_center: cid, p_as_of: to },
        profit_and_loss: { p_center: cid, p_from: from, p_to: to }, revenue_by_program: { p_center: cid, p_from: from, p_to: to } }[kind];
      $('#repOut').innerHTML = renderReport(kind, await rpc(kind, args)); live('Report ready.');
    }); });
  }

  // ---- QuickBooks ---------------------------------------------------------------------------------------------------------------------
  function quickbooksView() {
    const y = new Date().getFullYear();
    return `<form class="card" id="qbForm" novalidate><h3>QuickBooks files</h3>
      <p class="small muted">Give these to your accountant. Import the chart of accounts first, then the journal files. Use the <b>journal</b> route only (it keeps discounts, prepaid tuition, Stripe fees and agency receivables exactly); do not also import invoices for the same dates. Test one journal in a QuickBooks sandbox company before your first real import.</p>
      <div class="row two"><label class="f"><span>From</span><input class="i" type="date" id="qbFrom" value="${y}-01-01"></label><label class="f"><span>To</span><input class="i" type="date" id="qbTo" value="${y}-12-31"></label></div>
      <button class="btn center" type="submit">Prepare the files</button></form><div class="card" id="qbOut" aria-live="polite"><p class="empty">Nothing prepared yet.</p></div>`;
  }
  function wireQuickbooks(cid, msg, guard) {
    $('#qbForm').addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const s = await session();
      const res = await fetch('/api/billing/qbo-pack', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${s?.access_token ?? ''}` },
        body: JSON.stringify({ center: cid, from: $('#qbFrom').value || null, to: $('#qbTo').value || null }) });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || 'Could not prepare the files.');
      const urls = body.files.map((f) => ({ name: f.name, url: URL.createObjectURL(new Blob([f.csv], { type: 'text/csv' })), rows: f.csv.trim().split('\n').length - 1 }));
      $('#qbOut').innerHTML = `<h4>${urls.length} file${urls.length === 1 ? '' : 's'} ready</h4><ul class="list" id="qbFiles">${urls.map((u) => `<li><span class="who"><b>${esc(u.name)}</b><span class="small muted">${u.rows} rows</span></span><a class="btn soft small" href="${u.url}" download="${esc(u.name)}">Download</a></li>`).join('')}</ul>
        <p class="small muted">${body.entries} journal entries, ${body.accounts} accounts. The files contain family names and amounts: keep them private.</p>`;
      live('Files ready.');
    }); });
  }

  // ---- settings -------------------------------------------------------------------------------------------------------------------------
  function settingsView(b) {
    return `<form class="card" id="setForm" novalidate><h3>Billing settings</h3>
      <label class="f"><span>Legal name</span><input class="i" id="sLegal" value="${esc(b.legal_name || '')}" maxlength="200"></label><label class="f"><span>Address</span><input class="i" id="sAddr" value="${esc(b.address || '')}" maxlength="400"></label>
      <div class="row two"><label class="f"><span>EIN</span><input class="i" id="sEin" value="${esc(b.ein || '')}" maxlength="10"></label><label class="f"><span>Time zone</span><input class="i" id="sTz" value="${esc(b.timezone)}"></label></div>
      <div class="row two"><label class="f"><span>Late fee ($)</span><input class="i" id="sFee" value="${(b.late_fee_cents / 100).toFixed(2)}" inputmode="decimal"></label><label class="f"><span>Grace days</span><input class="i" id="sGrace" value="${b.late_fee_grace_days}" inputmode="numeric"></label></div>
      <p class="small muted">Online card and bank payments: ${b.stripe_account_id ? 'connected' : 'not turned on yet. The owner connects Stripe; until then only cash, checks and agency payments are recorded.'}</p><button class="btn center" type="submit">Save</button></form>`;
  }
  function wireSettings(cid, msg, guard, draw) {
    $('#setForm').addEventListener('submit', (e) => { e.preventDefault(); guard(async () => {
      const fee = parseCents($('#sFee').value); if (fee === null) throw new Error('enter the late fee as dollars');
      await rpc('center_billing_save', { p_center: cid, p_legal_name: $('#sLegal').value, p_address: $('#sAddr').value, p_ein: $('#sEin').value, p_timezone: $('#sTz').value, p_late_fee_cents: fee, p_late_fee_grace_days: Number($('#sGrace').value || 0) });
      await draw(); msg('Saved.');
    }); });
  }

  return { viewBilling };
}
