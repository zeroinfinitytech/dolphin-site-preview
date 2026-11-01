/* Home v8 (2026-10-28, R7). The scroll system lives in js/core/scenes.js (shared); this file only expands photos, fills the partner logos,
   runs the hero intro and renders the testimonials (featured university voice, partner wall, student cards: js/components/voices.js, sweep v8.2). Static without GSAP or under reduced motion. */
(function(){
var W=window,D=document,DX=W.DX||(W.DX={}),PH=W.DX_PH||{};
var $=function(s,r){return(r||D).querySelector(s)},$$=function(s,r){return[].slice.call((r||D).querySelectorAll(s))};
DX.phSrc=DX.phSrc||function(n,w){return'img/photos/'+n+'-'+w+'.webp'};
DX.phExpand=DX.phExpand||function(root){$$('img[data-ph]',root).forEach(function(im){var n=im.dataset.ph;if(DX.phPick)n=DX.phPick(n,im);var m=PH[n];if(!m)return;
 im.src=DX.phSrc(n,1600);im.srcset=[800,1200,1600,2400].concat(m.w>=3200?[3200]:[]).map(function(w){return DX.phSrc(n,w)+' '+w+'w'}).join(', ');im.sizes=im.dataset.sizes||'100vw';
 im.width=m.w;im.height=m.h;if(!im.hasAttribute('loading'))im.loading=im.dataset.eager?'eager':'lazy';im.decoding='async';
 if(im.dataset.pos)im.style.objectPosition=im.dataset.pos;im.style.setProperty('--phc',m.c);im.removeAttribute('data-ph');im.dataset.photo=n})};
/* QA-A 2026-10-31: cover-aware `sizes`. A landscape photo that covers a portrait box is drawn much wider than the box, so '100vw' picked an 800 file
   for a ~1700 px need on phones (soft at DPR 2). After layout each srcset image gets sizes = the width it is really drawn at (cover crop + 6 % zoom budget). */
if(!DX.phCover){DX.phCover=function(){$$('img[srcset]').forEach(function(im){if(!/\dw/.test(im.getAttribute('srcset')))return;var w=im.offsetWidth,h=im.offsetHeight;if(!w||!h)return;
 var m=PH[im.dataset.photo]||{},a=(m.w&&m.h)?m.w/m.h:(im.naturalWidth&&im.naturalHeight?im.naturalWidth/im.naturalHeight:0),c=(a&&getComputedStyle(im).objectFit==='cover')?Math.max(w,h*a):w,px=Math.ceil(c*1.06);
 if(Math.abs((+im.dataset.szp||0)-px)<40)return;im.dataset.szp=px;im.sizes=px+'px'})};
 (function(){var t;W.addEventListener('load',function(){DX.phCover();setTimeout(DX.phCover,1500)});W.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(DX.phCover,350)})})()}
/* testimonials (sweep v8.2): the featured university voice, the partner wall and three student/parent cards render from DX.voices via js/components/voices.js */
function voices(){if(!DX.voiceBand)return;var vb=$('#vbHome'),pw=$('#pwHome'),sc=$('#scHome');
 /* 2026-10-31: real reviews published on dolphin.edu.np (no invented university quotes): New Zealand, Australia, UK, preparation classes */
 if(vb&&!vb.children.length){var all=DX.voices({voice:'student'});vb.innerHTML=DX.voiceBand([5,2,3,10,9].map(function(id){return all.filter(function(x){return x.id===id})[0]}).filter(Boolean),{id:'vb',label:'What our students say'})}if(vb)DX.phExpand(vb);
 if(pw&&!pw.children.length)pw.innerHTML=DX.partnerWall();
 if(sc&&!sc.children.length)sc.innerHTML=DX.voices(function(x){return[1,3,6].indexOf(x.id)>-1}).sort(function(a,b){return[1,3,6].indexOf(a.id)-[1,3,6].indexOf(b.id)}).map(DX.storyCard).join('');
 /* sweep v8.12: no DX.peekRow here (it hid the text of any card under 60 % in view: the "blank second card"); the row is scroll-driven in DX.after */
 if(DX.voiceJsonLd)DX.voiceJsonLd()}
DX.page=function(){DX.phExpand();voices()};
DX.after=function(on){if(!on||!W.DXScenes)return;var ok;storiesHold();try{ok=W.DXScenes.init()}catch(e){D.documentElement.classList.remove('scn');throw e}if(!ok)return;
 var G=W.gsap,ST=W.ScrollTrigger;
 /* every scene is a full-viewport layer stacked under the one above, so the browser would never see the lower photos as "near the screen": fetch them all once the page is idle, so no photo pops in or shifts when its scene arrives */
 /* sweep v8.11: ... but only once the visitor starts to move (first wheel, touch, key or scroll), not on load: the first load stays the hero and the
    next scene (about 2.4 MB instead of 8 MB at 1440). One screen of scrolling is far more than the time the next photos need. */
 var warmed=0,EV=['wheel','touchstart','keydown','scroll','pointerdown'],warm=function(){if(warmed)return;warmed=1;EV.forEach(function(e){W.removeEventListener(e,warm,true)});$$('img[loading=lazy]').forEach(function(im){im.loading='eager'})};
 EV.forEach(function(e){W.addEventListener(e,warm,{capture:true,passive:true})});if(W.scrollY>40)warm();
 /* hero intro: sweep v8.12, CSS only (site.css html.intro, once per page per session, no script gate) */
 /* voices: sweep v8.5, the slider is a scene of the engine (data-scene="slider"): scenes.js wires DX.voiceRotate and drives it from the scroll; the wall tiles and the cards rise once */
 var pwh=$('#pwH');if(pwh&&DX.riseLines)DX.riseLines(pwh);
 /* sweep v8.12: the shared once-only entrance (pre-hidden, never replays); the story cards are driven by the scroll instead (below) */
 if(DX.reveal)DX.reveal($$('#pwHome .pw-c'));else if(DX.rise)DX.rise($$('#pwHome .pw-c'));
 stories(G,ST)
};
/* sweep v8.12 (user: "In their own words" on phones and tablets should be scroll-driven): the cover is held for half a screen per card (data-hold, set before the
   engine reads the scenes) and, while the page scrolls through that runway, the row advances by itself, scrubbed 1:1 (row.scrollLeft, so a native swipe still
   works and the next page scroll simply takes over). The card nearest the centre is the active one: its photo is at full size and opacity, the others' photos
   at .94 / .55; the text of every card that is more than half in view is always fully drawn; the arriving card's quote rises with the shared line effect
   (DX.lines, --rv from the position). On desktop (>= 1024) the section is hidden (home-v8.css), so none of this runs. */
var SC_MQ='(max-width:700px)'; /* 2026-10-31: the section is hidden above 700px now (home-v8.css) */
function storiesHold(){var s=$('#stories'),row=$('#scHome');if(!s||!row||!matchMedia(SC_MQ).matches||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 var n=$$('.tc',row).length;if(n>1)s.setAttribute('data-hold',((n-1)*.5).toFixed(2))}
function stories(G,ST){var s=$('#stories'),row=$('#scHome');if(!s||!row||!s.dataset.hold||!W.DXScenes||!W.DXScenes.topOf)return;
 var cards=$$('.tc',row),n=cards.length;if(n<2)return;row.classList.add('drive');
 var qs=cards.map(function(c){var p=$('.tc-q p',c);if(p&&DX.lines)DX.lines(p);return p}),ph=cards.map(function(c){return $('.tc-p img',c)}),last={};
 ph.forEach(function(i){if(i){i.loading='eager';i.decoding='async'}});
 var draw=function(p){var cw=cards[0].offsetWidth,gap=parseFloat(getComputedStyle(row).columnGap)||14,x=Math.round(p*(cw+gap));if(Math.abs(row.scrollLeft-x)>.5)row.scrollLeft=x;
  cards.forEach(function(c,k){var d=Math.abs(k-p),a=Math.min(1,d),ar=k>p?Math.max(0,Math.min(1,(1-(k-p))*1.8)):1,key=a.toFixed(3)+'|'+ar.toFixed(3);if(last[k]===key)return;last[k]=key;
   if(ph[k]){ph[k].style.scale=(1-.025*a).toFixed(4)}if(qs[k])qs[k].style.setProperty('--rv',ar.toFixed(3))})};
 var st=ST.create({start:function(){return W.DXScenes.topOf(s)},end:function(){return W.DXScenes.topOf(s)+Math.round(W.innerHeight*parseFloat(s.dataset.hold))},invalidateOnRefresh:true,
  onUpdate:function(t){draw(t.progress*(n-1))},onRefresh:function(t){draw(t.progress*(n-1))}});draw(st.progress*(n-1))}
/* hero video (sweep v8.15, user: "play a premium video in the hero section, without sound, and pause"; then "remove the image: just the video, a proper video").
   Sweep v8.16 (user: "play all four countries video in the home hero, with respect to cities, states and all like", then "text overlay describing video"):
   the hero plays ten short city clips in turn (js/hero-clips.js: UK x3, USA x3, Australia x2, New Zealand x2). Two <video> elements sit in #heroStage; the visible
   one plays, the other is loaded with the NEXT clip once the first has started playing and waits paused on its first frame. When the playing clip ends it holds its
   last frame, the other one starts and fades in over it (opacity only, 1 s), then the old one is emptied (src dropped), so one video decodes at a time and only
   the first clip (and its poster) loads at start. The poster of clip 1 is its own frame 0, set before first paint by the inline script next to the markup, which
   also leaves only that still frame under reduced motion, Save-Data, a 2g / 3g connection, or when the visitor paused it earlier in this session.
   Overlay (#heroCap): country + place in caps, one Bodoni Moda line, and a text link to country.html?c=<slug>; the rows rise out of
   their own mask, fade out about 1.2 s before the end of the clip, and use the five site languages from js/pages/hero-clips.js (DXI18n.get(), re-filled when <html lang> changes).
   Plays only while the hero is on screen (IntersectionObserver, and not covered: scn-off) and the tab is visible; the Pause / Play button (aria-pressed = paused,
   remembered in sessionStorage) pauses the whole sequence; the error fallback (the first clip failed: poster stays, button and overlay go; a later clip failing is
   skipped by replaying the current one). No sound ever: no audio track in any file, muted attribute and property, no unmute control. scenes.js zooms #heroStage. */
function heroVideo(){var A=D.getElementById('heroVid'),B=D.getElementById('heroVid2'),hero=D.getElementById('hero'),b=D.getElementById('heroVidBtn'),cap=D.getElementById('heroCap');if(!A||!B||!hero)return;
 var CL=DX.heroClips||[],N=CL.length,LC=['en','ne','es','ko','zh'];
 [A,B].forEach(function(v){v.muted=true;v.defaultMuted=true});
 var lang=function(){var l='en';try{l=W.DXI18n.get()}catch(e){}var i=LC.indexOf(l);return i<0?0:i};
 var K=cap&&D.getElementById('heroCapK'),T=cap&&D.getElementById('heroCapT'),X=cap&&D.getElementById('heroCapX'),Xt=cap&&D.getElementById('heroCapXt');
 var cur=A,nxt=B,i=0,hid=false,started=false,timers=[];
 var fill=function(k){if(!cap||!N)return;var c=CL[k],L=lang();K.textContent=c.c.n[L]+', '+c.p[L];T.textContent=c.t[L];Xt.textContent=c.c.x[L];X.href='country.html?c='+c.c.s;};
 var flush=function(){void cap.offsetWidth};
 var show=function(k){if(!cap||!N)return;cap.hidden=false;cap.classList.add('st');cap.classList.remove('out','in');fill(k);flush();cap.classList.remove('st');flush();cap.classList.add('in')};
 var hide=function(){if(cap)cap.classList.add('out')};
 /* reduced motion / Save-Data / slow network: the first clip's poster and its overlay, static */
 if(A.dataset.still){if(b)b.hidden=true;if(cap&&N){cap.hidden=false;cap.classList.add('st','in');fill(0)}return}
 var KEY='dx-hero-video',off=false,seen=true,dead=false;try{off=sessionStorage.getItem(KEY)==='paused'}catch(e){}
 var label=function(){if(!b)return;b.textContent=off?'Play video':'Pause video';b.setAttribute('aria-pressed',off?'true':'false')};
 var sync=function(){if(dead)return;var want=!off&&seen&&!D.hidden&&!hero.classList.contains('scn-off');
  if(want&&cur.paused&&!cur.ended){var p=cur.play();if(p&&p.catch)p.catch(function(){})}else if(!want&&!cur.paused)cur.pause()};
 var fail=function(){if(dead)return;dead=true;timers.forEach(clearTimeout);[A,B].forEach(function(v){try{v.pause()}catch(e){}v.removeAttribute('autoplay');v.preload='none'});
  [].slice.call(A.querySelectorAll('source')).forEach(function(s){A.removeChild(s)});A.load();if(b)b.hidden=true;if(cap)cap.hidden=true}; /* the poster attribute (frame 0) stays */
 /* paused earlier in this session: the inline script parked the sources on A.dxSrc (nothing downloads); Play puts them back */
 var check=function(){setTimeout(function(){if(!A.dxSrc&&!started&&(A.networkState===3||(A.error&&A.error.code)))fail()},0)};
 $$('source',A).concat(A.dxSrc||[]).forEach(function(s){s.addEventListener('error',check)});A.addEventListener('error',check);check();
 var arm=function(){if(!A.dxSrc)return;A.dxSrc.forEach(function(s){A.appendChild(s)});A.dxSrc=null;A.preload='auto';A.load()};
 /* ---- the sequence ---- */
 var phone=function(){return W.matchMedia&&matchMedia('(max-width:700px)').matches};
 var webm=!!(A.canPlayType&&A.canPlayType('video/webm; codecs="vp9"'));
 var srcOf=function(c){var base='img/video/h/'+c.id;return phone()?base+'-m.mp4':(webm?base+'.webm':base+'.mp4')};
 var posterOf=function(c){return'img/video/h/'+c.id+(phone()?'-poster-m.webp':'-poster.webp')};
 var load=function(v,k){v._k=k;v._ok=false;v._bad=false;v.poster=posterOf(CL[k]);[].slice.call(v.querySelectorAll('source')).forEach(function(s){v.removeChild(s)});
  v.preload='auto';v.src=srcOf(CL[k]);v.load()};
 var empty=function(v){try{v.pause()}catch(e){}v._k=-1;v.removeAttribute('src');[].slice.call(v.querySelectorAll('source')).forEach(function(s){v.removeChild(s)});v.load()};
 var replay=function(){hid=false;cur.currentTime=0;sync();show(i)};
 var swap=function(){var k=(i+1)%N,old=cur,inc=nxt;nxt._wait=false;
  inc.currentTime=0;inc.classList.add('on','nx');cur=inc;nxt=old;i=k;hid=false;show(k);
  var p=inc.play();if(p&&p.catch)p.catch(function(){});
  timers.push(setTimeout(function(){old.classList.remove('on');inc.classList.remove('nx');empty(old);load(old,(i+1)%N)},1100));
  sync()};
 var advance=function(){if(!nxt||nxt._bad||nxt._k===undefined||nxt._k<0){replay();return}if(nxt._ok&&nxt.readyState>=2)swap();else nxt._wait=true};
 [A,B].forEach(function(v){
  v.addEventListener('canplay',function(){v._ok=true;if(v===nxt&&v._wait){v._wait=false;swap()}});
  v.addEventListener('error',function(){if(v===nxt&&v._k>=0){v._bad=true;if(v._wait){v._wait=false;replay()}}});
  v.addEventListener('ended',function(){if(v===cur&&N>1)advance()});
  v.addEventListener('timeupdate',function(){if(v===cur&&!hid&&v.duration&&v.duration-v.currentTime<1.3){hid=true;hide()}})});
 /* once the first clip is really playing: its overlay, then (idle) the second clip */
 var begin=function(){if(started||dead)return;started=true;A._k=0;A.removeAttribute('autoplay');A.autoplay=false; /* a reloaded A must not start by itself */ show(0);if(N<2){A.loop=true;return}
  var go=function(){if(!dead&&nxt&&nxt._k===undefined)load(nxt,1)};
  if(W.requestIdleCallback)requestIdleCallback(go,{timeout:2500});else setTimeout(go,1500)};
 A.addEventListener('playing',begin);if(!A.paused&&A.readyState>2)begin();
 if(W.MutationObserver){new MutationObserver(sync).observe(hero,{attributes:true,attributeFilter:['class']});
  new MutationObserver(function(){if(started)fill(i)}).observe(D.documentElement,{attributes:true,attributeFilter:['lang']})}
 if(W.IntersectionObserver)new IntersectionObserver(function(es){seen=es[es.length-1].isIntersecting;sync()}).observe(hero);
 D.addEventListener('visibilitychange',sync);
 if(b){label();b.hidden=false;b.addEventListener('click',function(){off=!off;try{sessionStorage.setItem(KEY,off?'paused':'on')}catch(e){}label();if(!off)arm();sync()})}
 sync()}
heroVideo();

/* hero headline effect: each word rises out of a soft blur, staggered, then the italic word settles last (transform, opacity, filter only; skipped under reduced motion or without GSAP).
   Words are split at spaces only, so Devanagari conjuncts and matras stay whole (Chinese has no spaces: each run stays one piece). Runs on load and again after every language switch
   (js/core/i18n.js rewrites the h1; <html lang> changes last); a running tween is killed first and every word is cleaned (opacity, filter, transform) when it finishes. */
(function(){var h=$('.hero8 h1');if(!h||!W.gsap||(W.matchMedia&&W.matchMedia('(prefers-reduced-motion:reduce)').matches))return;
 var tw=null;
 var split=function(node,words){[].slice.call(node.childNodes).forEach(function(n){
  if(n.nodeType===3){var f=D.createDocumentFragment();n.textContent.split(/(\s+)/).forEach(function(t){if(!t)return;if(/^\s+$/.test(t)){f.appendChild(D.createTextNode(' '));return}var w=D.createElement('span');w.className='hw';w.textContent=t;f.appendChild(w);words.push(w)});node.replaceChild(f,n)}
  else if(n.nodeType===1&&n.nodeName!=='BR'&&!n.classList.contains('hw'))split(n,words)})};
 var run=function(first){
  if(tw){tw.kill();tw=null}
  $$('.hw',h).forEach(function(e){e.style.cssText=''});
  var words=[];split(h,words);if(!words.length)return;
  W.gsap.set(words,{opacity:0,yPercent:42,filter:'blur(14px)'});
  tw=W.gsap.to(words,{opacity:1,yPercent:0,filter:'blur(0px)',duration:first?1.25:1,ease:'power3.out',stagger:first?.13:.09,delay:first?.25:.05,clearProps:'opacity,filter,transform',onComplete:function(){tw=null}});
  if(first){var kick=$$('.hero8 .eyebrow,.hero8 .lead');W.gsap.from(kick,{opacity:0,y:18,duration:1,ease:'power2.out',stagger:.2,delay:.9,clearProps:'opacity,transform'})}};
 run(true);
 if(W.MutationObserver){var lg=D.documentElement.lang;new MutationObserver(function(){if(D.documentElement.lang===lg)return;lg=D.documentElement.lang;run(false)}).observe(D.documentElement,{attributes:true,attributeFilter:['lang']})}})();

/* stats strip count-up (2026-10-31): each .wp-n counts from 0 to its data-count once the strip scrolls into view, eased out, ~1.2 s, once per load.
   Reduced motion (or no IntersectionObserver): the final numbers are shown immediately, no animation. */
(function(){var ns=$$('.wp-n[data-count]');if(!ns.length)return;
 var reduce=W.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
 var fmt=function(n){return n.toLocaleString('en-US')};
 var done=function(el){el.textContent=fmt(+el.dataset.count)};
 if(reduce){ns.forEach(done);return}
 var run=function(el){var target=+el.dataset.count;if(!target){done(el);return}
  var dur=1100,t0=null;
  var step=function(ts){if(t0===null)t0=ts;var p=Math.min(1,(ts-t0)/dur),e=1-Math.pow(1-p,3);/* ease-out cubic */
   el.textContent=fmt(Math.round(target*e));if(p<1)requestAnimationFrame(step);else done(el)};
  requestAnimationFrame(step)};
 if(!W.IntersectionObserver){ns.forEach(run);return}
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(!e.isIntersecting)return;io.unobserve(e.target);run(e.target)})},{threshold:.4});
 ns.forEach(function(el){io.observe(el)})})();
})();
