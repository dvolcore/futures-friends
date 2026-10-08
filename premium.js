/* Futures Friends premium experience. Catalog and lesson logic stay in features.js. */
(function(){
  'use strict';
  const X = window.FFX, P = window.FFPure, modules = window.FF.modules;
  if(!X || !P || !modules) return;
  const academyView = V.academy;
  const icon = name => `<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#${name}"></use></svg>`;
  const colors = {F:'#2F6FC0',C:'#23814B',L:'#BB5415',D:'#18675F',K:'#BC4F22',H:'#B52D71',T:'#746019'};
  const track = code => X.tracks.find(t=>code.startsWith(t.p+'-')) || X.tracks[0];
  const visitStorage = new Map();
  const read = (key,fallback) => visitStorage.has(key)?visitStorage.get(key):X.load(key,fallback);
  function saved(){const a=read('ff-saved-lessons',[]);return Array.isArray(a)?a.filter(c=>modules.some(m=>m.code===c)):[];}
  const preferences = read('ff-display-preferences',{});
  document.documentElement.dataset.theme = 'light';
  // owner 2026-10-07 (demo: "I need ALL the effects on"): an old stored motion=false no longer switches motion off; only a choice made
  // since then (motion2) does, so everyone starts with the animations on and can still turn them off (remembered).
  document.documentElement.dataset.motion = preferences.motion2 === false ? 'off' : 'on';
  const ui = {tab:'overview',query:'',track:'',status:'',sort:'catalog',limit:12};
  const rawPlan = read('ff-learning-plan',{});
  const learningPlan = {track:X.tracks.some(t=>t.p===rawPlan.track)?rawPlan.track:'F', hours:Math.min(8,Math.max(.5,+rawPlan.hours||2))};
  function persist(key,value){visitStorage.set(key,value);if(!X.save(key,value)) toast('Storage is unavailable. Changes last for this visit only.');}
  function decode(value){try{return decodeURIComponent(value||'');}catch{return '';}}
  const href = (route,a) => '#'+route+(a?'/'+encodeURIComponent(a):'');
  const link = (route,text,cls='px-link',a='',attrs='') => `<a class="${cls}" href="${href(route,a)}"${attrs?' '+attrs:''}>${text}</a>`;

  // Header (wave 6 NAV). The neutral main list is what everyone sees until they pick who they are; the audience switcher in the
  // utility bar, the full-screen felt menu (it replaces the old phone dropdown and the desktop "More" panel), the search palette,
  // breadcrumbs, back chip, page transitions and the context card all live in wayfinding.js, which rewrites the main list per audience.
  // Owner 2026-10-07: Families is the default side, so its four links are the first paint; wayfinding.js swaps in the centers set.
  const mainNav=[['friends','Friends & Books'],['family-videos','Watch'],['at-home','Futures at Home'],['enroll','Visit our center']];
  const lockIcon='<svg class="px-icon ffw-lock" viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>';
  const audiences=[['families','Families','Families'],['centers','For Centers & Programs','Centers']];
  document.querySelector('.bar').innerHTML = `<div class="px-utility"><div class="wrap"><div class="ffw-aud" role="group" aria-labelledby="ffw-aud-label"><span id="ffw-aud-label" class="ffw-audlabel">Who are you?</span>${audiences.map(([k,l,s])=>`<button type="button" class="ffw-audbtn" data-audience="${k}" aria-pressed="${k==='families'}"><span class="ffw-long">${l.replace('&','&amp;')}</span><span class="ffw-short" aria-hidden="true">${s}</span></button>`).join('')}${link('sign-in',lockIcon+'Sign in','px-link ffw-signin')}</div><div class="px-utilinks">${link('enroll','Visit our center','px-link ffw-for-families')}${link('book-demo','Book a demo','px-link ffw-for-centers')}</div></div></div>
    <div class="wrap px-navrow">${link('home','<img class="ff-plush-wm" src="img/brand/ff-plush-wordmark-160.webp" srcset="img/brand/ff-plush-wordmark-160.webp 160w, img/brand/ff-plush-wordmark-320.webp 320w" sizes="(max-width:640px) 116px, 142px" width="142" height="66" alt="Futures Friends home">','px-logo')}
    <nav id="nav" class="main px-main" aria-label="Main">${mainNav.map(([v,n])=>link(v,n.replace('&','&amp;'))).join('')}</nav>
    <div class="px-navactions"><button type="button" class="px-iconbtn" data-px="search" title="Search Futures Friends (press / or Ctrl K)" aria-label="Search Futures Friends" aria-keyshortcuts="/ Control+K Meta+K">${icon('Search')}</button><button type="button" class="px-iconbtn" data-px="settings" title="Display preferences" aria-label="Display preferences">${icon('SlidersHorizontal')}</button>${link('at-home','Free stories '+icon('ArrowRight'),'px-btn px-primary ffw-for-families')}${link('book-demo','Book a demo '+icon('ArrowRight'),'px-btn px-primary ffw-for-centers')}<button type="button" id="menuT" class="px-iconbtn menu-t ffw-menubtn" aria-label="Open menu" aria-haspopup="dialog" aria-expanded="false" aria-controls="ffw-menu">${icon('Menu')}<span class="ffw-menulabel" aria-hidden="true">Menu</span></button></div></div>`;
  window.FFNav={mainNav,audiences,lockIcon,icon,link};

  const settingsDialog = document.createElement('dialog');
  settingsDialog.className='px-dialog px-settings';settingsDialog.id='px-settings';settingsDialog.setAttribute('aria-labelledby','px-settings-title');
  settingsDialog.innerHTML=`<div class="px-dialoghead"><h2 id="px-settings-title">Display preferences</h2><button type="button" class="px-iconbtn" data-px="close" aria-label="Close preferences">${icon('X')}</button></div><label class="px-toggle"><span>${icon('Waves')} Decorative motion</span><input type="checkbox" id="px-motion" ${preferences.motion2===false?'':'checked'}></label><p class="px-muted">Your device's reduced-motion preference always takes priority.</p>`;
  document.body.appendChild(settingsDialog);
  const pages=[['home','Futures Friends'],['curriculum','Curriculum by age'],['whole-child','The Whole-Child Day: learning, meals, movement, Quiet Time'],['bop-at-home','Bop at Home: free family movement, Move Your Body Grow Your Mind'],['at-home','Futures at Home: free family library'],['story-time','Story Time: read-along storybooks'],['activities','Things to do at home by age'],['printables','Printables for families'],['see-how','See how: picture guides'],['my-week','My Week: weekly plan, sticker chart, certificates'],['for-centers','For Child Care Centers: what a licensed center gets'],['teacher-standard','Our Teacher Standard: training, background checks and mastery'],['train-your-staff','Train your staff with us'],['readiness','School Readiness'],['friends','Booker Lumi Zuri Bop and storybooks'],['watch','Watch episodes'],['rainbow','Eat the Rainbow recipes'],['academy','Training Academy'],['options','Program Options'],['pricing','Pricing'],['hub','Futures Hub'],['enroll','Visit our pilot center: Futures Learning Center, Independence, Missouri'],['jobs','Careers and open positions'],['job','Job opening'],['contact','Contact and support']];
  window.FFSearchPages=pages;

  function courseCard(m,a,bookmarks){
    const t=track(m.code),pct=X.academy.percent(a,m.code),isSaved=bookmarks.includes(m.code);
    return `<article class="px-course" style="--accent:${colors[t.p]}"><div class="px-courseart"><div><span>${esc(t.level)}</span><b>${esc(m.code)}</b></div><img src="${ART[t.ch]}" width="100" height="120" alt="" loading="lazy"><button type="button" class="px-iconbtn px-save" data-save="${esc(m.code)}" aria-label="${isSaved?'Unsave':'Save'} ${esc(m.code)}" title="${isSaved?'Remove saved lesson':'Save lesson'}" aria-pressed="${isSaved}">${icon('Bookmark')}</button></div><div class="px-coursetext"><p class="px-kicker">${esc(t.name)}</p><h3>${link('academy',esc(m.title),'',m.code)}</h3><p class="px-courseformat">${esc(m.format)}</p><div class="px-coursemeta"><span>${icon('Clock')}${+m.hours} catalog h</span><span>${pct===100?icon('Check')+'Complete':pct?`${pct}% started`:'Preview'}</span></div><progress value="${pct}" max="100" aria-label="${esc(m.code)} local progress"></progress></div></article>`;
  }
  function library(a,bookmarks){
    const out=P.filter(modules,a,bookmarks,{...ui,savedOnly:ui.tab==='learning'});
    return `<div class="px-sectionheading"><div><span class="px-kicker">${ui.tab==='learning'?'YOUR COLLECTION':'EXPLORE THE CATALOG'}</span><h2>${ui.tab==='learning'?'My saved lessons':'Course library'}</h2></div><span class="px-muted">${out.length} ${out.length===1?'module':'modules'}</span></div>
    <div class="px-filters"><label class="px-searchbox">${icon('Search')}<input type="search" id="px-coursequery" aria-label="Search course library" placeholder="Search lessons or codes" value="${esc(ui.query)}"></label><label><span>Pathway</span><select id="px-track"><option value="">All pathways</option>${X.tracks.map(t=>`<option value="${t.p}" ${ui.track===t.p?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label><span>Progress</span><select id="px-status"><option value="">All progress</option>${[['new','Not started'],['started','In progress'],['done','Completed']].map(([v,n])=>`<option value="${v}" ${ui.status===v?'selected':''}>${n}</option>`).join('')}</select></label><label><span>Sort</span><select id="px-sort">${[['catalog','Catalog order'],['short','Shortest first'],['title','Title A to Z']].map(([v,n])=>`<option value="${v}" ${ui.sort===v?'selected':''}>${n}</option>`).join('')}</select></label></div>
    <div class="px-resultsummary" role="status">Showing ${Math.min(out.length,ui.limit)} of ${out.length} modules${ui.query||ui.track||ui.status?'<button type="button" class="px-textbtn" data-px="reset">Clear filters</button>':''}</div><div class="px-coursegrid">${out.slice(0,ui.limit).map(m=>courseCard(m,a,bookmarks)).join('')}</div>
    ${!out.length?`<div class="px-empty">${icon('BookOpen')}<h3>${ui.tab==='learning'&&!bookmarks.length?'Your collection starts here':'No lessons match these filters'}</h3><p>${ui.tab==='learning'&&!bookmarks.length?'Save a lesson from the library to keep it close.':'Try another keyword or clear your filters.'}</p><button class="px-btn px-secondary" type="button" data-px="${ui.tab==='learning'&&!bookmarks.length?'browse':'reset'}">${ui.tab==='learning'&&!bookmarks.length?'Browse courses':'Clear filters'}</button></div>`:''}
    ${out.length>ui.limit?`<div class="px-loadmore"><button class="px-btn px-secondary" type="button" data-px="more">Show more lessons ${icon('ChevronDown')}</button></div>`:''}`;
  }
  function planner(a){
    const plan=P.plan(modules,a,learningPlan.track,learningPlan.hours),t=X.tracks.find(t=>t.p===learningPlan.track);
    return `<section class="px-planner" aria-labelledby="px-plan-title"><div class="px-sectionheading"><div><span class="px-kicker">MAKE SPACE FOR LEARNING</span><h2 id="px-plan-title">Your weekly plan</h2></div>${icon('CalendarDays')}</div><div class="px-plancontrols"><label><span>Learning pathway</span><select id="px-plantrack">${X.tracks.map(t=>`<option value="${t.p}" ${t.p===learningPlan.track?'selected':''}>${esc(t.name)}</option>`).join('')}</select></label><label><span>Weekly goal <b id="px-goalvalue">${learningPlan.hours} h</b></span><input id="px-goal" aria-label="Weekly learning hours" type="range" min="0.5" max="8" step="0.5" value="${learningPlan.hours}"></label></div><div class="px-planbody"><div><h3>${esc(t.name)}</h3><p class="px-muted">${plan.remainingHours?`About ${plan.weeks} weeks at your chosen pace. Estimates use catalog hours, not verified training time.`:'All modules in this preview pathway are marked complete.'}</p><ul>${plan.modules.map(m=>`<li>${icon('BookOpen')}${link('academy',`${esc(m.code)} <b>${esc(m.title)}</b>`,'',m.code)}<span>${m.hours} h</span></li>`).join('')}</ul>${!plan.modules.length&&plan.remainingHours?'<p>No whole module fits this week. Increase your goal or spread a module across several weeks.</p>':''}</div><div class="px-planfooter"><span>${plan.hours} h planned this week</span><button type="button" class="px-btn px-secondary" data-px="download-plan">${icon('Download')} Save plan</button></div></div></section>`;
  }
  function pathways(a){
    return `<div class="px-sectionheading"><div><span class="px-kicker">FIND YOUR DIRECTION</span><h2>Learning pathways</h2></div></div><p class="px-muted">Explore the proposed training tracks. Completing a local preview does not issue a professional credential or approved clock hours.</p><div class="px-pathways">${X.tracks.map(t=>{const s=X.academy.stats(a,t);return `<article style="--accent:${colors[t.p]}"><img src="${ART[t.ch]}" width="70" height="90" alt="" loading="lazy"><div><span class="px-kicker">${esc(t.level)} / ${s.n} modules</span><h3>${esc(t.name)}</h3><p>${esc(t.who)}</p><progress value="${s.pct}" max="100" aria-label="${esc(t.name)} local completion"></progress><small>${s.d} of ${s.n} marked complete</small></div><button type="button" class="px-iconbtn" data-trackbrowse="${t.p}" title="Explore ${esc(t.name)}" aria-label="Explore ${esc(t.name)}">${icon('ArrowRight')}</button></article>`;}).join('')}</div>${planner(a)}`;
  }
  function overview(a,bookmarks){
    const next=modules.find(m=>a.open[m.code]&&!a.done[m.code])||modules.find(m=>!a.done[m.code]);
    return `<div class="px-overview"><section class="px-continue"><div class="px-continuecopy"><span class="px-kicker">${next&&a.open[next.code]?'CONTINUE YOUR DISCOVERY':'YOUR NEXT DISCOVERY'}</span><h2>${next?esc(next.title):'You explored every module'}</h2><p>${next?`${esc(next.code)} / ${next.hours} catalog hours / ${esc(track(next.code).name)}`:'Revisit a favorite or plan your next classroom conversation.'}</p>${link('academy',(next&&a.open[next.code]?'Continue lesson':'Explore lesson')+' '+icon('ArrowRight'),'px-btn px-primary',next?next.code:modules[0].code)}</div><img src="img/plush/characters/booker-480.webp" width="130" height="200" alt="Booker, your learning companion" class="px-booker"></section><section class="px-welcome"><div><span class="px-kicker">MEET YOUR ACADEMY</span><h3>A little curiosity goes a long way.</h3><p>Watch the introduction, then make your first discovery.</p></div><div class="ffa-flagwrap"><video controls playsinline preload="metadata" poster="video/academy-welcome-poster.jpg" aria-label="Academy introduction: Ms. June, a story-world teacher, introduces Booker, Lumi, Zuri and Bop"><source src="video/academy-welcome.mp4" type="video/mp4">${window.FFCaptions?window.FFCaptions.tracks('video/academy-welcome.mp4'):''}</video></div><small>Sample introduction &middot; story-world animation</small>${window.FFCaptions?window.FFCaptions.extras('video/academy-welcome.mp4','Meet the Friends'):''}</section></div><div class="px-sectionheading"><div><span class="px-kicker">START WITH THE FOUNDATIONS</span><h2>Built for everyday teaching</h2></div><button type="button" class="px-textbtn" data-px="browse">All courses ${icon('ArrowRight')}</button></div><div class="px-coursegrid">${modules.slice(0,3).map(m=>courseCard(m,a,bookmarks)).join('')}</div>${window.FFSupporting.teacher('academy')}${planner(a)}${window.FFAdvisors.render('melissa', true)}`;
  }
  V.academy = function(){
    if(arg && modules.some(m=>m.code===arg)) return `<div class="px-previewnote">${icon('BookOpen')} Lesson preview. Video and knowledge checks are samples. Progress is stored on this browser; no official training credit is issued.</div>`+academyView();
    const a=X.academy.state(),bookmarks=saved(),done=modules.filter(m=>a.done[m.code]),hours=done.reduce((n,m)=>n+(+m.hours||0),0);
    return `<div class="px-academy"><aside class="px-sidebar"><a href="#academy" class="px-academybrand"><img class="ff-plush-wm" src="img/brand/ff-plush-wordmark-320.webp" srcset="img/brand/ff-plush-wordmark-160.webp 160w, img/brand/ff-plush-wordmark-320.webp 320w" sizes="128px" width="128" height="60" alt="Futures Friends"><span><b>Academy</b></span></a><span class="px-sidelabel">YOUR WORKSPACE</span><nav aria-label="Academy workspace">${[['overview','LayoutDashboard','Overview'],['library','BookOpen','Course library'],['learning','Bookmark','My learning'],['pathways','Route','Pathways']].map(([v,i,n])=>`<button type="button" data-acadtab="${v}" aria-current="${ui.tab===v?'page':'false'}">${icon(i)}${n}${v==='learning'?`<span>${bookmarks.length}</span>`:''}</button>`).join('')}</nav><div class="px-sidebottom"><img src="img/plush/characters/ms-fern-480.webp" width="58" height="96" alt=""><b>A little support?</b><p>Every great teacher keeps learning.</p><small class="px-sidestory">Ms. Fern, story-world character</small>${link('contact','Talk to our team '+icon('ArrowRight'))}</div></aside><div class="px-workspace"><div class="px-workhead"><div><p class="px-kicker">FUTURES FRIENDS / TRAINING ACADEMY</p><h1>${ui.tab==='overview'?'Room to grow.':ui.tab==='library'?'Keep your curiosity going.':ui.tab==='learning'?'Learning, made yours.':'Choose your next chapter.'}</h1><p>Small discoveries. More confident teaching.</p></div><button type="button" class="px-btn px-secondary" data-px="transcript">${icon('Download')} Learning record</button></div><div class="px-previewnote">${icon('BookOpen')} Academy preview <span class="px-dot">/</span> Saved on this browser only. Sample lessons are not approved clock hours or professional certification.</div><div class="px-stats"><div><span>YOUR EXPLORATION</span><b>${done.length}<small> / ${modules.length}</small></b><p>Modules marked complete</p></div><div><span>KEEP IT CLOSE</span><b>${bookmarks.length}</b><p>Saved lessons</p></div><div><span>YOUR WEEKLY RHYTHM</span><b>${learningPlan.hours}<small> h</small></b><p>Personal learning goal</p></div><div><span>LEARNING RECORD</span><b>${hours}<small> catalog h</small></b><p>Self-recorded, not verified</p></div></div>${ui.tab==='overview'?overview(a,bookmarks):ui.tab==='pathways'?pathways(a):library(a,bookmarks)}</div></div>`;
  };

  // Home hero. Wave 6 (owner 2026-10-06): the plush meadow world (meadow-hero.js) with the plush logo as the h1 and the four friends
  // on one ground line, Booker center stage (brand-art.js homeStage). Without meadow-hero.js the wave-5 navy stage still renders.
  const MH=()=>!!(window.FFMeadow&&window.FFArt);
  V.home=()=>`<section class="px-homehero${MH()?' mh-hero':(window.FFArt?' ffa-homehero':'')}${!MH()&&window.FFJourney?' fj-hero':''}">${MH()?window.FFMeadow.world():''}${window.FFArt?'':'<img src="img/zones.jpg" alt="Placeholder map of the Futures Friends learning zones" class="px-herobg" fetchpriority="high">'}<div class="wrap${MH()?' mh-grid':(window.FFArt?' ffa-homegrid':'')}"><div class="px-herocopy${MH()?' mh-copy':''}">${MH()?'':'<span class="px-kicker">EARLY LEARNING / AGES 2 TO 5</span>'}<h1${MH()?' class="mh-logo"':''}>${MH()?window.FFMeadow.logo():'Futures Friends'}</h1><div class="mh-card"><p>Learn. Move. Explore. Belong.</p><div class="px-herosupport">${MH()?'Four familiar friends and a whole world of discovery. Early learning for ages 2&nbsp;to&nbsp;5, in classrooms, home daycares and families.':'Four familiar friends. A whole world of discovery.<br>Learning for classrooms, home daycares and families.'}</div><div class="px-heroactions">${link('at-home','Free stories and activities '+icon('ArrowRight'),'px-btn px-primary')}${link('home',icon('Play')+' Meet the friends','px-btn px-secondary','','data-reveal="[data-video=intro]" data-reveal-play')}</div></div></div>${MH()?'':(window.FFArt?window.FFArt.homeStage():'')}</div>${MH()?`<div class="mh-castrow">${window.FFArt.homeStage()}</div>${window.FFMeadow.front()}`:''}${window.FFArt?'':'<span class="px-imagecaption">Concept learning environment</span>'}${window.FFJourney||MH()?'':`<div class="px-herofoot"><div class="wrap"><span>${icon('BookOpen')} Stories worth sharing</span><span>${icon('Heart')} Every child belongs</span><span>${icon('Leaf')} Curiosity, every day</span><span>${icon('Blocks')} Learning through play</span></div></div>`}</section>
    ${window.FFHomeCalm?window.FFHomeCalm.body():''}`;

  function download(name,text,type){const url=URL.createObjectURL(new Blob([text],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function rerender(focusId){const el=focusId&&document.getElementById(focusId),start=el&&el.selectionStart,end=el&&el.selectionEnd;render();const replacement=focusId&&document.getElementById(focusId);if(replacement){replacement.focus({preventScroll:true});if(typeof start==='number'&&replacement.setSelectionRange) replacement.setSelectionRange(start,end);}}
  document.addEventListener('input',e=>{
    if(e.target.id==='px-coursequery'){ui.query=e.target.value;ui.limit=12;rerender(e.target.id);}
    if(e.target.id==='px-goal') document.getElementById('px-goalvalue').textContent=e.target.value+' h';
  });
  document.addEventListener('change',e=>{
    const t=e.target,map={'px-track':'track','px-status':'status','px-sort':'sort'};
    if(map[t.id]){ui[map[t.id]]=t.value;ui.limit=12;rerender(t.id);}
    if(t.id==='px-plantrack'||t.id==='px-goal'){learningPlan[t.id==='px-plantrack'?'track':'hours']=t.id==='px-goal'?+t.value:t.value;persist('ff-learning-plan',learningPlan);rerender(t.id);}
    if(t.id==='px-motion'){preferences.motion2=t.checked;persist('ff-display-preferences',preferences);document.documentElement.dataset.motion=t.checked?'on':'off';render();}
  });
  document.addEventListener('click',e=>{
    const t=e.target.closest('button,a');if(!t)return;
    if(t.hasAttribute('data-skip')){e.preventDefault();const main=document.getElementById('view');main.focus();main.scrollIntoView({block:'start'});return;}
    if(t.dataset.acadtab){ui.tab=t.dataset.acadtab;ui.query='';ui.track='';ui.status='';ui.limit=12;rerender();document.querySelector(`[data-acadtab="${ui.tab}"]`).focus({preventScroll:true});}
    if(t.dataset.save){const list=saved(),code=t.dataset.save;persist('ff-saved-lessons',list.includes(code)?list.filter(c=>c!==code):list.concat(code));rerender();document.querySelector(`[data-save="${code}"]`)?.focus({preventScroll:true});}
    if(t.dataset.trackbrowse){ui.tab='library';ui.track=t.dataset.trackbrowse;ui.query='';ui.status='';ui.limit=12;rerender();}
    switch(t.dataset.px){
      case 'search':if(window.FFWay)window.FFWay.palette.open(t);break;
      case 'settings':settingsDialog.showModal();break;
      case 'close':t.closest('dialog').close();break;
      case 'browse':ui.tab='library';ui.query='';ui.track='';ui.status='';ui.limit=12;rerender();break;
      case 'reset':ui.query='';ui.track='';ui.status='';ui.limit=12;rerender('px-coursequery');break;
      case 'more':{const previous=ui.limit;ui.limit+=12;rerender();document.querySelectorAll('.px-course h3 a')[previous]?.focus({preventScroll:true});break;}
      case 'transcript':download('futures-friends-learning-preview.csv',P.csv(modules,X.academy.state()),'text/csv;charset=utf-8');break;
      case 'download-plan':{const p=P.plan(modules,X.academy.state(),learningPlan.track,learningPlan.hours);download('futures-friends-weekly-plan.txt','FUTURES FRIENDS / PERSONAL LEARNING PLAN\nLocal preview, not verified training credit.\n\nWeekly goal: '+learningPlan.hours+' catalog hours\n'+p.modules.map(m=>m.code+' - '+m.title+' ('+m.hours+' catalog hours)').join('\n')+'\n\n'+(!p.modules.length?'No whole module fits the goal, or the pathway is marked complete.\n':'')+'Plan a time outside classroom supervision.','text/plain;charset=utf-8');break;}
    }
    const a=t.closest('a[href^="#"]');
    if(a&&!e.defaultPrevented&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0){const parts=a.getAttribute('href').slice(1).split('/');if(V[parts[0]]){e.preventDefault();document.getElementById('px-search')?.close();settingsDialog.close();go(parts[0],parts[1]?decode(parts[1]):undefined);}}
  });
  const realGo=go;
  let navigatingHistory=false;   // one-shot: set by Back/Forward, consumed by the next go() even when a page turn runs it a frame later
  go=function(v,a){
    const old=location.hash||'#home';
    const target=href(V[v]?v:'home',a);
    const fromHistory=navigatingHistory;navigatingHistory=false;
    if(!fromHistory&&old!==target)history.pushState(null,'',target);
    const result=realGo(v,a);
    document.querySelectorAll('.px-main a').forEach(el=>{if(el.getAttribute('href')==='#'+v)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
    document.querySelectorAll('[data-ff-pending]').forEach(el=>{el.hidden=typeof V[el.dataset.ffPending]!=='function';});
    const route=V[v]?v:'home';
    if(window.FFRouteMeta)window.FFRouteMeta.apply(route,a);
    else document.title=(pages.find(([r])=>r===route)?.[1]||route.replace(/-/g,' '))+' | Futures Friends';
    return result;
  };
  window.go=go;
  function fromHistory(){navigatingHistory=true;window.FFNav.viaHistory=true;const parts=location.hash.slice(1).split('/');go(parts[0]||'home',parts[1]?decode(parts[1]):undefined);}
  addEventListener('popstate',fromHistory);
  addEventListener('hashchange',()=>{const parts=location.hash.slice(1).split('/');if(parts[0]!==view||decode(parts[1])!==(arg||''))fromHistory();});
})();
