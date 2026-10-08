/* Futures Friends site v2: every page of a school-platform site, rebuilt for child care (ages 2 to 5), plus more. */
const D = window.FF || {recipes:[],menus:{},units:[],modules:[],catalog:[],books:[],episodes:[],summer:[],holiday:[],ladder:[]};
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const money = n => '$' + n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2});
const R = Object.fromEntries(D.recipes.map(r => [r.code, r]));
const CH = {
  booker:{n:'Booker',a:'brown bear',role:'The Brave Little Learner',p:'LEARN',v:'Confidence',z:"Booker's Reading Area",m:'Big breath. Brave heart. Try again!',d:'Early literacy, storytelling, listening, and the courage to try again.'},
  lumi:{n:'Lumi',a:'bunny',role:'The Kindness Keeper',p:'BELONG',v:'Kindness',z:"Lumi's Calm Corner",m:'Kindness brightens every day.',d:'Naming feelings, calming down, friendship and making room for everyone.'},
  zuri:{n:'Zuri',a:'turtle',role:'The Curious Explorer',p:'EXPLORE',v:'Curiosity',z:"Zuri's Discovery Zone",m:'I wonder what happens if we try!',d:'Questions, nature, numbers, shapes and simple experiments.'},
  bop:{n:'Bop',a:'elephant',role:'The Mighty Mover',p:'MOVE',v:'Independence',z:"Bop's Movement Zone",m:'Move your body, grow your mind.',d:'Movement, music, routines, clean-up and doing it myself.'}};
const KEYS = ['booker','lumi','zuri','bop'];
// Character art: ONE source, the plush library (img/plush/characters; plush-cast.js / window.FFPlush, wave 5). window.FFcut and img()
// give the 480 file for small uses (features, extras, portal, store); pimg() gives the full <img> with srcset (480/960) and the
// manifest's intrinsic size, so large figures stay sharp and nothing jumps while it loads. Old img/cut_*.webp stay for print only.
const ART = {booker:'img/plush/characters/booker-480.webp', lumi:'img/plush/characters/lumi-480.webp', zuri:'img/plush/characters/zuri-480.webp', bop:'img/plush/characters/bop-480.webp'};
window.FFcut = k => ART[k];
const img = k => ART[k];
const pimg = (k, o = {}) => window.FFPlush ? window.FFPlush.img(k, o) : `<img${o.cls ? ` class="${o.cls}"` : ''} src="${ART[k]}" alt="${esc(o.alt === undefined ? '' : o.alt)}">`;
const charOf = t => KEYS.find(k => (t||'').toLowerCase().includes(k)) || 'booker';
const LEVELS = {1:'Easy & Quick',2:'Medium',3:'Next Level'};
const MONTHS = ['September','October','November','December','January','February','March','April','May','June','July','August'];
const PHONE = '(816) 988-5661', EMAIL = 'info@futureslearningcenter.com', ADDR = '3625 S Blue Ridge Blvd, Independence, MO 64052';
let view = 'home', arg = null, st = {lvl:1, wk:1, portal:'director', kid:null, age:'threes', cart:{}, help:'tech'};

// ---------------------------------------------------------------- shared blocks
const phero = (eyebrow, title, lede, opts={}) => `<div class="phero"><div class="wrap"><div style="display:grid;gap:12px">
  ${opts.crumb?`<div class="crumbs"><button data-go="${opts.crumb[0]}">${opts.crumb[1]}</button> / ${esc(title.replace(/<[^>]+>/g,''))}</div>`:''}
  <div class="eyebrow">${eyebrow}</div><h1 style="font-size:clamp(30px,4.4vw,48px)">${title}</h1>${lede?`<p class="lede">${lede}</p>`:''}
  ${opts.cta?`<div style="display:flex;gap:10px;flex-wrap:wrap">${opts.cta}</div>`:''}
  ${opts.anchors?`<div class="anchors">${opts.anchors.map(a=>`<button data-anchor="${a[0]}">${a[1]}</button>`).join('')}</div>`:''}</div>
  <div class="art${opts.scene?' art-scene':''}">${opts.scene || (opts.chars||KEYS).map(k=>pimg(k,{alt:CH[k].n+' the '+CH[k].a,h:150,eager:true})).join('')}</div></div></div>`;
const head = (e,t,l) => `<div class="head"><div class="eyebrow">${e}</div><h2>${t}</h2>${l?`<p class="lede">${l}</p>`:''}</div>`;
const cta = (t,l,btn='Request a Quote',go='quote') => `<section class="tight"><div class="wrap"><div class="cta"><div style="display:grid;gap:8px"><h2>${t}</h2><p class="lede">${l}</p></div><button class="btn gold" data-go="${go}">${btn}</button></div></div></section>`;
const card = (title, body, tag, color) => `<div class="card">${tag?`<span class="tag c" style="--c:var(--${color||'booker'});justify-self:start">${tag}</span>`:''}<h3>${title}</h3><p class="small">${body}</p></div>`;
const friendCard = k => { const c=CH[k]; return `<article class="friend" style="--c:var(--${k});--s:var(--${k}-s)"><div class="ph">${pimg(k,{alt:`${c.n} the ${c.a}`,h:200})}</div><div class="bd"><div class="nm">${c.n}</div><div class="small muted">${c.role}</div><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag c" style="--c:var(--${k})">${c.p}</span><span class="tag">${c.v}</span></div><p class="small">${c.d}</p><p class="small"><b>Zone:</b> ${c.z}</p></div></article>`; };
// A storybook's cover: the finished cover of its revised edition (owner 2026-10-07: all four friends' books) from the Story Time data,
// linking to the reader; the felt layout card only for a book without finished art (The Rainbow Picnic).
const famBook = b => { const F = window.FFFamily; return F && Array.isArray(F.BOOKS) ? F.BOOKS.find(y => y.c === b.c && y.cover) || null : null; };
const cover = b => famBook(b)
  ? (f => `<a class="cover cover-art" href="#story-time/${f.id}" aria-label="Read ${esc(f.title)} in Story Time"><img src="${f.cover[0]}" srcset="${f.cover[0]} 640w, ${f.cover[1]} 1200w" sizes="(max-width:700px) 45vw, 240px" alt="${esc(f.title)} cover: ${esc(f.coverAlt.replace(/\.$/, ''))}" width="1200" height="1200" loading="lazy" decoding="async"></a>`)(famBook(b))
  : `<div class="cover" style="--c:${b.c==='all'?'var(--navy)':`var(--${b.c})`};--ci:${b.c==='all'?'var(--navy)':`var(--${b.c}-ink)`}"><em>${esc(b.title)}</em>${b.c==='all'?'<img src="img/group.jpg" alt="" style="height:62%;width:92%;object-fit:cover;object-position:center 30%;border-radius:6px;margin-bottom:8%">':`<img src="${img(b.c)}" alt="">`}</div>`;
const dayCost = r => { const m=(r[4]||'').match(/\$([\d.]+)/); return m?+m[1]:0; };
const linkR = t => esc(t).replace(/\(([EMN]\d{1,2})\)/g,(m,c)=>R[c]?`(<button class="rl" data-r="${c}">${c}</button>)`:m);
// Room slots (zone map, dining room) hold labelled placeholder art until the real photos arrive, with a visible flag (brand-art.js) so they never pass for our center.
// Wave 10 (owner 2026-10-07): the classroom slots, the learning-zone photo and the front door now show REAL photos of the pilot center (FFArt.photo, img/center/).
const FIG_AI = {'img/zones.jpg':[1200,800],'img/kitchen.jpg':[1200,675]};
const fig = (src, alt, cap) => { const wh = FIG_AI[src], fl = wh && window.FFArt ? window.FFArt.flag('illustration') : '';
  return `<figure${fl?' class="ffa-flagged"':''}>${fl}<img src="${src}" alt="${alt}"${wh?` width="${wh[0]}" height="${wh[1]}"`:''} loading="lazy" decoding="async"><figcaption>${cap}</figcaption></figure>`; };
// Page weight: resized WebP copies (<name>-400.webp, <name>-800.webp) for the screen, the original PNG as the fallback. Originals stay in the repo.
const pic = (src, w, h, alt, sizes, style) => { const b = src.replace(/\.png$/, ''); return `<picture><source type="image/webp" srcset="${b}-400.webp 400w, ${b}-800.webp 800w" sizes="${sizes}"><img src="${src}" alt="${alt}" width="${w}" height="${h}" loading="lazy" decoding="async"${style?` style="${style}"`:''}></picture>`; };
const draft = () => window.FFArt ? window.FFArt.flag('draft') : '';
const layout = () => window.FFArt ? window.FFArt.flag('layout') : '';
const ck = items => `<div style="display:grid;gap:6px">${items.map(i=>`<div class="chk"><span>${i}</span></div>`).join('')}</div>`;

const V = {};

// ---------------------------------------------------------------- HOME (mirrors the platform landing page)
// Signature moments owned here: H friend rooms, I daily learning loop, J explorable classroom, K family app stack.
const FFH_LOOP = [['Watch','A friend story, told with puppets for now','watch'],['Talk','The teacher asks what happened and why','booker'],['Do','A connected hands-on activity','zuri'],['Move','Movement, role play, art or a song','bop'],['Explore','The four learning zones, all day','lumi'],['Take home','A question and activity for families','gold-deep']];
const FFH_ZONES = {
  booker:{short:'Reading Area', r:[0,0,.553,.487], at:[.30,.20], say:'This is my Reading Area. We read together, trace our letters and try again when a word gets tricky.'},
  lumi:{short:'Calm Corner', r:[.558,0,.442,.487], at:[.80,.20], say:'In my Calm Corner we name our feelings, take flower-and-candle breaths and make room for everyone.'},
  zuri:{short:'Discovery Zone', r:[0,.493,.41,.382], at:[.21,.64], say:'My Discovery Zone is full of blocks, shapes and big questions. What happens if we try?'},
  bop:{short:'Movement Zone', r:[.413,.493,.219,.382], at:[.52,.80], say:'In my Movement Zone we hop, dance, balance, and then clean up all by ourselves!'}};
const FFH_MOT = {
  star:'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.7 7-6.3-3.8-6.3 3.8 1.7-7L2 9.2l7.1-.6z"/></svg>',
  heart:'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.6 4.5c2.1 0 3.6 1.2 5.4 3.2 1.8-2 3.3-3.2 5.4-3.2 3.6 0 5.7 3.9 4.2 7.3C19.5 16.4 12 21 12 21z"/></svg>',
  book:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path fill="currentColor" fill-opacity=".25" d="M2 5.5c3.3-1.2 6.7-1 10 1.2 3.3-2.2 6.7-2.4 10-1.2v13c-3.3-1.2-6.7-1-10 1.2-3.3-2.2-6.7-2.4-10-1.2z"/><path d="M12 6.7v13"/></svg>',
  leaf:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path fill="currentColor" fill-opacity=".35" d="M4 20C4 10 10 4 21 3c0 11-6 17-16 17z"/><path d="M4 20 14 10"/></svg>',
  note:'<svg viewBox="0 0 24 24"><path fill="currentColor" d="M9 3v11.3A3.5 3.5 0 1 0 11 17.5V8h8v6.3a3.5 3.5 0 1 0 2 3.2V3z"/></svg>'};
const FFH_MOTIFS = {booker:['book','star','ABC'], lumi:['heart','star','heart'], zuri:['leaf','?','leaf'], bop:['note','star','note']};
const FFH_BLOB = 'M44.7,-58.6C57.1,-49.5,65.9,-35.3,70.3,-19.6C74.7,-3.9,74.7,13.3,67.8,27.2C60.9,41.1,47.1,51.7,31.9,59.6C16.7,67.5,0.1,72.7,-17.4,71C-34.9,69.3,-53.3,60.7,-63.7,46.5C-74.1,32.3,-76.5,12.5,-72.6,-4.9C-68.7,-22.3,-58.5,-37.3,-45.1,-46.5C-31.7,-55.7,-15.9,-59.1,0.4,-59.6C16.7,-60.1,32.3,-67.7,44.7,-58.6Z';

const ffhBook = k => { const F = window.FFFamily; const x = F && Array.isArray(F.BOOKS) ? F.BOOKS.find(y => y.c === k) : null; return x ? x.id : ''; };
const ffhRoom = (k, i, active = null) => { const c = CH[k], b = (D.books||[]).find(x => x.c === k), bid = ffhBook(k), f = Math.min(1, 9 / c.v.length).toFixed(3);
  return `<${active === null ? 'article' : 'div'} class="ffhr-room" data-k="${k}" ${active === null ? '' : `id="ff-room-${k}" role="group" aria-roledescription="slide" ${i !== active ? 'hidden' : ''}`} style="--c:var(--${k});--f:${f}" aria-label="${c.n}: ${c.v}">
  <div class="ffhr-copy">
   <div class="ffhr-top"><span class="ffhr-pill">${c.p}</span><span class="ffhr-no">${i+1} of 4</span></div>
   <h3 class="ffhr-value">${c.v}</h3>
   <p class="ffhr-name">${c.n} the ${c.a}, ${c.role.replace(/^The /,'the ').toLowerCase()}</p>
   <p class="ffhr-d">${c.d}</p>
   <dl class="ffhr-meta"><div><dt>Zone</dt><dd>${c.z}</dd></div>${b?`<div><dt>Book</dt><dd><cite>${esc(b.title)}</cite></dd></div>`:''}</dl>
   <p class="ffhr-motto">“${c.m}”</p>
   <div class="ffhr-acts"><button class="btn gold ffhr-3d" type="button" data-ff3d="${k}" hidden>Meet ${c.n} in 3D</button><a class="btn ffhr-watch" href="${k==='bop'?'#bop-at-home':`#activities/${k}`}">Watch ${c.n}'s videos</a>${b&&bid?`<a class="btn ffhr-more" href="#story-time/${bid}">Read ${c.n}'s book</a>`:`<a class="btn ffhr-more" href="#friends" data-reveal="#ff-room-${k}">Meet ${c.n}</a>`}</div>
  </div>
  <div class="ffhr-stage">
   <div class="ffhr-shape" aria-hidden="true"><svg viewBox="0 0 200 200"><path transform="translate(100 100) rotate(${i*67}) scale(1.25)" d="${FFH_BLOB}"/></svg></div>
   ${pimg(k,{cls:'ffhr-cut',alt:`${c.n} the ${c.a}`,h:460})}
   <div class="ffhr-motif" aria-hidden="true">${FFH_MOTIFS[k].map((m,j)=>`<i class="m${j}">${FFH_MOT[m]||`<b>${m}</b>`}</i>`).join('')}</div>
  </div></${active === null ? 'article' : 'div'}>`; };

const ffhLoop = (interactive = false) => { const R0 = 170, RL = 226;
  const pt = (i, r) => { const a = (-90 + i*60) * Math.PI / 180; return [250 + r*Math.cos(a), 250 + r*Math.sin(a), Math.cos(a)]; };
  return `<section class="band-navy ffhl" data-signature ${interactive ? 'data-interactive' : ''} id="ff-loop">
 <div class="ffhl-pin"><div class="wrap ffhl-grid">
  <div class="ffhl-copy">${head('Readiness, every day','From a six-minute story to a whole day of learning','Screens start the conversation. Teachers, hands-on play and families carry it the rest of the way.')}
   <ol class="ffhl-list">
    ${interactive ? '' : `<li class="ffhl-rail" aria-hidden="true"><span class="ln"><i></i></span><img src="${FFcut('bop')}" alt=""></li>`}
    ${FFH_LOOP.map((s,i)=>interactive ? `<li><button type="button" class="ffhl-step" data-loop-step="${i}" aria-pressed="${i === 0}" style="--c:var(--${s[2]})"><i>${i+1}</i><span><b>${s[0]}</b><span>${s[1]}</span></span></button></li>` : `<li class="ffhl-step" style="--c:var(--${s[2]})"><i>${i+1}</i><div><b>${s[0]}</b><span>${s[1]}</span></div></li>`).join('')}
   </ol></div>
  <div class="ffhl-ring" ${interactive ? '' : 'aria-hidden="true"'}>
   <svg viewBox="-50 0 600 500" aria-hidden="true">
    <circle class="ffhl-track" cx="250" cy="250" r="${R0}"/>
    <path id="ffhl-path" class="ffhl-draw" d="M250,${250-R0} A${R0},${R0} 0 0 1 250,${250+R0} A${R0},${R0} 0 0 1 250,${250-R0}"/>
    ${FFH_LOOP.map((s,i)=>{ const [x,y]=pt(i,R0), [lx,ly,c]=pt(i,RL); return `<g class="ffhl-node" style="--c:var(--${s[2]})" transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="24"/><text y="7">${i+1}</text></g><text class="ffhl-lab" x="${lx.toFixed(1)}" y="${(ly+7).toFixed(1)}" text-anchor="${c>.3?'start':c<-.3?'end':'middle'}">${s[0]}</text>`; }).join('')}
    ${interactive ? `<g transform="translate(250 250)"><g class="ffhl-orbit"><g transform="translate(0 -${R0})"><g class="ffhl-upright"><image href="${FFcut('bop')}" x="-36" y="-42" width="72" height="85"/></g></g></g></g>` : `<g class="ffhl-bop" transform="translate(250 ${250-R0})"><image href="${FFcut('bop')}" x="-36" y="-42" width="72" height="85"/></g>`}
   </svg>
   <div class="ffhl-center" ${interactive ? 'role="status" aria-live="polite" aria-atomic="true"' : ''}><b>${interactive ? FFH_LOOP[0][0] : 'One day, six steps'}</b><span>${interactive ? FFH_LOOP[0][1] : 'Then it all starts again tomorrow.'}</span></div>
  </div>
 </div></div>
 <div class="wrap ffhl-stats"><div class="stats">
  <div class="stat"><b>48</b><span>theme weeks across 12 monthly units</span></div><div class="stat"><b>5</b><span>storybooks in development</span></div>
  <div class="stat"><b>36</b><span>recipe outlines in 3 levels</span></div><div class="stat"><b>${D.modules.length}</b><span>core training outlines; 4 continuing modules planned</span></div>
  <div class="stat"><b>24</b><span>summer camp and holiday units</span></div><div class="stat"><b>30</b><span>minute weekly ceiling on Futures Friends episodes; 24 scheduled at most</span></div>
 </div></div></section>`; };

const ffhMap = () => `<section class="ffhm" data-signature id="ff-map" data-z=""><div class="wrap ffhm-grid">
 <div class="ffhm-map">
  <div class="ffhm-frame">
   <img class="ffhm-img" src="img/zones.jpg" alt="Illustrated map of the learning zones: Booker's Reading Area, Lumi's Calm Corner, Zuri's Discovery Zone, Bop's Movement Zone and the Eat the Rainbow dining room" width="1200" height="800" loading="lazy" decoding="async">${window.FFArt ? window.FFArt.flag('illustration', {cls:'ffa-flag-map'}) : ''}
   ${KEYS.map(k=>{ const z=FFH_ZONES[k]; return `<button class="ffhm-spot" type="button" data-z="${k}" style="--c:var(--${k});--x:${z.at[0]};--y:${z.at[1]}" aria-pressed="false" aria-label="Step into ${CH[k].z}"><i></i><span>${z.short}</span></button>`; }).join('')}
   <div class="ffhm-pop"><img class="ffhm-cut" src="${FFcut('booker')}" alt=""><p class="ffhm-say" aria-live="polite"></p></div>
   <button class="ffhm-back btn soft" type="button" hidden>Whole room</button>
  </div>
  <p class="small muted ffhm-cap">Illustrated map, not a photo of our center. Tap a zone to step inside. <a class="rl" href="#room-kit">See the Learning Zones Kit</a></p>
 </div>
 <div class="ffhm-copy">${head('Everything in one program','More than a login','')}
  ${ck(['<b>Curriculum for twos, threes and pre-K:</b> Units 1 to 11 written day by day as drafts (none approved yet), Unit 12 in writing','<b>Five storybooks</b>, all free to read online (print editions in development), and a planned Season 1 micro-series','<b>Eat the Rainbow Kitchen:</b> 36 recipes and menus designed around the CACFP meal pattern','<b>Futures Friends educator training</b> ladder (planned, not state-approved)','<b>Classroom world (in development):</b> carpet, posters, zone signs and plush friends','<b>Futures Hub (built, not yet live):</b> Today checklist, family daily report, lunch planner, attendance and ratio checks','<b>Futures Include:</b> adaptations and inclusion supports for every child','<b>Funding help, marketing kit, summer camp and holiday units</b>'])}
  <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn navy" data-go="curriculum">View the curriculum</button><button class="btn soft" data-go="options">Program options</button></div></div>
</div></section>`;

const FFH_NOTES = [
  ['booker','Today at Futures','Booker\'s Story About Me','Children told the story of their names and made a name collage. Ask at dinner: "What letter does your name start with?"'],
  ['bop','What we ate','Lunch: chicken and rice bowl','Mandarin oranges and milk. Tried a new food today!'],
  ['lumi','Growing','A new milestone','Retold three events from a story and named four feelings.'],
  ['zuri','Take-home','Name hunt','Find your child\'s first letter on signs and boxes at home.'],
  ['watch','Message from the teacher','Episode night','This week\'s episode is ready to watch together, with one question to talk about.']];
const ffhPhone = () => `<div class="ffhk-phone" role="img" aria-label="Sample Family App notifications on a phone lock screen"><div class="ffhk-screen"><i class="ffhk-wall" aria-hidden="true"></i>
  <div class="ffhk-clock"><b>5:42</b><span>Friday, pickup time</span></div>
  <div class="ffhk-stack">${FFH_NOTES.map(n=>`<div class="ffhk-n" style="--c:var(--${n[0]})"><img src="img/brand/ff-plush-mark-96.webp" width="96" height="96" alt=""><div><div class="ffhk-h"><span>${n[1]}</span><span>now</span></div><b>${esc(n[2])}</b><p>${esc(n[3])}</p></div></div>`).join('')}</div>
  <span class="ffhk-sample">Sample</span></div></div>`;

// The hero is the still picture. (A looping hero video was planned; its file never existed, so the reference is gone, 2026-10-08.)
const ffhHeroArt = () => `<img class="art" src="img/hero.jpg" alt="Booker, Lumi, Zuri and Bop standing together under the Futures Friends logo">`;

V.home = () => `
<div class="hero" data-hero><div class="hero-bg" aria-hidden="true"></div>
 <div class="floaters" aria-hidden="true">${['st g l1','ht p l2','st b l3','cl l1','st o l2','ht g l3','st z l1','cl l3','st p l2','ht b l1'].map((c,i)=>`<i class="fl ${c}" style="--x:${[6,14,24,88,93,80,48,70,35,60][i]}%;--y:${[18,62,30,14,52,78,8,40,84,90][i]}%;--d:${(i%5)*0.7}s"></i>`).join('')}</div>
 <div class="stage-art">${ffhHeroArt()}</div>
 <div class="panel"><div class="wrap">
  <div style="display:grid;gap:14px"><div class="eyebrow" style="color:var(--gold)">For child care centers, home daycares and families · ages 2 to 5</div>
   <h1>A character-led early learning program for your child care: <span>Futures Friends</span></h1>
   <p class="lede">Start with Unit 1, available now as a draft for your educators (a summary is public). Later units, storybooks, short episodes, teacher training and the Futures Hub app are planned and marked as they are made.</p></div>
  <div style="display:grid;gap:14px;justify-items:start"><div class="pillars"><span class="pill p-read">LEARN</span><span class="pill p-belong">BELONG</span><span class="pill p-explore">EXPLORE</span><span class="pill p-play">MOVE</span></div>
   <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-go="quote">Request More Information</button><button class="btn ghost" data-go="hub" style="color:#fff">See the Futures Hub</button></div></div>
 </div></div></div>
<div class="marquee" aria-hidden="true"><div class="mq">${Array(2).fill('<span>LEARN</span><b>★</b><span>BELONG</span><b>★</b><span>EXPLORE</span><b>★</b><span>MOVE</span><b>★</b><span>Move Your Body, Grow Your Mind.</span><b>★</b><span>Big Hearts, Bright Futures!</span><b>★</b>').join('')}</div></div>
<section class="band-paper"><div class="wrap">${head('Program options','Where are your children learning?','Choose the path that fits your program. Each one comes with the same curriculum, characters and support.')}
 <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
  ${[['for-centers','Child care centers','booker','Run a signature program in every classroom, with staff training and the Futures Hub.'],['for-home','Home daycares','lumi','A mixed-age program sized for one room, with a Home Educator training path.'],['for-prek','Pre-K and Head Start partners','zuri','Units being mapped to state standards and the Head Start framework, plus family engagement tools for public and partner pre-K classrooms.'],['for-faith','Faith-based centers','bop','A values-forward program centered on kindness, courage, curiosity and helping others.'],['for-employers','Employer child care','booker','Bring a branded program to on-site and partner child care for working families.'],['for-families','Families at home','lumi','The Family Welcome Kit, books, episodes and weekly activities to do together.']].map(o=>`<button class="card" data-go="${o[0]}" style="font:inherit;color:inherit;text-align:left;cursor:pointer;border-top:5px solid var(--${o[2]})"><h3>${o[1]}</h3><p class="small">${o[3]}</p><span class="rl">Learn more</span></button>`).join('')}
 </div></div></section>
<section class="ffhr" data-signature id="ff-rooms">
 <div class="wrap ffhr-head">${head('Meet the Futures Friends','Four friends. Four values children practice every day.','Children meet the friends in stories and planned short episodes, find them in the classroom, read their books and bring them home. That repetition gives young children many chances to practice.')}</div>
 <div class="ffhr-pin"><div class="ffhr-track">${KEYS.map(ffhRoom).join('')}</div>
  <div class="ffhr-dots" aria-hidden="true">${KEYS.map(k=>`<i style="--c:var(--${k})"></i>`).join('')}</div></div>
</section>
${ffhLoop()}
${ffhMap()}
<section class="band-paper ffhk" data-signature id="ff-family"><div class="wrap ffhk-grid">
 <div class="ffhk-copy">${head('For families','The family experience','Families see what their child learned, ate and tried each day, with one simple thing to do together each week.')}
  ${ck(['Today\'s lesson and the question to ask at dinner','What their child ate, and new foods tried','Milestones observed in the classroom','A weekly take-home activity','Messages from the teacher','Planned episodes to watch together'])}
  <div><button class="btn navy" data-go="family-guide">See the Family App guide</button></div></div>
 ${ffhPhone()}
</div></section>
${cta('Learn more about how Futures Friends can help your program','Walk through the curriculum, the books, the menus and the Futures Hub in a 30-minute demo.','Request Information')}`;

// ---- home styles (injected once; uses the site tokens so light and dark both work)
const FFH_CSS = `
#ff-rooms,#ff-loop,#ff-map,#ff-family{--ffh:66px}
/* H: rooms */
.ffhr{padding:0;overflow-x:clip;--ffmix:76%}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]) .ffhr{--ffmix:58%}}
:root[data-theme="dark"] .ffhr{--ffmix:58%}
.ffhr-head{padding-block:clamp(44px,6vw,80px) 0}
.ffhr-head .head{margin-bottom:clamp(20px,3vw,32px)}
.ffhr-track{display:grid}
.ffhr-room{position:relative;display:grid;grid-template-columns:minmax(0,1.05fr) minmax(0,1fr);grid-template-areas:"copy stage";align-items:center;gap:clamp(20px,4vw,56px);padding:clamp(36px,5vw,64px) max(20px,calc((100% - 1180px)/2 + 20px));color:#fff;overflow:hidden;
  background:radial-gradient(120% 90% at 78% 60%,rgba(255,255,255,.18),transparent 60%),color-mix(in srgb,var(--c) var(--ffmix),#0A2B38)}
.ffhr-room::before{content:"";position:absolute;inset:10px;border:2px dashed rgba(255,255,255,.28);border-radius:22px;pointer-events:none}
.ffhr-copy{grid-area:copy;display:grid;gap:12px;align-content:center;position:relative;z-index:2;min-width:0}
.ffhr-top{display:flex;align-items:center;gap:12px}
.ffhr-pill{position:relative;font-family:var(--display);font-weight:600;letter-spacing:.08em;font-size:15px;padding:7px 16px;border-radius:12px;background:rgba(255,255,255,.18)}
.ffhr-pill::after{content:"";position:absolute;inset:3px;border:1.5px dashed rgba(255,255,255,.7);border-radius:9px}
.ffhr-no{font-size:13px;opacity:.85;font-weight:600}
.ffhr-value{font-family:var(--display);font-weight:700;font-size:calc(var(--f) * clamp(58px,6.6vw,120px));line-height:.95;letter-spacing:-.01em;margin:4px 0 2px;text-shadow:0 6px 0 rgba(0,0,0,.12);white-space:nowrap}
.ffhr-value .ffhr-ch{display:inline-block}
.ffhr-name{font-family:var(--display);font-size:clamp(18px,1.7vw,23px);font-weight:600}
.ffhr-d{font-size:16px;max-width:46ch;opacity:.95}
.ffhr-meta{display:flex;flex-wrap:wrap;gap:10px;margin:4px 0 0}
.ffhr-meta div{background:rgba(255,255,255,.14);border-radius:14px;padding:8px 14px;display:grid}
.ffhr-meta dt{font-size:11.5px;font-weight:600;opacity:.8}
.ffhr-meta dd{margin:0;font-weight:700;font-size:14.5px}
.ffhr-meta cite{font-style:normal}
.ffhr-motto{font-family:var(--display);font-size:clamp(17px,1.5vw,20px);color:#FFE3A1}
.ffhr-3d[hidden]{display:none}
.ffhr-acts{display:flex;gap:10px;flex-wrap:wrap;margin-top:4px}
.ffhr-more{background:#fff;color:#0A2B38}
.ffhr-stage{grid-area:stage;position:relative;height:clamp(340px,44vw,560px);display:grid;place-items:end center;min-width:0}
.ffhr-shape{position:absolute;inset:4% 2% 0;z-index:1;display:grid;place-items:center}
.ffhr-shape svg{width:auto;height:100%;max-width:100%;overflow:visible}
.ffhr-shape path{fill:rgba(255,255,255,.17);stroke:rgba(255,255,255,.4);stroke-width:1.2;stroke-dasharray:4 5}
.ffhr-cut{position:absolute;left:0;right:0;bottom:0;margin:0 auto;z-index:2;height:94%;width:auto;max-width:100%;object-fit:contain;filter:drop-shadow(0 22px 26px rgba(0,0,0,.3));user-select:none;-webkit-user-drag:none;touch-action:pan-y}
.ffhr-motif{position:absolute;inset:0;z-index:3;pointer-events:none;color:#FFD66B}
.ffhr-motif i{position:absolute;display:grid;place-items:center;filter:drop-shadow(0 6px 8px rgba(0,0,0,.18))}
.ffhr-motif svg{width:100%;height:100%}
.ffhr-motif b{font-family:var(--display);font-weight:700;color:#fff;font-size:clamp(28px,3vw,46px);line-height:1}
.ffhr-motif .m0{left:2%;top:10%;width:clamp(48px,5vw,76px);height:clamp(48px,5vw,76px)}
.ffhr-motif .m1{right:4%;top:4%;width:clamp(30px,3vw,46px);height:clamp(30px,3vw,46px)}
.ffhr-motif .m2{right:2%;bottom:20%;width:clamp(40px,4vw,62px);height:clamp(40px,4vw,62px)}
.ffhr-dots{display:none}
.ffhr.is-h .ffhr-pin{height:calc(100svh - var(--ffh));overflow:hidden;position:relative}
.ffhr.is-h .ffhr-track{display:flex;width:400%;height:100%;will-change:transform}
.ffhr.is-h .ffhr-room{flex:none;width:25%;height:100%;padding:clamp(28px,4vh,56px) max(28px,calc((100vw - 1180px)/2 + 20px)) clamp(44px,6vh,64px)}
.ffhr.is-h .ffhr-stage{height:min(78%,600px)}
.ffhr.is-h .ffhr-dots{display:flex;gap:10px;position:absolute;left:50%;bottom:22px;transform:translateX(-50%);z-index:5}
.ffhr-dots i{width:10px;height:10px;border-radius:99px;background:rgba(255,255,255,.45);transition:width .4s cubic-bezier(.34,1.56,.64,1),background .3s}
.ffhr-dots i.on{width:34px;background:#fff}
@media (max-width:819.98px){
  .ffhr-room{grid-template-columns:1fr;grid-template-areas:"stage" "copy";gap:6px;padding:26px 20px 34px}
  .ffhr-stage{height:300px}
  .ffhr-value{font-size:calc(var(--f) * 14vw)}
  .ffhr-d{font-size:15px}
  .ffhr-meta{gap:8px}.ffhr-meta div{padding:6px 10px}.ffhr-meta dd{font-size:13px}
}
/* I: learning loop */
.ffhl{padding:0}
.ffhl-pin{padding-block:clamp(44px,6vw,72px) 24px}
.ffhl-grid{display:grid;grid-template-columns:minmax(0,.9fr) minmax(0,1.2fr);gap:clamp(24px,4vw,56px);align-items:center}
.ffhl-copy .head{margin-bottom:14px}
.ffhl-list{list-style:none;margin:0;padding:0;display:grid;gap:7px;position:relative}
.ffhl-step{display:grid;grid-template-columns:38px 1fr;gap:12px;align-items:center;padding:8px 14px 8px 8px;border-radius:14px;background:color-mix(in srgb,var(--c) 22%,transparent);border:1.5px solid var(--c);transition:background .45s,border-color .45s}
.ffhl-step i{font-style:normal;width:38px;height:38px;border-radius:50%;display:grid;place-items:center;font-family:var(--display);font-weight:600;font-size:17px;background:var(--c);color:#fff;transition:background .45s,transform .45s cubic-bezier(.34,1.56,.64,1)}
.ffhl-step div{display:grid;line-height:1.3}
.ffhl-step b{font-family:var(--display);font-size:18px;font-weight:600}
.ffhl-step span{font-size:13px;color:#C6D7DD}
.ffhl.is-anim .ffhl-step:not(.on){background:rgba(255,255,255,.04);border-color:rgba(255,255,255,.12)}
.ffhl.is-anim .ffhl-step:not(.on) i{background:rgba(255,255,255,.14)}
.ffhl.is-anim .ffhl-step.on i{transform:scale(1.08)}
.ffhl-rail{display:none}
.ffhl-ring{position:relative;width:min(100%,680px,calc((100svh - var(--ffh) - 70px) * 1.2));justify-self:center}
.ffhl-ring svg{width:100%;height:auto;display:block;overflow:visible}
.ffhl-track{fill:none;stroke:rgba(255,255,255,.14);stroke-width:4;stroke-dasharray:2 10;stroke-linecap:round}
.ffhl-draw{fill:none;stroke:var(--gold);stroke-width:6;stroke-linecap:round}
.ffhl-node circle{fill:var(--c);stroke:#fff;stroke-width:3;transition:fill .45s,stroke .45s}
.ffhl-node text{fill:#fff;font-family:var(--display);font-weight:600;font-size:20px;text-anchor:middle}
.ffhl-lab{fill:#fff;font-family:var(--display);font-weight:600;font-size:21px;transition:opacity .45s}
.ffhl.is-anim .ffhl-node:not(.on) circle{fill:var(--navy2);stroke:rgba(255,255,255,.3)}
.ffhl.is-anim .ffhl-node:not(.on) text{opacity:.6}
.ffhl.is-anim .ffhl-lab:not(.on){opacity:.45}
.ffhl-bop image{filter:drop-shadow(0 6px 6px rgba(0,0,0,.35))}
.ffhl-center{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:40%;text-align:center;display:grid;gap:6px;pointer-events:none}
.ffhl-center b{font-family:var(--display);font-weight:600;font-size:clamp(22px,2.4vw,34px);line-height:1.05;color:var(--cc,#fff)}
.ffhl-center span{font-size:14px;color:#C6D7DD;line-height:1.4}
.ffhl-stats{padding-bottom:clamp(44px,6vw,72px)}
@media (max-width:819.98px){
  .ffhl-grid{grid-template-columns:1fr}
  .ffhl-ring{display:none}
  .ffhl-list{padding-left:48px}
  .ffhl-rail{display:block;position:absolute;left:0;top:0;bottom:0;width:44px}
  .ffhl-rail .ln{position:absolute;left:20px;top:20px;bottom:20px;width:4px;border-radius:4px;background:rgba(255,255,255,.14)}
  .ffhl-rail .ln i{position:absolute;inset:0;border-radius:4px;background:var(--gold);transform-origin:50% 0}
  .ffhl-rail img{position:absolute;left:2px;top:0;width:40px;height:auto;filter:drop-shadow(0 4px 5px rgba(0,0,0,.35))}
}
/* J: explorable classroom */
.ffhm-grid{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(0,1fr);gap:clamp(24px,4vw,48px);align-items:center}
.ffhm-map{display:grid;gap:8px;min-width:0}
.ffhm-frame{position:relative;aspect-ratio:3/2;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);background:var(--paper2);box-shadow:0 18px 40px rgba(10,43,56,.14);isolation:isolate}
.ffhm-img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;transform-origin:50% 50%;border:0;border-radius:0;will-change:transform}
.ffhm-spot{position:absolute;z-index:2;left:calc(var(--x) * 100%);top:calc(var(--y) * 100%);transform:translate(-50%,-50%);display:inline-flex;align-items:center;gap:7px;padding:6px 12px 6px 7px;border-radius:999px;border:2px solid #fff;background:var(--c);color:#fff;font:600 13px/1.1 var(--display);cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.28);transition:opacity .3s,transform .3s cubic-bezier(.34,1.56,.64,1);white-space:nowrap}
.ffhm-spot:hover{transform:translate(-50%,-50%) scale(1.08)}
.ffhm-spot i{width:12px;height:12px;border-radius:50%;background:#fff;position:relative;flex:none}
@media (prefers-reduced-motion: no-preference){.ffhm-spot i::after{content:"";position:absolute;inset:-4px;border-radius:50%;border:2px solid #fff;animation:ffmPulse 2.2s ease-out infinite}}
@keyframes ffmPulse{0%{transform:scale(.6);opacity:1}100%{transform:scale(2);opacity:0}}
.ffhm.is-zoom .ffhm-spot{opacity:0;pointer-events:none}
.ffhm.is-zoom .ffhm-spot:focus-visible{opacity:1}
.ffhm-pop{position:absolute;z-index:3;left:2%;bottom:0;height:56%;max-width:96%;display:flex;align-items:flex-end;gap:6px;pointer-events:none;visibility:hidden}
.ffhm.is-zoom .ffhm-pop{visibility:visible}
.ffhm-cut{height:100%;width:auto;flex:none;border:0;border-radius:0;filter:drop-shadow(0 10px 12px rgba(0,0,0,.35))}
.ffhm-say{align-self:center;background:var(--paper);color:var(--ink);border:2px solid var(--c,var(--gold));border-radius:18px;padding:10px 14px;font-size:14.5px;line-height:1.45;max-width:320px;box-shadow:0 10px 24px rgba(0,0,0,.2)}
.ffhm-back{position:absolute;z-index:4;top:10px;right:10px;padding:7px 14px;font-size:13px}
.ffhm-cap{margin:0}
.ffhm-back[hidden]{display:none}
@media (max-width:819.98px){.ffhm-grid{grid-template-columns:1fr}}
@media (max-width:560px){.ffhm-spot{font-size:11px;padding:4px 8px 4px 5px;gap:5px}.ffhm-spot i{width:9px;height:9px}.ffhm-say{font-size:12.5px;padding:7px 10px;max-width:220px}.ffhm-pop{height:60%}}
/* K: family app notification stack */
.ffhk-grid{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,380px);gap:clamp(24px,5vw,72px);align-items:center}
.ffhk-copy .head{margin-bottom:6px}
.ffhk-copy{display:grid;gap:14px}
.ffhk-phone{width:min(380px,100%);justify-self:center;border-radius:46px;padding:11px;background:#0A2B38;box-shadow:0 30px 60px rgba(10,43,56,.3),inset 0 0 0 2px rgba(255,255,255,.1)}
.ffhk-screen{position:relative;border-radius:36px;overflow:hidden;padding:44px 12px 16px;display:grid;gap:10px;background:#0A2B38;isolation:isolate}
.ffhk-wall{position:absolute;inset:-20px;z-index:-1;background:linear-gradient(180deg,rgba(10,43,56,.45),rgba(10,43,56,.85)),url(img/hero.jpg) 50% 72%/cover;filter:blur(7px) saturate(1.2)}
.ffhk-screen::before{content:"";position:absolute;top:11px;left:50%;transform:translateX(-50%);width:92px;height:24px;border-radius:14px;background:#05161d}
.ffhk-clock{text-align:center;color:#fff;display:grid;text-shadow:0 2px 10px rgba(0,0,0,.35);margin-bottom:4px}
.ffhk-clock b{font-family:var(--display);font-weight:600;font-size:58px;line-height:1}
.ffhk-clock span{font-size:13px;font-weight:600}
.ffhk-stack{display:grid;gap:8px}
.ffhk-n{display:grid;grid-template-columns:34px minmax(0,1fr);gap:10px;align-items:start;padding:10px 12px;border-radius:18px;background:color-mix(in srgb,var(--paper) 92%,transparent);backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);color:var(--ink);box-shadow:0 8px 18px rgba(0,0,0,.18);border-left:5px solid var(--c)}
.ffhk-n img{width:34px;height:34px;border-radius:9px;object-fit:contain}
.ffhk-n > div{display:grid;gap:1px;min-width:0}
.ffhk-h{display:flex;justify-content:space-between;gap:8px;font-size:11.5px;color:var(--muted);font-weight:600}
.ffhk-n b{font-size:14px;line-height:1.3}
.ffhk-n p{font-size:12.5px;line-height:1.4;color:var(--muted)}
.ffhk-sample{justify-self:center;font-size:11px;font-weight:700;color:#fff;background:rgba(0,0,0,.35);padding:2px 10px;border-radius:99px}
@media (max-width:819.98px){.ffhk-grid{grid-template-columns:1fr}}
`;
(function(){ try { if (!document.getElementById('ff-home-css')) { const s = document.createElement('style'); s.id = 'ff-home-css'; s.textContent = FFH_CSS; document.head.appendChild(s); } } catch (e) {} })();

// ---- J: classroom map interactions (delegated, so they survive any re-render; works with or without GSAP)
function ffmSet(sec, k){
  if (!sec) return; k = k || '';
  if (sec.dataset.z === k) return; sec.dataset.z = k; sec._t = Date.now();
  const img = sec.querySelector('.ffhm-img'), pop = sec.querySelector('.ffhm-pop'), cut = sec.querySelector('.ffhm-cut'), say = sec.querySelector('.ffhm-say'), back = sec.querySelector('.ffhm-back');
  const G = window.gsap, anim = !!G && !(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
  sec.classList.toggle('is-zoom', !!k);
  sec.querySelectorAll('.ffhm-spot').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.z === k)));
  back.hidden = !k;
  let tr = { scale: 1, xPercent: 0, yPercent: 0 };
  if (k) {
    const z = FFH_ZONES[k], [x0, y0, w, h] = z.r, s = Math.min(1 / w, 1 / h, 2.5) * .98, cl = t => Math.max(.5 - s / 2, Math.min(s / 2 - .5, t));
    tr = { scale: s, xPercent: 100 * cl(s * (.5 - (x0 + w / 2))), yPercent: 100 * cl(s * (.5 - (y0 + h / 2))) };
    cut.src = FFcut(k); pop.style.setProperty('--c', `var(--${k})`);
    say.innerHTML = `<b style="color:var(--${k})">${CH[k].n}:</b> ${esc(z.say)}`;
  } else say.textContent = '';
  if (anim) {
    G.to(img, { ...tr, duration: .9, ease: 'power3.inOut', overwrite: true });
    if (k) {
      G.fromTo(cut, { yPercent: 70, scale: .6, rotation: -10, opacity: 0 }, { yPercent: 0, scale: 1, rotation: 0, opacity: 1, duration: .75, ease: 'back.out(2)', delay: .25, overwrite: true });
      G.fromTo(say, { scale: .5, opacity: 0, transformOrigin: '0% 100%' }, { scale: 1, opacity: 1, duration: .55, ease: 'back.out(2)', delay: .45, overwrite: true });
    }
  } else if (G) G.set(img, tr);
  else img.style.transform = `translate(${tr.xPercent}%,${tr.yPercent}%) scale(${tr.scale})`;
}
let ffmSkip = false;
(function(){
  const hoverOK = () => window.matchMedia && matchMedia('(hover: hover) and (pointer: fine)').matches;
  document.addEventListener('pointerover', e => { if (!hoverOK()) return; const s = e.target.closest && e.target.closest('.ffhm-spot'); if (s) ffmSet(s.closest('.ffhm'), s.dataset.z); });
  document.addEventListener('pointerout', e => { if (!hoverOK()) return; const f = e.target.closest && e.target.closest('.ffhm-frame'); if (!f || (e.relatedTarget && f.contains(e.relatedTarget))) return; if (f.contains(document.activeElement) && document.activeElement.classList.contains('ffhm-spot') && document.activeElement.matches(':focus-visible')) return; ffmSet(f.closest('.ffhm'), ''); });
  document.addEventListener('focusin', e => { if (ffmSkip) return; const s = e.target.closest && e.target.closest('.ffhm-spot'); if (s) ffmSet(s.closest('.ffhm'), s.dataset.z); });
  document.addEventListener('click', e => {
    const t = e.target; if (!t.closest) return;
    const s = t.closest('.ffhm-spot'); if (s) { ffmSet(s.closest('.ffhm'), s.dataset.z); return; }
    const b = t.closest('.ffhm-back'); if (b) { const sec = b.closest('.ffhm'), sp = sec.querySelector(`.ffhm-spot[data-z="${sec.dataset.z}"]`); ffmSet(sec, ''); if (sp) { ffmSkip = true; sp.focus({ preventScroll: true }); ffmSkip = false; } return; }
    const f = t.closest('.ffhm-frame'); if (f && f.closest('.ffhm').dataset.z && Date.now() - (f.closest('.ffhm')._t || 0) > 500) ffmSet(f.closest('.ffhm'), '');
    const d = t.closest('[data-ff3d]'); if (d) { const k = d.dataset.ff3d, src = window.FF_GLB && window.FF_GLB[k]; if (typeof window.FFopen3D === 'function') window.FFopen3D(k, src); else document.dispatchEvent(new CustomEvent('ff:open3d', { detail: { key: k, src } })); }
  });
  document.addEventListener('keydown', e => { if (e.key !== 'Escape' || !e.target.closest) return; const sec = e.target.closest('.ffhm'); if (sec && sec.dataset.z) ffmSet(sec, ''); });
})();

// ---- H, I, K choreography (runs after every render via the motion.js hook contract)
let ffhMM = null, ffhExtra = [];
function ffhCleanup(){ if (ffhMM) { try { ffhMM.revert(); } catch (e) {} ffhMM = null; } ffhExtra.forEach(f => { try { f(); } catch (e) {} }); ffhExtra = []; }
window.FFhooks = window.FFhooks || [];
window.FFhooks.push(function(v, root, ok){
  ffhCleanup();
  if (v !== 'home' || !root) return;
  root.querySelectorAll('[data-ff3d]').forEach(b => { b.hidden = !(window.FF_GLB && window.FF_GLB[b.dataset.ff3d]); });
  const G = window.gsap, STg = window.ScrollTrigger;
  if (!ok || !G || !STg) return;
  const plug = [STg, window.SplitText, window.DrawSVGPlugin, window.MotionPathPlugin, window.Draggable].filter(Boolean);
  G.registerPlugin(...plug);
  const bar = document.querySelector('header.bar'), hh = bar ? Math.round(bar.getBoundingClientRect().height) : 66;
  ['#ff-rooms', '#ff-loop'].forEach(s => { const el = root.querySelector(s); if (el) el.style.setProperty('--ffh', hh + 'px'); });
  const rs = root.querySelector('#ff-rooms:not([data-interactive])'), L = root.querySelector('#ff-loop:not([data-interactive])'), K = root.querySelector('#ff-family');

  // K: family notifications drop in as a stack, one time
  if (K) {
    const ns = K.querySelectorAll('.ffhk-n');
    G.set(ns, { y: -70, scale: .9, opacity: 0 });
    G.set(K.querySelector('.ffhk-clock'), { opacity: 0, y: -12 });
    STg.create({ trigger: K.querySelector('.ffhk-phone'), start: 'top 78%', once: true, onEnter: () => {
      G.to(K.querySelector('.ffhk-clock'), { opacity: 1, y: 0, duration: .6, ease: 'back.out(1.6)' });
      G.to(ns, { y: 0, scale: 1, opacity: 1, duration: .8, ease: 'back.out(1.6)', stagger: .2, delay: .2 });
    } });
  }

  // floating motifs bob gently everywhere
  if (rs) rs.querySelectorAll('.ffhr-motif i').forEach((m, i) => { const tw = G.to(m, { y: i % 2 ? 12 : -12, rotation: i % 2 ? 8 : -8, duration: 2.4 + (i % 3) * .5, ease: 'sine.inOut', yoyo: true, repeat: -1 }); ffhExtra.push(() => tw.kill()); });

  ffhMM = G.matchMedia();
  ffhMM.add({ desk: '(min-width: 820px)', mob: '(max-width: 819.98px)' }, ctx => {
    const desk = ctx.conditions.desk, undo = [];
    // ---------- H: rooms
    if (rs) {
      const pin = rs.querySelector('.ffhr-pin'), track = rs.querySelector('.ffhr-track'), rooms = [...rs.querySelectorAll('.ffhr-room')], dots = [...rs.querySelectorAll('.ffhr-dots i')];
      const splits = rooms.map(r => window.SplitText ? new SplitText(r.querySelector('.ffhr-value'), { type: 'chars', charsClass: 'ffhr-ch' }) : null);
      undo.push(() => splits.forEach(s => s && s.revert()));
      const letters = (r, i, st) => { const s = splits[i]; if (!s) return; G.from(s.chars, { yPercent: 55, scale: .35, transformOrigin: '50% 100%', rotation: j => (j % 2 ? 14 : -14), opacity: 0, duration: .8, ease: 'back.out(2.2)', stagger: .045, scrollTrigger: st }); };
      if (desk) {
        rs.classList.add('is-h'); undo.push(() => rs.classList.remove('is-h'));
        const dist = () => Math.max(0, track.scrollWidth - pin.clientWidth);
        let cur = -1; const setDot = n => { if (n === cur) return; cur = n; dots.forEach((d, j) => d.classList.toggle('on', j === n)); };
        setDot(0);
        const hz = G.to(track, { x: () => -dist(), ease: 'none', scrollTrigger: { trigger: pin, pin: true, start: () => `top top+=${hh}`, end: () => '+=' + dist(), scrub: .8, invalidateOnRefresh: true, refreshPriority: 2, anticipatePin: 1, onUpdate: s => setDot(Math.round(s.progress * (rooms.length - 1))) } });
        rooms.forEach((r, i) => {
          const sc = { trigger: r, containerAnimation: hz, start: 'left right', end: 'right left', scrub: true };
          G.fromTo(r.querySelector('.ffhr-shape'), { x: -120, rotation: -10 }, { x: 120, rotation: 10, ease: 'none', scrollTrigger: sc });
          G.fromTo(r.querySelector('.ffhr-cut'), { x: 70 }, { x: -70, ease: 'none', scrollTrigger: { ...sc } });
          G.fromTo(r.querySelector('.ffhr-motif'), { x: 240 }, { x: -240, ease: 'none', scrollTrigger: { ...sc } });
          G.fromTo(r.querySelector('.ffhr-copy'), { x: 60 }, { x: -60, ease: 'none', scrollTrigger: { ...sc } });
          if (i === 0) letters(r, i, { trigger: pin, start: 'top 70%', toggleActions: 'play none none none' });
          else letters(r, i, { trigger: r, containerAnimation: hz, start: 'left 62%', toggleActions: 'play none none reverse' });
        });
      } else {
        rooms.forEach((r, i) => {
          const st = r.querySelector('.ffhr-stage'), cut = r.querySelector('.ffhr-cut');
          G.from(st, { x: i % 2 ? 70 : -70, rotation: i % 2 ? 5 : -5, opacity: 0, duration: .9, ease: 'back.out(1.5)', scrollTrigger: { trigger: r, start: 'top 82%', once: true } });
          letters(r, i, { trigger: r.querySelector('.ffhr-value'), start: 'top 88%', once: true });
          if (window.Draggable) {
            const d = Draggable.create(cut, { type: 'x', bounds: { minX: -90, maxX: 90 }, edgeResistance: .6,
              onDrag() { G.set(this.target, { rotation: this.x / 9 }); },
              onRelease() { G.to(this.target, { x: 0, rotation: 0, duration: 1, ease: 'elastic.out(1,.4)' }); } })[0];
            undo.push(() => { d.kill(); G.set(cut, { clearProps: 'transform' }); });
          }
        });
      }
    }
    // ---------- I: learning loop
    if (L) {
      L.classList.add('is-anim'); undo.push(() => L.classList.remove('is-anim'));
      const steps = [...L.querySelectorAll('.ffhl-step')], nodes = [...L.querySelectorAll('.ffhl-node')], labs = [...L.querySelectorAll('.ffhl-lab')];
      const cb = L.querySelector('.ffhl-center b'), cs = L.querySelector('.ffhl-center span'), C0 = [cb.textContent, cs.textContent];
      let lit = -2, done = false;
      const light = (n, fin) => {
        if (n === lit && fin === done) return;
        steps.forEach((s, i) => s.classList.toggle('on', i <= n));
        nodes.forEach((g, i) => { const on = i <= n; if (on && !g.classList.contains('on')) G.fromTo(g.querySelector('circle'), { scale: .6 }, { scale: 1, duration: .6, ease: 'back.out(3)', transformOrigin: '50% 50%' }); g.classList.toggle('on', on); });
        labs.forEach((t, i) => t.classList.toggle('on', i <= n));
        if (desk) {
          if (fin) { cb.textContent = 'And again tomorrow'; cs.textContent = 'Every day loops back to a new story.'; L.style.setProperty('--cc', 'var(--gold)'); }
          else if (n < 0) { cb.textContent = C0[0]; cs.textContent = C0[1]; L.style.setProperty('--cc', '#fff'); }
          else if (n !== lit || done) { cb.textContent = FFH_LOOP[n][0]; cs.textContent = FFH_LOOP[n][1]; L.style.setProperty('--cc', `var(--${FFH_LOOP[n][2]})`); G.fromTo([cb, cs], { y: 14, opacity: 0 }, { y: 0, opacity: 1, duration: .45, ease: 'back.out(2)', stagger: .06, overwrite: true }); }
          if (fin && !done) G.fromTo(nodes[0].querySelector('circle'), { scale: 1 }, { scale: 1.3, duration: .35, yoyo: true, repeat: 1, ease: 'sine.inOut', transformOrigin: '50% 50%' });
        }
        lit = n; done = fin;
      };
      undo.push(() => { steps.concat(nodes, labs).forEach(e => e.classList.remove('on')); cb.textContent = C0[0]; cs.textContent = C0[1]; L.style.removeProperty('--cc'); });
      if (desk) {
        const path = L.querySelector('#ffhl-path'), bop = L.querySelector('.ffhl-bop');
        light(-1, false);
        const tl = G.timeline({ defaults: { ease: 'none' },
          scrollTrigger: { trigger: L.querySelector('.ffhl-pin'), pin: true, start: () => `top top+=${hh}`, end: '+=1300', scrub: .8, refreshPriority: 1, anticipatePin: 1 },
          onUpdate() { const q = Math.min(1, this.time()); light(q < .01 ? -1 : Math.min(5, Math.floor(q * 6 + .03)), q > .995); } });
        if (window.DrawSVGPlugin) tl.fromTo(path, { drawSVG: '0%' }, { drawSVG: '100%', duration: 1 }, 0);
        if (window.MotionPathPlugin) tl.to(bop, { motionPath: { path, align: path, alignOrigin: [.5, .5] }, duration: 1 }, 0);
        tl.to({}, { duration: .06 });
      } else {
        const list = L.querySelector('.ffhl-list'), fill = L.querySelector('.ffhl-rail .ln i'), bimg = L.querySelector('.ffhl-rail img');
        light(-1, false);
        const travel = () => Math.max(0, list.offsetHeight - bimg.offsetHeight);
        const tl = G.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: list, start: 'top 70%', end: 'bottom 45%', scrub: .6, invalidateOnRefresh: true },
          onUpdate() { const y = G.getProperty(bimg, 'y') + bimg.offsetHeight * .6; let n = -1; steps.forEach((s, i) => { if (s.offsetTop + s.offsetHeight * .35 <= y) n = i; }); light(n, false); } });
        tl.fromTo(fill, { scaleY: 0 }, { scaleY: 1 }, 0).fromTo(bimg, { y: 0 }, { y: travel }, 0);
      }
    }
    return () => undo.forEach(f => { try { f(); } catch (e) {} });
  });
});

// ---------------------------------------------------------------- IMPACT
// Learning Steps claim, computed from learning-steps-summary.js (public counts only; the steps are private, IP lockdown 2026-10-07) so the site never says more than the crosswalk shows.
function stepsClaim(){ const S=window.FFSteps; if(!S||!S.summary) return 'Teacher-observed Learning Steps for each age band, from twos to pre-K. Not a test or a screening.';
  const t=S.summary, b=t.by_standard; return `${t.total} teacher-observed Learning Steps for ages 2 to 5. Each one cites its source (CDC milestones or the Missouri, Kansas or Head Start standards). ${b.kels.mapped} are matched to Kansas standards, ${b.mels.mapped} to Missouri and ${b.elof.mapped} to Head Start; the rest are marked not matched. A draft awaiting expert review, and never a test or a score.`; }
V.impact = () => phero('Impact','Why the early years matter, and how we measure them','Early learning is among the most studied topics in education. We build on that research, and we plan to report our own results in plain numbers that a parent or a funder can check.',{anchors:[['why-early','The research'],['measure','What we measure'],['flagship','Flagship center']]}) + `
<section id="why-early" class="band-paper"><div class="wrap">${head('The research','What the research says about the first five years','')}
 <div class="grid g3">
  ${card('A brain built early','The Harvard Center on the Developing Child describes the early years as the period when the foundations of brain architecture are built, through back-and-forth interaction with caring adults.','Brain architecture','booker')}
  ${card('It pays back','Economist James Heckman\'s research on two high-quality birth-to-five programs for disadvantaged children estimated a 13% annual return on investment through better education, health and earnings outcomes.','13% annual return','zuri')}
  ${card('Play is how they learn','The American Academy of Pediatrics describes play as essential to building problem-solving, self-control and social skills in young children.','The power of play','bop')}
 </div><p class="note" style="margin-top:12px">Sources: Harvard Center on the Developing Child, Brain Architecture; University of Chicago, Heckman (2016); American Academy of Pediatrics, The Power of Play (2018).</p></div></section>
<section id="measure"><div class="wrap">${head('What we measure','Progress you can see, not screen minutes','Futures Friends is designed to track child milestones, family engagement and program quality.')}
 <div class="grid g4">
  ${card('Learning Steps',stepsClaim(),'Children','booker')}
  ${card('Family learning notes','Families see what teachers saw, what comes next and an idea to try at home, in words. No scores, percentages or rankings, and no comparisons between children.','Families','zuri')}
  ${card('Family engagement','Take-home activities completed, family events attended and app activity.','Families','lumi')}
  ${card('Program quality','Ratio compliance, staff training, meals planned to the CACFP pattern and enrollment.','Programs','bop')}
 </div></div></section>
<section id="flagship" class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:center">
 <div style="display:grid;gap:12px">${head('Flagship center','Futures Learning Center, Independence, Missouri','The program runs first at our flagship center in Independence, Missouri. Every lesson, recipe and Hub feature is meant to be tested there before it reaches partner programs.')}
  ${ck(['Piloting in Independence, Missouri; call for current ages and hours','Full curriculum, Eat the Rainbow menus and the Futures Hub','Term reports on milestones and family engagement (planned)'])}</div>
 ${window.FFArt ? window.FFArt.photo('alphabet-rug',{line:'The carpet area at our flagship center: the alphabet rug, the reading shelf and the toy shelves.'}) : ''}</div></div></section>
${cta('See the program in action','Visit the flagship center or book a live walkthrough.','Request Information')}`;

// ---------------------------------------------------------------- READINESS (Learning Acceleration)
// The Learning Steps band: counts and sources come from learning-steps-summary.js (generated from the fetched standards; counts only).
function learningStepsBand(){ const S=window.FFSteps; if(!S||!S.summary) return '';
  const t=S.summary, B=S.bands, L=x=>`${x.mapped} of ${x.mapped+x.unmapped}`;
  return `<section id="steps" class="band-paper"><div class="wrap">${head('Learning Steps','What teachers look for, from twos to pre-K',`${t.total} observable Learning Steps across seven areas of development. Each cites where it comes from, and each is checked against the official Missouri, Kansas and Head Start documents.`)}
 <div class="tw"><table><tr><th>Age band</th><th>Learning Steps</th><th>Missouri (MELS 2021)</th><th>Kansas (KELS 2024)</th><th>Head Start (ELOF 2015)</th></tr>
  ${B.map(b=>{ const r=t.by_band_standard[b.key]; return `<tr><td>${esc(b.label)} <span class="small muted">${esc(b.ages)}</span></td><td>${t.by_band[b.key]}</td><td>${L(r.mels)} matched</td><td>${L(r.kels)} matched</td><td>${L(r.elof)} matched</td></tr>`; }).join('')}</table></div>
 <div class="grid g3" style="margin-top:16px">
  ${card('Sources on every step','Each step quotes its source: a CDC "Learn the Signs. Act Early." milestone, a Missouri example or a Kansas or Head Start indicator, checked word for word against the official documents.','Sources','booker')}
  ${card('Honest matching','Only codes found in the official documents are used. Where no standard truly matches, the step says "not matched" rather than guessing. Head Start has no separate arts or social studies goals; Missouri has no social studies domain.','Standards','zuri')}
  ${card('Not a test or screening','Learning Steps describe what children do in play. They are never used to label, rank or compare children, or to decide enrollment. If a family has a question, we point them to their doctor, Missouri First Steps or Kansas tiny-k.','Families','lumi')}
 </div><p class="note" style="margin-top:12px">Draft written from the cited documents and awaiting review by an early-childhood specialist. Sources: CDC Learn the Signs. Act Early. (2022 milestones); Missouri Early Learning Standards (DESE, 2021); Kansas Early Learning Standards (KSDE, 2024); Head Start Early Learning Outcomes Framework (2015). Accessed October 2026.</p></div></section>`; }
V.readiness = () => phero('School readiness','How Futures Friends supports every child','Adaptive software guesses what a child needs from clicks. Here the teacher watches the child, writes down what she saw and picks the next step, and the family gets the same note.',{anchors:[['loop','The learning loop'],['adapt','Observe and adapt'],['steps','Learning Steps'],['support','Supports'],['stars','Friendship Stars']]}) + `
<section id="loop" class="band-paper"><div class="wrap">${head('The learning loop','Six steps, every day','')}
 <div class="loop">
  <div style="background:var(--watch)"><i>1</i><b>Watch</b><span>A puppet story (episodes later)</span></div><div style="background:var(--booker)"><i>2</i><b>Talk</b><span>Guided discussion</span></div>
  <div style="background:var(--zuri)"><i>3</i><b>Do</b><span>Hands-on activity</span></div><div style="background:var(--bop)"><i>4</i><b>Move</b><span>Physical play</span></div>
  <div style="background:var(--lumi)"><i>5</i><b>Explore</b><span>Learning zones</span></div><div style="background:var(--gold-deep)"><i>6</i><b>Take home</b><span>Family connection</span></div></div></div></section>
<section id="adapt"><div class="wrap">${head('Observe and adapt','The teacher is the adaptive engine','Young children learn through relationships, not drills. The Futures Hub helps teachers see what each child needs next.')}
 <div class="steps">
  ${card('Observe','Teachers note what a child does and says in play and routines, tagged to a Learning Step for the child\'s age band, from twos to pre-K.')}
  ${card('Describe in words','A level is a word (Emerging, Developing or Secure) backed by a dated note. Steps not seen yet show as "not yet observed", never as zero.')}
  ${card('See what comes next','Every Learning Step names the next step to watch for and an idea to try at home.')}
  ${card('Share with family','Families see what we saw, what\'s next and what to try at home. No scores, no rankings, no comparisons.')}
 </div></div></section>
${learningStepsBand()}
<section id="support" class="band-paper"><div class="wrap">${head('Scaffolded supports','Mixed ages, one plan','')}
 <div class="grid g3">
  ${card('Two-year-old and pre-K versions','Every activity has a simpler version for twos and a stretch for pre-K, so mixed groups learn together.','Every age','booker')}
  ${card('English learners','Picture cards, gestures and key words for every Unit 1 day, in English with draft Spanish. Translated family letters are in development.','Language','zuri')}
  ${card('Calm and belonging','Lumi\'s Calm Corner, breathing cards and positive guidance steps help children manage big feelings.','Social-emotional','lumi')}
  ${card('Talk Time with Booker','Every story ends with open questions that invite vocabulary and back-and-forth conversation.','Language','booker')}
  ${card('Futures Include','Classroom adaptations and inclusion supports for children with disabilities and developmental delays.','Special needs','bop')}
  ${card('Movement and meals','Movement every day, the Eat the Rainbow menu and choking-safe food prep.','Daily routines','zuri')}
 </div><div style="margin-top:16px"><button class="btn navy" data-go="include">Explore Futures Include</button></div></div></section>
<section id="stars"><div class="wrap"><div class="grid g2" style="align-items:center">
 <div style="display:grid;gap:12px">${head('Friendship Stars','Stars for effort, not points','No points on a screen. A child earns a star card for something real: trying again, helping a friend, asking a question, finishing the job.')}
  ${ck(['Character achievement cards for each value','Food explorer talk: look, smell, touch and describe new foods (tasting is always the child\'s choice, and nothing is charted)','Value-of-the-week celebration at Friday circle','Families will see each star in the Family App once the Futures Hub is live'])}</div>
 <div class="grid g2">${KEYS.map(k=>`<div class="card" style="background:var(--${k}-s);border-color:transparent;text-align:center"><img src="${img(k)}" alt="" style="height:90px;width:auto;margin:0 auto"><b style="color:color-mix(in srgb,var(--${k}) var(--ci-mix,68%),#000);font-family:var(--display);font-size:18px">${CH[k].v} Star</b><span class="small">"${CH[k].m}"</span></div>`).join('')}</div></div></div></section>
${cta('Want to see the loop in a real room?','Tell us about your classrooms and we will walk you through a sample day of Unit 1.','Request information')}`;

// ---------------------------------------------------------------- CURRICULUM (Courses)
V.curriculum = () => {
  const ages = {twos:['Twos','Ages 2 to 3','Pointing, naming, matching colors, simple songs, and short, hands-on turns. Groups up to 16 with a 1:8 ratio in Missouri.','booker'],threes:['Threes','Ages 3 to 4','Retelling, counting, sorting, asking questions and practicing routines on their own.','zuri'],prek:['Pre-K','Ages 4 to 5','Letters and sounds, counting and patterns, predicting and testing, and kindergarten-readiness skills.','bop']};
  const a = ages[st.age];
  return phero('Curriculum','A planned year of learning for ages 2 to 5','Twelve monthly units with four theme weeks each, in versions for twos, threes and pre-K. Units 1 to 11 are written day by day as drafts and none is approved yet (a summary and one sample day are public, the full plans are for licensed centers); Unit 12 is being written. Add-on units cover summer camp, holidays and Eat the Rainbow meals.',{anchors:[['ages','By age'],['units','Year at a glance'],['addons','Add-on units'],['books','Books and episodes']]}) + `
<section id="ages" class="band-paper"><div class="wrap">${head('By age','One program, three age bands','')}
 <div class="seg" role="group" aria-label="Age band" style="margin-bottom:14px">${Object.entries(ages).map(([k,v])=>`<button data-age="${k}" aria-pressed="${k===st.age}">${v[0]}</button>`).join('')}</div>
 <div class="grid g2" style="align-items:start"><div class="card" style="border-top:5px solid var(--${a[3]})"><span class="small muted">${a[1]}</span><h3>${a[0]}</h3><p>${a[2]}</p>
  ${ck(['Daily lesson plans with the age version marked','Learning Steps for each age band, each with its source','Family learning notes in words, never scores'])}</div>
 <div class="card"><h3>Course listing</h3><div class="tw"><table><tr><th>Domain</th><th>What children practice</th></tr>
  <tr><td>Literacy</td><td>${st.age==='twos'?'Book handling, naming pictures, songs and rhymes':st.age==='threes'?'Retelling three events, name recognition, rhyming':'Letter sounds, first and last names, story sequence'}</td></tr>
  <tr><td>Math and science</td><td>${st.age==='twos'?'Matching, sorting by color, counting to 3':st.age==='threes'?'Counting to 10, sorting, sink or float':'Counting to 20, patterns, predict and test'}</td></tr>
  <tr><td>Social-emotional</td><td>${st.age==='twos'?'Separating from family, naming happy and sad':st.age==='threes'?'Naming 4 feelings, waiting for a turn':'Solving problems with words, helping friends'}</td></tr>
  <tr><td>Physical and nutrition</td><td>${st.age==='twos'?'Handwashing with help, carpet sitting, exploring new foods (tasting optional)':st.age==='threes'?'Handwashing alone, serving with help':'Self-serving, cutting with child scissors'}</td></tr>
  <tr><td>Creative arts</td><td>${st.age==='twos'?'Finger painting, shakers, movement songs':st.age==='threes'?'Collage, pretend play, call-and-response songs':'Self-portraits, story drama, simple instruments'}</td></tr></table></div></div></div></div></section>
<section id="units"><div class="wrap">${head('Year at a glance','Twelve units, forty-eight theme weeks','Units 1 to 11 are written day by day as drafts, none approved yet; Unit 12 is being written. Open a unit to see each week\'s lead friend, planned episode, books and family take-home.')}
 <div style="display:grid;gap:10px">${D.units.map(u=>`<details class="unit" ${u.n===1?'open':''}><summary><span class="tag">Unit ${u.n}</span><b>${esc(u.title)}</b><span class="small muted">${MONTHS[u.n-1]}</span></summary>
  <div class="wk">${u.weeks.map(w=>{const k=charOf(w[2]);return `<div class="card" style="--c:var(--${k})"><div style="display:flex;justify-content:space-between;gap:8px"><span class="small muted">Week ${esc(w[0])}</span><span class="small" style="color:var(--${k});font-weight:600">${esc(w[2])}</span></div><b>${esc(w[1])}</b><span class="small"><b>Episode plan:</b> ${esc(w[3])}</span><span class="small"><b>Books:</b> ${esc(w[4])}</span><span class="small"><b>Take-home:</b> ${esc(w[5])}</span></div>`}).join('')}</div></details>`).join('')}</div></div></section>
<section id="addons" class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start">
 <div>${head('Summer camp','Ten themed weeks','')}<div style="display:flex;flex-wrap:wrap;gap:8px">${D.summer.map((s,i)=>`<span class="tag">${i+1}. ${esc(s)}</span>`).join('')}</div></div>
 <div>${head('Holiday and seasonal units','Fourteen one-week units','')}<div style="display:flex;flex-wrap:wrap;gap:8px">${D.holiday.map(s=>`<span class="tag">${esc(s)}</span>`).join('')}</div></div></div>
 <div class="grid g3" style="margin-top:22px">${card('Eat the Rainbow','36 recipes, menus designed around the CACFP meal pattern and kids-in-the-kitchen activities.','Nutrition','bop')}${card('Futures Include','Inclusion supports, lesson adaptations and early intervention guidance.','Special needs','lumi')}${card('Character development','Kindness, courage, curiosity and independence woven through every week.','Values','zuri')}</div></div></section>
<section id="books"><div class="wrap">${head('Books and episodes','In development, made for little ones','Every unit is planned to pair with a storybook and short episodes from the Futures Friends studio. The four friends\' storybooks are illustrated and free to read in Story Time; printed editions and finished episodes are not yet available.')}
 <div class="grid g2">${D.books.slice(0,4).map(b=>`<div class="card book">${cover(b)}<div style="display:grid;gap:6px"><h3>${esc(b.title)}</h3><p class="small">${esc(b.log)}</p></div></div>`).join('')}</div>
 <div style="margin-top:16px"><button class="btn navy" data-go="friends">See all books and episodes</button></div></div></section>
${cta('Get the curriculum','Licensed programs receive Unit 1 first; see the summary and a sample day, then ask us for access. The printed binder and later units follow as each is finished.')}`;
};

// ---------------------------------------------------------------- PROGRAM OPTIONS (Deployment)
V.options = () => phero('Program options','Pick the version that fits your building','A ten-room center, a home daycare, a church hall: the friends and the curriculum are the same in each. Unit 1 is available now as a draft for your educators; later units, printed materials, training and the Hub are planned. Each option below says what it includes today.') + `
<section class="band-paper"><div class="wrap"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))">
 ${[['Center package','Planned: curriculum, welcome box, carpet, posters, plush, books, cookbook, Level 1 training for all staff, the Futures Hub and coaching. Today: Unit 1 and a launch session.','for-centers','booker'],['Home daycare package','Planned: a one-room version with a mixed-age schedule, a home welcome box and the Home Educator training path. Today: Unit 1 and a launch session.','for-home','lumi'],['Pre-K and Head Start partnership','Units being mapped to Head Start outcomes and state standards, with family engagement tools.','for-prek','zuri'],['Classroom kit only','Opening a new room? Add a classroom set: storybooks, plush, posters and zone signs.','store','bop'],['Futures Hub only','For programs that want the office side first: menus, meal counts, ratio planning and training records, without the curriculum.','hub','booker'],['For families','The free Futures at Home library now; the Family Welcome Kit and books later. For families using any child care provider.','for-families','lumi']].map(o=>`<div class="card" style="border-top:5px solid var(--${o[3]})"><h3>${o[0]}</h3><p class="small">${o[1]}</p><button class="rl" data-go="${o[2]}">Details</button></div>`).join('')}
</div></div></section>
${window.FFRelease ? window.FFRelease.optionsSection() : ''}
<section><div class="wrap">${head('Getting started','A 30-day launch plan, once ordering opens','')}
 <div class="steps">${card('Choose your option','A 30-minute call to match your rooms, ages and enrollment to a package.')}${card('Receive the welcome box','It ships when its pieces are made, and not before. Your written quote marks each item available now, in development or coming later.')}${card('Train the team','Level 1 Foundations for every staff member, online, in the first 30 days.')}${card('Run your first unit','Unit 1, Welcome to Futures: Meet the Friends, with a family launch night.')}</div></div></section>
${cta('Not sure which one fits?','Tell us your rooms, ages and enrollment. We will match you to a package and build the startup list with you.')}`;

// ---------------------------------------------------------------- AUDIENCE PAGES (mirrors the charter-school template)
const AUD = {
 'for-centers':{t:'Child Care Centers',h:'Bring Futures Friends to your child care center, starting with Unit 1',l:'The same four friends in the twos room and the pre-K room, so a child who moves up a room already knows who is waiting. Unit 1 is ready to teach as a draft; the rest of the year is planned.',k:'booker',x:'Up to 3 classrooms with Center Starter, 4 or more with Center Complete.'},
 'for-home':{t:'Home Daycares',h:'A big program sized for your home daycare',l:'One plan that works when the two-year-old and the four-year-old share a table. The welcome box is smaller, and a credential for licensed home providers is planned.',k:'lumi',x:'One room, mixed ages, the provider plus up to 3 assistants in the Hub.'},
 'for-prek':{t:'Pre-K and Head Start Partners',h:'Readiness units for pre-K partners',l:'Units being mapped to the Missouri Early Learning Standards and the Head Start Early Learning Outcomes Framework. Every week sends one take-home activity to families.',k:'zuri',x:'Classroom sets, Level 1 training and Hub records for each partner room.'},
 'for-faith':{t:'Faith-Based Centers',h:'Kindness and courage, one week at a time',l:'Each week picks one value and one friend who shows it: Lumi making room for everyone, Booker trying again. Your church adds its own prayers, songs and stories beside it.',k:'bop',x:'Your church decides which traditions and celebrations sit alongside the plans.'},
 'for-employers':{t:'Employer Child Care',h:'A branded program for your on-site child care',l:'Give working families a program they can see every day, and explore the federal 45F employer child care credit with your tax advisor.',k:'booker',x:'On-site or at a partner center, with a weekly take-home activity for families.'}};
// Wave 5: centers and home daycares open on a story-world classroom (FFArt.scene, labelled as an illustration) with their friend in front.
const AUD_SCENE = {'for-centers':['classroom-empty-master',[['booker',30],['zuri-pointing',70]]], 'for-home':['classroom-reverse-angle',[['lumi',34],['bop-waving',68]]]};
const audScene = key => AUD_SCENE[key] && window.FFArt && window.FFArt.scene ? window.FFArt.scene(AUD_SCENE[key][0], {chars:AUD_SCENE[key][1], u:96, y:2, cls:'phero-scene', sizes:'(max-width:820px) 92vw, 520px', eager:true}) : '';
// Child care centers: the main-classroom proposal leads (kit-showcase.js puts it first under the hero); the actual vs proposed pair sits underneath.
const compare = key => key==='for-centers' && window.FFArt && window.FFArt.kitImg && window.FFArt.KIT_CAPTION ? `<section class="band-paper ffa-compare"><div class="wrap"><div class="ffa-compare-in">${head('Our main classroom','Today and proposed','The same room: our pilot center as it is today, and the proposed Futures Friends transformation.')}<div class="grid g2"><figure class="ffa-photo"><span class="ffa-compare-tag">Today (real photo)</span>${window.FFArt.photoImg('turtle-rug',{sizes:'(max-width:820px) 92vw, 560px'})}<figcaption><span class="ffa-credit">Photo: ${window.FFArt.CENTER_CREDIT}</span></figcaption></figure><figure class="ffa-photo"><span class="ffa-compare-tag">Planned design</span><div class="ffa-kit-stage">${window.FFArt.kitImg('turtle-rug',{sizes:'(max-width:820px) 92vw, 560px'})}<span class="ffa-kit-label" aria-hidden="true">Planned design</span></div><figcaption><span class="ffa-kit-caption">${window.FFArt.KIT_CAPTION}</span><span class="ffa-kit-note">${window.FFArt.KIT_LABEL}; not installed yet.</span></figcaption></figure></div></div></div></section>` : '';
function audience(key){ const a=AUD[key]; return phero(a.t, a.h, a.l, {crumb:['options','Program options'], cta:'<button class="btn gold" data-go="quote">Ask about your rooms</button>', chars:[a.k], scene:audScene(key)}) + compare(key) + `
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:center"><div style="display:grid;gap:12px">${head('Family-friendly curriculum','Ages 2 to 5, in three age bands','Twelve units, forty-eight theme weeks, with versions for twos, threes and pre-K. Units 1 to 11 are written day by day as drafts and none is approved yet (the full plans are for licensed centers); Unit 12 is being written. '+a.x)}<div><button class="btn navy" data-go="curriculum">View the curriculum</button></div></div>${window.FFArt ? window.FFArt.photo('reading-corner',{line:'The reading corner at our pilot center: a full bookshelf and a cushioned bench. Every Futures Friends room sets one up.'}) : ''}</div></div></section>
<section><div class="wrap">${head('Motivation','Trying counts here','')}<div class="grid g3">${card('Friendship Stars','A star card from one of the friends for trying again, helping out, asking a question or finishing the puzzle a child nearly quit.','Rewards','lumi')}${card('Food explorer talk','Look, smell, touch and describe new foods at the table. Tasting is always the child\'s choice, and nothing is charted or rewarded.','Exploring new foods','bop')}${card('Friday circle','On Friday the class sits together and names who showed the week\'s value. The news goes home to families.','Community','zuri')}</div></div></section>
<section class="band-paper"><div class="wrap">${head('Learning activities','Four zones, open all day','')}<div class="grid g4">${KEYS.map(k=>`<div class="card" style="border-top:5px solid var(--${k})"><b style="color:var(--${k})">${CH[k].z}</b><span class="small">${CH[k].d}</span></div>`).join('')}</div></div></section>
<section><div class="wrap">${head('Scaffolded supports','Twos, pre-K and everyone in between','')}<div class="grid g3">${card('Age versions','Every activity has a simpler version for twos and a stretch for pre-K.')}${card('Observe and adapt','Learning Steps help teachers notice what each child is doing and what comes next.')}${card('Language support','Picture cards and key words for English learners.')}</div></div></section>
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:center"><div style="display:grid;gap:12px">${head('Special needs','Futures Include','Classroom adaptations and early intervention guidance, alongside the curriculum. The Futures Hub does not store IEP or IFSP goals or health records.')}<div><button class="btn navy" data-go="include">Explore Futures Include</button></div></div><div class="card">${ck(['Adaptations in every lesson plan','Observed milestone notes teachers can share with families','Calm and regulation supports for every room','Referral guidance for early intervention'])}</div></div></div></section>
<section><div class="wrap">${head('Teacher tools','Less paperwork after pickup','')}<div class="grid g3">${card('Teacher Today','Attendance, the day\'s checklist, what each child ate and notes home, in one screen.'+(window.FFRelease?' '+window.FFRelease.feature('hub-portals'):''),'Futures Hub','booker')}${card('Lunch planner','Planned menus checked against the CACFP lunch pattern. CACFP claim counts are planned.'+(window.FFRelease?' '+window.FFRelease.feature('hub-cacfp-claims'):''),'Futures Hub','bop')}${card('Ratio check','Staff needed by age mix under your state\'s rules, from today\'s attendance.'+(window.FFRelease?' '+window.FFRelease.feature('hub-portals'):''),'Futures Hub','zuri')}</div></div></section>
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start"><div style="display:grid;gap:12px">${head('The family experience','Families see the day','')}${ck(['Today\'s lesson and a dinner question','What their child ate','Milestones and Friendship Stars','Weekly take-home activity','Messages with the teacher'])}<div><button class="btn navy" data-go="family-guide">More details</button></div></div><div class="demo"><div class="top"><div class="dots"><i></i><i></i><i></i></div><b style="font-family:var(--display)">Family App</b><span class="sample" style="margin-left:auto">Sample</span></div><div class="body">${portalFamily()}</div></div></div></div></section>
<section><div class="wrap">${head('Planned episodes','Short episodes for threes and pre-K','Season One is planned as 13 episodes of about 6 minutes, watched together (Series Bible v3.0). Children 2 and younger do not watch episodes in care. No episode has been made yet.')}<div class="grid g3">${(window.FFTalk?window.FFTalk.SLATE.slice(0,6).map(e=>[e.title,e.k,'FF'+e.code]):D.episodes.slice(0,6).map((e,i)=>[e[0],e[1],'Planned episode '+(i+1)])).map(e=>`<div class="card" style="border-left:5px solid ${e[1]==='all'?'var(--gold)':'var(--'+e[1]+')'}"><span class="small muted">${esc(e[2])}</span><b>${esc(e[0])}</b></div>`).join('')}</div></div></section>
${window.FFRelease ? window.FFRelease.packageSection(key) : ''}
${cta('Tell us about your rooms','How many classrooms, which ages, how many children. We put together a startup package that fits and mark where every item stands.','Request information')}`; }
Object.keys(AUD).forEach(k => V[k] = () => audience(k));

V['for-families'] = () => phero('Families','The Futures Friends come home','You see what your child learned, ate and tried today. Then you get one small thing to do together before the week is out.',{crumb:['options','Program options'],chars:['lumi','bop']}) + `
${window.FFSupporting.arrival()}
<section class="tight"><div class="wrap"><div class="cta"><div style="display:grid;gap:8px"><h2>Futures at Home: free for every family</h2><p class="lede">Read five storybooks together, find activities for your child's age, print fridge pages and make a plan for your week. No account needed.</p></div><a class="btn gold" href="#at-home">Open the family library</a></div></div></section>
<section class="band-paper"><div class="wrap"><div class="grid g3">
 ${card('A friend to take home','A plush of your child\'s chosen friend, a storybook, an activity book with stickers, a parent guide, a books-at-home card and a Rainbow at Home fridge page. $59.','Family Welcome Kit','lumi')}
 ${card('One take-home activity','A question for dinner and a five-minute activity that matches the week\'s lesson.','Every week','booker')}
 ${card('A lending library','Children borrow a book each week, and centers help families get a public library card.','Books at home','zuri')}
 ${card('Rainbow habits together','A color tracker for the fridge and simple, choking-safe snack ideas.','Rainbow at home','bop')}
 ${card('Watch, then talk','Planned short episodes, made to be watched with a grown-up, each with a question to ask afterward.','Episodes together','booker')}
 ${card('See your child grow','Planned with the app pilot: progress reports three times a year and milestones in the Family App.','Progress','lumi')}
</div></div></section>${window.FFRelease ? window.FFRelease.packageSection('for-families') : ''}${cta('Find a Futures Friends program','Start at the flagship center in Independence, Missouri, or ask your child care provider to join.','Contact Us','contact')}`;

// ---------------------------------------------------------------- FUTURES INCLUDE (special education)
V.include = () => phero('Futures Include','Every child belongs in the Futures Friends classroom','Inclusion supports for children with disabilities and developmental delays, built into the curriculum and the classroom. The Futures Hub does not store IEP or IFSP goals, evaluations or health records.',{anchors:[['features','Key features'],['how','How it works'],['funding','Funding help']],chars:['lumi','booker']}) + `
<section id="features" class="band-paper"><div class="wrap">${head('Key features','Inclusion that is part of every day','')}<div class="grid g3">
 ${card('Observed milestones','Teachers note the milestones they see in play, using a checklist for each age band. No diagnoses, goals or health records are stored.','Milestones','lumi')}
 ${card('Adaptations in every lesson','Every plan lists adaptations for motor, sensory, communication and attention needs.','Lessons','booker')}
 ${card('Notes to share with families','Observed milestones are ready for family conferences. Families decide what to bring to any IEP or IFSP meeting.','Reports','zuri')}
 ${card('Calm and regulation','Lumi\'s Calm Corner, visual schedules and breathing cards for every room.','Social-emotional','lumi')}
 ${card('Early intervention guidance','Steps for families to request an evaluation: Missouri First Steps for children who are 2, and the local school district for ages 3 to 5.','Referrals','bop')}
</div></div></section>
<section id="how"><div class="wrap">${head('How Futures Include works','Four steps','')}<div class="steps">${card('Teacher adapts the plan','Using the adaptations listed in every lesson plan, with the family\'s input.')}${card('Activities are chosen','Teachers pick the zone activity or book that fits the child today.')}${card('Observe in play','Teachers note milestones during play in seconds.')}${card('Share with the family','Observed milestones are ready for family conversations.')}</div></div></section>
<section id="funding" class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:center"><div style="display:grid;gap:12px">${head('Funding help','Bring in every available dollar','Our Funding Guide covers child care subsidy, CACFP, grants and partnerships, and our team can help with applications.')}<div><button class="btn navy" data-go="funding">Funding help</button></div></div>${window.FFArt ? window.FFArt.photo('dress-up-corner',{line:'The dress-up and toy corner at our pilot center: low open shelves children can reach on their own.'}) : ''}</div></div></section>
${cta('Talk with us about inclusion','We will walk through Futures Include for your classrooms.','Request Details','quote')}`;

// ---------------------------------------------------------------- FUTURES HUB + portals
const KIDS = (()=>{ const names=['Ava','Mateo','Zoe','Elijah','Mia','Noah','Aria','Liam','Nova','Jayden','Ivy','Kai','Luna','Malik','Sofia','Ezra','Amara','Leo','Nora','Owen']; const z=['booker','lumi','zuri','bop']; return names.map((n,i)=>({n:n+' '+String.fromCharCode(65+(i*7)%26)+'.',age:i<11?3:4,zone:z[(i*3)%4],status:i===5?'Nap':(i===13?'Picked up':'Here')})); })();
const FR = id => window.FFRelease ? ' ' + window.FFRelease.feature(id) : '';   // Hub feature state from the release manifest (release-truth.js)
function portalDirector(){ const rooms=[['Twos room',8,1,8],['Threes room',10,1,10],['Pre-K room',12,2,10]]; return `
 <div class="ratio">${rooms.map(r=>{const need=Math.ceil(r[1]/r[3]);const ok=r[2]>=need;return `<div><span class="small muted">${r[0]}</span><b style="font-family:var(--display);font-size:24px">${r[1]} children</b><span class="small">${r[2]} staff · 1:${r[3]} ratio</span><span class="chip ${ok?'ok':'bad'}">${ok?'In ratio':'Needs '+(need-r[2])+' more'}</span></div>`}).join('')}
  <div><span class="small muted">Meals counted today</span><b style="font-family:var(--display);font-size:24px">86</b><span class="small">Breakfast 28 · Lunch 30 · Snack 28</span><span class="chip ok">$119.42 CACFP earned</span><span class="small muted">Sample figure: CACFP claim totals are a planned feature</span></div></div>
 <div class="grid g2">
  <div class="card"><b>Staff training</b><div class="meter"><i style="width:72%"></i></div><span class="small">5 of 7 staff finished Level 1 Foundations · 2 due by Nov 30</span></div>
  <div class="card"><b>Enrollment this month</b><span class="small">14 inquiries · 9 tours · 4 enrolled · 3 waitlisted</span><div class="meter"><i style="width:44%;background:var(--booker)"></i></div></div>
  <div class="card"><b>Food budget</b><span class="small">Week 2, Easy &amp; Quick · $2.52 per child per day</span><div class="meter"><i style="width:63%;background:var(--bop)"></i></div></div>
  <div class="card"><b>Screen time this week</b><span class="small">2 of 4 episodes used · 11 of 30 minutes</span><div class="meter"><i style="width:37%;background:var(--watch)"></i></div></div>
 </div>`; }
function portalClass(){ const k=st.kid!=null?KIDS[st.kid]:null; return `
 <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center"><span class="chip">Threes and Pre-K · 20 children</span><span class="chip ok">2 teachers · in ratio</span><span class="chip">Unit 2, Week 1 · Booker's Story About Me</span></div>
 <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:8px">${KIDS.map((x,i)=>`<button class="kid ${st.kid===i?'sel':''}" data-kid="${i}" style="--c:var(--${x.zone})"><b>${esc(x.n)}</b><span class="small muted">Age ${x.age} · ${CH[x.zone].n}'s zone</span><span class="chip ${x.status==='Here'?'ok':''}" style="justify-self:start">${x.status}</span></button>`).join('')}</div>
 ${k?`<div class="card" style="border-left:5px solid var(--${k.zone})"><b>${esc(k.n)} · age ${k.age}</b><span class="small">Now in ${CH[k.zone].z}. Learning Steps notes live in the child\'s portfolio, in words.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn soft" data-act="milestone">Note a Learning Step</button><button class="btn soft" data-act="star">Give a Friendship Star</button><button class="btn soft" data-act="note">Send a note home</button><button class="btn soft" data-act="zone">Move to a zone</button></div></div>`:'<p class="small muted">Select a child to log a milestone, give a Friendship Star, send a note home or record a zone change.</p>'}`; }
function portalFamily(){ return `<div class="grid g2">
  <div class="card" style="border-top:5px solid var(--booker)"><span class="small muted">Today at Futures</span><b>Booker's Story About Me</b><span class="small">Children told the story of their names and made a name collage.</span><span class="small"><b>Ask at dinner:</b> "What letter does your name start with?"</span></div>
  <div class="card" style="border-top:5px solid var(--bop)"><span class="small muted">What we ate</span><span class="small"><b>Lunch:</b> Chicken and rice bowl, mandarin oranges, milk</span><span class="chip ok" style="justify-self:start">Tried a new food</span></div>
  <div class="card" style="border-top:5px solid var(--zuri)"><span class="small muted">Take-home</span><b>Name hunt</b><span class="small">Find your child's first letter on signs and boxes at home.</span></div>
  <div class="card" style="border-top:5px solid var(--lumi)"><span class="small muted">What we saw</span><span class="small">Retold three events from a story, in order. <span class="chip">Developing</span></span><span class="small">Named "frustrated" and took three slow breaths. <span class="chip">Secure</span></span><span class="small"><b>Try at home:</b> after a story, ask "What happened first?"</span></div></div>`; }
V.hub = () => phero('Futures Hub','Office, classroom and family in one app','The director checks ratios and training. The teacher marks attendance and what each child ate. A parent sees the day. Every screen below uses sample data.',{cta:'<button class="btn gold" data-go="app">Get the app</button><button class="btn ghost" data-go="signin-teacher" style="color:#fff">Teacher Sign-In</button>'}) + `
<section class="band-paper"><div class="wrap">
 <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:16px"><div class="seg" role="group" aria-label="Portal">${[['director','Director dashboard'],['class','Classroom Live (preview)'],['family','Family App']].map(p=>`<button data-portal="${p[0]}" aria-pressed="${st.portal===p[0]}">${p[1]}</button>`).join('')}</div><span class="sample" style="align-self:center">Sample data</span></div>
 <div class="demo"><div class="top"><div class="dots"><i></i><i></i><i></i></div><b style="font-family:var(--display)">Futures Hub</b><span class="small" style="opacity:.8">${st.portal==='director'?'Director · Futures Learning Center':(st.portal==='class'?'Classroom Live · Threes and Pre-K':'Family App · Ava R.')}</span></div><div class="body">${st.portal==='director'?portalDirector():(st.portal==='class'?portalClass():portalFamily())}</div></div>
 <p class="note" style="margin-top:10px">Names and figures in this demo are made up to show how the screens work.</p></div></section>
<section><div class="wrap">${head('Inside the Hub','What is inside','')}<div class="grid g3">
 ${card('Classroom Live','Which zone each child is in, shown with sample data. Built today: attendance, the Today checklist, notes home and the weekly screen-time meter.'+FR('hub-ops-preview'))}${card('Lesson calendar','The year calendar and each day\'s lesson. Program printables are planned.'+FR('hub-portals'))}${card('Eat the Rainbow menus','A free menu planner on this site in three levels with cost per child. Scaling to your headcount with a prep list is planned.'+(window.FFRelease?' '+window.FFRelease.chip('menu-planner-web'):''))}
 ${card('CACFP meal counts','Point-of-service counts and a monthly claim summary are planned. Built today: what each child ate and a check of lunches against the CACFP pattern.'+FR('hub-cacfp-claims'))}${card('Ratio and staffing','Staff needed by age mix under your state\'s rules, room by room, from today\'s attendance.'+FR('hub-portals'))}${card('Training records','Every staff member\'s courses, Futures Friends completion records and training hours.'+FR('hub-lms'))}
 ${card('Family App','Today\'s lesson, meals, take-home and progress. Child photos only with family consent.'+FR('hub-portals'))}${card('Futures Include','Adaptations, early intervention guidance and observed-milestone notes. No IEP, IFSP or health records.'+FR('hub-portals'))}${card('Store and funding','Member-price reorders, grant calendar and reimbursement tracking.'+FR('hub-store-funding'))}</div>
 <div style="margin-top:20px;display:flex;gap:10px;flex-wrap:wrap"><button class="btn gold" data-go="portal">Open the Teacher Portal</button><button class="btn navy" data-go="family-portal">Open the Family Portal</button><button class="btn soft" data-go="family-guide">Family App guide</button></div></div></section>`;

V.app = () => phero('Get the app','The Futures Hub, on every device','The Hub is a web app: open it in any modern browser on a classroom tablet, a director\'s computer or a family\'s phone, then add it to your home screen. There is nothing to download from an app store.',{chars:['bop']}) + `
<section class="band-paper"><div class="wrap"><div class="grid g3">
 ${card('Classroom tablets','On a shared tablet: the Today checklist, attendance, what each child ate and today\'s lesson.','Teachers','booker')}
 ${card('Web','The full Hub in any modern browser for directors, cooks and office staff.','Directors','zuri')}
 ${card('Family phones','Open the Hub in the browser on any iPhone or Android phone and add it to your home screen to see notes and stars.','Families','lumi')}</div>
 <div class="card" style="margin-top:18px"><h3>Requirements</h3>${ck(['A current version of Chrome, Safari or Edge on a computer or tablet','Any iPhone or Android phone with a current browser for families','Wi-Fi in each classroom for the Teacher Portal; lessons are written to run from print'])}<p class="note">The Hub is invite-only: directors are invited by Futures Friends, and staff and families get an email invitation from their center.</p></div></div></section>`;

V['family-guide'] = () => phero('Family App guide','What you will see in the Family App','A quick tour: signing in, what shows up each day, and where to find your reports.',{crumb:['hub','Futures Hub'],chars:['lumi']}) + `
<section class="band-paper"><div class="wrap">${head('Signing in','Four steps','')}<div class="steps">${card('Get your invite','Your center sends an email invitation to the address on your enrollment form.')}${card('Verify','Enter the code sent to your phone or email.')}${card('Add your details','Confirm your name and how you want to be notified.')}${card('Turn on quick sign-in','Use Face ID, fingerprint or a PIN next time.')}</div></div></section>
<section><div class="wrap">${head('Your dashboard','What you will see each day','')}<div class="grid g3">${card('Today at Futures','The lesson, the lead friend and a question to ask at dinner.')}${card('What we ate','Breakfast, lunch and snack, plus new foods your child tried.')}${card('Friendship Stars','Stars your child earned and why.')}${card('Take-home activity','A five-minute activity for the week.')}${card('Learning Steps','What teachers saw, in words, with what comes next and an idea to try at home.')}${card('Messages','Notes from your child\'s teacher, and replies.')}</div></div></section>
<section class="band-paper"><div class="wrap">${head('Reports','Download and share','')}<div class="tw"><table><tr><th>Report</th><th>What it shows</th><th>How often</th></tr><tr><td>Learning notes</td><td>What teachers saw, what\'s next and ideas for home, in words (no scores)</td><td>As teachers add them</td></tr><tr><td>Attendance and meals</td><td>Days attended and meals served</td><td>Monthly</td></tr><tr><td>Friendship Stars</td><td>Stars earned by value</td><td>Any time</td></tr></table></div></div></section>`;

// ---------------------------------------------------------------- SIGN-IN
// Real accounts live in the Futures Friends CRM portals. Off by default (visitors see the sample).
// Going live: set FF_CRM_DEFAULT to the permanent CRM address. A ?crm= link may only pick an exact
// address listed in FF_CRM_ALLOWED and is never remembered, so a crafted link cannot put a
// look-alike login page behind the site's own Sign in button.
const FF_CRM_DEFAULT = '';
const FF_CRM_ALLOWED = [];
const ffCrmUrl = () => {
  try {
    localStorage.removeItem('ff-crm'); // clear values saved by the old opt-in test mode
    const p = (new URLSearchParams(location.search).get('crm') || '').replace(/\/+$/, '');
    return FF_CRM_ALLOWED.includes(p) ? p : FF_CRM_DEFAULT;
  } catch (e) { return FF_CRM_DEFAULT; }
};
const ffRealSignin = who => { const crm = ffCrmUrl(); if (!crm) return '';
  const slug = who === 'Family' ? 'family' : 'teacher';
  return `<div class="card signin" style="margin-bottom:18px"><h2 class="h3">Sign in to your account</h2>
 <p class="small">Use the email and password from your invitation. Your information is saved to your account.</p>
 <a class="btn gold" href="${crm}/portal/${slug}/" rel="noopener">Sign in as ${who === 'Family' ? 'a family' : 'a teacher'}</a>
 <p class="note">Church, center or franchise administrator? <a class="rl" href="${crm}/portal/partner/" rel="noopener">Partner sign-in</a></p></div>`; };
const signin = (who, color, k) => phero(`${who} Sign-In`,`Welcome back`,'',{chars:[k]}) + `
<section class="band-paper"><div class="wrap">${ffRealSignin(who)}<form class="card signin" id="signinForm" data-who="${who}" novalidate><h2 class="h3">${who} sample portal</h2>
 <p class="small">This is a sample local preview for the ${who.toLowerCase()} experience. It does not connect to a live account, and it does not ask for an email, password or center code.</p>
 <button class="btn gold" type="submit">Open ${who} sample portal</button>
 <p class="note">Changes in the preview stay in this browser. For a real account, contact your center.</p>
 <button type="button" class="rl" data-go="support">Contact the center</button></form></div></section>`;
V['signin-family'] = () => signin('Family','lumi','lumi');
V['signin-teacher'] = () => signin('Teacher','booker','booker');

// ---------------------------------------------------------------- TRAINING + SUMMIT
V.training = () => phero('Planned training and certification','Futures Friends educator pathways',`A proposed seven-credential ladder with ${D.modules.length} core modules and four planned continuing-education modules. Explore the catalog and proposed Kansas City educator summit.`,{anchors:[['ladder','Credentials'],['catalog','Module catalog'],['summit-cta','Summit']],chars:['booker','zuri']}) + `
<section id="ladder" class="band-paper"><div class="wrap"><div class="grid g3">${D.ladder.map(l=>{const c=l[4]==='rainbow'?'linear-gradient(90deg,#D9483B,#E8761E,#C99A06,#2E9E57,#6A4FB8)':(l[4]==='navy'?'var(--navy)':(l[4]==='gold'?'var(--gold-deep)':`var(--${l[4]})`));return `<div class="card" style="border-top:6px solid transparent;border-image:${c} 1"><span class="small muted">${esc(l[0])}</span><h3>${esc(l[1])}</h3><p class="small">${esc(l[2])}</p><span class="tag" style="justify-self:start">${esc(l[3])} planned hours</span><p class="small"><b>${esc(l[5])}</b></p></div>`}).join('')}</div>
 <p class="note" style="margin-top:12px">Approval and eligible clock hours have not been verified. Credential titles and hours are planning estimates, not approved awards. Four continuing-education modules are proposed separately from the core catalog.</p></div></section>
<section id="catalog"><div class="wrap">${head('Module catalog','Core course outlines','Catalog hours are estimates. The Academy provides sample lessons, not the complete training program.')}<div class="tw"><table><tr><th>Code</th><th>Module</th><th class="n">Catalog hours</th><th>Format</th></tr>${D.modules.map(m=>`<tr><td>${m.code}</td><td>${esc(m.title)}</td><td class="n">${m.hours}</td><td class="small">${esc(m.format)}</td></tr>`).join('')}</table></div></div></section>
<section id="summit-cta" class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:center"><div style="display:grid;gap:12px">${head('Proposed educator summit','Two days in Kansas City','Planned sessions for directors, teachers, cooks and home providers. Dates, venues and eligible training hours are not confirmed.')}<div><button class="btn navy" data-go="summit">Summit details</button></div></div>${fig('img/kitchen.jpg','Illustration of an Eat the Rainbow dining room, with the rainbow colors on the wall','The Eat the Rainbow dining room, illustrated: family-style tables and the rainbow wall.')}</div></div></section>`;

V.summit = () => phero('Proposed educator summit','A gathering for Kansas City educators','A proposed two-day event for child care directors, teachers, cooks and home providers. Dates, venues, registration and eligible training hours are not confirmed.',{crumb:['training','Training'],cta:'<button class="btn gold" data-go="quote">Ask about the summit</button>'}) + `
<section class="band-paper"><div class="wrap">${head('Draft schedule','Two days for people who run child care','Session ideas are subject to confirmation.')}<div class="grid g2">
 <div class="card"><h3>Day 1</h3>${ck(['Welcome reception and meet the Futures Friends','Classroom sessions: the learning loop in action','Eat the Rainbow kitchen demo and tasting','Director track: ratios, staffing and budgets','Home provider track: one room, mixed ages'])}</div>
 <div class="card"><h3>Day 2</h3>${ck(['Proposed center tour in Independence','Proposed behind-the-scenes production session','Futures Include: inclusion workshop','Funding session: CACFP, subsidy and grants','Peer roundtables and recognition session'])}</div></div></div></section>
<section><div class="wrap">${head('Proposed sessions','Topics to explore','')}<div class="grid g3">${card('Launch your program','Setting up, staffing and getting through the first 30 days.','Directors','booker')}${card('Fill your seats','Build a flyer and a tour-confirmation email from the enrollment marketing kit.','Directors','zuri')}${card('Teach the loop','See a lesson taught with each friend and zone, then try one yourself.','Teachers','lumi')}${card('Cook the rainbow','All three menu levels, from assembly to the grinder method.','Cooks','bop')}${card('Futures Include','Adaptations and family partnership.','Everyone','lumi')}${card('Funding','CACFP setup, subsidy and grant readiness.','Directors','zuri')}</div></div></section>
<section class="band-paper"><div class="wrap">${head('Kansas City','Stay and explore','Kansas City is home to Union Station and Science City, the Nelson-Atkins Museum of Art, the National WWI Museum and Memorial, Crown Center and the Country Club Plaza, and, of course, the barbecue.')}</div></section>`;

// ---------------------------------------------------------------- SUPPORT + CONTACT + QUOTE
const FAQ = [
 ['What ages is Futures Friends for?','Children ages 2 to 5 in licensed child care centers, licensed home daycares and pre-K partner classrooms. Every lesson has a version for twos and a stretch for pre-K.'],
 ['How much screen time does the program use?','Scheduled program minutes: at most 24 a week, from one episode of up to 6 minutes Monday to Thursday, watched together. Friday has no episode. Two ceilings sit above that: never more than 30 minutes of Futures Friends episodes in a week, and no more than 30 minutes a week of all screens in care for children 3 to 5 (the CDC early care and education standard), so episodes use most of it. Children 2 and younger do not use screens in care. These are Futures Friends standards; your state rules and your center\'s policy apply where they are stricter.'],
 ['Do we need the internet to teach?','No. Lessons are written to run from print: Unit 1 comes first as a printable teacher packet, and recipes print from this site. The Futures Hub adds planning, records and family updates.'],
 ['What comes in the welcome box?','It is planned to hold a founder letter, the curriculum binder, five storybooks, the cookbook, posters, zone signs, plush friends, the character carpet, badges and a 30-day quick-start guide. Most of these pieces are still being made, so your written quote marks each one available now, in development or coming later. Hub accounts come by email invitation.'],
 ['Is training included?','Yes. Level 1 Futures Friends Foundations is included for every staff member of a program member. Higher training levels are planned through memberships and seats. Completing a course gives a Futures Friends completion record; no course is state-approved yet.'],
 ['Do the menus follow the CACFP meal pattern?','Menus are written for the USDA CACFP meal pattern for ages 3 to 5, with crediting notes on each recipe. They are not reviewed or approved by USDA or a state agency: check crediting against your own product labels and your state agency\'s current rules. Two-year-olds fall in the CACFP ages 1 to 2 group, which has smaller portions.'],
 ['How does staffing work?','Staffing follows your state\'s ratios and your age mix. In Missouri that is 1 adult for every 8 two-year-olds and 1 for every 10 three- and four-year-olds. The Hub calculates it for you.'],
 ['Can home daycares join?','Yes. The Home Daycare tier includes a mixed-age plan, a home welcome box, the Hub for the provider and up to 3 assistants, and the Home Educator training path.'],
 ['How do families get the Imagination Library?','Availability depends on your county\'s local program and the current state enrollment status. Centers can help families check and enroll when sign-ups are open, and run a Futures lending library in the meantime.'],
 ['Is our data private?','We collect only what programs need, never sell data, and share child photos only with family consent. The Hub does not store health, allergy or IEP and IFSP records.'],
 ['Can we use our own faith traditions or celebrations?','Yes. The curriculum is inclusive by design and programs can add their own traditions alongside it.'],
 ['How do we get started?','Request a quote. We will match your rooms, ages and enrollment to a package and plan a 30-day launch.']];
V.support = () => phero('Support','Answers, and a person to call','Sign-in help, how-to guides and the questions directors, teachers and families ask most.',{chars:['zuri']}) + `
<section class="band-paper"><div class="wrap">
 <div class="seg" role="group" aria-label="Help topic" style="margin-bottom:16px">${[['tech','Technical support'],['tut','Tutorials'],['faq','FAQ']].map(t=>`<button data-help="${t[0]}" aria-pressed="${st.help===t[0]}">${t[1]}</button>`).join('')}</div>
 ${st.help==='tech'?`<div class="grid g3">${card('Sign-in help','The Hub is invite-only. Directors are invited by Futures Friends; staff and families get an email invitation from their center. Open the link in that email to set up your sign-in, or ask your director to resend it.','Accounts','booker')}${card('Classroom tablets','Coming with the app pilot: once the Hub is live for your program, turn on classroom mode so staff can switch quickly on a shared tablet.','Devices','zuri')}${card('Something not working?','Call or email us with your center name and a screenshot. We answer within one business day.','Contact','bop')}</div>`:''}
 ${st.help==='tut'?`<div class="grid g3">${['Set up your center in the Hub','Add staff and assign Level 1','Plan a week of menus','Log attendance and meals','Use the Today checklist','Send a note home','Log observed milestones','Reorder from the store','Run your first family night'].map((t,i)=>`<div class="card"><span class="small muted">Tutorial ${i+1}</span><b>${t}</b><span class="small">Planned: a step-by-step guide with screenshots. Not written yet.</span></div>`).join('')}</div>`:''}
 ${st.help==='faq'?`<div class="faq">${FAQ.map(f=>`<details><summary>${esc(f[0])}</summary><p>${esc(f[1])}</p></details>`).join('')}</div>`:''}
 <p class="note" style="margin-top:16px">Can't find what you're looking for? <button class="rl" data-go="contact">Let us know</button>.</p></div></section>`;

const contactForm = (title, sub, mode) => phero('Contact', title, sub, {chars:['zuri','lumi']}) + `
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:start">
 ${window.FFIntake ? window.FFIntake.contactHtml(mode) : `<div class="card"><h3>Request information</h3><p class="small">Online requests are not available on this page right now. Please call <b>${PHONE}</b> or email <b>${EMAIL}</b> and a real person will help you.</p></div>`}
 <div style="display:grid;gap:14px"><div class="card"><h3>Contact us by phone</h3><span>Main: <b>${PHONE}</b></span><span>Email: <b>${EMAIL}</b></span><span class="small">${ADDR}</span><span class="small">Open weekdays. Call for current hours.</span><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn soft" data-copy="${EMAIL}">Copy email</button><button class="btn soft" data-copy="${PHONE}">Copy phone</button></div></div>
 ${window.FFArt ? (mode==='quote' ? window.FFArt.photo('alphabet-rug',{title:'Our pilot classroom',line:'The carpet area at Futures Learning Center, Independence. Ask us what a startup package holds for your rooms.',ratio:'land'})
   : '<div class="ffa-slots">' + window.FFArt.photo('exterior',{title:'Our front entrance, proposed',line:'3625 S Blue Ridge Blvd: the proposed entrance, with the building as it is today one tap away',ratio:'land'}) + window.FFArt.photo('turtle-rug',{title:'Inside our center',line:'Our main classroom: the turtle stepping stones, the alphabet rug and child-size tables.',ratio:'land'}) + '</div><p class="small"><a href="https://www.google.com/maps/search/?api=1&amp;query=3625+S+Blue+Ridge+Blvd+Independence+MO+64052" target="_blank" rel="noopener noreferrer">Open 3625 S Blue Ridge Blvd in Google Maps</a> (opens in a new tab). Today the front door is the blue door under the Futures sign.</p>') : ''}</div></div></div></section>`;
V.contact = () => contactForm('Request information','Ask a question, or ask for a quote for your center or home daycare.','contact');
V.quote = () => contactForm('Request a quote','Tell us your rooms, ages and enrollment and we will build your startup package.','quote');

// ---------------------------------------------------------------- FRIENDS, RAINBOW, STORE, FUNDING, PRICING, WHY
V.friends = () => phero('Friends and books','Booker, Lumi, Zuri and Bop','Four plush-and-felt friends share the Clubhouse. Each looks after one learning pillar and practices one value.') + `
<section class="band-paper"><div class="wrap"><div class="grid g4">${KEYS.map(friendCard).join('')}</div></div></section>
${window.FFSupporting.town ? window.FFSupporting.town() : ''}${window.FFSupporting.community()}
<section class="band-paper" data-signature><div class="wrap">${head('The storybooks','Four finished covers','The revised editions of October 2026: each friend\'s book with its finished story-world art. Tap a cover to read it.')}
 <div class="grid g4" style="align-items:start">${D.books.filter(famBook).map(b => { const f = famBook(b); return `<figure class="card" style="margin:0;overflow:hidden">${cover(b)}<figcaption style="padding:12px;display:grid;gap:4px"><b>${esc(f.title)}</b><span class="small muted">Book ${f.n} · ${esc(f.sub || '')}</span></figcaption></figure>`; }).join('')}</div>
 <p class="note" style="margin-top:12px">Every word of all five stories is free to read now in <a href="#story-time">Story Time</a>. Printed editions are not available yet.</p>
</div></section>
<section><div class="wrap">${head('Storybook series','Five stories, free to read','Picture books for ages 2 to 5, each with a say-along refrain, a Talk About It page and a five-minute activity. Read them free in Story Time; 8.5 by 8.5 inch printed editions are planned.')}
 <div class="grid g2">${D.books.map(b=>`<div class="card book">${cover(b)}<div style="display:grid;gap:6px"><h3>${esc(b.title)}</h3><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag">${famBook(b)?'Finished cover':'Layout preview'}</span><span class="tag">${famBook(b)?'Illustrated · '+b.pages+' pages':b.pages+' planned pages'}</span><span class="tag">${b.c==='all'?'All four friends':CH[b.c].p+' · '+CH[b.c].v}</span></div><p class="small">${esc(b.log)}</p></div></div>`).join('')}</div><p class="note" style="margin-top:12px">The four friends' books are the revised, illustrated editions (October 2026), read free in Story Time page by page. The Rainbow Picnic's pictures are still a layout, and printed editions are not available yet.</p><p style="margin-top:14px"><a class="btn navy" href="#story-time" data-reveal="#fl-shelf">Read all five stories free in Story Time</a></p></div></section>
${window.FFTalk ? window.FFTalk.friendsBand() : `<section class="band-navy"><div class="wrap">${head('<span style="color:var(--gold)">The micro-series</span>','Season 1 episode plan','Season One is planned at 13 episodes of about 6 minutes each: a question, a try, a small win and a takeaway children can use that day. Finished episodes are not yet available.')}
 <div class="grid g3">${D.episodes.map((e,i)=>{const k=e[1];const col=k==='all'?'var(--gold)':`var(--${k})`;return `<div class="card" style="background:rgba(255,255,255,.05);border-color:rgba(255,255,255,.14);color:#fff"><div style="display:flex;justify-content:space-between;gap:8px"><span class="small" style="color:${col};font-weight:600">Episode ${i+1}</span><span class="small" style="opacity:.75">Unit ${e[2]}</span></div><b style="font-family:var(--display);font-size:18px">${esc(e[0])}</b><span class="small" style="opacity:.8">${k==='all'?'All four friends':CH[k].n}</span></div>`}).join('')}</div>
 <p class="small" style="margin-top:14px;color:#B8CCD3">Earlier working titles are shown. Season One is planned at 13 episodes.</p></div></section>`}`;

V.rainbow = () => { const rows=((D.menus[String(st.lvl)]||{})[String(st.wk)]||[]); const avg=rows.reduce((a,r)=>a+dayCost(r),0)/(rows.length||1);
 return phero('Eat the Rainbow','A rainbow on every plate','Thirty-six recipes in three levels, plus a menu planner with the food cost worked out. Menus are designed around the USDA CACFP meal pattern for ages 3 to 5.',{chars:['bop','zuri']}) + `
<section class="band-paper"><div class="wrap"><div class="bands"><div style="background:#D9483B"><b>Red</b><span>Red Rockets</span></div><div style="background:#E8761E"><b>Orange</b><span>Orange Sunshine</span></div><div style="background:#C99A06"><b>Yellow</b><span>Yellow Sunbeams</span></div><div style="background:#2E9E57"><b>Green</b><span>Green Sprouts</span></div><div style="background:#6A4FB8"><b>Blue &amp; Purple</b><span>Purple Pals</span></div><div style="background:#8A7558"><b>White &amp; Tan</b><span>Cozy Clouds</span></div></div>
 <div class="grid g3" style="margin-top:18px">${card('Easy & Quick','15 to 20 minutes hands-on with smart shortcuts. About $2.55 per child per day.','Level 1','zuri')}${card('Medium','Scratch cooking with basic equipment. About $2.81 per child per day.','Level 2','bop')}${card('Next Level','Grinder-method chicken nuggets, batch marinara and a freezer prep day. About $2.95 per child per day.','Level 3','lumi')}</div></div></section>
<section><div class="wrap">${head('Menu planner','Try a week','Pick a level and a week. Tap a recipe code to open the recipe card.')}
 <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:14px"><div class="seg" role="group" aria-label="Level">${[1,2,3].map(l=>`<button data-lvl="${l}" aria-pressed="${l===st.lvl}">${LEVELS[l]}</button>`).join('')}</div><div class="seg" role="group" aria-label="Week">${[1,2,3,4].map(w=>`<button data-wk="${w}" aria-pressed="${w===st.wk}">Week ${w}</button>`).join('')}</div></div>
 <div class="tw"><table><tr><th>Day</th><th>Breakfast</th><th>Lunch</th><th>PM snack</th><th class="n">Food cost</th></tr>${rows.map(r=>`<tr><td><b>${esc(r[0])}</b></td><td>${linkR(r[1])}</td><td>${linkR(r[2])}</td><td>${linkR(r[3])}</td><td class="n">${money(dayCost(r))}</td></tr>`).join('')}</table></div>
 <p class="note" style="margin-top:10px">Average ${money(avg)} per child per day. Ingredient estimates per ages 3 to 5 serving, Kansas City-area prices, October 2026, milk included.</p>
</div></section>
${window.FFAdvisors.render('laurie')}
<section class="band-paper"><div class="wrap"><div class="grid g2" style="align-items:center">${fig('img/kitchen.jpg','Illustration of an Eat the Rainbow dining room, with the rainbow colors on the wall','Family-style meals in an Eat the Rainbow dining room, illustrated.')}<div style="display:grid;gap:12px">${head('Our food standards','Simple rules every kitchen can keep','')}${ck(['No artificial dyes; cereals and yogurt within the CACFP added-sugar limits (from October 1, 2025: 6 g per dry ounce of cereal, 12 g per 6 oz of yogurt)','Unflavored whole milk at age 1, unflavored 1% or fat-free at ages 2 to 5; juice no more than once a day; water all day','Whole grains, lean proteins and family-style service','Choking-safe prep for under-fives','Recipes scaled for 10, 20 and 40 children'])}</div></div></div></section>`; };

// V.store (and the shop, corner-guide and request pages) live in store.js.

V.funding = () => phero('Funding help','Funding your program may qualify for','CACFP, child care subsidy, grants and the 45F tax credit: what each one pays, what to check first and where to start. If you would rather not do the paperwork, we will do it for a flat fee.',{chars:['zuri']}) + `
<section class="band-paper"><div class="wrap"><div class="tw"><table><tr><th>Program</th><th>What it pays</th><th>Check before you apply</th><th>Next step</th></tr>
 <tr><td><b>CACFP</b> (Missouri DHSS)</td><td>Cash for each qualifying meal and snack</td><td><span class="chip warn">Check current rules</span></td><td>Apply through CNPWeb; collect income forms from every family</td></tr>
 <tr><td><b>Child care subsidy</b> (DESE)</td><td>Part of tuition for eligible families</td><td><span class="chip warn">Check enrollment status</span></td><td>Keep your provider contract current</td></tr>
 <tr><td><b>DESE Innovation grants</b></td><td>Start-up and expansion funds</td><td><span class="chip warn">Check for open rounds</span></td><td>Prepare a grant-ready file now</td></tr>
 <tr><td><b>Imagination Library</b></td><td>Free monthly books under age 5</td><td><span class="chip warn">Only where a local program is taking sign-ups</span></td><td>Run the Futures lending library</td></tr>
 <tr><td><b>Employer 45F credit</b></td><td>Federal credit for employer child care support</td><td><span class="chip ok">Federal credit; ask your tax advisor</span></td><td>Use the employer pitch in the marketing kit</td></tr></table></div>
 <div class="grid g3" style="margin-top:18px">${card('CACFP setup','We prepare your application, forms and records system. Center $950, home $250.','Done for you','zuri')}${card('Monthly compliance','Claim review and records check each month. Center $195, home $49.','Done for you','booker')}${card('Grant writing','A complete application for a flat fee, never a percentage. Center $1,500, home $450.','Done for you','bop')}</div></div></section>`;

V.pricing = () => phero('Pricing','Clear prices, published up front','One startup package and one monthly program fee. The Futures Hub app and Level 1 training for every staff member are included.') + `
<section class="band-paper"><div class="wrap"><div class="grid g3">
 <div class="price"><span class="tag c" style="--c:var(--lumi);justify-self:start">Home Daycare</span><div class="amt">$89<small> / month</small></div><span class="small muted">$1,495 startup package</span><ul class="small"><li>Home welcome box and curriculum</li><li>Futures Hub for the provider and 3 assistants</li><li>Level 1 Foundations for everyone</li><li>Marketing kit and funding guide</li></ul></div>
 <div class="price feat"><span class="tag c" style="--c:var(--booker);justify-self:start">Center Starter</span><div class="amt">$229<small> / month</small></div><span class="small muted">$2,995 startup package</span><ul class="small"><li>Center welcome box for up to 3 classrooms</li><li>Futures Hub with unlimited staff</li><li>Level 1 Foundations for all staff</li><li>Marketing kit and funding guide</li></ul><button class="btn gold" data-go="quote">Request a Quote</button></div>
 <div class="price"><span class="tag c" style="--c:var(--zuri);justify-self:start">Center Complete</span><div class="amt">$349<small> / month</small></div><span class="small muted">$5,995 startup package</span><ul class="small"><li>Classroom sets for 4 or more rooms</li><li>Futures Hub with unlimited staff</li><li>Level 1 Foundations for all staff</li><li>Priority coaching and onboarding</li></ul></div></div></div></section>
<section><div class="wrap">${head('Add-ons','Everything else, priced','')}<div class="grid g2" style="align-items:start">
 <div class="tw"><table><tr><th>Training</th><th class="n">Price</th></tr><tr><td>Standard Center membership (up to 15 staff)</td><td class="n">$3,600 / yr</td></tr><tr><td>Large Center membership</td><td class="n">$5,940 / yr</td></tr><tr><td>Home Daycare membership</td><td class="n">$480 / yr</td></tr><tr><td>Seats: Level 2 / Level 3 / Director / Cook</td><td class="n">$349 / $495 / $595 / $199</td></tr><tr><td>Trainer Academy</td><td class="n">$1,250</td></tr></table></div>
 <div class="tw"><table><tr><th>Seasonal and other</th><th class="n">Price</th></tr><tr><td>Summer camp week kit (center / home)</td><td class="n">$229 / $139</td></tr><tr><td>Holiday unit kit (center / home)</td><td class="n">$119 / $69</td></tr><tr><td>Family Welcome Kit (member / retail)</td><td class="n">$42 / $59</td></tr><tr><td>Futures Hub only (home / center / center plus)</td><td class="n">$49 / $149 / $249 mo</td></tr></table></div></div></div></section>
${cta('Get a quote for your program','Tell us your rooms, ages and enrollment and we will build your startup package.')}`;

V.why = () => phero('Why Futures Friends','Made for the youngest learners, not adapted from K-12','A lot of online curricula began as K-12 courses and added a preschool section later. This one starts at age 2 and stays there.') + `
<section class="band-paper"><div class="wrap"><div class="tw"><table class="vs"><tr><th>What matters for ages 2 to 5</th><th>Typical video-first online curriculum</th><th>Futures Friends</th></tr>
 <tr><td>Who it was built for</td><td>K-12 courses with a few preschool lessons added</td><td class="yes">Ages 2 to 5 only, with versions for twos, threes and pre-K</td></tr>
 <tr><td>Screen time</td><td>Lessons delivered mainly by video</td><td class="yes">At most 24 scheduled episode minutes a week (ceiling 30), watched together; none for children 2 and younger</td></tr>
 <tr><td>Who teaches</td><td>The video teaches; adults supervise</td><td class="yes">Teachers and families lead</td></tr>
 <tr><td>Hands-on learning</td><td>Mostly on-screen practice</td><td class="yes">Four learning zones, books, cooking, movement and art daily</td></tr>
 <tr><td>Physical materials</td><td>Device and login</td><td class="yes">Carpet, posters, zone signs, plush, books and a cookbook (in development)</td></tr>
 <tr><td>Meals</td><td>Not included</td><td class="yes">Menu program built around the CACFP meal pattern, in three levels</td></tr>
 <tr><td>Child care operations</td><td>Not included</td><td class="yes">Ratios, meal counts, training records and family updates</td></tr>
 <tr><td>Works offline</td><td>No</td><td class="yes">Yes. Lessons are written to run from print</td></tr>
 <tr><td>Pricing</td><td>Quote only</td><td class="yes">Published tiers, app and Level 1 training included</td></tr></table></div></div></section>
<section><div class="wrap">${head('Our promises','What every program can count on','')}<div class="grid g3">${card('Repetition with variety','The friend, value and refrain repeat each week; the activities change.')}${card('Real people answer','Every program has a named Futures coach.')}${card('No surprise changes','Prices locked for 12 months; changes come with 90 days\' notice.')}${card('Review before release','Every lesson, book and episode is planned to get an early-childhood and inclusion review before it is published.')}${card('Privacy first','Only what programs need. Never sold. Photos only with consent.')}${card('Fresh every season','New seasonal units each year, with new episodes planned.')}</div></div></section>`;

// ---------------------------------------------------------------- NEWS, BLOG, EVENTS
const NEWS = [
 ['Oct 2026','Futures Friends Program Library drafted','Ten planning volumes covering curriculum, storybooks, the Eat the Rainbow Kitchen, teacher training, the welcome package, enrollment marketing, seasonal units, funding, the Futures Hub and the launch plan. They are internal drafts being updated, not materials a program receives.'],
 ['Oct 2026','Futures Hub preview','See sample screens of the Teacher and Family portals, the lunch planner, staffing by age mix and training records. CACFP claim counts and store reorders are planned.'],
 ['Oct 2026','Season One of the micro-series is planned','Thirteen episodes of about 6 minutes are planned in the Series Bible v3.0. No finished episodes are available yet.'],
 ['Sep 2026','Futures Friends pilot starts in Independence, Missouri','Futures Friends is piloting at Futures Learning Center in Independence, Missouri. Call the center for current ages served and hours.']];
V.news = () => phero('Newsroom','Futures Friends news and updates','',{chars:['booker']}) + `<section class="band-paper"><div class="wrap" style="max-width:900px">${NEWS.map(n=>`<div class="newsitem"><span class="dt">${n[0]}</span><div style="display:grid;gap:4px"><h3>${n[1]}</h3><p class="small">${n[2]}</p></div></div>`).join('')}</div></section>`;

const POSTS = [
 {id:'screen-time',t:'Small screens, big conversations: screen time for ages 2 to 5',k:'zuri',b:['The national child care health standards, Caring for Our Children (4th edition, standard 2.2.0.3), say no screens in child care for children 2 and younger. For ages 2 to 5 they set 1 hour a day of high-quality programming across child care and home combined, watched with an adult who helps the child connect it to the world around them.','Futures Friends schedules far less. Scheduled program minutes are at most 24 a week: one episode of up to 6 minutes, Monday to Thursday, and no episode on Friday. Above that sit two ceilings that are never targets: 30 minutes of Futures Friends episodes a week, and 30 minutes a week of all screens in care for children 3 to 5, the CDC early care and education standard. The episode is only the spark: the real lesson happens in the conversation, the activity and the learning zones afterward.','Practical tips for any classroom: watch together, pause to ask a question, turn the screen off as soon as the story ends, and move straight into a hands-on activity that uses the same words.']},
 {id:'ratios',t:'Staffing by age mix: Missouri ratios made simple',k:'bop',b:['Missouri licensing rules (5 CSR 25-500.112) set a ratio of 1 adult for every 8 two-year-olds, with groups up to 16, and 1 adult for every 10 three- and four-year-olds, with groups up to 20.','Because the youngest child sets the rule in a mixed group, the same headcount can need different staffing depending on ages. A room of 20 three- and four-year-olds needs 2 adults; 16 two-year-olds also need 2.','Plan hour by hour from your sign-in data, cover breaks before the day starts, and confirm your plan with your licensing specialist. The Futures Hub staffing tool does the math for each room.']},
 {id:'choking',t:'Choking-safe snacks for under-fives',k:'lumi',b:['Young children are still learning to chew and swallow. The CDC recommends cutting and cooking foods to the right size and texture and keeping children seated and supervised while they eat.','In Futures Friends kitchens, grapes and cherry tomatoes are quartered lengthwise, hard vegetables are cooked soft, apples are cooked soft for children under 4, and whole nuts, popcorn and hard candy are never served to young children.','The Eat the Rainbow Kitchen is built around choking-safe preparation, and recipes are scaled for 10, 20 and 40 children.']},
 {id:'cacfp',t:'CACFP: what your meals may be worth',k:'booker',b:['The Child and Adult Care Food Program reimburses licensed programs for qualifying meals and snacks. USDA publishes new rates each July. For July 1, 2026 to June 30, 2027, USDA set the rates for centers in the contiguous US at $2.54 for a free breakfast, $4.76 for a free lunch or supper and $1.30 for a free snack, with lower rates for reduced-price and paid meals (Federal Register notice, FR Doc. 2026-15071, published July 27, 2026). Confirm the current figures with your state agency before you budget.','What a program actually receives depends on enrollment, attendance, the meals served and the income mix of your families, so work out your own numbers with your state agency or sponsor before planning around them. For-profit centers must meet the 25% rule each month they claim, so collect an income form from every family.','The Futures Funding Guide walks through the Missouri application step by step, and the Futures Hub records counts at the point of service.']}];
V.blog = () => phero('Blog for educators','Notes for the classroom','Short, sourced guides on screen time, ratios, snacks and CACFP.',{chars:['booker','zuri']}) + `<section class="band-paper"><div class="wrap"><div class="grid g2">${POSTS.map(p=>`<button class="card" data-post="${p.id}" style="font:inherit;color:inherit;text-align:left;cursor:pointer;border-top:5px solid var(--${p.k})"><h3>${esc(p.t)}</h3><p class="small">${esc(p.b[0].slice(0,150))}…</p><span class="rl">Read more</span></button>`).join('')}</div></div></section>`;
V.post = () => { const p=POSTS.find(x=>x.id===arg)||POSTS[0]; return phero('Blog for educators', esc(p.t),'',{crumb:['blog','Blog'],chars:[p.k]}) + `<section class="band-paper"><div class="wrap"><article class="post">${p.b.map(x=>`<p>${esc(x)}</p>`).join('')}<div><button class="btn navy" data-go="blog">More articles</button></div></article></div></section>`; };

V.events = () => phero('Events','Family events and Discovery Day','Four family events a year, plus an annual Discovery Day where children show everyone what they found out.',{chars:['zuri','bop']}) + `
<section class="band-paper"><div class="wrap"><div class="grid g4">${card('Fall Festival','Harvest games, a rainbow snack bar and a family story walk.','Fall','bop')}${card('Winter Showcase','Songs and a short performance by each classroom.','Winter','booker')}${card('Spring Rainbow Picnic','A picnic inspired by The Rainbow Picnic, with every color on the table.','Spring','zuri')}${card('Summer Carnival','The Futures Friends Olympics and Carnival to finish camp.','Summer','lumi')}</div>
 <div class="card" style="margin-top:18px;border-top:5px solid var(--zuri)"><h3>Zuri's Discovery Day</h3><p class="small">A science fair for preschoolers. Each class shows one question it explored, how it tested it and what it found, with families as the audience. Run-of-show, roles, budget and safety plan are in the Summer Camp and Holiday Units guide.</p></div></div></section>`;

// ---------------------------------------------------------------- LEGAL
const legal = (t, sections) => phero('Legal', t, 'Sample policy for this preview site. Final policies will be reviewed by counsel before launch.') + `<section class="band-paper"><div class="wrap"><div class="legal">${sections.map(s=>`<h3>${s[0]}</h3><p>${s[1]}</p>`).join('')}<p class="note">Last updated October 2026. Questions: ${EMAIL}.</p></div></div></section>`;
V.privacy = () => legal('Privacy policy',[['What we collect','Contact details you give us, program details such as enrollment and staffing, and how the Futures Hub is used.'],['How we use it','To provide the program, support your account, process orders and improve our materials.'],['What we never do','We do not sell personal information and do not use children\'s information for advertising.'],['Website statistics','We count visits to this website with our own analytics server, run by Futures Friends. No outside analytics or advertising company receives anything. It sets no cookies, stores no identifier on your device and does not store your IP address. We record the page name only (never what you type into a form or anything added to the address), the domain of the website that sent you here, campaign tags in links we publish (such as utm_source=tiktok), device type, browser, language and country, and simple actions: which buttons and links are used, whether a form was sent successfully (not what it said), video progress, downloads, storybook opens and how far a long page is scrolled. Visits are grouped with a code that changes every day, so we cannot follow anyone from one day to the next or across other websites. Nothing is recorded in the Teacher and Family Portals or the Training Academy. If your browser sends Do Not Track or Global Privacy Control, nothing is recorded at all. We use these counts only to run and improve the website and to see which channels bring visitors, never for advertising or to build a profile of anyone. Detailed records are deleted after 13 months.<br><button type="button" class="btn soft" data-ff-analytics-toggle aria-pressed="false" style="margin-top:10px">Turn off website statistics on this browser</button>'],['Your choices','You can ask to see, correct or delete your information by contacting us.']]);
V['child-privacy'] = () => legal('Child privacy',[['Collected only through programs','Children\'s information is entered by their child care program or family, not collected from children.'],['Minimal data','The Futures Hub stores only what programs need: first name, age band, attendance, meals and the milestones teachers observe. It does not store health or allergy records, or IEP and IFSP goals.'],['Photos','Child photos are shared only with written family consent, and only with that child\'s family.'],['Website statistics','Pages children may use with an adult, such as Friends, Watch and Bop at Home, are counted the same anonymous way as the rest of the site: no cookies, no names, nothing typed into a form, and a visit code that changes every day. These counts only support the running of the website, as the COPPA Rule allows; they are never used to contact a child, build a profile or advertise. Nothing is recorded in the Family or Teacher Portals.'],['Parental rights','Families can review and request deletion of their child\'s information through their program or by contacting us, consistent with the Children\'s Online Privacy Protection Act.']]);
V.terms = () => legal('Terms',[['License','Program members receive a license to use Futures Friends materials and characters at their licensed location for the term of their membership.'],['Trademarks','Futures Friends, Booker, Lumi, Zuri and Bop are trademarks of the Futures Friends IP owner.'],['Payments','Startup packages are billed when ordered; monthly fees are billed in advance.'],['Changes','We give 90 days\' notice before changing program prices or terms.']]);
V.accessibility = () => legal('Accessibility',[['Our goal','We aim to meet WCAG 2.2 Level AA across this site and the Futures Hub.'],['What we do','Readable type, color contrast, keyboard navigation, text alternatives for images and captions planned for episodes and training video.'],['Tell us','If something is hard to use, contact us and we will help and fix it.']]);

// ---------------------------------------------------------------- router + events
let _lastView=null;
function render(){ const vw=$('#view'); if(vw.removeAttribute) vw.removeAttribute('data-prerender'); vw.innerHTML = (V[view]||V.home)(); document.querySelectorAll('[data-nav]').forEach(b=>b.setAttribute('aria-current', b.dataset.go===view?'page':'false')); const same=_lastView===view+'|'+arg; _lastView=view+'|'+arg; try{ window.FFmotion && window.FFmotion(view, same); }catch(e){ console.warn(e); } }
function go(v, a){ if(!V[v]) v='home'; view=v; arg=a||null; if((v==='portal'||v==='family-portal') && window.FFPortal) window.FFPortal.subscribeKd(); render(); window.scrollTo(0,0); try{ const h='#'+v+(arg?'/'+arg:''); history.replaceState(null,'',(window.FF_PRERENDER && window.FF_PRERENDER!==h.slice(1) ? window.FF_ROOT_PATH+location.search : '')+h); }catch(_){} }
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast._t); toast._t=setTimeout(()=>t.hidden=true,2400); }
function openRecipe(code){ const r=R[code]; if(!r) return;
 $('#dlgBody').innerHTML=`<div style="display:flex;justify-content:space-between;gap:10px;align-items:start"><div><div class="eyebrow">Level ${r.level} · ${LEVELS[r.level]} · ${r.code}</div><h3 id="dlgTitle" style="font-size:26px">${esc(r.name)}</h3></div><button class="btn soft" id="dlgClose">Close</button></div>
 <div style="display:flex;gap:6px;flex-wrap:wrap"><span class="tag">${esc(r.color)}</span><span class="tag">${esc(r.meal)}</span>${r.prep?`<span class="tag">Prep ${esc(r.prep)}</span>`:''}${r.cook?`<span class="tag">Cook ${esc(r.cook)}</span>`:''}${r.cost!=null?`<span class="tag">${money(r.cost)} per serving</span>`:''}</div>
 ${r.credit?`<p class="small"><b>CACFP credit, ages 3 to 5:</b> ${esc(r.credit)}</p>`:''}
 <div class="tw"><table><tr><th>Ingredient</th><th class="n">10 children</th><th class="n">20 children</th><th class="n">40 children</th></tr>${r.ing.map(i=>`<tr><td>${esc(i[0])}</td><td class="n">${esc(i[1])}</td><td class="n">${esc(i[2])}</td><td class="n">${esc(i[3])}</td></tr>`).join('')}</table></div>
 <b>Steps</b><ol class="small">${r.steps.map(s=>`<li>${esc(s)}</li>`).join('')}</ol>`; $('#dlg').showModal(); }
document.addEventListener('click', async e=>{ const t=e.target;
 const g=t.closest('[data-go]'); if(g){ e.preventDefault(); const gp=String(g.dataset.go).split('/'); return gp[1]?go(gp[0],decodeURIComponent(gp[1])):go(gp[0]); }
 const po=t.closest('[data-post]'); if(po) return go('post', po.dataset.post);
 const an=t.closest('[data-anchor]'); if(an){ const el=document.getElementById(an.dataset.anchor); const motion=document.documentElement.dataset.motion!=='off' && !window.matchMedia('(prefers-reduced-motion: reduce)').matches; if(el){ el.scrollIntoView({behavior:motion?'smooth':'auto'}); if(!el.hasAttribute('tabindex')) el.setAttribute('tabindex','-1'); el.focus({preventScroll:true}); } return; }
 const r=t.closest('[data-r]'); if(r) return openRecipe(r.dataset.r);
 const l=t.closest('[data-lvl]'); if(l){ st.lvl=+l.dataset.lvl; return render(); }
 const w=t.closest('[data-wk]'); if(w){ st.wk=+w.dataset.wk; return render(); }
 const ag=t.closest('[data-age]'); if(ag){ st.age=ag.dataset.age; return render(); }
 const h=t.closest('[data-help]'); if(h){ st.help=h.dataset.help; return render(); }
 const p=t.closest('[data-portal]'); if(p){ st.portal=p.dataset.portal; return render(); }
 const k=t.closest('[data-kid]'); if(k){ st.kid=+k.dataset.kid; return render(); }
 const a=t.closest('[data-act]'); if(a) return toast({milestone:'Learning Step note saved to the child\'s portfolio',note:'Note sent to the family app',zone:'Zone change recorded',star:'Friendship Star sent to the family'}[a.dataset.act]);
 const c=t.closest('[data-copy]'); if(c){ try{ await navigator.clipboard.writeText(c.dataset.copy); toast('Copied'); }catch(_){ toast(c.dataset.copy); } return; }
 // #menuT opens the full-screen menu (wayfinding.js, wave 6); it no longer toggles a dropdown here.
 if(t.id==='dlgClose'||t.id==='dlg') $('#dlg').close(); });
document.addEventListener('change', e=>{ const t=e.target; if(t.dataset.q!==undefined){ const q=Math.max(0,Math.floor(+t.value||0)); if(q) st.cart[t.dataset.q]=q; else delete st.cart[t.dataset.q]; render(); const el=document.getElementById(t.id); if(el) el.focus(); } });
document.addEventListener('submit', async e=>{ e.preventDefault(); const f=e.target;
 if(f.id==='signinForm'){ return go(f.dataset.who==='Family'?'family-portal':'portal'); }
 });
window.FFstart = () => { const h0=(location.hash||'').replace('#','').split('/'); go(V[h0[0]]?h0[0]:'home', h0[1]); };
