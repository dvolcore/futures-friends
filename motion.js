/* Native scrolling and short, optional motion. Hooks still initialize every view. */
(function(){
  'use strict';
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const allowed=()=>!reduced.matches&&document.documentElement.dataset.motion!=='off';
  const bar=document.getElementById('ffprog');
  const top=document.createElement('button');
  top.className='totop';top.type='button';top.setAttribute('aria-label','Back to top');
  top.innerHTML='<svg class="px-icon" aria-hidden="true"><use href="img/ui-icons.svg#ArrowUp"></use></svg>';
  top.onclick=()=>window.scrollTo({top:0,behavior:allowed()?'smooth':'auto'});
  document.body.appendChild(top);
  function onScroll(){
    const h=document.documentElement.scrollHeight-innerHeight;
    if(bar)bar.style.transform='scaleX('+(h>0?Math.min(1,scrollY/h):0)+')';
    top.classList.toggle('on',scrollY>700);
  }
  addEventListener('scroll',onScroll,{passive:true});

  /* Floating dock (visual audit, owner 2026-10-07: "no pictures on top of words"). The Sound/Nature buttons (sound.js .ffs) and this
     back-to-top button float bottom-right. Whenever words or a control (link, button, field, table cell) lie under them, they tuck to a
     thin tab at the screen edge; tapping the tab brings them back for a few seconds. Over a picture or empty space they stay out (decorative layers on top, like the Booker walk path, are looked through).
     Checked when scrolling settles, on resize and on route changes; only class toggles, no layout reads during the scroll itself. */
  const R=document.documentElement;let pinUntil=0,settle;
  const dockEls=()=>[...document.querySelectorAll('.ffs .ffs-btn:not([hidden]),.ffs .ffs-hint:not([hidden]),.totop.on')];   // the one-time 'Tap for sound' tag counts too
  const CTRL='a,button,input,select,textarea,summary,label,[role=button],[role=tab],td,th';
  // A card body: a box narrower than the page with its own fill or outline (cards, tiles, notes), or anything marked .card / li.
  // Full-width bands and the hero picture are not cards, so over them the dock stays out. (visual audit follow-up, #for-centers 1280)
  function cardBody(e,cs){
    if(e.matches('.card,li,article'))return true;
    const r=e.getBoundingClientRect();if(r.width>=innerWidth*.86||r.width<60||r.height<40)return false;
    const m=/rgba?\(([^)]+)\)/.exec(cs.backgroundColor),a=m?+(m[1].split(/[ ,/]+/).filter(Boolean)[3]??1):0;
    return a>.35||(parseFloat(cs.borderTopWidth)>0&&cs.borderTopStyle!=='none'&&parseFloat(cs.borderLeftWidth)>0);
  }
  function underDock(){
    const els=dockEls();if(!els.length)return false;
    for(const w of els){
      const r=w.getBoundingClientRect();if(!r.width)continue;
      const pad=6,xs=[r.left-pad,r.left+r.width/2,r.right+pad],ys=[r.top-pad,r.top+r.height/2,r.bottom+pad];
      for(const x of xs)for(const y of ys){
        if(x<0||y<0||x>=innerWidth||y>=innerHeight)continue;
        for(const e of document.elementsFromPoint(x,y)){
          if(e.closest('.ffs,.totop'))continue;
          if(e===document.body||e===R)break;
          const c=e.closest(CTRL);if(c&&!c.closest('.ffs,.totop'))return true;
          for(const n of e.childNodes)if(n.nodeType===3&&n.textContent.trim()){const g=document.createRange();g.selectNodeContents(n);for(const q of g.getClientRects())if(x>=q.left-2&&x<=q.right+2&&y>=q.top-2&&y<=q.bottom+2)return true;}
          const cs=getComputedStyle(e);if(cs.position==='fixed'||cs.position==='sticky')continue;
          if(cardBody(e,cs))return true;   // a card's body (even its empty corner) is content: the dock does not hang over it
        }
      }
    }
    return false;
  }
  function dockCheck(){
    if(Date.now()<pinUntil)return;
    R.classList.remove('ff-dock-tuck');                                         // measure where the buttons really sit
    R.classList.toggle('ff-dock-tuck',underDock());
  }
  const later=()=>{clearTimeout(settle);settle=setTimeout(dockCheck,140);};
  addEventListener('scroll',later,{passive:true});addEventListener('resize',later);addEventListener('hashchange',()=>setTimeout(dockCheck,600));
  addEventListener('load',later);setTimeout(dockCheck,1200);
  // things that open in place (the hero friend's dialogue card, accordions, tabs) can put words under the dock without a scroll
  document.addEventListener('click',()=>{clearTimeout(settle);settle=setTimeout(dockCheck,320);});
  document.addEventListener('keyup',e=>{if(e.key==='Enter'||e.key===' '){clearTimeout(settle);settle=setTimeout(dockCheck,320);}});
  // a tap on a tucked button only brings the dock back (it does not toggle sound or jump to the top)
  document.addEventListener('click',e=>{
    if(!R.classList.contains('ff-dock-tuck')||!e.target.closest||!e.target.closest('.ffs-btn,.totop'))return;
    e.preventDefault();e.stopImmediatePropagation();R.classList.remove('ff-dock-tuck');pinUntil=Date.now()+4000;setTimeout(()=>{pinUntil=0;dockCheck();},4100);
  },true);
  // keyboard: a focused dock button is always fully out (WCAG 2.4.11), and stays out while it has focus
  document.addEventListener('focusin',e=>{if(e.target.closest&&e.target.closest('.ffs-btn,.totop')&&e.target.matches(':focus-visible')){R.classList.remove('ff-dock-tuck');pinUntil=Infinity;}});
  document.addEventListener('focusout',e=>{if(e.target.closest&&e.target.closest('.ffs-btn,.totop')){pinUntil=0;later();}});
  window.FFdock={check:dockCheck,under:underDock};
  let celebrationFrame;
  window.FFconfetti=function(count){
    if(!allowed())return;
    let canvas=document.getElementById('ffconf');
    if(!canvas){canvas=document.createElement('canvas');canvas.id='ffconf';canvas.setAttribute('aria-hidden','true');document.body.appendChild(canvas);}
    cancelAnimationFrame(celebrationFrame);
    const ctx=canvas.getContext('2d');
    if(!ctx)return;
    const width=canvas.width=innerWidth,height=canvas.height=innerHeight;
    const colors=['#2F6FC0','#D9488B','#2E9E57','#8236AE','#E7A928'];
    const particles=Array.from({length:Math.min(140,Math.max(1,count||60))},(_,i)=>({x:width/2+(Math.random()-.5)*width*.4,y:height*.35,vx:(Math.random()-.5)*14,vy:-Math.random()*14-4,size:Math.random()*6+4,color:colors[i%colors.length]}));
    const start=performance.now();
    function frame(now){
      ctx.clearRect(0,0,width,height);
      if(!allowed()||now-start>2200)return;
      particles.forEach(p=>{p.vy+=.35;p.vx*=.99;p.x+=p.vx;p.y+=p.vy;ctx.fillStyle=p.color;ctx.fillRect(p.x,p.y,p.size,p.size/2);});
      celebrationFrame=requestAnimationFrame(frame);
    }
    celebrationFrame=requestAnimationFrame(frame);
  };
  let observer;
  window.FFmotion=function(v,same){
    if(observer)observer.disconnect();
    const root=document.getElementById('view');
    root.classList.toggle('px-routeenter',allowed()&&!same);
    // Hooks need the real motion permission so legacy home choreography can
    // opt into GSAP while still being fully quiet for reduced-motion users.
    (window.FFhooks||[]).forEach(fn=>fn(v,root,allowed()));
    if(allowed()&&window.IntersectionObserver){
      observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
        if(entry.isIntersecting){entry.target.classList.add('px-revealed');observer.unobserve(entry.target);}
      }),{threshold:.12});
      root.querySelectorAll('.px-programs>a,.px-academyband,.px-planner').forEach(el=>{
        if(el.getBoundingClientRect().top>innerHeight)observer.observe(el);
      });
    }
    onScroll();
  };
  reduced.addEventListener('change',()=>{if(typeof render==='function')render();});
})();
