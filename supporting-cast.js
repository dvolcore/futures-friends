/* Supporting friends expand the story world without replacing the four learning guides.
   Art: every portrait comes from the plush library through FFPlush (plush-cast.js), never a separate copy.
   Honesty: everyone here is a story-world character. Wherever one appears near real-world content (teachers, centers,
   families, enrollment) the markup carries a visible "Story-world character" label, and nobody is presented as staff.
   Names and roles beyond Ms. June are proposals (img/plush/manifest.json `proposed`); the one-line descriptions are story copy. */
(function () {
  'use strict';
  const PL = () => window.FFPlush;
  // The four with a full "try together" activity (the picker on #friends). Story copy unchanged from wave 4.
  const cast = Object.freeze({
    june: {name:'Ms. June',role:'The encouraging teacher',image:'ms-june',color:'#75439d',title:'Small steps. Big stories.',text:'Ms. June is the teacher who notices the quiet one by the window and asks what he sees. Try her picture-talk circle with Booker.',activity:'Picture-talk circle',steps:['Choose a picture book with a grown-up.','Let everyone point to one thing they notice.','Wait for a question. Any question counts.'],route:'curriculum',link:'Discover the curriculum'},
    rowan: {name:'Rowan',role:'A friendly grown-up at drop-off',image:'rowan',color:'#1f6f78',title:'The goodbye at the door.',text:'In the story world, Rowan is the grown-up at the door at drop-off. Practice a goodbye with Lumi and someone you trust, so tomorrow\'s feels familiar.',activity:'Our goodbye ritual',steps:['Pick your goodbye: a wave, a phrase or a gentle high-five.','Practice it once with a grown-up you trust.','Say who will be there next.'],route:'for-families',link:'Bring the discovery home'},
    tilly: {name:'Tilly',role:'The imaginative classmate',image:'tilly',color:'#b0466a',title:'Give the story a new ending.',text:'Tilly is the classmate who adds a surprise to every story. Take a story with Booker and change how it ends.',activity:'A brand-new story ending',steps:['Draw a place you would like to explore.','Add a friend and something surprising.','Tell a grown-up what happens next.'],route:'friends',link:'Explore the storybooks'},
    pip: {name:'Pip',role:'The new friend',image:'pip',color:'#8a5a2b',title:'Copy my rhythm!',text:'Pip is new, and he notices everything. He taps out a little rhythm; Bop copies it, stomps it, makes it bigger. Your turn.',activity:'Copy my happy rhythm',steps:['Clap or tap a simple two-beat rhythm.','Invite a friend to copy it in their own way.','Take turns leading; movement and sound are both welcome.'],route:'curriculum',link:'Find another playful discovery'}
  });
  // Bilingual canon (owner 2026-10-07): Zuri is the bilingual friend: she mixes Spanish words into what she says, Spanish first and then
  // English ("¡Mira! Look!", "¿Qué es esto? What is it?"), and every Spanish word means something in that moment; nobody mocks an accent.
  // A new adult story-world character, the Spanish teacher, leads the daily Spanish Circle (greeting song, Zuri's word of the day, a game).
  // The name is the owner's pick from three proposals (BILINGUAL_PROGRAM_2026-10-07.md); until then the copy says "the Spanish teacher
  // (name TBD)". No plush art exists yet, so she is NOT in `cast`/`more` (every entry there needs an image); `planned` holds her role.
  const planned = Object.freeze({
    spanishTeacher: Object.freeze({ name: 'the Spanish teacher (name TBD)', nameEs: 'la maestra de español (nombre por decidir)', role: 'The Spanish teacher', group: 'school',
      line: 'Leads the Spanish Circle every day: a greeting song, Zuri\'s word of the day and a game everyone can play.', art: null })
  });
  // The rest of the town: who they are, in one line of story copy. `group` places them in town().
  const more = Object.freeze({
    hazel: {name:'Principal Hazel',role:'The principal',image:'principal-hazel',color:'#7a2236',group:'school',line:'Knows every cubby by its felt symbol and greets each family at the door.'},
    moss: {name:'Mr. Moss',role:'The classroom helper',image:'mr-moss',color:'#3f6b3a',group:'school',line:'Rolls out the activity rug, minds the garden beds and never hurries anyone.'},
    fern: {name:'Ms. Fern',role:'A classroom grown-up',image:'ms-fern',color:'#9a3f26',group:'school',line:'Keeps the art shelf stocked and always asks, "What will you try next?"'},
    nico: {name:'Nico',role:'Classmate',image:'nico',color:'#8a4b1f',group:'class',line:'First to the water table and first to offer a turn.'},
    poppy: {name:'Poppy',role:'Classmate',image:'poppy',color:'#a8436f',group:'class',line:'Likes to try one new color at snack time.'},
    finn: {name:'Finn',role:'Classmate',image:'finn',color:'#a6481b',group:'class',line:'Builds tall block towers and laughs when they tumble.'},
    mimi: {name:'Mimi',role:'Classmate',image:'mimi',color:'#62528a',group:'class',line:'Quiet, and notices the tiniest things in every picture.'},
    tad: {name:'Tad',role:'Classmate',image:'tad',color:'#2f6f5c',group:'class',line:'Hops through every movement song.'},
    bruno: {name:'Bruno',role:"Booker's parent",image:'bruno',color:'#94391e',group:'home',line:'Reads one more page at bedtime, every time.'},
    rose: {name:'Rose',role:"Lumi's parent",image:'rose',color:'#843a68',group:'home',line:'Smells the flower and blows the candle with Lumi before bed.'},
    sage: {name:'Sage',role:"Zuri's parent",image:'sage',color:'#3d6b2c',group:'home',line:'Answers a question with another question: "What do you think?"'},
    ella: {name:'Ella',role:"Bop's parent",image:'ella',color:'#795a00',group:'home',line:'Turns carrying the groceries into a team job.'},
    mara: {name:'Mara',role:"Pip's grown-up",image:'mara',color:'#a02a68',group:'home',line:'Helps Pip practice a brave hello on the way in.'}
  });
  const all = Object.freeze(Object.assign({}, cast, more));
  const keys = Object.freeze(Object.keys(cast));
  const allKeys = Object.freeze(Object.keys(all));
  const has = k => Object.prototype.hasOwnProperty.call(all, k);
  const safeKey = key => Object.hasOwn(cast,key) ? key : 'june';
  const anyKey = key => has(key) ? key : 'june';
  const icon = name => `<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#${name}"></use></svg>`;
  const LABEL = 'Story-world character';
  const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
  const esc = v => String(v==null?'':v).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  let guideN = 0;
  // ---------------------------------------------------------------- story-world talking clips (wave 9, VIDEO-READY)
  // Another lane is producing short talking clips (Higgsfield). The coordinator registers each finished file here; until then the map
  // is empty and every card looks and works exactly as it does without clips. Keys, most specific first (clipIds):
  //   '<route>:<character>:<line>'  one card     e.g. 'teacher-standard:june:in-our-story' ('grown-up' counts as one word)
  //   '<route>:<character>'         every card for that character on that route   e.g. 'teacher-standard:fern'
  // <route> = the page the card is on (location hash, 'home' when empty; opts.page overrides), <character> = the supporting-cast key
  // (june, hazel, moss, fern, bruno, rose, sage, ella, ...), <line> = opts.clip or the first three words of the card's line, lowercase,
  // hyphenated. Every card prints its exact one-card key in data-ff-clip-id. Entry: {mp4, webm?, poster, voiced?, ratio?} with site-relative
  // paths (video/..., img/...): mp4 required, voiced = the clip has a voice track (it plays with sound only when the visitor's sound is on
  // and the browser has allowed it), ratio = 'w/h' of the clip (default 4/5).
  // Entries also take loop: true (a silent loop that plays while the card is on screen) and label (the clip's accessible name).
  // Files: video/cast/ (H.264 MP4 + AV1 WebM + WebP poster; talking clips have a .en.vtt registered in captions.js). Receipts:
  // video/cast/manifest.json. All of it is story-world animation of approved plush art, never footage of the real center.
  const cast9 = (mp4,webm,poster,o) => Object.assign({mp4,webm,poster,ratio:'4/5'},o);
  const says = (who,line) => ({voiced:true,label:`Story-world animation: ${who} says: ${line}`});
  const CLIPS = {
    'teacher-standard:june:every-grown-up-in': cast9('video/cast/ff-cast-june-welcome.mp4','video/cast/ff-cast-june-welcome.av1.webm','video/cast/ff-cast-june-welcome-poster.webp',says('Ms. June the giraffe teacher',"Every grown-up in the room starts as a learner. Let's look closely at what that learning asks of them.")),
    'teacher-standard:june:in-our-story': cast9('video/cast/ff-cast-june-two-questions.mp4','video/cast/ff-cast-june-two-questions.av1.webm','video/cast/ff-cast-june-two-questions-poster.webp',says('Ms. June the giraffe teacher','In our story world, I ask the children two questions. Good training asks the grown-ups the same two.')),
    'train-your-staff:june:small-steps-big': cast9('video/cast/ff-cast-june-small-steps.mp4','video/cast/ff-cast-june-small-steps.av1.webm','video/cast/ff-cast-june-small-steps-poster.webp',says('Ms. June the giraffe teacher','Small steps. Big stories. A team learns the same way children do: one clear step, practiced until it sticks.')),
    'train-your-staff:june:what-do-you': cast9('video/cast/ff-cast-june-notice-wonder.mp4','video/cast/ff-cast-june-notice-wonder.av1.webm','video/cast/ff-cast-june-notice-wonder-poster.webp',says('Ms. June the giraffe teacher','What do you notice about your team? What do you wonder? Bring both questions to the conversation.')),
    'teacher-standard:hazel': cast9('video/cast/ff-cast-hazel-law.mp4','video/cast/ff-cast-hazel-law.av1.webm','video/cast/ff-cast-hazel-law-poster.webp',says('Principal Hazel the deer','First things first: before a grown-up teaches, the law asks who they are and whether they are ready.')),
    'teacher-standard:moss': cast9('video/cast/ff-cast-moss-standard.mp4','video/cast/ff-cast-moss-standard.av1.webm','video/cast/ff-cast-moss-standard-poster.webp',says('Mr. Moss the badger','Knowing the rule is the start. Showing it, every day, is the standard.')),
    'teacher-standard:fern': cast9('video/cast/ff-cast-fern-safety.mp4','video/cast/ff-cast-fern-safety.av1.webm','video/cast/ff-cast-fern-safety-poster.webp',says('Ms. Fern the owl','If a grown-up misses a safety question, they go back and learn it again. That is not a failure. That is the point.')),
    'for-families:bruno': cast9('video/cast/ff-cast-bruno-loop.mp4','video/cast/ff-cast-bruno-loop.av1.webm','video/cast/ff-cast-bruno-loop-poster.webp',{loop:true,label:'Story-world animation: Bruno the bear waves hello.'}),
    'for-families:rose': cast9('video/cast/ff-cast-rose-loop.mp4','video/cast/ff-cast-rose-loop.av1.webm','video/cast/ff-cast-rose-loop-poster.webp',{loop:true,label:'Story-world animation: Rose the rabbit does a happy hug.'}),
    'for-families:sage': cast9('video/cast/ff-cast-sage-loop.mp4','video/cast/ff-cast-sage-loop.av1.webm','video/cast/ff-cast-sage-loop-poster.webp',{loop:true,label:'Story-world animation: Sage the turtle waves hello.'}),
    'for-families:ella': cast9('video/cast/ff-cast-ella-loop.mp4','video/cast/ff-cast-ella-loop.av1.webm','video/cast/ff-cast-ella-loop-poster.webp',{loop:true,label:'Story-world animation: Ella the elephant does a happy hug-bounce.'})
  };
  const slug = t => String(t||'').replace(/<[^>]*>/g,' ').toLowerCase().replace(/[^a-z0-9\s-]/g,' ').trim().split(/\s+/).filter(Boolean).slice(0,3).join('-');
  const routeNow = () => { try { const h=(typeof location!=='undefined'&&location.hash)||''; return h.replace(/^#/,'').split('/')[0]||'home'; } catch(_) { return 'home'; } };
  function clipIds(k,text,opts={}){
    const page=String(opts.page||routeNow()).replace(/[^a-z0-9-]/gi,'').toLowerCase()||'home', line=opts.clip?String(opts.clip).toLowerCase().replace(/[^a-z0-9-]/g,''):slug(text);
    return [`${page}:${k}:${line}`,`${page}:${k}`];
  }
  const safePath = p => typeof p==='string' && /^(?:[a-z0-9_-]+\/)*[a-z0-9_.-]+\.(mp4|webm|webp|jpg|jpeg|png)$/i.test(p) && !/\.\./.test(p);
  function cleanClip(c){
    if(!c||typeof c!=='object'||!safePath(c.mp4))return null;
    const r=/^\d{1,2}\/\d{1,2}$/.test(String(c.ratio||''))?String(c.ratio):'4/5';
    return {mp4:c.mp4,webm:safePath(c.webm)?c.webm:'',poster:safePath(c.poster)?c.poster:'',voiced:c.voiced===true&&c.loop!==true,loop:c.loop===true,ratio:r,label:typeof c.label==='string'?c.label.slice(0,300):''};
  }
  // A portrait from the plush library. h = tallest display height in CSS px (picks the 480 or 960 file).
  const portrait = (key,cls='',decorative=false,h=340) => {const f=all[anyKey(key)];return PL().img(f.image,{cls,alt:decorative?'':f.name,h});};
  const lead = (k,h,alt='') => PL().img(k,{alt,h});
  // Two characters side by side at true relative size: heights are var(--box) * scale / tallest scale (supporting-cast.css).
  function duo(a,b,altA,altB,box){
    const sa=scaleOf(a), sb=scaleOf(b), m=Math.max(sa,sb);
    const one=(slug,sc,alt)=>PL().img(slug,{alt,h:Math.round(box*sc/m),style:`--s:${sc}`});
    return `<span class="ff-duo" style="--smax:${m}">${one(a,sa,altA)}${one(b,sb,altB)}</span>`;
  }
  // Children stand at their true size next to grown-ups: both are drawn from one unit, never scaled up (lineup_scale).
  const scaleOf = slug => PL().P[slug].scale;

  function detail(key){
    const f=cast[safeKey(key)];
    return `<div class="ff-community-copy"><span class="px-kicker">${f.role}</span><h3>${f.title}</h3><p>${f.text}</p><div class="ff-community-activity"><span class="px-kicker">Try together / With a grown-up</span><h4>${f.activity}</h4><ol>${f.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div><a class="px-link" href="#${f.route}">${f.link} ${icon('ArrowRight')}</a></div><div class="ff-community-portrait" style="--cast-accent:${f.color}">${portrait(safeKey(key))}<span>${f.name}</span><small class="ff-story-tag">${LABEL}</small></div>`;
  }
  function community(){
    return `<section class="ff-community tx-felt"><div class="wrap"><div class="px-sectionheading"><div><span class="px-kicker">Beyond the Clubhouse</span><h2>Try something with a friend.</h2></div><p>The four are the stars, but the rest of town has five-minute ideas too.<br>Pick someone and try theirs.</p></div><div class="ff-community-choices" role="group" aria-label="Meet the supporting friends">${keys.map(k=>`<button type="button" data-community-friend="${k}" aria-pressed="${k==='june'}" style="--cast-accent:${cast[k].color}">${portrait(k,'',true,85)}<span><b>${cast[k].name}</b><small>${cast[k].role}</small></span></button>`).join('')}</div><div class="ff-community-detail">${detail('june')}</div><p class="ff-cast-status" role="status" aria-live="polite"></p><p class="ff-cast-note">Supporting-character illustration previews, adapted from the supplied model guides. Everyone in town is a story-world character.</p></div></section>`;
  }
  function teacher(context){
    const academy=context==='academy';
    return `<section class="ff-context ff-teacher tx-felt ${academy?'ff-context-compact':''}"><div class="wrap ff-context-inner"><div class="ff-context-art">${duo('ms-june','booker','Ms. June','Booker',300)}<span class="tx-ground" aria-hidden="true"></span></div><div><span class="px-kicker">In the classroom with Ms. June</span><h2>Every question deserves a welcome.</h2><p>${academy?'A story-world companion for thoughtful teaching. Start with a picture, leave room for a question, and listen to each child.':'Alongside Booker, Ms. June invites children to notice, wonder and share. A small classroom moment can open a whole new story.'}</p><blockquote>What do you notice? What do you wonder?</blockquote><a class="px-link" href="#${academy?'curriculum':'academy'}">${academy?'Explore a classroom discovery':'Grow your teaching practice'} ${icon('ArrowRight')}</a><small>Ms. June is a ${LABEL.toLowerCase()}, not a member of our staff. Story-world illustration preview.</small></div></div></section>`;
  }
  function arrival(){
    return `<section class="ff-context ff-arrival tx-felt"><div class="wrap ff-context-inner"><div class="ff-context-art">${duo('rowan','lumi-waving','Rowan','Lumi, waving goodbye',300)}<span class="tx-ground" aria-hidden="true"></span></div><div><span class="px-kicker">A story-world moment with Rowan & Lumi</span><h2>The goodbye at the door.</h2><p>Goodbyes go easier when they are the same every time. Rowan and Lumi have one they use at drop-off. Borrow it.</p><ol><li>Pick your goodbye: a wave, a phrase or a gentle high-five.</li><li>Practice it once with a grown-up you trust.</li><li>Say who will be there next, and what comes after goodbye.</li></ol><a class="px-link" href="#curriculum">Find a discovery to share ${icon('ArrowRight')}</a><small>Rowan is a fictional ${LABEL.toLowerCase()}, not a member of our staff.</small></div></div></section>`;
  }
  // A short story-world call-out: the character's portrait, name, a visible "Story-world character" label so they are never
  // mistaken for a real staff member or family, and one line of copy (the page's voice, never a quote about real people).
  // opts.with = a lead friend (booker|lumi|zuri|bop) who stands beside them at true relative size.
  // Wave 9 (owner: "all these characters ... need to be animated and need to do something special"): the portrait sits in a real
  // <button> ("Ms. Fern says hello") that plays the character's signature action; the card comes alive in the runtime below.
  // opts.video = {mp4, webm, poster, voiced, ratio} (or a CLIPS entry, see clipIds): a story-world talking clip in the portrait slot.
  function guide(key,text,opts={}){
    const k=anyKey(key),f=all[k];
    const buddy=opts.with&&PL().has(opts.with)&&PL().LEADS.includes(opts.with.split('-')[0])?opts.with:null;   // a lead or one of its poses
    const ids=clipIds(k,text,opts), clip=cleanClip(opts.video)||ids.map(id=>cleanClip(own(CLIPS,id)?CLIPS[id]:null)).find(Boolean)||null;
    const uid='ffg'+(++guideN), said=buddy?`${f.name} and ${PL().name(buddy)} say hello`:`${f.name} says hello`;
    let art;
    if(clip){
      // A story-world animation in the portrait slot: the poster first; the <video> and its sources are added only when the card comes
      // near the screen. A parent's loop replaces only the parent: the lead friend's cut-out still stands beside them.
      const btn=`<button type="button" class="ff-vid-btn" data-ff-vid="play" aria-label="Play ${esc(f.name)}'s story-world animation"><svg viewBox="0 0 20 20" aria-hidden="true"><path class="ff-vid-play" d="M7 4.8v10.4l8.4-5.2z"/><path class="ff-vid-pause" d="M6 4.5h3v11H6zM11 4.5h3v11h-3z"/><path class="ff-vid-again" d="M10 4a6 6 0 1 1-5.6 3.9l1.9.7A4 4 0 1 0 10 6v2.4L6.4 5 10 1.6z"/></svg></button>`;
      const poster=clip.poster?`<img class="ff-guide-poster" src="${esc(clip.poster)}" alt="" loading="lazy" decoding="async" draggable="false">`:portrait(k,'ff-guide-poster',true,150);
      const kid=buddy?PL().img(buddy,{cls:'ff-guide-vkid',alt:'',h:96}):'';
      art=`<div class="ff-guide-art ff-guide-video${buddy?' ff-guide-video-duo':''}" style="--vr:${clip.ratio}" data-ff-clip="${esc(JSON.stringify(clip))}" data-ff-describe="${uid}-say"><span class="ff-vframe">${poster}${btn}</span>${kid}<small class="ff-guide-vtag">Story-world animation</small></div>`;
    } else if(buddy){
      art=`<button type="button" class="ff-guide-actor ff-guide-actor-duo" aria-label="${esc(said)}" data-ff-actor="${k}">${duo(f.image,buddy,'','',96).replace('class="ff-duo"','class="ff-duo ff-guide-pair"')}</button>`;
    } else {
      art=`<button type="button" class="ff-guide-art ff-guide-actor" aria-label="${esc(said)}" data-ff-actor="${k}" style="--ar:${PL().ratio(f.image).toFixed(4)}"><span class="ff-rig">${portrait(k,'ff-guide-img',true,96)}</span></button>`;
    }
    return `<div class="ff-guide tx-cream${buddy&&!clip?' ff-guide-duo':''}${clip?' ff-guide-has-video':''}${clip&&buddy?' ff-guide-vduo':''}${opts.cls?' '+opts.cls:''}" role="group" style="--cast-accent:${f.color}" aria-label="${f.name}, story-world character" data-ff-guide="${k}" data-ff-clip-id="${esc(ids[0])}">${art}<div class="ff-guide-copy"><span class="ff-guide-who"><b>${f.name}</b><small>${LABEL}</small></span>${opts.kicker?`<span class="ff-guide-kick">${opts.kicker}</span>`:''}<p id="${uid}-say">${text}</p>${opts.quote?`<blockquote>${opts.quote}</blockquote>`:''}</div></div>`;
  }
  // A small story-world figure group standing on felt grass (empty states, the 404, page corners): a few characters at their
  // true relative heights, named, with the label. keys: supporting keys or lead slugs. unit = px height of a 1.0-scale grown-up.
  function cameo(list,opts={}){
    const unit=opts.unit||150; // px of a 1.0-scale grown-up; CSS may override --u responsively when opts.unit is not given
    const items=list.map(x=>has(x)?{slug:all[x].image,name:all[x].name}:(PL().has(x)?{slug:x,name:PL().name(x)}:null)).filter(Boolean);
    if(!items.length)return '';
    const names=items.map(i=>i.name), said=names.length>1?names.slice(0,-1).join(', ')+' and '+names[names.length-1]:names[0];
    return `<figure class="ff-cameo${opts.cls?' '+opts.cls:''}"${opts.unit?` style="--u:${unit}px"`:''}><span class="ff-cameo-row">${items.map(i=>`<span class="ff-cameo-fig" style="--s:${scaleOf(i.slug)};--ar:${PL().ratio(i.slug).toFixed(4)}">${PL().img(i.slug,{alt:'',h:Math.round(unit*scaleOf(i.slug))})}</span>`).join('')}</span><span class="tx-ground" aria-hidden="true"></span><figcaption>${opts.caption?opts.caption+' ':''}<span class="ff-story-tag">${items.length>1?'Story-world characters':LABEL}: ${said}</span></figcaption></figure>`;
  }
  // #friends: everyone in the story world on three felt-grass shelves, drawn from ONE height unit so grown-ups are grown-up
  // sized and children stand about 55 to 65 percent as tall (manifest lineup_scale). Names under each; roles are story copy.
  const TOWN=[
    ['school','At school',['june','hazel','moss','fern']],
    ['home','At home',['bruno','rose','sage','ella','mara','rowan']],
    ['class','In the classroom',['booker','lumi','zuri','bop','pip','nico','tilly','poppy','finn','mimi','tad']]];
  const LEAD_ROLE={booker:'Learn and Smile',lumi:'Belong and Reset',zuri:'Explore and Nourish',bop:'Move and Outside'};
  function town(){
    // the two grown-up shelves share one slot height, so their ground lines line up when they sit side by side
    const adultMax=Math.max(...TOWN.filter(t=>t[0]!=='class').flatMap(t=>t[2]).map(k=>scaleOf(all[k].image)));
    const fig=k=>{
      const isLead=PL().LEADS.includes(k), slug=isLead?k:all[k].image, nm=isLead?PL().name(k):all[k].name, role=isLead?LEAD_ROLE[k]:all[k].role, col=isLead?`var(--${k})`:all[k].color;
      return `<li class="ff-townie${isLead?' ff-townie-lead':''}" style="--s:${scaleOf(slug)};--ar:${PL().ratio(slug).toFixed(4)};--cast-accent:${col}"><span class="ff-townie-slot"><span class="ff-townie-art">${PL().img(slug,{alt:'',h:Math.round(230*scaleOf(slug))})}</span></span><span class="tx-ground" aria-hidden="true"></span><b>${nm}</b><small>${role}</small></li>`;
    };
    return `<section class="ff-town tx-cloud" aria-labelledby="ff-town-h"><div class="wrap"><div class="ff-town-head"><h2 id="ff-town-h">Meet the whole town</h2><p>Booker, Lumi, Zuri and Bop have a town around them: grown-ups at school, families at home and classmates on the rug. Everyone here is a story-world character, drawn to scale.</p></div>
<div class="ff-shelves">${TOWN.map(([id,title,list])=>`<div class="ff-shelf ff-shelf-${id}" role="group" aria-labelledby="ff-shelf-${id}" style="--rowmax:${id==='class'?Math.max(...list.map(k=>scaleOf(PL().LEADS.includes(k)?k:all[k].image))):adultMax}"><h3 id="ff-shelf-${id}">${title}</h3><ul class="ff-shelf-row">${list.map(fig).join('')}</ul></div>`).join('')}</div>
<p class="ff-cast-note">Grown-ups and children are shown at their true heights next to each other. Names and roles beyond the four friends and Ms. June are early story-world proposals.</p></div></section>`;
  }
  const profile = key => {const f=all[anyKey(key)];return Object.freeze({name:f.name,role:f.role,color:f.color,title:f.title||f.line,line:f.line||f.text,image:f.image});};
  document.addEventListener('click',event=>{
    const button=event.target.closest('[data-community-friend]');
    if(!button || !Object.hasOwn(cast,button.dataset.communityFriend))return;
    const section=button.closest('.ff-community');
    if(!section)return;
    const key=button.dataset.communityFriend;
    section.querySelectorAll('[data-community-friend]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    section.querySelector('.ff-community-detail').innerHTML=detail(key);
    section.querySelector('.ff-cast-status').textContent=`${cast[key].name}: ${cast[key].activity}`;
  });
  // ================================================================ wave 9: every story-world card comes alive
  // One runtime for every .ff-guide card, every cameo() group and the town on #friends, wherever they are rendered: a MutationObserver
  // finds new ones, an IntersectionObserver wakes them on screen and parks them off screen. Nothing here changes a word, the label,
  // the layout or the roles: everything it adds is aria-hidden decoration positioned on top (no layout shift), and the text is never
  // below 60% opacity. Reduced motion or the site's motion switch = the composed final state (sound still answers an explicit tap).
  // Art rules: the approved cut-out is only moved, rotated or scaled uniformly; the one exception is a subtle squash on landing.
  // RIG: head = [body clip top %, head clip bottom %, pivot]: the portrait is split at the neck into two layers of the SAME image
  // (clip-path), the head layer overlapping the body by a few percent so no seam opens when it tilts. limbs = [name, clip, pivot]:
  // a duplicate layer clipped to one arm or wing, rotated a few degrees around the shoulder; an optional 4th entry (hole) is cut out of
  // the body layer where the limb stands free against the background, so the raised limb leaves no ghost of itself behind.
  const RIG = Object.freeze({
    june:{head:[22,26,'40% 23%'],limbs:[['arm','polygon(60% 37%,100% 35%,100% 57%,70% 57%,64% 52%,60% 49%)','61% 43%','64% 36%,100% 35%,100% 57%,70% 57%,64% 52%']],sig:'present',sfx:'chime',fx:'sparkle'},
    hazel:{head:[27,31,'55% 28%'],sig:'bow',sfx:'chime',fx:'heart'},
    moss:{head:[30,34,'50% 30%'],sig:'nod',sfx:'badge',fx:'check'},
    fern:{head:[34,38,'47% 33%'],limbs:[['wing-l','polygon(6% 36%,20% 33%,32% 31%,47% 37%,46% 50%,38% 57%,26% 61%,20% 68%,12% 70%,4% 64%)','40% 38%'],['wing-r','polygon(72% 37%,100% 40%,100% 66%,80% 68%,76% 62%,75% 50%)','73% 41%','80% 39%,100% 40%,100% 66%,80% 68%']],sig:'flutter',sfx:'wave',fx:'leaf'}
  });
  const ACT = key => RIG[key] || (all[key] && all[key].group==='home' ? {sig:'hug',sfx:'squish',fx:'heart'} : {sig:'hop',sfx:'hop',fx:'sparkle'});
  const ALIVE = (function(){
    if(typeof document==='undefined'||typeof document.querySelectorAll!=='function'||typeof window.IntersectionObserver!=='function'||typeof window.MutationObserver!=='function')return null;
    const D=document, W=window, SPR='img/plush/world8/';
    const mm=q=>typeof W.matchMedia==='function'&&W.matchMedia(q).matches;
    const calm=()=>W.FFMotion&&W.FFMotion.allowed?!W.FFMotion.allowed():(mm('(prefers-reduced-motion: reduce)')||D.documentElement.dataset.motion==='off');
    const fine=()=>mm('(hover: hover) and (pointer: fine)');
    const rnd=(a,b)=>a+Math.random()*(b-a);
    function sfx(name,el){
      let x=0; try{const r=el.getBoundingClientRect();x=Math.max(-1,Math.min(1,(r.left+r.width/2)/W.innerWidth*2-1));}catch(_){/* no layout */}
      D.dispatchEvent(new CustomEvent('ff:sfx',{detail:{name,x:Math.round(x*100)/100}}));
    }
    const play=(el,frames,o)=>{if(!el||typeof el.animate!=='function')return null;const a=el.animate(frames,o);return a;};
    const later=(f,ms)=>setTimeout(f,ms);

    // ------------------------------------------------------------ felt accents (aria-hidden, absolutely placed, removed when done)
    const SVG={
      heart:'<svg viewBox="0 0 24 22"><path d="M12 20.5 3.6 12.4C1 9.8 1.2 5.6 4.2 3.6c2.4-1.6 5.6-1 7.8 1.6 2.2-2.6 5.4-3.2 7.8-1.6 3 2 3.2 6.2.6 8.8z" fill="#d9488b"/><path d="M12 17.6 5.4 11.3C3.6 9.4 3.8 6.8 5.6 5.6c1.7-1.1 4-.5 5.4 1.4l1 1.3 1-1.3c1.4-1.9 3.7-2.5 5.4-1.4 1.8 1.2 2 3.8.2 5.7z" fill="none" stroke="#fde3ee" stroke-width="1" stroke-dasharray="2 1.6" stroke-linecap="round"/></svg>',
      leaf:'<svg viewBox="0 0 24 24"><path d="M4 20C3 11 9 4 21 3c0 11-6 18-17 17z" fill="#6f8f4e"/><path d="M5.5 18.5 18 6M10 14l-3.2-.6M13 11l-.4-3.4M10 14l.6 3.2" fill="none" stroke="#dfe9c8" stroke-width="1" stroke-dasharray="2 1.5" stroke-linecap="round"/></svg>',
      check:'<svg viewBox="0 0 28 28"><circle cx="14" cy="14" r="12.5" fill="#3f6b3a"/><circle cx="14" cy="14" r="10.4" fill="none" stroke="#cfe3c4" stroke-width="1" stroke-dasharray="2.2 1.8"/><path class="ff-fx-tick" d="M8.4 14.6l3.7 3.6 7.6-8" fill="none" stroke="#fffaf0" stroke-width="2.8" stroke-linecap="round" stroke-linejoin="round" pathLength="1"/></svg>'
    };
    function fx(card,type,at,n,still){
      const layer=card.querySelector('.ff-fx'), box=at.el||card;
      if(!layer||!box)return;
      let cr,br; try{cr=card.getBoundingClientRect();br=box.getBoundingClientRect();}catch(_){return;}
      const x0=br.left-cr.left+br.width*at.x, y0=br.top-cr.top+br.height*at.y;
      for(let i=0;i<n;i++){
        const p=D.createElement('span'); p.className='ff-fx-bit ff-fx-'+type;
        if(type==='sparkle')p.innerHTML=i===0?`<img src="${SPR}sparkle-burst-160.webp" alt="" width="160" height="160" decoding="async" draggable="false">`:`<img src="${SPR}star-s-40.webp" alt="" width="40" height="40" decoding="async" draggable="false">`;
        else p.innerHTML=SVG[type];
        if(type==='sparkle'&&i>0)p.classList.add('ff-fx-star');
        p.style.left=x0+'px'; p.style.top=y0+'px'; layer.appendChild(p);
        const done=()=>p.remove();
        if(still){const a=play(p,[{opacity:0},{opacity:1,offset:.25},{opacity:1,offset:.7},{opacity:0}],{duration:1100,delay:i*120,fill:'both'});if(a)a.onfinish=done;else later(done,1300);continue;}
        const ang=type==='leaf'?(i%2?1:-1)*rnd(30,70):type==='heart'?rnd(12,58)*(i===1?.4:1):type==='check'?rnd(-6,6):rnd(-80,80), dist=type==='sparkle'?rnd(14,30):type==='check'?12:rnd(22,40), dx=Math.sin(ang*Math.PI/180)*dist, dy=-Math.abs(Math.cos(ang*Math.PI/180))*dist-(type==='heart'?14:type==='leaf'?-10:4);
        const spin=type==='leaf'?rnd(-160,160):type==='heart'?rnd(-14,14):rnd(-40,40), dur=type==='leaf'?1500:type==='check'?1400:950;
        const a=play(p,[{opacity:0,transform:'translate(-50%,-50%) scale(.3) rotate(0deg)'},{opacity:1,transform:`translate(calc(-50% + ${dx*.45}px),calc(-50% + ${dy*.45}px)) scale(1.08) rotate(${spin*.4}deg)`,offset:.3},{opacity:1,transform:`translate(calc(-50% + ${dx*.8}px),calc(-50% + ${dy*.8}px)) scale(1) rotate(${spin*.8}deg)`,offset:.72},{opacity:0,transform:`translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.86) rotate(${spin}deg)`}],{duration:type==='check'?dur:dur+i*60,delay:i*90,easing:'cubic-bezier(.2,.8,.3,1)',fill:'both'});
        if(type==='check'){const t=p.querySelector('.ff-fx-tick');if(t)play(t,[{strokeDashoffset:1},{strokeDashoffset:1,offset:.18},{strokeDashoffset:0,offset:.5},{strokeDashoffset:0}],{duration:dur,fill:'both',easing:'ease-out'});}
        if(a)a.onfinish=done;else later(done,dur+400);
      }
    }

    // ------------------------------------------------------------ one card: rig, stitch, accents layer, bubbles
    let uid=0;
    const questions=card=>{
      const q=card.querySelector('.ff-guide-copy blockquote'), p=card.querySelector('.ff-guide-copy p');
      const src=((q&&q.textContent)||'')+' '+((p&&p.textContent)||'');
      const qs=(src.match(/[^.?!]*\?/g)||[]).map(s=>s.trim()).filter(s=>/\b(notice|wonder)\b/i.test(s));
      const seen=new Set(), out=[]; qs.forEach(s=>{const k=s.toLowerCase();if(!seen.has(k)&&out.length<2){seen.add(k);out.push(s);}});
      return out.length===2&&/notice/i.test(out[0])&&/wonder/i.test(out[1])?out:null;
    };
    function rig(card,key){
      const btn=card.querySelector('.ff-guide-actor:not(.ff-guide-actor-duo)'), base=btn&&btn.querySelector('.ff-guide-img'), cfg=RIG[key];
      if(!btn||!base)return;
      card._rig=btn.querySelector('.ff-rig');
      if(!cfg)return;
      const part=(cls,clip,pivot)=>{const s=D.createElement('span');s.className='ff-part '+cls;s.setAttribute('aria-hidden','true');s.style.clipPath=clip;s.style.transformOrigin=pivot;const c=base.cloneNode(false);c.removeAttribute('id');c.alt='';c.className='ff-part-img';c.removeAttribute('loading');c.style.clipPath='';s.appendChild(c);card._rig.appendChild(s);return s;};
      if(cfg.head)card._head=part('ff-head',`inset(0 0 ${100-cfg.head[1]}% 0)`,cfg.head[2]);
      card._limbs={}; (cfg.limbs||[]).forEach(([n,clip,pv])=>{card._limbs[n]=part('ff-limb ff-'+n,clip,pv);});
      // the body: everything below the neck, minus any free-standing limb (evenodd holes, each path returning to the corner)
      const top=cfg.head?cfg.head[0]:0, holes=(cfg.limbs||[]).filter(l=>l[3]).map(l=>`,${l[3]},${l[3].split(',')[0]},0% ${top}%`).join('');
      if(cfg.head||holes)base.style.clipPath=`polygon(evenodd,0% ${top}%,100% ${top}%,100% 100%,0% 100%,0% ${top}%${holes})`;
    }
    function wake(card){
      card.setAttribute('data-ff-live','');
      const key=card.dataset.ffGuide||'june'; card._act=ACT(key); card._anims=[];
      if(!card.querySelector(':scope > .ff-stitch')){
        const id='ffst'+(++uid);
        card.insertAdjacentHTML('afterbegin',`<svg class="ff-stitch" aria-hidden="true" focusable="false"><defs><mask id="${id}" maskUnits="userSpaceOnUse"><rect class="ff-stitch-draw" x="0" y="0" width="100%" height="100%" rx="10" pathLength="1"/></mask></defs><rect class="ff-stitch-line" x="0" y="0" width="100%" height="100%" rx="10" mask="url(#${id})"/></svg><span class="ff-fx" aria-hidden="true"></span>`);
      }
      const qs=questions(card);
      if(qs&&key==='june'){card.insertAdjacentHTML('beforeend',`<span class="ff-bubbles" aria-hidden="true">${qs.map(q=>`<span class="ff-bubble">${esc(q)}</span>`).join('')}</span>`);card._bubbles=[...card.querySelectorAll('.ff-bubble')];}
      rig(card,key);
      const vslot=card.querySelector('.ff-guide-video'); if(vslot)video(card,vslot);
      vis.observe(card);
    }
    // ------------------------------------------------------------ entrance: hop + land, stitch draws, the line writes on
    function writeOn(card){
      const blocks=[...card.querySelectorAll('.ff-guide-copy p, .ff-guide-copy blockquote')];
      const spans=[];
      blocks.forEach(b=>{
        const walk=D.createTreeWalker(b,4), texts=[]; while(walk.nextNode())texts.push(walk.currentNode);
        texts.forEach(t=>{const parts=t.nodeValue.split(/(\s+)/); if(parts.length<2&&!parts[0])return; const frag=D.createDocumentFragment(); parts.forEach(w=>{if(!w)return; if(/^\s+$/.test(w)){frag.appendChild(D.createTextNode(w));return;} const s=D.createElement('span');s.className='ff-w';s.textContent=w;frag.appendChild(s);spans.push(s);}); t.parentNode.replaceChild(frag,t);});
      });
      if(!spans.length)return 0;
      // lines by their top edge: one layout read, then delays (line by line, left to right inside a line)
      const tops=spans.map(s=>s.offsetTop), lines=[]; let cur=null;
      spans.forEach((s,i)=>{if(cur===null||Math.abs(tops[i]-cur.top)>4){cur={top:tops[i],ws:[]};lines.push(cur);}cur.ws.push(s);});
      lines.forEach((l,li)=>l.ws.forEach((s,wi)=>s.style.setProperty('--d',Math.round(120+li*230+wi/Math.max(1,l.ws.length)*210)+'ms')));
      card.classList.add('ff-writing');
      const total=120+lines.length*230+420;
      later(()=>{card.classList.remove('ff-writing');blocks.forEach(b=>{b.querySelectorAll('.ff-w').forEach(s=>s.replaceWith(D.createTextNode(s.textContent)));b.normalize();});if(card._paint)card._paint();},total+80);
      return total;
    }
    function enter(card){
      if(card._entered)return; card._entered=true;
      if(calm()){card.classList.add('ff-still');return;}
      const r=card._rig||card.querySelector('.ff-guide-actor .ff-duo')||card.querySelector('.ff-guide-video');
      card.classList.add('ff-draw');
      later(()=>card.classList.remove('ff-draw'),1400);
      if(r){
        play(r,[{transform:'translateY(46%)',opacity:0},{transform:'translateY(-9%)',opacity:1,offset:.42,easing:'cubic-bezier(.3,0,.6,1)'},{transform:'translateY(0) scale(1.05,.95)',offset:.66},{transform:'translateY(-1.5%)',offset:.82},{transform:'none'}],{duration:760,easing:'cubic-bezier(.2,.75,.3,1)',fill:'backwards'});
        sfx('hop',card); later(()=>sfx('land',card),500);
      }
      writeOn(card);
      if(!card._clip)later(()=>{if(card.isConnected)sign(card,false);},880);
    }
    // ------------------------------------------------------------ signature actions
    function stop(card){(card._anims||[]).forEach(a=>{try{a.cancel();}catch(_){}});card._anims=[];}
    function sign(card,loud){
      const act=card._act||{sig:'hop',sfx:'hop',fx:'sparkle'}, still=calm();
      if(loud)sfx(act.sfx,card);
      const actor=card.querySelector('.ff-guide-actor')||card.querySelector('.ff-guide-video'), r=card._rig||actor;
      const A=(el,fr,o)=>{const a=play(el,fr,Object.assign({fill:'none'},o));if(a)card._anims.push(a);return a;};
      card._lastSign=Date.now();
      if(still){fx(card,act.fx==='check'?'check':act.fx,{el:actor,x:.75,y:.3},1,true);if(card._bubbles)bubbles(card,loud,true);return;}
      stop(card);
      const H=card._head, L=card._limbs||{}, at=(x,y)=>({el:r,x,y});
      switch(act.sig){
        case 'present':
          A(r,[{transform:'none'},{transform:'rotate(3deg)',offset:.28},{transform:'rotate(3deg)',offset:.78},{transform:'none'}],{duration:1500,easing:'ease-in-out'});
          if(L.arm)A(L.arm,[{transform:'none'},{transform:'rotate(-24deg)',offset:.26},{transform:'rotate(-14deg)',offset:.42},{transform:'rotate(-24deg)',offset:.58},{transform:'rotate(-18deg)',offset:.8},{transform:'none'}],{duration:1500,easing:'ease-in-out'});
          if(H)A(H,[{transform:'none'},{transform:'rotate(9deg)',offset:.3},{transform:'rotate(8deg)',offset:.75},{transform:'none'}],{duration:1500,easing:'ease-in-out'});
          later(()=>fx(card,'sparkle',at(.98,.42),3),300);
          if(card._bubbles)later(()=>bubbles(card,loud,false),260);
          break;
        case 'bow':
          if(H)A(H,[{transform:'none'},{transform:'translateY(5%) rotate(-11deg)',offset:.32},{transform:'translateY(5%) rotate(-11deg)',offset:.62},{transform:'none'}],{duration:1300,easing:'cubic-bezier(.45,0,.3,1)'});
          A(r,[{transform:'none'},{transform:'translateY(4px)',offset:.32},{transform:'translateY(4px)',offset:.62},{transform:'none'}],{duration:1300,easing:'cubic-bezier(.45,0,.3,1)'});
          later(()=>fx(card,'heart',at(.62,.46),3),420);
          break;
        case 'nod':
          if(H)A(H,[{transform:'none'},{transform:'translateY(6.5%) rotate(2deg)',offset:.2},{transform:'none',offset:.42},{transform:'translateY(5%) rotate(1deg)',offset:.62},{transform:'none'}],{duration:950,easing:'ease-in-out'});
          A(r,[{transform:'none'},{transform:'translateY(1px)',offset:.2},{transform:'none',offset:.42},{transform:'translateY(1px)',offset:.62},{transform:'none'}],{duration:950,easing:'ease-in-out'});
          later(()=>{fx(card,'check',at(1.22,.1),1);fx(card,'sparkle',at(1.22,.1),2);},720);
          break;
        case 'flutter':
          if(L['wing-l'])A(L['wing-l'],[{transform:'none'},{transform:'rotate(24deg)',offset:.18},{transform:'rotate(4deg)',offset:.36},{transform:'rotate(21deg)',offset:.54},{transform:'rotate(2deg)',offset:.72},{transform:'rotate(9deg)',offset:.86},{transform:'none'}],{duration:950,easing:'ease-in-out'});
          if(L['wing-r'])A(L['wing-r'],[{transform:'none'},{transform:'rotate(-24deg)',offset:.18},{transform:'rotate(-4deg)',offset:.36},{transform:'rotate(-21deg)',offset:.54},{transform:'rotate(-2deg)',offset:.72},{transform:'rotate(-9deg)',offset:.86},{transform:'none'}],{duration:950,easing:'ease-in-out'});
          A(r,[{transform:'none'},{transform:'translateY(-6%)',offset:.3},{transform:'translateY(-2%)',offset:.6},{transform:'translateY(-4%)',offset:.8},{transform:'none'}],{duration:950,easing:'ease-in-out'});
          if(H)A(H,[{transform:'none'},{transform:'none',offset:.45},{transform:'rotate(-8deg)',offset:.68},{transform:'rotate(-8deg)',offset:.86},{transform:'none'}],{duration:1700,easing:'ease-in-out'});
          later(()=>fx(card,'leaf',at(.5,.5),3),260);
          break;
        case 'hug': {
          const imgs=[...actor.querySelectorAll('img')], a=imgs[0], b=imgs[1];
          if(a)A(a,[{transform:'none'},{transform:'rotate(5deg)',offset:.25},{transform:'rotate(5deg) translateY(-7%)',offset:.42},{transform:'rotate(5deg)',offset:.56},{transform:'rotate(4deg) translateY(-4%)',offset:.7},{transform:'rotate(4deg)',offset:.82},{transform:'none'}],{duration:1300,easing:'ease-in-out'});
          if(b)A(b,[{transform:'none'},{transform:'rotate(-6deg)',offset:.25},{transform:'rotate(-6deg) translateY(-9%)',offset:.42},{transform:'rotate(-6deg)',offset:.56},{transform:'rotate(-5deg) translateY(-5%)',offset:.7},{transform:'rotate(-5deg)',offset:.82},{transform:'none'}],{duration:1300,easing:'ease-in-out'});
          if(!b&&r)A(r,[{transform:'none'},{transform:'rotate(-4deg)',offset:.25},{transform:'rotate(4deg)',offset:.6},{transform:'none'}],{duration:1000,easing:'ease-in-out'});
          later(()=>fx(card,'heart',{el:actor,x:.5,y:.12},3),380);
          break; }
        default:
          A(r,[{transform:'none'},{transform:'translateY(-12%)',offset:.4},{transform:'translateY(0) scale(1.04,.96)',offset:.7},{transform:'none'}],{duration:640,easing:'ease-out'});
          later(()=>fx(card,'sparkle',at(.5,.1),2),200);
      }
    }
    function bubbles(card,loud,still){card._bubbles.forEach((b,i)=>bubble(card,b,i*560,still,loud));}
    // ------------------------------------------------------------ idle: breathing (CSS, only on screen), a head tilt now and then, looking at the pointer
    const live=new Set();
    let tickId=0;
    function tick(){
      tickId=0; if(D.visibilityState==='hidden'||!live.size)return;
      const now=Date.now();
      live.forEach(card=>{
        if(!card.isConnected){live.delete(card);return;}
        if(calm()||!card._entered)return;
        if(!card._next){card._next=now+rnd(4000,8000);return;}
        if(now<card._next||now-(card._lastSign||0)<3000)return;
        card._next=now+rnd(5500,10000);
        const H=card._head, r=card._rig;
        if(H){const d=Math.random()<.5?-1:1;play(H,[{transform:'none'},{transform:`rotate(${d*3.5}deg)`,offset:.35},{transform:`rotate(${d*3.5}deg)`,offset:.6},{transform:'none'}],{duration:1900,easing:'ease-in-out'});}
        else if(r&&card._act&&card._act.sig==='hug'){const imgs=card.querySelectorAll('.ff-guide-actor-duo img');const b=imgs[imgs.length-1];if(b)play(b,[{transform:'none'},{transform:'translateY(-6%)',offset:.3},{transform:'none',offset:.55},{transform:'translateY(-3%)',offset:.75},{transform:'none'}],{duration:900,easing:'ease-in-out'});}
      });
      tickId=setTimeout(tick,1200);
    }
    const kick=()=>{if(!tickId&&live.size)tickId=setTimeout(tick,1200);};
    let px=null, lookRaf=0;
    function look(){
      lookRaf=0; if(calm())return;
      live.forEach(card=>{
        const a=card.querySelector('.ff-guide-actor'); if(!a||!card._entered)return;
        let v=0; if(px){const r=a.getBoundingClientRect();const dx=px[0]-(r.left+r.width/2), dy=px[1]-(r.top+r.height*.25);v=Math.max(-1,Math.min(1,dx/360))*(card._head?6:2)*(Math.abs(dy)<700?1:.4);}
        a.style.setProperty('--look',(Math.round(v*10)/10)+'deg');
      });
    }
    D.addEventListener('pointermove',e=>{if(e.pointerType!=='mouse'||!fine())return;px=[e.clientX,e.clientY];if(!lookRaf)lookRaf=requestAnimationFrame(look);},{passive:true});
    D.documentElement.addEventListener('mouseleave',()=>{px=null;if(!lookRaf)lookRaf=requestAnimationFrame(look);});
    D.addEventListener('visibilitychange',()=>{if(D.visibilityState!=='hidden')kick();});

    const vis=new IntersectionObserver(es=>es.forEach(e=>{
      const card=e.target;
      if(!card.isConnected){vis.unobserve(card);live.delete(card);return;}
      if(e.isIntersecting){live.add(card);card.classList.add('ff-on');if(e.intersectionRatio>=.3)enter(card);kick();}
      else{live.delete(card);card.classList.remove('ff-on');if(card._v&&!card._v.paused)card._v.pause();}
    }),{threshold:[0,.3,.6]});

    // ------------------------------------------------------------ a story-world talking clip in the portrait slot (VIDEO-READY)
    function soundOK(){
      const S=W.FFSound; if(!S||typeof S.enabled!=='function'||!S.enabled())return false;
      if(typeof S.unlocked==='function'&&S.unlocked())return true;
      // the visitor's own tap or key right now (e.g. the replay button) lets the browser play the voice even before sound.js has
      // woken its AudioContext (that resume is asynchronous); a muted retry still covers a browser that says no
      const UA=W.navigator&&W.navigator.userActivation; return !!(UA&&(UA.isActive||(typeof S.unlocked!=='function'&&UA.hasBeenActive)));
    }
    // The card's own line is the transcript (aria-describedby). When the browser has the CSS Custom Highlight API, the registered .vtt
    // track drives it instead of drawing captions over a 112 px picture: the words on the card light up as they are spoken. Without
    // that API the track simply shows as captions. A cue that matches one of Ms. June's questions pops its speech bubble right then.
    const HL=typeof W.Highlight==='function'&&W.CSS&&W.CSS.highlights?new W.Highlight():null;
    if(HL)W.CSS.highlights.set('ff-say',HL);
    const flat=t=>String(t||'').replace(/\s+/g,' ').trim().toLowerCase();
    function rangeOf(card,said){
      const want=flat(said); if(!want)return null;
      for(const el of card.querySelectorAll('.ff-guide-copy p, .ff-guide-copy blockquote')){
        const walk=D.createTreeWalker(el,4), nodes=[]; let full='';
        while(walk.nextNode()){nodes.push([walk.currentNode,full.length]);full+=walk.currentNode.nodeValue;}
        const at=full.toLowerCase().indexOf(want); if(at<0)continue;
        const pos=i=>{for(let n=nodes.length-1;n>=0;n--)if(i>=nodes[n][1])return [nodes[n][0],Math.min(i-nodes[n][1],nodes[n][0].nodeValue.length)];return [nodes[0][0],0];};
        const r=D.createRange(), a=pos(at), b=pos(at+want.length); r.setStart(a[0],a[1]); r.setEnd(b[0],b[1]); return r;
      }
      return null;
    }
    function video(card,slot){
      let clip; try{clip=JSON.parse(slot.dataset.ffClip);}catch(_){return;}
      const frame=slot.querySelector('.ff-vframe')||slot, btn=slot.querySelector('.ff-vid-btn'), name=(card.querySelector('.ff-guide-who b')||{}).textContent||'';
      const label=st=>`${st==='pause'?'Pause':st==='again'?'Replay':'Play'} ${name}'s story-world animation`;
      const state=st=>{btn.dataset.ffVid=st;btn.setAttribute('aria-label',label(st));};
      const saver=()=>!!(W.navigator&&W.navigator.connection&&W.navigator.connection.saveData);
      card._clip=clip;
      let v=null, auto=false, held=false, said=null, popped=new Set();
      const paint=()=>{
        if(!v)return; const t=v.textTracks&&v.textTracks[0]; const cue=t&&t.activeCues&&t.activeCues[0], text=cue?cue.text:'';
        if(HL){if(said)HL.delete(said);said=null;if(text&&!card.classList.contains('ff-writing')){said=rangeOf(card,text);if(said)HL.add(said);}}
        (card._bubbles||[]).forEach((b,i)=>{const q=flat(b.textContent).replace(/\?$/,'');if(text&&flat(text).includes(q)&&!popped.has(i)){popped.add(i);bubble(card,b,0,calm(),false);}});
      };
      card._paint=paint;
      const make=()=>{
        if(v)return v;
        v=D.createElement('video'); v.className='ff-guide-clip'; v.muted=true; v.playsInline=true; v.setAttribute('playsinline',''); v.preload='none'; v.loop=!!clip.loop;
        if(clip.poster)v.poster=clip.poster;
        v.setAttribute('aria-label',clip.label||`Story-world animation: ${name}`); v.setAttribute('aria-describedby',slot.dataset.ffDescribe);
        if(clip.webm){const s=D.createElement('source');s.src=clip.webm;s.type='video/webm; codecs="av01.0.04M.08'+(clip.voiced?', opus':'')+'"';v.appendChild(s);}
        const m=D.createElement('source');m.src=clip.mp4;m.type='video/mp4';v.appendChild(m);
        if(W.FFCaptions&&typeof W.FFCaptions.tracks==='function')v.insertAdjacentHTML('beforeend',W.FFCaptions.tracks(clip.mp4));
        const tr=v.querySelector('track');
        if(tr&&tr.track){if(HL)tr.track.mode='hidden';tr.track.addEventListener('cuechange',paint);}
        v.addEventListener('playing',()=>{slot.classList.add('ff-playing');state('pause');});
        v.addEventListener('pause',()=>{if(!v.ended)state('play');if(said&&HL){HL.delete(said);said=null;}});
        v.addEventListener('ended',()=>{
          slot.classList.remove('ff-playing');state('again');if(said&&HL){HL.delete(said);said=null;}
          // the line is finished: a small felt flourish, and Ms. June's two questions if her clip did not just say them
          const act=card._act||{}; if(act.fx)fx(card,act.fx,{el:frame,x:.9,y:.12},act.fx==='check'?1:3,calm());
          if(card._bubbles&&!popped.size)bubbles(card,false,calm());
        });
        frame.insertBefore(v,btn); card._v=v; return v;
      };
      const go=()=>{make(); held=false; popped=new Set(); v.muted=!(clip.voiced&&soundOK()); if(v.ended)v.currentTime=0; const p=v.play(); if(p&&p.catch)p.catch(()=>{if(!v.muted){v.muted=true;v.play().catch(()=>{});}});};
      const toggle=()=>{if(v&&!v.paused&&!v.ended){v.pause();held=true;}else go();};
      btn.addEventListener('click',toggle);
      frame.addEventListener('click',e=>{if(!e.target.closest('.ff-vid-btn'))toggle();});
      const near=new IntersectionObserver(es=>es.forEach(e=>{if(!e.isIntersecting)return;near.disconnect();if(!calm()&&!saver())make();}),{rootMargin:'300px 0px'});
      near.observe(slot);
      // talking clip: once, when the card is well in view. Silent loop: while it is on screen (unless the visitor paused it).
      const seen=new IntersectionObserver(es=>es.forEach(e=>{
        const ok=e.isIntersecting&&e.intersectionRatio>=(clip.loop?.3:.6);
        if(clip.loop){if(ok&&!held&&!calm()&&!saver()&&(!v||v.paused))go();return;}
        if(!ok||auto)return; auto=true; if(calm()||saver())return; go();
      }),{threshold:[0,.3,.6]});
      seen.observe(slot);
      card._video={go,toggle,state:()=>btn.dataset.ffVid};
    }
    function bubble(card,b,delay,still,loud){
      const fr=still?[{opacity:0},{opacity:1,offset:.12},{opacity:1,offset:.88},{opacity:0}]:[{opacity:0,transform:'translateY(8px) scale(.35)'},{opacity:1,transform:'translateY(-3px) scale(1.07)',offset:.08},{opacity:1,transform:'none',offset:.13},{opacity:1,transform:'none',offset:.9},{opacity:0,transform:'translateY(-6px) scale(.92)'}];
      const a=play(b,fr,{duration:4200,delay,easing:'ease-out',fill:'both'}); if(a)card._anims.push(a);
      if(loud)later(()=>sfx('letter-pop',card),delay+40);
    }

    // ------------------------------------------------------------ the town and cameo groups: they hop onto their spot, breathe, and answer a tap
    function wakeGroup(g){
      g.setAttribute('data-ff-live','');
      const figs=[...g.querySelectorAll('.ff-townie-art img, .ff-cameo-fig img')];
      figs.forEach(im=>{im.style.setProperty('--bd',rnd(3.6,5.2).toFixed(2)+'s');im.style.setProperty('--bdl',(-rnd(0,4)).toFixed(2)+'s');});
      g._figs=figs; gvis.observe(g);
    }
    const gvis=new IntersectionObserver(es=>es.forEach(e=>{
      const g=e.target; if(!g.isConnected){gvis.unobserve(g);return;}
      g.classList.toggle('ff-on',e.isIntersecting);
      if(e.isIntersecting&&e.intersectionRatio>=.2&&!g._entered){
        g._entered=true; if(calm())return;
        const rect=g.getBoundingClientRect();
        g._figs.forEach((im,i)=>{const r=im.getBoundingClientRect();if(r.bottom<0||r.top>W.innerHeight)return;play(im,[{transform:'translateY(40%)',opacity:0},{transform:'translateY(-10%)',opacity:1,offset:.45},{transform:'translateY(0) scale(1.04,.96)',offset:.7},{transform:'none'}],{duration:640,delay:Math.round((r.left-rect.left)/Math.max(1,rect.width)*420+(i%3)*30),easing:'cubic-bezier(.2,.75,.3,1)',fill:'backwards'});});
        sfx('hop',g);
      }
    }),{threshold:[0,.2]});
    function poke(im){
      const g=im.closest('[data-ff-live]'); const slug=im.dataset.plush, child=!!(slug&&PL().P[slug]&&PL().P[slug].age==='child');
      sfx(child?'hop':'wave',im);
      if(calm())return;
      play(im,child?[{transform:'none'},{transform:'translateY(-14%)',offset:.4},{transform:'translateY(0) scale(1.04,.96)',offset:.7},{transform:'none'}]:[{transform:'none'},{transform:'rotate(-5deg)',offset:.25},{transform:'rotate(5deg)',offset:.6},{transform:'none'}],{duration:child?620:900,easing:'ease-in-out'});
      if(g){let fxl=g.querySelector(':scope > .ff-fx');if(!fxl){g.insertAdjacentHTML('beforeend','<span class="ff-fx" aria-hidden="true"></span>');fxl=g.querySelector(':scope > .ff-fx');}fx(g,'sparkle',{el:im,x:.5,y:.08},2);}
    }

    // ------------------------------------------------------------ wiring
    D.addEventListener('click',e=>{
      const t=e.target; if(!t||!t.closest)return;
      const b=t.closest('.ff-guide-actor'); if(b){const card=b.closest('.ff-guide');if(card)sign(card,true);return;}
      const im=t.closest('.ff-townie, .ff-cameo-fig'); if(im){const i=im.querySelector('img');if(i)poke(i);}
    });
    let scanRaf=0;
    function scan(){
      scanRaf=0;
      D.querySelectorAll('.ff-guide:not([data-ff-live])').forEach(wake);
      D.querySelectorAll('.ff-town:not([data-ff-live])').forEach(t=>{t.setAttribute('data-ff-live','');t.querySelectorAll('.ff-shelf').forEach(wakeGroup);});
      D.querySelectorAll('.ff-cameo:not([data-ff-live])').forEach(wakeGroup);
    }
    const queue=()=>{if(!scanRaf)scanRaf=(W.requestAnimationFrame||setTimeout)(scan);};
    const mo=new MutationObserver(queue);
    const start=()=>{mo.observe(D.body||D.documentElement,{childList:true,subtree:true});scan();};
    if(D.body)start(); else D.addEventListener('DOMContentLoaded',start);
    return Object.freeze({scan,sign:card=>sign(card,true)});
  })();
  window.FFSupporting=Object.freeze({planned,community,teacher,arrival,detail,guide,cameo,town,LABEL,portrait:(key,cls='',decorative=false,h=340)=>portrait(anyKey(key),cls,decorative,h),profile,keys,allKeys,CLIPS,clipIds,RIG,alive:ALIVE});
})();
