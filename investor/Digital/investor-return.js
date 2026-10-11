'use strict';
(() => {
  const host = document.querySelector('.investor-return');
  if (!host) return;
  const money = n => new Intl.NumberFormat('en-US', {style:'currency', currency:'USD'}).format(n);
  const set = (key, value) => host.querySelectorAll(`[data-return="${key}"]`).forEach(el => {el.textContent = value;});
  let principal = 1500000;
  let schedule = [];
  let total = 0;
  function calculate(p) {
    const rate = .12 / 12;
    const payment = p * rate / (1 - Math.pow(1 + rate, -84));
    let balance = p, received = 0, earned = 0, repaid = 0;
    const rows = [];
    for (let month = 1; month <= 108; month++) {
      const interest = balance * rate;
      const paid = month <= 24 ? interest : month === 108 ? balance + interest : payment;
      const capital = paid - interest;
      balance = Math.max(0, balance - capital);
      received += paid; earned += interest; repaid += capital;
      rows.push({month, paid, capital, interest, balance, received, earned, repaid});
    }
    return {rows, payment, total:received, earned};
  }
  function paintMonth() {
    const row = schedule[Number(host.querySelector('#return-month').value) - 1];
    set('month-label', row.month);
    set('month-pay', money(row.paid));
    set('month-breakdown', `${money(row.capital)} principal + ${money(row.interest)} interest`);
    set('received', money(row.received));
    set('earned-to-date', `Includes ${money(row.earned)} in interest`);
    set('balance', money(row.balance));
    set('paid-progress', `${(row.received / total * 100).toFixed(2)}% of scheduled receipts`);
    host.querySelector('.return-meter-principal').style.width = `${row.repaid / total * 100}%`;
    host.querySelector('.return-meter-interest').style.width = `${row.earned / total * 100}%`;
    host.querySelector('.return-meter').setAttribute('aria-label', `Through month ${row.month}: ${money(row.repaid)} principal returned and ${money(row.earned)} interest received; ${money(row.balance)} principal outstanding.`);
  }
  function render(p) {
    principal = Number(p);
    const result = calculate(principal);
    schedule = result.rows; total = result.total;
    set('principal', money(principal));set('total', money(total));set('earned', money(result.earned));
    set('percent', `${(result.earned / principal * 100).toFixed(2)}%`);
    set('io', money(principal * .12 / 12));set('payment', money(result.payment));
    for (const key of ['io','payment']) {
      const target = host.querySelector(`[data-return="${key}"]`);
      target.querySelectorAll('.return-unit').forEach(node => node.remove());
      const label = document.createElement('span');label.className='return-unit';label.textContent = ' / month';
      target.append(label);
    }
    host.querySelectorAll('[data-return-loan]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.returnLoan) === principal)));
    const body = host.querySelector('[data-return="year-rows"]');body.replaceChildren();
    for (let year = 1; year <= 9; year++) {
      const rows = schedule.slice((year - 1) * 12, year * 12);
      const sum = key => rows.reduce((n, row) => n + row[key], 0);
      const tr = document.createElement('tr');
      [String(year), money(rows[0].paid), money(sum('capital')), money(sum('interest')), money(sum('paid')), money(rows.at(-1).balance)].forEach((value,i) => {
        const cell = document.createElement(i === 0 ? 'th' : 'td');
        if (i === 0) cell.scope = 'row';
        cell.textContent = value;tr.append(cell);
      });
      body.append(tr);
    }
    set('condition', `Proposed 12% rate, not a lender quote or market-average claim. First draw is TBD and quote-backed; $500,000 is a hypothetical comparison only. The maximum commitment is $1.5M, with draws restricted to months 1–24 and final maturity at month 108; later draws do not restart the term. Illustration assumes the full ${money(principal)} is funded at closing, payments at month-end and all 108 payments made on time. Paid partner collections and repayment capacity remain unverified. The current cash stress test fails debt coverage in every modeled case; this table shows contractual math only, not capacity to pay. Actual draw timing changes interest and payments. No interest on undrawn funds, no prepayment penalty, and no automatic capitalized interest or maturity balloon are proposed. Releases require a viable sources-and-uses plan, documented receipts and 1.25× debt coverage. The longer term lowers monthly payments but raises lifetime interest. Figures use the unrounded model payment; displayed cents and the final payment must be reconciled in the signed note.`);
    paintMonth();
  }
  host.querySelector('#return-month').addEventListener('input', paintMonth);
  host.querySelectorAll('[data-return-loan]').forEach(button => button.addEventListener('click', () => {
    const p = Number(button.dataset.returnLoan);
    render(p);
  }));
  host.querySelector('[data-return-download]').addEventListener('click', () => {
    const lines = [
      'Futures Friends - Proposed investor repayment illustration',
      `Principal USD,${principal}`, 'Nominal annual interest rate,12%',
      'Months 1-24 interest only; months 25-108 amortizing; full funding at closing; month-end payments',
      'Unrounded model values shown to 6 decimal places; displayed cents and final payment require reconciliation in signed note',
      'Staged draws; fees; early repayment; defaults may change actual receipts. No guaranteed return or ownership.',
      'Month,Payment USD,Principal returned USD,Interest USD,Principal outstanding USD,Cumulative received USD,Cumulative interest USD',
      ...schedule.map(r => [r.month,r.paid,r.capital,r.interest,r.balance,r.received,r.earned].map((v,i) => i ? v.toFixed(6) : v).join(',')),
      `Scheduled total USD,${total.toFixed(6)}`,
      `Total interest USD,${(total-principal).toFixed(6)}`
    ];
    const url = URL.createObjectURL(new Blob([lines.join('\r\n')], {type:'text/csv;charset=utf-8'}));
    const link = document.createElement('a');link.href = url;link.download = `Futures_Friends_${principal}_Investor_Repayment.csv`;
    link.click();setTimeout(() => URL.revokeObjectURL(url), 1000);
  });
  render(principal);
})();
