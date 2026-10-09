'use strict';
(() => {
  const $ = s => document.querySelector(s);
  const $$ = s => [...document.querySelectorAll(s)];
  const data = JSON.parse($('#planData').textContent);
  const financials = data.financials;
  const money = (n, cents = false) => new Intl.NumberFormat('en-US', {style:'currency',currency:'USD',maximumFractionDigits:cents?2:0,minimumFractionDigits:cents?2:0}).format(n);
  const number = n => new Intl.NumberFormat('en-US',{maximumFractionDigits:2}).format(n);
  const loan = principal => financials.debt_scenarios.find(d => d.principal === +principal);
  let active = 'decision';
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let motion = !reduced.matches;
  let frame = 0;

  function showChapter(id, target, focus = true) {
    const chapter = document.getElementById(id);
    if (!chapter?.classList.contains('chapter')) return;
    $$('.chapter').forEach(c => {c.hidden = c.id !== id;});
    active = id;
    try {sessionStorage.setItem('ff-business-plan-position','#'+(target || id));} catch {}
    $$('[data-chapter]').forEach(a => {
      if (a.dataset.chapter === id) a.setAttribute('aria-current','page');
      else a.removeAttribute('aria-current');
    });
    $('#chapterSelect').value = id;
    const item = target && document.getElementById(target);
    if (item && item !== chapter) item.scrollIntoView({behavior:'instant',block:'start'});
    else window.scrollTo({top:0,behavior:'instant'});
    if (focus) $('#planMain').focus({preventScroll:true});
    document.title = `Futures Friends | ${data.chapters.find(c=>c.id===id).title} · Business Plan`;
    paintMotion();
  }

  function followHash(focus = true) {
    let hash;
    try {hash = decodeURIComponent(location.hash.slice(1));} catch {hash = '';}
    if (hash === 'planMain') {$('#planMain').focus(); return;}
    const target = document.getElementById(hash);
    const chapter = target?.closest('.chapter');
    showChapter(chapter?.id || 'decision', chapter ? hash : null, focus);
  }
  window.addEventListener('hashchange', () => followHash());
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const id = a.getAttribute('href').slice(1);
    if (id === location.hash.slice(1)) {e.preventDefault(); followHash();}
    if ($('#searchDialog').open) $('#searchDialog').close();
  });
  $('#chapterSelect').addEventListener('change', e => {location.hash = e.target.value;});

  function bars(id, items, maximum) {
    const host = document.getElementById(id);
    host.replaceChildren();
    const max = maximum || Math.max(1,...items.map(i=>Math.abs(i.value)));
    items.forEach(item => {
      const column = document.createElement('div'); column.className = 'bar-column';
      const value = document.createElement('b'); value.className = 'bar-value'; value.textContent = item.display || number(item.value);
      const shell = document.createElement('div'); shell.className = 'bar-shell';
      const fill = document.createElement('div'); fill.className = 'bar-fill';
      fill.style.height = `${Math.abs(item.value)/max*100}%`;
      fill.style.background = item.color || '#2463ec';
      if (item.value < 0) fill.style.background = '#c85055';
      shell.append(fill);
      const label = document.createElement('span'); label.className = 'bar-label'; label.textContent = item.label;
      column.append(value,shell,label);host.append(column);
    });
    host.setAttribute('aria-label',items.map(i=>`${i.label}: ${i.display || number(i.value)}`).join('; '));
    paintMotion();
  }

  function lineChart(id, values, opts = {}) {
    const host = document.getElementById(id);
    const width = 800, height = 290, left = 72, right = 30, top = 26, bottom = 52;
    const min = Math.min(0,...values,opts.reference ?? 0), max = Math.max(...values,opts.reference ?? 0)*1.1 || 1;
    const x = i => left + i/(values.length-1)*(width-left-right);
    const y = v => top+(max-v)/(max-min)*(height-top-bottom);
    const label = opts.currency ? v => money(v) : number;
    let svg = `<svg viewBox="0 0 ${width} ${height}" aria-hidden="true">`;
    [0,.5,1].forEach(f => {const v=min+(max-min)*f;svg+=`<line x1="${left}" x2="${width-right}" y1="${y(v)}" y2="${y(v)}" stroke="#dce5f0"/><text x="${left-10}" y="${y(v)+4}" text-anchor="end" fill="#546683" font-size="16">${label(v)}</text>`;});
    if (opts.reference !== undefined) svg+=`<line x1="${left}" x2="${width-right}" y1="${y(opts.reference)}" y2="${y(opts.reference)}" stroke="#b27923" stroke-dasharray="5 5"/><text x="${width-right}" y="${y(opts.reference)-8}" text-anchor="end" fill="#805a1f" font-size="16">${opts.referenceLabel}</text>`;
    const path = values.map((v,i)=>`${i?'L':'M'} ${x(i)} ${y(v)}`).join(' ');
    svg+=`<path class="line-area" d="${path} L ${x(values.length-1)} ${height-bottom} L ${left} ${height-bottom} Z" fill="#2463ec10"/><path class="animated-line" d="${path}" pathLength="100" stroke="#2463ec" stroke-width="4" fill="none" stroke-linejoin="round" stroke-linecap="round"/>`;
    values.forEach((v,i) => {if(i===0||i===values.length-1||i===Math.floor(values.length/2))svg+=`<circle cx="${x(i)}" cy="${y(v)}" r="4" fill="#2463ec"/><text x="${x(i)}" y="${height-20}" text-anchor="middle" fill="#546683" font-size="16">Month ${i+1}</text>`;});
    svg+='</svg>';host.innerHTML=svg;
    host.setAttribute('aria-label',values.map((v,i)=>`Month ${i+1}: ${label(v)}`).join('; ')+(opts.referenceLabel?`; ${opts.referenceLabel}: ${label(opts.reference)}`:''));
    paintMotion();
  }

  function paintMotion() {
    cancelAnimationFrame(frame); frame=0;
    const vh=innerHeight;
    $$('.bar-chart,.line-chart,.budget-list').forEach(chart => {
      if(chart.closest('.chapter')?.hidden) return;
      const r=chart.getBoundingClientRect();
      const enter=Math.max(0,Math.min(1,(vh-r.top)/(vh*.65)));
      const exit=Math.max(0,Math.min(1,r.bottom/(vh*.22)));
      const fraction=motion ? enter*exit : 1;
      chart.dataset.motionProgress=String(fraction);
      chart.querySelectorAll('.bar-fill,.budget-track i').forEach(b => {b.style.transform=`scale${b.closest('.budget-track')?'X':'Y'}(${fraction})`;});
      chart.querySelectorAll('.animated-line').forEach(p=>{p.style.strokeDasharray='100';p.style.strokeDashoffset=String(100*(1-fraction));});
    });
    const total = Math.max(1,document.documentElement.scrollHeight-innerHeight);
    $('.read-progress span').style.width=`${Math.min(100,scrollY/total*100)}%`;
    paintReadingState();
  }
  function paintReadingState() {
    const current = document.getElementById(active);
    const index = data.chapters.findIndex(c => c.id === active);
    const headerHeight = $('.plan-header').getBoundingClientRect().height;
    const bounds = current.getBoundingClientRect();
    const start = Math.max(0, bounds.top + scrollY - headerHeight - $('.reading-console').offsetHeight);
    const end = Math.min(document.documentElement.scrollHeight - innerHeight, bounds.bottom + scrollY - innerHeight);
    const percent = Math.max(0, Math.min(100, Math.round((scrollY - start) / Math.max(1, end - start) * 100)));
    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`);
    document.documentElement.style.setProperty('--light-offset', `${motion ? -Math.min(scrollY * .018, 80) : 0}px`);
    const finish = $('#plan-finish');
    const atEnd = active === 'partners' && finish.getBoundingClientRect().top < innerHeight * .7;
    $('.reading-console').classList.toggle('at-end', atEnd);
    $('#readingChapter').textContent = atEnd ? 'End of the business plan' : `Chapter ${String(index + 1).padStart(2,'0')} / 09`;
    const headings = [...current.querySelectorAll('.source-section h2,.source-section h3,.interactive-panel h2')];
    const passed = headings.filter(h => h.getBoundingClientRect().top <= headerHeight + 100);
    $('#readingSection').textContent = atEnd ? 'Final chapter · restart or review below' : (passed.at(-1)?.textContent || data.chapters[index].title);
    $('#readingPercent').textContent = `${percent}% of this chapter`;
    $('#readingNext').href = active === 'partners' ? '#plan-finish' : '#' + data.chapters[index + 1].id;
    $('#readingNext').innerHTML = active === 'partners' ? 'End of plan <span aria-hidden="true">↓</span>' : 'Next chapter <span aria-hidden="true">↗</span>';
    $$('[data-step]').forEach((step,i) => {
      step.classList.toggle('prior', i < index);
      if (i === index) step.setAttribute('aria-current','step');
      else step.removeAttribute('aria-current');
    });
    current.querySelectorAll('[data-reveal]').forEach(panel => {
      const fraction = motion ? Math.max(0,Math.min(1,(innerHeight-panel.getBoundingClientRect().top)/(innerHeight*.3))) : 1;
      panel.style.setProperty('--reveal-offset', `${(1-fraction)*18}px`);
      panel.style.setProperty('--reveal-opacity', String(.72 + fraction*.28));
    });
  }
  function queueMotion(){if(!frame)frame=requestAnimationFrame(paintMotion);}
  window.addEventListener('scroll',queueMotion,{passive:true});
  window.addEventListener('resize',queueMotion);
  function syncMotion(){
    $('#motionButton').textContent=motion?'Motion on':'Motion off';
    $('#motionButton').setAttribute('aria-pressed',String(motion));
    document.body.classList.toggle('motion-off',!motion);
    paintMotion();
  }
  $('#motionButton').addEventListener('click',()=>{motion=!motion;syncMotion();});
  reduced.addEventListener('change',()=>{motion=!reduced.matches;syncMotion();});
  $('#fullscreenButton').addEventListener('click',async()=>{
    try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}
    catch{$('#fullscreenButton').textContent='Full screen unavailable';}
  });
  document.addEventListener('fullscreenchange',()=>{$('#fullscreenButton').textContent=document.fullscreenElement?'Exit full screen':'Full screen';});

  function capital(principal) {
    const d=loan(principal);
    $('#loanIO').textContent=money(d.first_year_monthly_interest);
    $('#loanPayment').textContent=money(d.amortizing_monthly_payment,true);
    $('#loanTotal').textContent=money(d.scheduled_total_including_first_year_interest,true);
    $('#loanStatus').textContent=principal===500000?'Conditional later facility. Not offered for immediate draw; center-only repayment is insufficient. Separate partner acquisition, staffing and cash plans are required.':principal===140000?'Smaller proof launch. The center-only base bridge ends at $2,880; this is a constrained alternative, not a broad rollout budget.':'Recommended discussion amount. Release against verified operating records, a paid pilot and accepted service. The center-only base bridge still falls $6,120 below its stated reserve.';
    const labels={center_operating_runway:'Center operating runway',enrollment_and_local_marketing:'Enrollment & local marketing',licensing_insurance_compliance_professional:'Licensing, compliance & professional fees',portal_and_service_completion:'Portal & service completion',cash_reserve:'Cash reserve',marketing_and_sales:'Marketing & sales',operations_compliance_professional:'Operations, compliance & professional fees',portal_hosting_security_service:'Portal, hosting, security & service',merchandise_samples_and_launch_inventory:'Merchandise samples & launch inventory',hosting_security_integrations_portal:'Hosting, security, integrations & portal',hiring_training_operating_systems:'Hiring, training & operating systems',merchandise_production_and_inventory:'Merchandise production & inventory',second_site_or_partner_pilot:'Second-site or partner pilot'};
    $('#budgetList').replaceChildren(...Object.entries(financials.use_of_funds[String(principal)]).map(([key,value],i)=>{
      const row=document.createElement('div');row.className='budget-row';
      const label=document.createElement('label');label.textContent=labels[key];
      const track=document.createElement('div');track.className='budget-track';
      const fill=document.createElement('i');fill.style.width=`${value/principal*100}%`;fill.style.background=['#2463ec','#7850c9','#168261','#ed8643','#d1a021','#509ad1','#a873c6'][i];track.append(fill);
      const amount=document.createElement('b');amount.textContent=money(value);row.append(label,track,amount);return row;
    }));
    $$('[data-loan]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.loan===principal)));paintMotion();
  }
  $$('[data-loan]').forEach(b=>b.addEventListener('click',()=>capital(+b.dataset.loan)));

  function center(){
    const children=+$('#children').value,loss=+$('#collectionLoss').value/100;
    const before=children*(910*(1-loss)-70)-23500;
    const payment=loan(240000).amortizing_monthly_payment;
    $('#childrenValue').textContent=children;$('#lossValue').textContent=`${loss*100}%`;
    $('#centerBefore').textContent=money(before,true);$('#centerAfter').textContent=money(before-payment,true);$('#centerCoverage').textContent=(before/payment).toFixed(2)+'×';
    $('#centerInsight').textContent=before/payment>=1.25?'This input clears the 1.25× planning target mathematically. Actual staffing, capacity, owner pay and tax still have to support it.':`This input is below the 1.25× planning target. Cash needed before debt at that target: ${money(payment*1.25,true)}. Partner contribution or stronger center performance must close the gap.`;
  }
  $('#children').addEventListener('input',center);$('#collectionLoss').addEventListener('input',center);
  function ramp(key){
    const values=financials.center_scenarios[`monthly_ramp_${key}_children`];
    bars('enrollmentChart',values.map((value,i)=>({value,label:String(i+1),color:key==='base'?'#2463ec':'#7850c9'})),40);
    $('#rampNote').textContent=`Month labels 1–12. ${key==='base'?'Base: 8 to 34':'Slower: 8 to 24'} paying children. Planning targets, not current enrollment. Month 12 still pays interest only; amortization starts in month 13. The 40/41/50 capacity figures remain unresolved.`;
    $$('[data-ramp]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.ramp===key)));
  }
  $$('[data-ramp]').forEach(b=>b.addEventListener('click',()=>ramp(b.dataset.ramp)));
  function cash(key){
    const rows=financials.cash_bridge_240k_day_one_draw.schedule;
    const values=rows.map(r=>r[`ending_cash_${key}`]);
    const end=values.at(-1);$('#endingCash').textContent=money(end);$('#reserveGap').textContent=money(Math.max(0,35000-end));
    $('#cashNote').textContent=key==='base'?'Base cash ends at $28,880, $6,120 below the $35,000 reserve. Reconcile draw dates and a bill-by-bill cost ledger before underwriting.':'Slower cash turns negative in month 10 and ends at negative $29,080. The $64,080 reserve gap requires an explicit funding or operating response; it is not cured by branding or projected sales.';
    lineChart('cashChart',values,{currency:true,reference:35000,referenceLabel:'$35K reserve'});
    $$('[data-cash]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.cash===key)));
  }
  $$('[data-cash]').forEach(b=>b.addEventListener('click',()=>cash(b.dataset.cash)));

  const growthAccounts=20.76430479762553;
  let accounts=growthAccounts;
  function partner(){
    const margin=+$('#margin').value,children=+$('#partnerChildren').value,principal=+$('#partnerLoan').value;
    const payment=loan(principal).amortizing_monthly_payment;
    const centerCash=children*840-23500;
    // No overhead before a partner launch; the account sensitivity represents an operating B2B service once accounts are active.
    const overhead=accounts>0?500:0;
    const net=accounts*197*margin-overhead,total=centerCash+net;
    const required=Math.max(0,Math.ceil((payment*1.25-centerCash+500)/(197*margin)));
    $('#partnersValue').textContent=number(accounts);$('#partnerNet').textContent=money(net,true);$('#combinedCash').textContent=money(total,true);$('#combinedCoverage').textContent=(total/payment).toFixed(2)+'×';
    $('#partnerInsight').textContent=`At ${children} children and ${Math.round(margin*100)}% contribution, ${required} whole active paid sites are needed for 1.25× coverage on this loan. ${total/payment>=1.25?'This test clears that mathematical target.':'This test falls below it.'} No current contracts are assumed.`;
    $('#partnerNote').textContent=`${number(accounts)} accounts × $197 gross fee × ${Math.round(margin*100)}% contribution − ${money(overhead)} overhead. Center cash: ${money(centerCash)}. Debt: ${money(payment,true)} from month 13. Overhead is zero in the center-only comparison; an operating partner program retains its costs even if accounts churn to zero.`;
    bars('repaymentChart',[{label:'Center',value:centerCash,display:money(centerCash),color:'#2463ec'},{label:'Partners',value:net,display:money(net),color:'#7850c9'},{label:'Debt / month',value:payment,display:money(payment,true),color:'#ed8643'}]);
    $('#growthPreset').setAttribute('aria-pressed',String(Math.abs(accounts-growthAccounts)<.000001));$('#noPartners').setAttribute('aria-pressed',String(accounts===0));
  }
  $('#partnerAccounts').addEventListener('input',()=>{accounts=+$('#partnerAccounts').value;partner();});
  ['margin','partnerChildren','partnerLoan'].forEach(id=>document.getElementById(id).addEventListener('change',partner));
  $('#growthPreset').addEventListener('click',()=>{accounts=growthAccounts;$('#partnerAccounts').value=accounts;$('#margin').value='0.6';$('#partnerChildren').value='34';$('#partnerLoan').value='240000';partner();});
  $('#noPartners').addEventListener('click',()=>{accounts=0;$('#partnerAccounts').value=0;partner();});

  const searchItems=$$('.source-section').map(s=>({id:s.id,chapter:s.closest('.chapter').id,title:s.querySelector('h2,h3')?.textContent||'Investment decision',text:s.textContent.replace(/\s+/g,' ').trim()}));
  function search(){
    const query=$('#searchInput').value.trim().toLocaleLowerCase();
    const results=query?searchItems.filter(s=>s.text.toLocaleLowerCase().includes(query)):[];
    $('#searchCount').textContent=query?`${results.length} matching sections`:'Search the full plan, including financial diligence and partner expansion.';
    $('#searchResults').replaceChildren(...results.map(s=>{
      const result=document.createElement('article');result.className='search-result';
      const a=document.createElement('a');a.href='#'+(s.id||s.chapter);
      const label=document.createElement('small');label.textContent=data.chapters.find(c=>c.id===s.chapter).title;
      const title=document.createElement('b');title.textContent=s.title;
      const p=document.createElement('p');const pos=s.text.toLocaleLowerCase().indexOf(query);const start=Math.max(0,pos-70);p.textContent=(start?'…':'')+s.text.slice(start,start+230)+'…';
      a.append(label,title,p);result.append(a);return result;
    }));
  }
  $('#searchButton').addEventListener('click',()=>{$('#searchDialog').showModal();$('#searchInput').focus();search();});
  $('#closeSearch').addEventListener('click',()=>{$('#searchDialog').close();});
  $('#searchDialog').addEventListener('close',()=>{$('#searchButton').focus({preventScroll:true});});
  $('#searchInput').addEventListener('input',search);
  document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('#searchDialog').open){e.preventDefault();$('#searchDialog').close();}else if((e.metaKey||e.ctrlKey)&&e.key.toLowerCase()==='k'){e.preventDefault();if(!$('#searchDialog').open)$('#searchButton').click();}});

  capital(240000);center();ramp('base');cash('base');partner();
  let expected=0;
  const growth=Array.from({length:24},(_,i)=>{const month=i+1;expected=expected*.98+(month>=4?(month<=8?2:1):0);return expected;});
  lineChart('partnerGrowthChart',growth);
  syncMotion();followHash(false);
  window.addEventListener('load',paintMotion);
  window.addEventListener('beforeprint',()=>{document.body.classList.add('printing');});
  window.addEventListener('afterprint',()=>{document.body.classList.remove('printing');paintMotion();});
})();
