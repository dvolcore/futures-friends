'use strict';
(() => {
  const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  const wholeMoney = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const observed = document.querySelectorAll('.cash-panel');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => entry.target.classList.toggle('in-view', entry.isIntersecting)), {threshold:.18});
    observed.forEach(el => observer.observe(el));
  } else observed.forEach(el => el.classList.add('in-view'));
  const phases = {
    prepare: ['Confirm written cost quotes, financing, approved content and tested family access before launch.', 'pilot-plan.html#evidence', 'Review preparation evidence →'],
    pilot: ['Use the first-month checkpoint to review family workflows, staffing and collections. Evaluate the full 12-month pilot before expansion.', 'pilot-plan.html#scope', 'Explore pilot boundaries →'],
    expand: ['Daycare and church expansion depends on pilot proof. Unsigned partner fees and merchandise revenue are excluded from repayment.', 'library.html#operations', 'Explore future operations →']
  };
  document.querySelectorAll('[data-phase]').forEach(button => button.addEventListener('click', () => {
    const [description, href, label] = phases[button.dataset.phase];
    document.querySelectorAll('[data-phase]').forEach(other => {
      const active = other === button;
      other.setAttribute('aria-pressed', String(active));
      other.classList.toggle('selected', active);
    });
    set('phaseText', description);
    const link = document.getElementById('phaseLink');
    link.setAttribute('href', href);
    link.textContent = label;
  }));
  const renderRows = (id, rows) => {
    const list = document.getElementById(id);
    if (!Array.isArray(rows) || !rows.every(row => typeof row.item === 'string' && Number.isFinite(row.annual))) throw new Error('Invalid platform rows');
    const items = rows.map(row => {
      const item = document.createElement('li');
      const label = document.createElement('span');
      label.textContent = row.item;
      const amount = document.createElement('b');
      amount.textContent = money(row.annual);
      item.append(label, amount);
      return item;
    });
    list.replaceChildren(...items);
  };
  fetch('../costs/pilot-budget.json', {cache:'no-store'})
    .then(response => { if (!response.ok) throw new Error('Financial model unavailable'); return response.json(); })
    .then(data => {
      const {funding, totals, platform, assumptions, metrics, meta} = data;
      const amounts = [funding.request_before_financing,totals.refinance,platform.first_year,platform.completion,platform.assurance_one_time,platform.recurring,platform.one_time,platform.monthly,assumptions.tuition,metrics.breakeven_tuition,metrics.year2_margin,funding.peak_deficit,totals.contingency,funding.cash_floor];
      if (!amounts.every(Number.isFinite) || meta.version !== 'pilot-40-v4') throw new Error('Unrecognized financial model');
      const sum = totals.refinance + funding.peak_deficit + totals.contingency + funding.cash_floor;
      if (Math.abs(sum - funding.request_before_financing) > .02 || Math.abs(platform.completion + platform.assurance_one_time + platform.recurring - platform.first_year) > .02) throw new Error('Financial model does not reconcile');
      const rowGroups = [
        ['buildRows', platform.build_rows, platform.completion],
        ['assuranceRows', platform.service_rows?.filter(row => row.bucket === 'one_time'), platform.assurance_one_time],
        ['recurringRows', [...(platform.service_rows?.filter(row => row.bucket === 'recurring') || []), ...(platform.hosting_rows || [])], platform.recurring]
      ];
      if (!rowGroups.every(([, rows, total]) => Array.isArray(rows) && rows.every(row => typeof row.item === 'string' && Number.isFinite(row.annual)) && Math.abs(rows.reduce((sum, row) => sum + row.annual, 0) - total) < .02)) throw new Error('Platform detail rows do not reconcile');
      if (Math.abs(platform.one_time - platform.completion - platform.assurance_one_time) > .02 || Math.abs(platform.monthly * 12 - platform.recurring) > .1) throw new Error('Platform payment schedule does not reconcile');
      set('funding', money(funding.request_before_financing));
      set('refinance', wholeMoney(totals.refinance));
      set('platformYear', money(platform.first_year));
      set('platformBuild', wholeMoney(platform.completion));
      set('platformAssurance', wholeMoney(platform.assurance_one_time));
      set('platformRecurring', money(platform.recurring));
      set('platformOnce', wholeMoney(platform.one_time));
      set('platformMonthly', money(platform.monthly));
      rowGroups.forEach(([id, rows]) => renderRows(id, rows));
      set('draftTuition', wholeMoney(assumptions.tuition));
      set('breakEven', money(metrics.breakeven_tuition));
      set('annualGap', money(metrics.year2_margin).replace('-', '−'));
      set('partRefinance', wholeMoney(totals.refinance));
      set('partDeficit', money(funding.peak_deficit));
      set('partContingency', money(totals.contingency));
      set('partFloor', money(funding.cash_floor));
      set('lineCount', String(meta.line_count));
      const date = new Date(meta.prepared + 'T12:00:00');
      set('modelDate', 'Planning model · ' + date.toLocaleDateString('en-US', {month:'long',day:'numeric',year:'numeric'}));
      const chart = document.querySelector('.comparison');
      chart.setAttribute('aria-label', `Draft monthly tuition ${money(assumptions.tuition)}; operating break-even ${money(metrics.breakeven_tuition)} before building payments and debt`);
      const max = Math.max(assumptions.tuition, metrics.breakeven_tuition) / .9;
      document.querySelector('.bar-tuition').style.setProperty('--height', (assumptions.tuition / max * 100) + '%');
      document.querySelector('.bar-break-even').style.setProperty('--height', (metrics.breakeven_tuition / max * 100) + '%');
      document.documentElement.dataset.modelVersion = meta.version;
    })
    .catch(() => { document.getElementById('dataError').hidden = false; });
})();
