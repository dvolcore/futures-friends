'use strict';
(() => {
  const money = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:2}).format(value);
  const wholeMoney = value => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:0}).format(value);
  const set = (id, text) => { const el = document.getElementById(id); if (el) el.textContent = text; };
  const explorer = document.getElementById('workspace');
  document.querySelector('.explore-button').addEventListener('click', () => { explorer.open = true; });
  const revealNumber = id => {
    const el = document.getElementById(id);
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.classList.add('number-reveal');
    el.replaceChildren(...Array.from(text, (digit, index) => {
      const span = document.createElement('span');
      span.className = 'num-digit';
      span.setAttribute('aria-hidden', 'true');
      span.style.setProperty('--digit-delay', `${index * 35}ms`);
      span.textContent = digit;
      return span;
    }));
  };
  const observed = document.querySelectorAll('.cash-panel');
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => entries.forEach(entry => { if (entry.isIntersecting) { entry.target.classList.add('in-view'); observer.unobserve(entry.target); } }), {threshold:.18});
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
  const motionPreference = window.matchMedia('(prefers-reduced-motion: reduce)');
  const motionButton = document.getElementById('motionToggle');
  let manualPause = false;
  const updateMotion = () => {
    const paused = manualPause || motionPreference.matches;
    document.documentElement.classList.toggle('motion-paused', paused);
    motionButton.setAttribute('aria-pressed', String(paused));
    motionButton.textContent = motionPreference.matches ? 'Reduced motion on' : paused ? 'Resume motion' : 'Pause motion';
    motionButton.disabled = motionPreference.matches;
  };
  motionButton.addEventListener('click', () => { manualPause = !manualPause; updateMotion(); });
  motionPreference.addEventListener('change', updateMotion);
  updateMotion();
  const tabs = [...document.querySelectorAll('[data-view]')];
  const activateView = tab => {
    tabs.forEach(button => {
      const active = button === tab;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      document.getElementById(button.dataset.view + 'View').hidden = !active;
    });
  };
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => activateView(tab));
    tab.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1 : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      activateView(tabs[next]); tabs[next].focus();
    });
  });
  const initializeExplorer = data => {
    const {funding, totals, assumptions, cash} = data;
    const svgNode = (tag, attributes) => {
      const node = document.createElementNS('http://www.w3.org/2000/svg', tag);
      Object.entries(attributes).forEach(([key, value]) => node.setAttribute(key, String(value)));
      return node;
    };
    const allocations = [
      {label:'Peak pilot cash deficit',value:funding.peak_deficit,color:'#6ce6d1',description:'The largest cumulative gap between pilot receipts and spending over the first 12 months.'},
      {label:'Building refinance allocation',value:totals.refinance,color:'#7c9aff',description:'Owner-stated refinance-enabling amount. Payoff and lender commitment remain unverified.'},
      {label:'Cash floor',value:funding.cash_floor,color:'#d5b17b',description:'A liquidity reserve held alongside the pilot funding. It is not an extra operating expense.'},
      {label:'Contingency',value:totals.contingency,color:'#c199ff',description:'An additional planning buffer included in the preliminary funding calculation.'}
    ];
    const buttons = [...document.querySelectorAll('[data-allocation]')];
    const arcs = [];
    const selectAllocation = index => {
      const allocation = allocations[index];
      set('allocationPercent', (allocation.value / funding.request_before_financing * 100).toFixed(1) + '%');
      set('allocationLabel', allocation.label);set('allocationValue', money(allocation.value));set('allocationDescription', allocation.description);
      buttons.forEach((button, i) => button.setAttribute('aria-pressed', String(i === index)));
      arcs.forEach((arc, i) => { arc.classList.toggle('active', i === index); arc.style.opacity = i === index ? '1' : '.5'; });
    };
    let start = 0;
    const circumference = 2 * Math.PI * 93;
    allocations.forEach((allocation, index) => {
      const fraction = allocation.value / funding.request_before_financing;
      const arc = svgNode('circle', {cx:120,cy:120,r:93,class:'allocation-arc',stroke:allocation.color,'stroke-dasharray':`${fraction * circumference - 5} ${circumference}`,'stroke-dashoffset':-start * circumference});
      arc.addEventListener('click', () => selectAllocation(index));
      document.getElementById('allocationArcs').append(arc);arcs.push(arc);start += fraction;
      buttons[index].disabled = false;buttons[index].addEventListener('click', () => selectAllocation(index));
    });
    selectAllocation(0);
    const spending = cash.map(row => row.recurring + row.one_time);
    const max = Math.ceil(Math.max(...spending, ...cash.map(row => row.receipts)) / 25000) * 25000;
    const x = index => 46 + index / 11 * 612;
    const y = value => 163 - value / max * 145;
    for (let tick = 0; tick <= 4; tick++) {
      const value = max * tick / 4;
      document.getElementById('cashGrid').append(svgNode('line', {x1:46,x2:658,y1:y(value),y2:y(value),class:'chart-grid-line'}));
      const label = svgNode('text', {x:0,y:y(value)+3,class:'chart-grid-label'});
      label.textContent = value === 0 ? '$0' : '$' + Math.round(value / 1000) + 'k';
      document.getElementById('cashGrid').append(label);
    }
    const line = values => values.map((value,index) => `${index ? 'L' : 'M'}${x(index).toFixed(2)},${y(value).toFixed(2)}`).join(' ');
    const receiptLine = line(cash.map(row => row.receipts));
    document.getElementById('receiptArea').setAttribute('d', `${receiptLine} L658,163 L46,163 Z`);
    for (const [id, values] of [['receiptPath',cash.map(row => row.receipts)],['spendingPath',spending]]) {
      document.getElementById(id).setAttribute('d',line(values));
      document.getElementById(id).setAttribute('pathLength','1');
    }
    const scrubber = document.getElementById('monthScrubber');
    const selectMonth = month => {
      const index = month - 1, row = cash[index];
      scrubber.value = month;scrubber.setAttribute('aria-valuetext', `Month ${month}, ${row.children} children, cumulative cash deficit ${money(Math.abs(row.cumulative))}`);
      set('cashMonth',String(month).padStart(2,'0'));set('monthLabel','Month ' + month);
      set('cashDeficit',money(Math.abs(row.cumulative)));set('cashChildren',String(row.children));
      set('cashReceipts',money(row.receipts));set('cashSpending',money(spending[index]));set('cashNet',money(row.net).replace('-','−'));
      document.getElementById('cashCursor').setAttribute('x1',x(index));document.getElementById('cashCursor').setAttribute('x2',x(index));
      for (const [id,value] of [['receiptDot',row.receipts],['spendingDot',spending[index]]]) {
        document.getElementById(id).setAttribute('cx',x(index));document.getElementById(id).setAttribute('cy',y(value));
      }
    };
    cash.forEach((row,index) => {
      const hit = svgNode('rect',{x:x(index)-24,y:10,width:48,height:155,class:'cash-hit'});
      hit.addEventListener('pointerenter',event => { if (event.pointerType !== 'touch') selectMonth(row.month); });
      hit.addEventListener('click',() => selectMonth(row.month));document.getElementById('cashHitTargets').append(hit);
    });
    scrubber.disabled = false;scrubber.addEventListener('input',() => selectMonth(Number(scrubber.value)));selectMonth(1);
    document.getElementById('cashChart').classList.add('chart-enter');
    const tuition = document.getElementById('scenarioTuition'), children = document.getElementById('scenarioChildren'), collection = document.getElementById('scenarioCollection');
    const scenario = () => {
      const revenue = Number(tuition.value) * Number(children.value) * Number(collection.value) / 100 * 12;
      const margin = revenue - totals.recurring;
      const breakEven = totals.recurring / (Number(children.value) * Number(collection.value) / 100 * 12);
      set('tuitionOutput',wholeMoney(Number(tuition.value)));set('childrenOutput',children.value);set('collectionOutput',collection.value + '%');
      set('scenarioMargin',money(margin).replace('-','−'));set('scenarioRevenue',money(revenue));set('scenarioBreakEven',money(breakEven));
      set('scenarioStatus',margin >= 0 ? 'Operating surplus · building payments & debt excluded' : 'Operating shortfall · building payments & debt excluded');
      document.querySelector('.scenario-result').classList.toggle('positive',margin >= 0);
      document.getElementById('marginIndicator').style.left = Math.max(3,Math.min(97,50 + margin / totals.recurring * 100)) + '%';
    };
    [tuition,children,collection].forEach(input => {input.disabled = false;input.addEventListener('input',scenario);});
    const reset = () => {tuition.value = assumptions.tuition;children.value = 40;collection.value = assumptions.collection * 100;scenario();};
    const resetButton = document.getElementById('scenarioReset');resetButton.disabled = false;resetButton.addEventListener('click',reset);reset();
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
      if (!Number.isFinite(totals.recurring) || totals.recurring <= 0 || assumptions.collection !== .96 || assumptions.tuition < 600 || assumptions.tuition > 1600 || !Array.isArray(data.cash) || data.cash.length !== 12) throw new Error('Invalid explorer assumptions');
      let previous = 0;
      data.cash.forEach((row, index) => {
        if (row.month !== index + 1 || ![row.children,row.receipts,row.recurring,row.one_time,row.net,row.cumulative].every(Number.isFinite) || row.children < 0 || row.children > 40 || row.recurring < 0 || row.one_time < 0 || row.receipts < 0 || Math.abs(row.receipts - row.recurring - row.one_time - row.net) > .02 || Math.abs(previous + row.net - row.cumulative) > .02) throw new Error('Cash forecast does not reconcile');
        previous = row.cumulative;
      });
      if (Math.abs(Math.min(...data.cash.map(row => row.cumulative)) + funding.peak_deficit) > .02 || Math.abs(assumptions.tuition * 40 * assumptions.collection * 12 - totals.recurring - metrics.year2_margin) > .02) throw new Error('Explorer totals do not reconcile');
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
      initializeExplorer(data);
      ['funding', 'refinance', 'capacity', 'pilotDuration', 'platformYear'].forEach(revealNumber);
      document.documentElement.dataset.modelVersion = meta.version;
    })
    .catch(() => { document.getElementById('dataError').hidden = false; });
})();
