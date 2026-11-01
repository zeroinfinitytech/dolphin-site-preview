/* reveal.js (2026-10-31): ONE scroll-reveal and banner-motion layer for every public page, on Motion (motion.dev, the vanilla library from the
   Framer Motion team; vendored UMD build js/vendor/motion/motion.min.js, global window.Motion, no CDN).
   Load order on every page: ... imgfx.js, i18n.js, api.js, site.js, vendor/motion/motion.min.js, reveal.js, then the page script.
   It replaces the engine behind the two shared entrances that every page already calls, so behaviour is identical page to page:
     DX.reveal(els)    blocks, cards, rows, list items: fade + rise T.y px, spring T.spring, stagger T.st (capped at T.cap steps), once,
                       when the element's top passes T.margin (82 % of the screen). Was a GSAP ScrollTrigger batch (site.js).
     DX.riseLines(el)  headings: masked line-by-line rise (site.js DX.lines / SplitText split, CSS .rv .sl reads --rv), spring T.line, same trigger.
   and adds:
     hero intro        every page's first banner: eyebrow -> headline lines -> lead -> buttons -> trailing row, staggered springs; on pages whose
                       hero carries photographs (events, gallery, videos, blog, test prep, blog post) the photos settle (clip + 1.06 -> 1) and
                       drift with the scroll (Motion scroll(), figure translate only). Home and v7/country heroes keep their GSAP scroll zoom on the
                       photo; only their copy is driven here, so no element is animated by two engines.
     band entrance     brand bands and closing CTA bands (pink gradient bands, the gallery map band, v7 closings) open from a rounded inset
                       (clip-path) as they enter; their copy uses DX.reveal / DX.riseLines.
     button springs    .btn hover lift (-2 px) and press (0.97), Motion hover()/press(); the CSS transform transition is switched off on those buttons.
   Rules: transform / opacity / clip-path only; springs with bounce 0 (no wobble), visual duration <= 0.9 s; hidden states are only ever set from
   here (no JS = static page; css/core/site.css hides static hero copy only while html.js is set and html.mo-go is not, with a 2.5 s CSS fail-safe);
   anything already on screen when it is registered is never hidden (no blink); prefers-reduced-motion = nothing moves, final state shown. */
(function(){
var W=window,D=document,HTML=D.documentElement,DX=W.DX=W.DX||{},MO=W.Motion;
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
var go=function(){HTML.classList.add('mo-go')};   /* releases the pre-JS hero hide (css/core/site.css "Motion layer" block) */
if(!MO||!MO.animate||!MO.inView||RM){go();if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',go);return}
var animate=MO.animate,inView=MO.inView;
/* shared tokens (one place to tune the feel of the whole site) */
var T=DX.MO={y:W.innerWidth<=700?14:18,   /* phones: same springs and stagger, a slightly shorter rise */st:.07,cap:7,margin:'0px 0px -18% 0px',
 spring:{type:'spring',visualDuration:.7,bounce:0},line:{type:'spring',visualDuration:.85,bounce:0},soft:{type:'spring',visualDuration:.9,bounce:0}};
/* sections owned by another agent's own motion (home 'What we offer' sticky photo panel): never touched here */
var OWN='#offer,.of8';
function sp(o,x){var r={},k;for(k in o)r[k]=o[k];for(k in x)r[k]=x[k];return r}
function $$(s,r){return[].slice.call((r||D).querySelectorAll(s))}
function onScreen(e){var r=e.getBoundingClientRect();return r.width>0&&r.top<W.innerHeight&&r.bottom>0}
function docOrder(a,b){return a.compareDocumentPosition(b)&4?-1:1}

/* ---- one trigger for everything: fires once when the element's top passes 82 % of the screen; an element that was jumped past
        (anchor link, fast fling) without ever intersecting is completed at once on the next scroll frame, so nothing stays hidden ---- */
var pend=new Set(),pr=0;
function whenIn(e,fn){var done=false,stop=null,f=function(now){if(done)return;done=true;pend.delete(e);if(stop)stop();fn(now)};
 e._moF=f;pend.add(e);stop=inView(e,function(){f(false)},{margin:T.margin})}
/* at the page end the 82 % line can never reach the last short rows (footer bar), so anything on screen there plays now */
function sweep(){pr=0;var end=W.innerHeight+W.scrollY>=D.documentElement.scrollHeight-4;
 pend.forEach(function(e){if(!e._moF)return;var r=e.getBoundingClientRect();if(r.bottom<0)e._moF(true);else if(end&&r.top<W.innerHeight)e._moF(false)})}
var sto=0;function onScroll(){if(!pend.size)return;if(!pr)pr=requestAnimationFrame(sweep);clearTimeout(sto);sto=setTimeout(sweep,160)}   /* the timer also covers a throttled / backgrounded tab where frames do not run */
W.addEventListener('scroll',onScroll,{passive:true});W.addEventListener('hashchange',function(){setTimeout(sweep,400)});

/* ---- DX.reveal: blocks rise in, entering together = one staggered group ---- */
var q=[],qr=0;
function settle(e){e._moRun=0;e.style.opacity='';e.style.transform='';e.style.transition=e._moTr||'';e.removeAttribute('data-mo-wait')}
function playBlock(e,delay){e._moRun=1;var a=animate(e,{opacity:[0,1],y:[T.y,0]},sp(T.spring,{delay:delay}));(a&&a.then?a:Promise.resolve()).then(function(){settle(e)},function(){settle(e)})}
function flush(){qr=0;var b=q.splice(0).sort(docOrder);b.forEach(function(e,i){playBlock(e,Math.min(i,T.cap)*T.st)})}
DX.reveal=function(els){els=[].slice.call(els||[]).filter(function(e){return e&&e.nodeType===1&&!e._rvl&&!e.closest(OWN)&&!e.closest(BANDS)});
 els.forEach(function(e){e._rvl=1;e.setAttribute('data-rvl','');if(onScreen(e))return;   /* already on screen when registered: left exactly as it is (no blink) */
  e._moTr=e.style.transition;e.style.transition='none';e.style.opacity='0';e.style.transform='translateY('+T.y+'px)';e.setAttribute('data-mo-wait','');
  whenIn(e,function(now){if(now){settle(e);return}q.push(e);if(!qr)qr=requestAnimationFrame(flush)})})};

/* ---- DX.riseLines: headings rise line by line through masks (split by site.js DX.lines once the fonts are ready) ---- */
function lineRise(el,delay,spring){return new Promise(function(res){var fin=function(){el.style.removeProperty('--rv');res()};
 DX.fontsReady().then(function(){var a=animate(0,1,sp(spring||T.line,{delay:delay||0,onUpdate:function(v){el.style.setProperty('--rv',v)}}));(a&&a.then?a:Promise.resolve()).then(fin,fin)})})}
DX.riseLines=function(el){if(!el||el._mol||!DX.lines||!DX.fontsReady||el.closest(BANDS))return;el._mol=1;var seen=onScreen(el);
 if(!DX.lines(el)||seen)return;el.style.setProperty('--rv','0');whenIn(el,function(now){if(now){el.style.removeProperty('--rv');return}lineRise(el)})};

/* ---- hero intro ---- */
var HERO='main .hero8,main #top.v7h,main>section#hero,main>.dx-run>section#hero,main>section.nf';
var COPY='.hero-c,.v7h-c,.ev-ht,.gl-ht,.vd-ht,.bl-ht,.tp-ht,.bl-col,.nf>.wrap';
var PHOTOS='.ev-hp>figure,.gl-hp>figure,.vd-hp>figure,.bl-hp>figure,.tp-hp>figure,.bl-hd-ph';
function heroIntro(){var hero=D.querySelector(HERO);if(!hero){go();return}var copy=hero.querySelector(COPY);if(!copy){go();return}
 var kids=[].slice.call(copy.children).filter(function(c){return!c.hidden&&c.offsetParent!==null&&!/^(SCRIPT|STYLE)$/.test(c.tagName)}),h1=copy.querySelector('h1'),
  pre=[],post=[],seenH=false;kids.forEach(function(c){if(c===h1||c.contains(h1)){seenH=true;return}(seenH?post:pre).push(c)});
 var spans=h1?$$('.ln>span',h1):[],split=!spans.length&&h1&&DX.lines&&W.SplitText;
 var figs=$$(PHOTOS,hero).filter(function(f){return f.offsetParent!==null});
 /* initial states, written in the same task that renders the page (nothing is painted in between) */
 pre.concat(post).forEach(function(e){e.style.opacity='0';e.style.transform='translateY('+T.y+'px)'});
 spans.forEach(function(s){s.style.transform='translateY(110%)'});
 if(split){DX.lines(h1);h1.style.setProperty('--rv','0')}else if(h1&&!spans.length){h1.style.opacity='0';h1.style.transform='translateY('+T.y+'px)'}
 figs.forEach(function(f){f._moR=(getComputedStyle(f).borderTopLeftRadius||'0px').split(' ')[0];f.style.opacity='0';f.style.clipPath='inset(6% 4% 6% 4% round '+f._moR+')';var im=f.querySelector('img,video,picture');if(im)im.style.transform='scale(1.06)'});
 copy.setAttribute('data-mo-hero','');go();
 var start=function(){var t=0;
  pre.forEach(function(e,i){animate(e,{opacity:1,y:0},sp(T.spring,{delay:t+i*T.st}))});t+=pre.length*T.st;
  if(spans.length){spans.forEach(function(s,i){animate(s,{y:['110%','0%']},sp(T.line,{delay:t+i*.09}))});t+=.12+spans.length*.09}
  else if(split){lineRise(h1,t);t+=.28}
  else if(h1){animate(h1,{opacity:1,y:0},sp(T.spring,{delay:t}));t+=.12}
  post.forEach(function(e,i){var a=animate(e,{opacity:1,y:0},sp(T.spring,{delay:t+Math.min(i,T.cap)*T.st}));(a&&a.then?a:Promise.resolve()).then(function(){e.style.opacity='';e.style.transform=''})});
  figs.forEach(function(f,i){var d=.12+i*.14,im=f.querySelector('img,video,picture');
   animate(f,{opacity:1,clipPath:'inset(0% 0% 0% 0% round '+f._moR+')'},sp(T.soft,{delay:d})).then(function(){f.style.clipPath='';f.style.opacity=''});
   if(im)animate(im,{scale:1},sp(T.soft,{delay:d})).then(function(){im.style.transform=''})});
  setTimeout(function(){spans.forEach(function(s){s.style.transform=''})},1600)};
 if(split)DX.fontsReady().then(function(){requestAnimationFrame(start)});else requestAnimationFrame(start);
 /* hero photographs drift with the scroll: the big frame a little, the small inset frame further (layered depth); the frame moves, the photo inside does not */
 if(figs.length&&MO.scroll){figs.forEach(function(f,i){var dy=(i?-56:-28)*(W.innerWidth<700?.5:1);
  MO.scroll(animate(f,{y:[0,dy]},{ease:'linear'}),{target:hero,offset:['start start','end start']})})}}

/* ---- band entrance: the band opens from a rounded inset as it enters (the band element itself; its photo and copy are other elements) ---- */
var BANDS='.ev-band,.gl-band,.vd-band,.tp-band,.bl-band,main .cl7,main .cx7,main .v7cta,#stats.st-band';
/* the band's background grows with the scroll: a rounded inset panel while its top climbs from the screen bottom to 10 %, full bleed after
   (scrubbed both ways, so scrolling back shrinks it again); the reading hold (imgfx.js DX.hold) then stops it full size */
var grow=[],gr=0;
function growFrame(){gr=0;var vh=W.innerHeight,mx=W.innerWidth<=700?4:7;
 grow.forEach(function(b){var r=b.getBoundingClientRect();if(r.bottom<-50||r.top>vh+50)return;
  var p=Math.min(1,Math.max(0,(vh-r.top)/(vh*.9))),e=p*p*(3-2*p),k=1-e;
  b.style.clipPath=k<.002?'':'inset('+(k*mx*.6).toFixed(2)+'% '+(k*mx).toFixed(2)+'% '+(k*mx*.6).toFixed(2)+'% '+(k*mx).toFixed(2)+'% round '+Math.round(k*40)+'px)'})}
var gt=0;function growReq(){if(!gr)gr=requestAnimationFrame(growFrame);clearTimeout(gt);gt=setTimeout(growFrame,140)}   /* the timer: throttled tabs */
W.addEventListener('scroll',growReq,{passive:true});W.addEventListener('resize',growReq);
function bands(){$$(BANDS).forEach(function(b){if(b.closest('.scn')||b._moB)return;b._moB=1;
  grow.push(b);growReq()})}   /* user 2026-11-01: a band moves as one unit, no inner rise-ins */

/* ---- section headings: every page's section heading rises line by line (pages-v7 already registers its own; this covers the static pages) ---- */
function headings(){$$('main section .sh h2,main section>.wrap>h2,main section>.wrap>div>h2').forEach(function(h){if(h.closest('.scn,.v7h,#voices,[data-no-vm],#hero,'+OWN))return;DX.riseLines(h)})}

/* ---- button springs ---- */
/* 2026-10-31 (user: same effects on phones): the press spring runs on every pointer (a tap on a phone sinks to .97 and springs back); the hover
   lift stays mouse-only (touch has no hover, and a sticky :hover after a tap would leave the button raised) */
function buttons(){if(!MO.press)return;var fine=matchMedia('(hover:hover) and (pointer:fine)').matches;
 $$('main .btn,footer .btn,.bk-pill').forEach(function(b){if(b._moH||b.hasAttribute('data-mag')||b.closest(OWN)||b.closest('.scn')||getComputedStyle(b).transform!=='none')return;   /* home scene buttons are positioned by scenes.js (transform from --zx/--zy): left alone */b._moH=1;b.classList.add('mo-b');
  if(fine&&MO.hover)MO.hover(b,function(){animate(b,{y:-2},T.spring);return function(){animate(b,{y:0},T.spring)}});
  MO.press(b,function(){animate(b,{scale:.97},{type:'spring',visualDuration:.18,bounce:0});return function(){animate(b,{scale:1},{type:'spring',visualDuration:.3,bounce:0})}})})}

/* phones: the destinations ladder is a native swipe row there (dest-v7.js pins it only from 700px up, so nothing moved it): the row rises in like any block */
function phoneExtras(){if(W.innerWidth>=700)return;var tr=D.getElementById('ltr');if(tr)DX.reveal([tr])}
function boot(){try{heroIntro()}catch(e){go();throw e}try{bands();headings();phoneExtras()}catch(e){}buttons();setTimeout(buttons,1500);setTimeout(function(){try{bands()}catch(e){}},1500)}   /* bands drawn later by page scripts (v7 closings) */
/* QA 2026-11-01: keyboard focus can land on a block that is still waiting to rise in (opacity 0) when Tab scrolls it only to the screen
   edge (e.g. the Events filter row). Any focused control inside a waiting block now completes that block at once, so focus is never invisible. */
D.addEventListener('focusin',function(ev){var e=ev.target;for(var i=0;e&&e.closest&&i<6;i++){var w=e.closest('[data-mo-wait]');if(!w)break;if(w._moF)w._moF(true);else settle(w);e=w.parentElement}},true);
/* after site.js's DOMContentLoaded handler (registered earlier) has rendered the page and chrome */
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
})();
