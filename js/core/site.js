/* Shared chrome, components and motion for every page. */
(function(){
var D=document,W=window,DX=W.DX,$=function(s,r){return(r||D).querySelector(s)},$$=function(s,r){return Array.prototype.slice.call((r||D).querySelectorAll(s))};
/* sweep v8.12 (motion QA, user: "no blinking text"): one set of motion tokens for every page (CSS twins in site.css: --m-in, --m-hover, --m-ease) */
/* shared motion tokens (MOTION_SYSTEM.md; sweep v8.13 'soft feel': small distances, long gentle ease-out with a slow tail, modest stagger). power4.out ~ cubic-bezier(.22,1,.36,1) */
var M=DX.M={d:1.1,ease:'power4.out',y:20,st:.06,xy:10,xo:.45};
/* masked line split, shared by the scene engine (scenes.js) and the inner pages. GSAP SplitText splits a heading into lines inside masks; CSS (site.css) moves
   line k by the element's --rv (0 hidden, 1 at rest), so text is untransformed at rest. v8.12: it splits only once the web fonts are ready (at most 1.5 s), so a
   font swap never re-splits a heading on screen; the heading carries .rv-wait (visibility hidden) from the moment it is registered until it is split, so
   unsplit text is never shown and then replaced; it re-splits only when its width changes by more than 24 px (debounced 250 ms), never on height-only resizes. */
var fReady=null;DX.fontsReady=function(){if(!fReady)fReady=new Promise(function(res){var t=setTimeout(res,1500);if(D.fonts&&D.fonts.ready)D.fonts.ready.then(function(){clearTimeout(t);res()},res);else{clearTimeout(t);res()}});return fReady};
var splits=[];function doSplit(el){try{if(el._split)el._split.revert();el._split=W.SplitText.create(el,{type:'lines',mask:'lines',linesClass:'sl',aria:'none',
 onSplit:function(s){el.style.setProperty('--n',s.lines.length);s.lines.forEach(function(l,k){l.style.setProperty('--k',k);
  /* the split drops the space at each line break ("withcare" for search engines and screen readers): put it back, invisible at the line end */
  if(k<s.lines.length-1&&!/\s$/.test(l.textContent))l.appendChild(D.createTextNode(' '))})}})}catch(e){}el._sw=el.offsetWidth;el.classList.remove('rv-wait')}
DX.lines=function(el){if(!el||el._sl||!W.SplitText)return false;el._sl=1;el.classList.add('rv','rv-wait');splits.push(el);DX.fontsReady().then(function(){doSplit(el)});return true};
var rsW;W.addEventListener('resize',function(){clearTimeout(rsW);rsW=setTimeout(function(){splits.forEach(function(el){if(!el._split||Math.abs(el.offsetWidth-el._sw)<=24)return;doSplit(el)})},250)});
/* scroll lock for the menu and drawers: pauses smooth scrolling (Lenis then swallows the wheel everywhere except panels marked data-lenis-prevent, which scroll natively) */
DX.lock=function(on){D.documentElement.classList.toggle('lenis-stopped',!!on);var l=W.__lenis;if(l)l[on?'stop':'start']()};
/* a heading already on screen when the page has finished loading (a late, deferred page script) is split but never hidden (no on-off-on) */
var shown=function(e){if(D.readyState!=='complete')return false;var r=e.getBoundingClientRect();return r.top<W.innerHeight&&r.bottom>0};DX.onScreen=shown;
DX.riseLines=function(el){var G=W.gsap;if(!G||!W.ScrollTrigger)return;var vis=shown(el);if(!DX.lines(el)||vis)return;var go=function(){if(el._rv)return;el._rv=1;G.to(el,{'--rv':1,duration:M.d,ease:M.ease})};G.set(el,{'--rv':0});W.ScrollTrigger.create({trigger:el,start:'top 92%',once:true,onEnter:go,onLeave:go})};
/* once-only entrance for cards, rows and blocks (replaces the per-page batches): hidden from the start (never visible, then hidden, then shown), rises 24 px
   in 650 ms expo.out with a .07 s stagger, stable end state (props cleared), never replays when the direction reverses; anything already on screen after the
   page has loaded stays as it is. */
DX.reveal=function(els,o){var G=W.gsap,ST=W.ScrollTrigger;o=o||{};els=[].slice.call(els||[]).filter(function(e){return e&&!e._rvl});if(!els.length||!G||!ST||reduce)return;
 els=els.filter(function(e){e._rvl=1;e.setAttribute('data-rvl','');return!shown(e)});if(!els.length)return;G.set(els,{y:M.y,opacity:0});
 var go=function(b){b=b.filter(function(e){if(e._rvd)return false;e._rvd=1;return true});if(b.length)G.to(b,{y:0,opacity:1,duration:M.d,ease:M.ease,stagger:function(i){return Math.min(i*M.st,.42)},overwrite:true,clearProps:'transform,opacity'})};
 ST.batch(els,{start:o.start||'top 92%',once:true,onEnter:go,onLeave:go})};
/* sweep v8.12: a held section without ScrollTrigger pinning. The section goes into a runway wrapper (its own height + len()) and is CSS-sticky inside it, so the
   browser holds it (no fixed/relative swap, no one-frame jump at the start or end of the hold, no layout shift: the pin swap measured CLS 1.6-3.9 per pass on
   destinations and stories) and it scrolls away by itself at the end. Returns the runway (use it as the trigger: start 'top top', end '+=' + len()). */
DX.stick=function(sec,len){var run=sec.parentNode&&sec.parentNode.classList.contains('dx-run')?sec.parentNode:null,ST=W.ScrollTrigger;
 if(!run){run=D.createElement('div');run.className='dx-run';sec.parentNode.insertBefore(run,sec);run.appendChild(sec)}
 sec.style.position='sticky';sec.style.top='0px';var size=function(){run.style.height=Math.round(sec.offsetHeight+len())+'px'};size();
 if(ST&&!run._sz){run._sz=size;ST.addEventListener('refreshInit',function(){if(run._sz)run._sz()})}
 run._off=function(){run._sz=null;run.style.height='';sec.style.position='';sec.style.top=''};return run};
/* bottom dock (sweep v8.12): created on first use; the phone booking pill (end of this file) and the chat launcher (chrome()) live in it */
DX.dockEl=function(){var d=D.getElementById('dxDock');if(!d){d=D.createElement('div');d.className='dx-dock';d.id='dxDock';D.body.appendChild(d)}return d};
/* dock visibility with hysteresis, no loop: checked at most every 90 ms while the page scrolls (the last check lands within 90 ms of the last scroll event),
   on resize, clicks and keys. off  = a menu, modal, drawer or language sheet is open (at once); soft = phones: the footer ledger is under the dock, desktop:
   the launcher sits on a small link or button (hide after 150 ms, show after 300 ms clear); pill = phones past 90 % of the first screen while no primary
   button is on screen and no button sits in the dock zone (collapses after 150 ms, returns after 300 ms). Each state changes one class; CSS gives one 200 ms fade. */
(function(){var st={},want={},tm={},phone=W.matchMedia('(max-width:700px)');
 function paint(){var d=D.getElementById('dxDock');if(!d)return;var off=!!(st.off||st.soft||st.led);if(d.classList.contains('off')!==off)d.classList.toggle('off',off);var p=!!st.pill&&!off;if(d.classList.contains('dk-pill')!==p)d.classList.toggle('dk-pill',p)}
 function set(k,v,dOn,dOff){want[k]=v;if(!!st[k]===v){clearTimeout(tm[k]);tm[k]=0;return}if(tm[k])return;var ms=v?dOn:dOff;if(!ms){st[k]=v;paint();return}
  tm[k]=setTimeout(function(){tm[k]=0;if(!!st[k]!==want[k]){st[k]=want[k];paint()}},ms)}
 function onTop(e,d){var r=e.getBoundingClientRect(),H=W.innerHeight;if(r.bottom<=0||r.top>=H||!r.width)return false;var t=D.elementFromPoint(Math.max(1,Math.min(W.innerWidth-1,r.left+r.width/2)),Math.max(1,Math.min(H-1,r.top+r.height/2)));return!!t&&(t===e||e.contains(t)||d.contains(t))}
 function ctaNear(d){var H=W.innerHeight,zone=H*.55,es=D.querySelectorAll('main .btn');for(var i=0;i<es.length;i++){var e=es[i],c=e.classList;if(!(c.contains('btn-p')||c.contains('btn-a'))){var r=e.getBoundingClientRect();if(!(r.bottom>zone&&r.top<H&&r.width))continue}if(onTop(e,d))return true}return false}
 function overCtl(L){var r=L.getBoundingClientRect(),vw=W.innerWidth,vh=W.innerHeight,pts=[[.5,.5],[.15,.15],[.85,.15],[.15,.85],[.85,.85]];
  for(var j=0;j<pts.length;j++){var es=D.elementsFromPoint?D.elementsFromPoint(r.left+r.width*pts[j][0],r.top+r.height*pts[j][1]):[],top=null;
   for(var k=0;k<es.length;k++){var e=es[k];if(e.closest&&e.closest('#dxDock,#dxcP,.dxc-scrim'))continue;top=e;break}
   var hit=top&&top.closest&&top.closest('a[href],button,input,select,textarea,label,[role=button],summary');
   if(hit){var hr=hit.getBoundingClientRect(),area=hr.width*hr.height;if(area<vw*vh*.04||((/^(BUTTON|INPUT|SELECT|TEXTAREA)$/.test(hit.tagName)||/\bbtn\b/.test(hit.className)||hit.closest('footer'))&&area<vw*vh*.2))return true}}return false}
 DX.dockSync=function(now){var d=D.getElementById('dxDock');if(!d)return;var H=W.innerHeight,ph=phone.matches,L=D.getElementById('dxcL');
  var overlay=!!D.querySelector('#mm.open,.modal.open,.lang-m.open,.dr.open');set('off',overlay,0,now?0:120);
  /* while the page is moving, the desktop overlap test waits (links stream past the launcher; deciding mid-flight made it blink) and the pill may only
     collapse, never return: both settle 180 ms after the scroll stops */
  var moving=performance.now()-lastScroll<160,fb=D.querySelector('.ft-b');
  set('led',ph&&!overlay&&!!fb&&fb.getBoundingClientRect().top<H-24,150,300); /* phones: the footer ledger is under the dock */
  if(overlay)set('soft',false,0,0);else if(L&&!moving)set('soft',overCtl(L),150,300); /* both widths: the launcher sits on a control at rest (a form field, a link) */
  var pill=d.querySelector('.bk-pill'),pw=!!pill&&ph&&!overlay&&W.scrollY>H*.9&&!ctaNear(d);if(!(moving&&pw&&!st.pill))set('pill',pw,300,150)};
 var q=0,rest=0,lastScroll=0;function soon(){if(q)return;q=setTimeout(function(){q=0;DX.dockSync()},90)}
 W.addEventListener('scroll',function(){lastScroll=performance.now();soon();clearTimeout(rest);rest=setTimeout(function(){DX.dockSync()},180)},{passive:true});W.addEventListener('resize',soon);D.addEventListener('click',function(){setTimeout(function(){DX.dockSync(true)},80);setTimeout(soon,700)},true);
 D.addEventListener('keyup',function(e){if(e.key==='Escape'||e.key==='Enter'||e.key===' ')setTimeout(function(){DX.dockSync(true)},80)});W.addEventListener('load',soon)})();
W.addEventListener('error',function(){D.documentElement.classList.add('nomo')});
/* Soft proximity magnet (sweep v8.6, user request: "users must be able to stop scrolling wherever they want"). The v8.3-v8.5 stepper (one wheel gesture = one
   stop, wheel events swallowed, scroll locked during the flight) is gone: the wheel is never hijacked, nothing is prevented, keys and touch are the browser's own.
   blocks() still returns [{t:top,h:height,stops:[extra absolute stops],tall:bool}] in page order; from it DX.stops() lists every resting position (scene tops,
   each panel of a journey, each slide, a tall block's top and bottom edge, the footer scenes). Only when the visitor has STOPPED (no wheel / key / pointer / touch
   input for 220 ms and Lenis at rest) and the page sits within 12 % of the viewport height of a stop, it eases there in 0.45-0.6 s; any new input cancels the glide at
   once (Lenis replaces the running scrollTo with the visitor's own scroll). Farther away the page stays exactly where it was left. Fine pointers only (Lenis). */
DX.magnet=function(blocks){var L=W.__lenis;if(!L||DX._mag)return;DX._mag=1;var H=function(){return W.innerHeight},li=0,tm=0,glide=0,EO=function(t){var u=1-t;return 1-u*u*u*(1-.22*t)};
 var list=function(){var h2=H(),max=Math.max(0,D.documentElement.scrollHeight-h2),s=[0],b=blocks()||[],rg=[];
  b.forEach(function(k){s.push(k.t);(k.stops||[]).forEach(function(v){s.push(v)});if(k.tall&&!k.free&&k.h>h2+8)s.push(k.t+k.h-h2)});
  /* 2026-10-31: a block's own stop that falls inside a reading hold (js/core/imgfx.js DX.hold) is dropped: the hold's middle is its one rest */
  (DX._mm||[]).forEach(function(f){(f()||[]).forEach(function(r){rg.push(r)})});if(rg.length)s=s.filter(function(v){return v<=0||!rg.some(function(r){return v>r[0]+4&&v<r[1]-4})});
  (DX._mx||[]).forEach(function(f){(f()||[]).forEach(function(v){s.push(v)})});s.push(max);
  var o=[];s.sort(function(a,b){return a-b}).forEach(function(v){v=Math.max(0,Math.min(max,Math.round(v)));if(!o.length||v-o[o.length-1]>8)o.push(v)});return o};
 var input=function(){li=performance.now();glide=0;DX._jump=0;clearTimeout(tm)};   /* any own input ends an anchor jump's "do not magnet" (DX.scrollTo) */
 ['wheel','keydown','pointerdown','touchstart'].forEach(function(ev){W.addEventListener(ev,input,{passive:true,capture:true})});
 var fly=function(y,d){glide=1;L.scrollTo(y,{duration:d||.9,lerp:0,easing:EO,onComplete:function(){glide=0}})};
 /* 2026-11-01 soft stop (user: "proper scroll for all sections, like a soft stop, then it continues"): the original magnet above is kept and given
    (1) the edges of every reading hold as resting places (at either edge the held block already sits whole and centred, so the shortest settle wins),
    (2) a forward reach: when the visitor stops while a section is ARRIVING (the next hold edge / rest lies ahead in the direction of travel, within
        DX.SOFT.reach screens), the page glides on to it, so the section settles whole and centred instead of resting half cut; behind it (or farther)
        only the original 12 % proximity applies, so nothing is pulled back against the visitor,
    (3) a soft settle curve: the glide starts from rest, so it eases in AND out (sine in-out, DX.SOFT.dur), with no jolt at the start.
    Inside a hold the block is already resting (sticky), so the next push of the wheel simply carries on through it; any input cancels a glide. */
 var SO=DX.SOFT={reach:.25,near:.12,dur:[.6,1.05]},EIO=function(t){return-(Math.cos(Math.PI*t)-1)/2},dir=1,lastY=W.scrollY;
 var settle=function(y,d){glide=1;L.scrollTo(y,{duration:d,lerp:0,easing:EIO,onComplete:function(){glide=0}})};
 var holdRanges=function(){var o=[];(DX._mm||[]).forEach(function(f){(f()||[]).forEach(function(r){o.push(r)})});return o};
 var check=function(){if(glide||DX._jump||D.documentElement.classList.contains('lenis-stopped')||D.documentElement.classList.contains('md-lock')||performance.now()-li<220)return;
  if(L.isScrolling==='smooth'&&Math.abs(L.velocity||0)>.2)return;var y=L.scroll!=null?L.scroll:W.scrollY,h=H(),s=list(),rg=holdRanges(),max=Math.max(0,D.documentElement.scrollHeight-h),b=null,d;
  var inside=rg.some(function(r){return y>=r[0]-2&&y<=r[1]+2});
  /* resting places: the original stops plus each hold's two edges (clamped to the page) */
  var c=s.slice();rg.forEach(function(r){c.push(Math.max(0,Math.min(max,Math.round(r[0]))));c.push(Math.max(0,Math.min(max,Math.round(r[1]))))});
  if(!inside){var a=null;c.forEach(function(v){var k=(v-y)*dir;if(k>2&&k<=h*SO.reach&&(a==null||k<(a-y)*dir))a=v});   /* (2) arriving: the nearest place ahead */
   if(a!=null){d=Math.abs(a-y);settle(a,SO.dur[0]+(SO.dur[1]-SO.dur[0])*Math.min(1,d/(h*SO.reach)));return}}
  c.forEach(function(v){if((v-y)*dir<-2)return;if(b==null||Math.abs(v-y)<Math.abs(b-y))b=v});if(b==null)return;d=Math.abs(b-y);   /* (1) the original proximity, edges included; never behind the visitor (no pull back against the scroll) */
  if(d>2&&d<=h*SO.near)settle(b,SO.dur[0]+.25*d/(h*SO.near))};
 /* the direction of travel comes from the visitor's own input (wheel / keys), never from a settle glide or a scene's own movement */
 W.addEventListener('wheel',function(e){if(e.deltaY)dir=e.deltaY>0?1:-1},{passive:true,capture:true});
 W.addEventListener('keydown',function(e){var k=e.key;if(/^(ArrowDown|PageDown|End| )$/.test(k)&&!e.shiftKey)dir=1;else if(/^(ArrowUp|PageUp|Home)$/.test(k)||(k===' '&&e.shiftKey))dir=-1},{passive:true,capture:true});
 L.on('scroll',function(){var yy=L.scroll!=null?L.scroll:W.scrollY;lastY=yy;if(glide)return;clearTimeout(tm);tm=setTimeout(check,230)});
 DX.stops=list;DX.stepFly=function(y){fly(y,.6)}};
DX.stepper=DX.magnet;
/* sweep v8.13: extra rest positions from other systems (the reading holds, js/core/imgfx.js DX.hold): f() returns absolute scroll positions */
DX.magnetAdd=function(f){(DX._mx=DX._mx||[]).push(f)};
/* 2026-10-31: ranges [from,to] (absolute scroll) owned by a reading hold; other stops inside them are dropped (see list() above) */
DX.magnetMask=function(f){(DX._mm=DX._mm||[]).push(f)};
var reduce=W.matchMedia('(prefers-reduced-motion:reduce)').matches,fine=W.matchMedia('(hover:hover) and (pointer:fine)').matches;
DX.reduce=reduce;DX.$=$;DX.$$=$$;
var esc=function(s){return String(s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})};DX.esc=esc;
var path=(location.pathname.split('/').pop()||'index.html');
/* theme + language */
try{var th=localStorage.getItem('dx-theme');if(!th)th=W.matchMedia('(prefers-color-scheme:dark)').matches?'dark':'light';D.documentElement.dataset.theme=th}catch(e){D.documentElement.dataset.theme='light'}
var lang='en';try{lang=localStorage.getItem('dx-lang')||'en'}catch(e){}
var NE={'Study abroad,':'विदेश अध्ययन,','Destinations':'गन्तव्य','Stories':'कथाहरू','Universities':'विश्वविद्यालय','About':'हाम्रो बारे','Contact':'सम्पर्क','Sign in':'साइन इन','Book free counselling':'निःशुल्क परामर्श बुक गर्नुहोस्','Study abroad, guided with care.':'विदेश अध्ययन, ध्यानपूर्वक निर्देशित।','Find my course':'मेरो कोर्स खोज्नुहोस्','Explore':'हेर्नुहोस्','Book counselling':'परामर्श बुक गर्नुहोस्'};
function applyLang(){D.documentElement.lang=lang==='ne'?'ne':'en';$$('[data-t]').forEach(function(e){if(!e.dataset.en)e.dataset.en=e.textContent;var k=e.dataset.en;e.textContent=lang==='ne'&&NE[k]?NE[k]:k});var b=$('#lang');if(b)b.textContent=lang==='ne'?'English':'नेपाली'}
DX.t=function(s){return'<span data-t>'+s+'</span>'};
var ar='';DX.ar=ar; /* 2026-10-30 user: no arrows inside buttons */
/* components */
DX.cCard=function(c,i){return'<a class="cc" href="country.html?c='+c.slug+'" data-tilt><img src="'+c.mid2+'" alt="'+esc(c.alt)+'" width="'+c.w+'" height="'+c.h+'" loading="lazy" style="object-position:'+c.pos+'"><h3>'+esc(c.name)+'</h3><p>'+esc(c.tagline)+'</p><span class="cc-x">'+DX.t('Explore')+ar+'</span></a>'};
function cn(slug){var c=DX.C.filter(function(x){return x.slug===slug})[0];return c?c.name:slug}DX.cn=cn;
var VL={student:'Student',parent:'Parent',university:'University'};
DX.sCard=function(s){var ini=s.name.charAt(0),m=(s.consent&&s.consent.status==='approved')?'Published with permission':'Sample';return'<article class="card sc-card lift"><div class="top"><div class="av" aria-hidden="true">'+ini+'</div><div class="nm">'+esc(s.name)+'<small>'+VL[s.voice]+', '+s.year+'</small></div></div><q>'+esc(s.text)+'</q><div class="ft"><span class="chip">'+esc(cn(s.country))+'</span><span class="chip">'+esc(s.course)+'</span><span class="smp">'+esc(m)+'</span></div></article>'};
DX.vCard=function(s){var c=DX.C.filter(function(x){return x.slug===s.country})[0]||DX.C[0];return'<article class="vid"><img src="'+c.mid2+'" alt="" width="'+c.w+'" height="'+c.h+'" loading="lazy"><span class="chip chip-g chip-s" style="align-self:flex-start">Video story, sample</span><h3>'+esc(s.name)+', '+esc(cn(s.country))+'</h3><button class="btn btn-sm" data-video="'+s.id+'">Play story'+ar+'</button></article>'};
DX.modal=function(html){var m=$('#md');m.querySelector('.mbody').innerHTML=html;m.classList.add('open');m.querySelector('.x').focus()};
function closeModal(){var m=$('#md');if(m)m.classList.remove('open')}
DX.initRail=function(rail,prev,next,prog){if(!rail)return;var down=0,sx=0,sl=0,moved=0;
rail.addEventListener('pointerdown',function(e){if(e.pointerType!=='mouse')return;down=1;moved=0;sx=e.clientX;sl=rail.scrollLeft});
W.addEventListener('pointermove',function(e){if(!down)return;var dx=e.clientX-sx;if(Math.abs(dx)>5){moved=1;rail.classList.add('drag')}if(moved)rail.scrollLeft=sl-dx});
W.addEventListener('pointerup',function(){if(!down)return;down=0;setTimeout(function(){rail.classList.remove('drag')},0)});
function step(d){var w=rail.firstElementChild?rail.firstElementChild.getBoundingClientRect().width+22:340;rail.scrollBy({left:d*w*(W.innerWidth>900?2:1),behavior:'smooth'})}
if(prev)prev.onclick=function(){step(-1)};if(next)next.onclick=function(){step(1)};
function pr(){if(!prog)return;var m=rail.scrollWidth-rail.clientWidth;var p=m>0?rail.scrollLeft/m:0;var i=prog.firstElementChild;i.style.width=(100*rail.clientWidth/rail.scrollWidth)+'%';i.style.marginLeft=(p*(100-100*rail.clientWidth/rail.scrollWidth))+'%'}
rail.addEventListener('scroll',pr,{passive:true});pr();setTimeout(pr,400)};
DX.mountStories=function(root,o){o=o||{};var f={c:o.country||'all',v:'all'};
var cs=['all'].concat(o.country?[o.country]:DX.C.filter(function(c){return DX.stories.some(function(s){return s.country===c.slug})}).map(function(c){return c.slug}));
root.innerHTML=(o.country?'':'<div class="fl" role="group" aria-label="Filter by country"><span class="lab">Country</span>'+cs.map(function(c){return'<button class="pill" data-fc="'+c+'" aria-pressed="'+(c==='all')+'">'+(c==='all'?'All':esc(cn(c)))+'</button>'}).join('')+'</div>')+'<div class="fl" role="group" aria-label="Filter by voice"><span class="lab">Voice</span>'+['all','student','parent','university'].map(function(v){return'<button class="pill" data-fv="'+v+'" aria-pressed="'+(v==='all')+'">'+(v==='all'?'All voices':VL[v])+'</button>'}).join('')+'</div><div class="rail-w" style="margin-top:34px"><div class="'+(o.grid?'sgrid':'rail')+'" data-out></div>'+(o.grid?'':'<div style="display:flex;justify-content:space-between;align-items:center;gap:20px"><div class="prog" style="flex:1;max-width:520px"><i></i></div><div class="rc"><button class="arr" aria-label="Previous stories" data-p>&#8592;</button><button class="arr" aria-label="Next stories" data-n>&#8594;</button></div></div>')+'</div>';
var out=$('[data-out]',root);
function draw(){var l=DX.stories.filter(function(s){return(f.c==='all'||s.country===f.c)&&(f.v==='all'||s.voice===f.v)});var h=l.map(function(s,i){return(s.video?DX.vCard(s):'')+DX.sCard(s)}).join('');if(!l.length)h='<div class="card empty" style="padding:40px;width:100%"><p>No sample stories for this filter yet. Try another country or voice.</p></div>';out.innerHTML=h;if(!o.grid)DX.initRail(out,$('[data-p]',root),$('[data-n]',root),$('.prog',root));$$('[data-tilt]',out).forEach(DX.tilt)}
root.addEventListener('click',function(e){var b=e.target.closest('button');if(!b)return;if(b.dataset.fc){f.c=b.dataset.fc;$$('[data-fc]',root).forEach(function(x){x.setAttribute('aria-pressed',x===b)});draw()}if(b.dataset.fv){f.v=b.dataset.fv;$$('[data-fv]',root).forEach(function(x){x.setAttribute('aria-pressed',x===b)});draw()}
if(b.dataset.video){var s=DX.stories.filter(function(x){return x.id==b.dataset.video})[0];DX.modal('<span class="smp">Sample</span><h3 style="margin:14px 0">'+esc(s.name)+', '+esc(cn(s.country))+'</h3><div class="vph">Video player placeholder. No recording exists yet: a story is published only after the person signs consent and head office approves it.</div><p>'+esc(s.text)+'</p>')}});
if(o.country)f.c=o.country;draw()};
DX.tilt=function(e){if(!fine||reduce||e._t)return;e._t=1;e.addEventListener('mousemove',function(ev){var r=e.getBoundingClientRect(),x=(ev.clientX-r.left)/r.width-.5,y=(ev.clientY-r.top)/r.height-.5;e.style.transition='transform .12s';e.style.transform='perspective(900px) rotateX('+(-y*7)+'deg) rotateY('+(x*9)+'deg) translateY(-6px)'});e.addEventListener('mouseleave',function(){e.style.transition='';e.style.transform=''})};
DX.countryOpts=function(sel){return(sel||'')+DX.C.map(function(c){return'<option value="'+c.slug+'">'+esc(c.name)+'</option>'}).join('')};
/* chrome */
function chrome(){
var navs=[['destinations.html','Destinations'],['test-preparation.html','Test Preparation'],['events.html','Events'],['universities.html','Partner universities'],['blogs.html','Blog'],['about.html','About']];
/* Home v7 (2026-10-28): header is logo, four links and one button; no announcement bar, no icon controls, no sign-in menu (portals live in the footer and the phone menu). */
var h='<a class="skip" href="#main">Skip to content</a><header class="hdr" id="hdr"><div class="hdr-in"><a class="logo" href="index.html" aria-label="Dolphin Education home"><img class="lw" src="img/logo-light-400.webp" alt="Dolphin Education" width="176" height="44"><img class="lc" src="img/logo-400.webp" alt="" width="176" height="44"></a><ul class="nav">';
navs.forEach(function(n){var cur=path===n[0]||(n[0]==='destinations.html'&&path==='country.html')||(n[0]==='blogs.html'&&path==='blog-post.html')||(n[0]==='gallery.html'&&path==='videos.html');h+='<li><a class="nav-b'+(cur?' is-cur':'')+'" href="'+n[0]+'" data-t'+(cur?' aria-current="page"':'')+'>'+n[1]+'</a></li>'});
h+='</ul><div class="hdr-r"><button class="thm-b" id="thm" type="button" aria-label="Switch to dark theme"><svg class="th-m" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5a8.5 8.5 0 1 0 10.7 10.7z"/></svg><svg class="th-s" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M18.7 5.3l-1.6 1.6M6.9 17.1l-1.6 1.6"/></svg></button><a class="btn btn-p btn-sm d" href="contact.html#book"><span data-t>Book free counselling</span>'+ar+'</a><button class="burger" id="bg" aria-label="Menu" aria-expanded="false"><i></i><i></i></button></div></div></header>';
/* sweep v8.5: the full-screen menu is a photograph (one per page, loaded only when the menu first opens) under a theme-aware wash: deep navy with white type in the dark
   theme, a frosted soft-blue wash with navy type in the light theme. Serif links at the gutter (the current page marked by colour only), the button system for the
   call to action and the four sign-in pills, then language, theme and the office line. Esc closes, focus stays inside while open, the page behind is locked. */
var MP={home:'hero-ubc-blossom',destinations:'flight-clouds',stories:'students-laugh-walk',universities:'lib-trinity-long-room',about:'ktm-boudhanath',contact:'advisor-office'},
 MC={'usa':'us-columbia','united-kingdom':'oxford-aerial','canada':'hero-vancouver','australia':'sydney-opera','new-zealand':'hero-tekapo'};
var mpg=D.body.dataset.page||'home',mph=MP[mpg]||'campus-walk-chat';if(mpg==='country'){var cq=/[?&]c=([\w-]+)/.exec(location.search);mph=(cq&&MC[cq[1]])||'oxford-aerial'}
var mlinks=[['destinations.html','Destinations'],['test-preparation.html','Test Preparation'],['events.html','Events'],['gallery.html','Gallery'],['blogs.html','Blog'],['stories.html','Stories'],['universities.html','Universities'],['about.html','About'],['contact.html','Contact']];
h+='<nav class="mmenu" id="mm" aria-label="Menu" data-lenis-prevent aria-hidden="true"><div class="mm-bg" aria-hidden="true" data-ph="'+mph+'"></div><div class="mm-in">'
+'<ul class="mm-l">'+mlinks.map(function(n){var cur=path===n[0]||(n[0]==='destinations.html'&&path==='country.html')||(n[0]==='blogs.html'&&path==='blog-post.html')||(n[0]==='gallery.html'&&path==='videos.html');return'<li><a class="big'+(cur?' is-cur':'')+'" href="'+n[0]+'"'+(cur?' aria-current="page"':'')+' data-t>'+n[1]+'</a></li>'}).join('')+'</ul>'
+'<a class="btn btn-p mm-cta" href="contact.html#book"><span data-t>Book free counselling</span>'+ar+'</a>'
+'<p class="mm-lb" id="mmSign">Sign in</p><div class="mg" aria-labelledby="mmSign"><a class="btn btn-g btn-sm" href="../portal.html">Student and parent</a><a class="btn btn-g btn-sm" href="../institution.html">University partner</a><a class="btn btn-g btn-sm" href="../staff.html">Staff</a><a class="btn btn-g btn-sm" href="../admin.html">Head office</a></div>'
+'<p class="mm-of"><a href="contact.html">New Baneshwor, Kathmandu</a><span aria-hidden="true"> &middot; </span><a href="tel:'+DX.contact.tel+'">'+DX.contact.phone+'</a></p>'
+'</div></nav>';
/* sweep v8.8 (user 2026-10-30, replaces the v8.7 "no floating pill" rule): the Ask Dolphin chat launcher on every public page, bottom-right.
   Only the button and its few rules load here (< 1.5 KB); js/components/chat.js + css/components/chat.css load on idle or on the first click. window.DolphinChat.open('assist'|'support') / .close() */
/* sweep v8.12 (user: "the pill and the chat button sit awkwardly at the bottom; premium chat icon"): ONE bottom dock (#dxDock, DX.dockEl). Phones (<= 700 px): the
   booking pill (ocean gradient, 52 px) and the launcher (52 px) in one row on a soft fade, 16 px gutters, safe-area padding; desktop: the launcher alone,
   bottom-right. --dock-h (0 / 76 px + safe area) is the zone it occupies; scenes and the footer keep their text above it. Visibility: DX.dockSync below. */
Promise.resolve().then(function(){if(D.getElementById('dxcL'))return;var st=D.createElement('style');
 st.textContent=':root{--dock-h:0px}html{scroll-padding-bottom:var(--dock-h)}'
 +'.dx-dock{position:fixed;right:calc(24px + env(safe-area-inset-right));bottom:calc(24px + env(safe-area-inset-bottom));z-index:66;display:flex;align-items:center;gap:12px;pointer-events:none;transition:opacity .2s ease-out,visibility .2s,translate .2s ease-out}'
 +'.dx-dock>*{pointer-events:auto}.dx-dock.off{opacity:0;visibility:hidden;translate:0 8px}.dx-dock.off>*{pointer-events:none}.dx-dock .bk-pill{display:none}'
 +'.dxc-l{position:relative;flex:none;width:64px;height:64px;padding:0;border:3px solid #fff;border-radius:50%;overflow:hidden;cursor:pointer;background:#fff;color:#6D1428;box-shadow:0 0 0 2px #eaa3cf;animation:dxcIn .6s cubic-bezier(.16,1,.3,1) both;transition:transform .25s cubic-bezier(.16,1,.3,1)}'
 +'.dxc-l:hover{transform:scale(1.06)}.dxc-l:active{transform:scale(.96)}@keyframes dxcIn{from{opacity:0;transform:scale(.6)}to{opacity:1;transform:none}}'
 +'.dxc-l>*{position:absolute;inset:0;display:grid;place-items:center;border-radius:inherit;transition:opacity .22s ease-out,transform .22s ease-out}'
 +'.dxc-l .dxc-lm,.dxc-l .dxc-lx{background:#fff}.dxc-l .dxc-lx{opacity:0}.dxc-l .dxc-lm img{width:62%;height:62%;object-fit:contain}.dxc-l .dxc-lx svg{width:24px;height:24px;transform:rotate(-45deg);transition:transform .22s ease-out}'
 +'.dxc-l[aria-expanded=true]:is(:hover,:focus-visible) .dxc-lm{opacity:0}.dxc-l[aria-expanded=true]:is(:hover,:focus-visible) .dxc-lx{opacity:1}.dxc-l[aria-expanded=true]:is(:hover,:focus-visible) .dxc-lx svg{transform:none}'
 +'.dxc-l:focus-visible{outline:2px solid #6D1428;outline-offset:3px}:root[data-theme=dark] .dxc-l{background:#fff}:root[data-theme=dark] .dxc-l:focus-visible{outline-color:#eaa3cf}'
 +'.dxc-n{--nb-bg:#6D1428;--nb-ink:#fff;position:absolute;right:0;bottom:calc(100% + 12px);display:flex;flex-direction:column;align-items:flex-end;gap:6px;width:min(310px,80vw);pointer-events:none}.dxc-n[hidden]{display:none}'
 +':root[data-theme=dark] .dxc-n,.dxc-n.on-dark{--nb-bg:#fff;--nb-ink:#161616}'
 +'.dxc-nb{pointer-events:auto;display:flex;align-items:flex-start;gap:10px;max-width:100%;padding:10px 16px 10px 10px;border:0;border-radius:20px 20px 6px 20px;background:var(--nb-bg);color:var(--nb-ink);text-align:left;font:400 14.5px/1.45 var(--sans);cursor:pointer;animation:dxcNb .9s cubic-bezier(.22,1,.36,1) both}'
 +'.dxc-nb .dxc-av{flex:none;width:30px;height:30px;border-radius:50%;background:#fff url(img/logo-mark-96.webp) center/72% no-repeat;box-shadow:0 0 0 1px rgba(109,20,40,.12)}.dxc-nb .dxc-av i{display:none}'
 +'.dxc-nb .dxc-bd{display:block;min-width:0}.dxc-nb .dxc-nm{display:block;font:600 11.5px/1.2 var(--sans);letter-spacing:.04em;opacity:.7;padding:2px 0 3px}.dxc-nb .dxc-tx{display:block;padding-top:3px}.dxc-nb .dxc-nm+.dxc-tx,.dxc-nb .dxc-nm+.dxc-dots{padding-top:0}'
 +'.dxc-nb .dxc-dots{display:flex;gap:4px;padding:9px 6px}.dxc-nb .dxc-dots b{width:6px;height:6px;border-radius:50%;background:currentColor;opacity:.4;animation:dxcDt 1s infinite ease-in-out}.dxc-nb .dxc-dots b:nth-child(2){animation-delay:.15s}.dxc-nb .dxc-dots b:nth-child(3){animation-delay:.3s}'
 +'.dxc-nc{pointer-events:auto;display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;animation:dxcNb .9s cubic-bezier(.22,1,.36,1) both}.dxc-nc button{border:0;margin:0;padding:8px 14px;border-radius:999px;background:var(--nb-bg);color:var(--nb-ink);font:500 13.5px/1.2 var(--sans);cursor:pointer}'
 +'.dxc-nx{pointer-events:auto;border:0;background:none;padding:2px 6px;margin:2px 0 0;color:var(--nb-bg);font:500 12.5px/1.2 var(--sans);cursor:pointer;opacity:.85}.dxc-nx:hover{opacity:1}'
 +'@keyframes dxcNb{from{opacity:0;transform:translateY(16px) scale(.96)}to{opacity:1;transform:none}}.dxc-nb{max-height:180px;transition:opacity .8s cubic-bezier(.22,1,.36,1),transform .8s cubic-bezier(.22,1,.36,1),max-height .9s cubic-bezier(.22,1,.36,1),padding .9s cubic-bezier(.22,1,.36,1),margin .9s cubic-bezier(.22,1,.36,1)}.dxc-nb.gone{opacity:0;transform:translateY(-10px) scale(.97);max-height:0;padding-top:0;padding-bottom:0;margin:-3px 0;overflow:hidden;pointer-events:none}@keyframes dxcDt{0%,100%{opacity:.25}50%{opacity:.9}}'
 +'.dxc-nb:focus-visible,.dxc-nc button:focus-visible,.dxc-nx:focus-visible{outline:2px solid var(--nb-bg);outline-offset:2px}.dxc-nx:focus-visible{outline-color:currentColor}'
 +'@media(max-width:700px){.dxc-n{right:calc(16px + env(safe-area-inset-right));bottom:calc(100% - 8px)}}'
 +'@media(max-width:700px){:root{--dock-h:calc(76px + env(safe-area-inset-bottom))}.dx-dock{left:0;right:0;bottom:0;padding:24px calc(16px + env(safe-area-inset-right)) calc(12px + env(safe-area-inset-bottom)) calc(16px + env(safe-area-inset-left))}'
 +'.dx-dock:before{content:"";position:absolute;inset:0;z-index:-1;pointer-events:none;background:linear-gradient(180deg,transparent,color-mix(in srgb,var(--bg) 78%,transparent) 60%);opacity:0;transition:opacity .2s ease-out}.dx-dock.dk-pill:before{opacity:1}'
 +'.dx-dock .bk-pill{display:inline-flex;position:relative;left:auto;bottom:auto;flex:1 1 auto;min-width:0;height:52px;margin:0;padding:0 22px;gap:10px;justify-content:center;border:0;border-radius:999px;color:#fff;font:600 15px/1 var(--sans);background:linear-gradient(135deg,#8a2346 0%,#6D1428 55%,#5a1020 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.16),inset 0 1px 0 rgba(255,255,255,.28),0 14px 30px -14px rgba(31,74,133,.72);opacity:0;visibility:hidden;transform:translateY(10px);transition:opacity .2s ease-out,transform .2s ease-out,visibility .2s}'
 +'.dx-dock.dk-pill .bk-pill{opacity:1;visibility:visible;transform:none}.dx-dock .bk-pill:hover{color:#fff}.dxc-l{width:56px;height:56px;margin-left:auto}.dxc-on .dx-dock{opacity:0;visibility:hidden}.ftr .ft-bar{padding-bottom:var(--dock-h)}}'
 +'@media print{.dx-dock{display:none}}@media(prefers-reduced-motion:reduce){.dx-dock,.dx-dock:before,.dx-dock .bk-pill,.dxc-l{transition:none;animation:none}.dxc-nb,.dxc-nb .dxc-dots b{animation:none}}';
 D.head.appendChild(st);DX.dockEl().insertAdjacentHTML('beforeend','<button class="dxc-l" id="dxcL" type="button" aria-label="Chat with Dolphin" aria-haspopup="dialog" aria-expanded="false" aria-controls="dxcP"><span class="dxc-lm" aria-hidden="true"><img src="img/logo-mark-96.webp" srcset="img/logo-mark-192.webp 2x" alt="" width="40" height="40" decoding="async"></span><span class="dxc-lx" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M6.5 6.5l11 11M17.5 6.5l-11 11"/></svg></span></button><div class="dxc-n" id="dxcN" hidden aria-live="polite"></div>');
 if(DX.dockSync)DX.dockSync(true);
 var q=[],ld=0;function flush(){var f;while(W.DXChat&&(f=q.shift()))try{f(W.DXChat)}catch(e){}}
 function load(cb){if(cb)q.push(cb);if(W.DXChat)return flush();if(ld)return;ld=1;var l=D.createElement('link');l.rel='stylesheet';l.href='css/components/chat.css';l.onload=l.onerror=function(){var s=D.createElement('script');s.src='js/components/chat.js';s.onload=flush;s.onerror=function(){ld=0};D.head.appendChild(s)};D.head.appendChild(l)}
 W.DolphinChat={open:function(m){load(function(c){c.open(m)})},ask:function(q){load(function(c){c.ask(q)})},close:function(){if(W.DXChat)W.DXChat.close()}};
 D.getElementById('dxcL').addEventListener('click',function(){load(function(c){c.toggle()})});

 /* assistant pop-ups (user 2026-10-30): ~6 s after load, once per session, never with the panel open; a short sequence of bubbles (typing dots first), then quick replies.
    Each text sits in its own span so js/core/i18n.js translates it; the bubble tone follows the launcher's on-dark detection (lchTone). */
 (function(){var N=D.getElementById('dxcN'),K='dxc-hello',tm=[],gone=0,rm=W.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches;if(!N)return;try{if(sessionStorage.getItem(K))return}catch(e){}
  var M=['Namaste, welcome to Dolphin Education.','I am Dolphin Assistant. Ask me about visas, universities or fees.','Not sure where to begin? Tell me a country: USA, UK, Canada, Australia or New Zealand.','Or book a free counselling call and we will call you back.'];
  var Q=[['Choose a country','Which countries can I study in?'],['Visa help','How does the visa process work?'],['Book counselling','How do I book a free counselling call?']];
  function stop(){gone=1;tm.forEach(clearTimeout);N.hidden=true;N.innerHTML=''}W.__dxcHelloStop=function(){gone=1;tm.forEach(clearTimeout)};
  function mark(){try{sessionStorage.setItem(K,'1')}catch(e){}}
  function open(){var p=D.getElementById('dxcP');return D.body.classList.contains('dxc-on')||(p&&p.classList.contains('is-open'))}
  function wait(f,ms){tm.push(setTimeout(f,rm?Math.min(ms,300):ms))}
  function bub(txt,first,next){if(gone||open())return stop();var b=D.createElement('button');b.type='button';b.className='dxc-nb';
   b.innerHTML='<span class="dxc-av"><i></i></span><span class="dxc-bd">'+(first?'<span class="dxc-nm">Dolphin Assistant</span>':'')+'<span class="dxc-dots"><b></b><b></b><b></b></span></span>';
   b.addEventListener('click',function(){stop();W.DolphinChat.open('assist')});N.insertBefore(b,N.querySelector('.dxc-nx'));var al=[].slice.call(N.querySelectorAll('.dxc-nb:not(.gone)'));if(al.length>2){var o=al[0];o.classList.add('gone');setTimeout(function(){if(o.parentNode)o.parentNode.removeChild(o)},900)}
   wait(function(){if(gone)return;var t=D.createElement('span');t.className='dxc-tx';t.textContent=txt;var d=b.querySelector('.dxc-dots');d.parentNode.replaceChild(t,d);next()},1300)}
  function chips(){if(gone||open())return stop();var c=D.createElement('div');c.className='dxc-nc';Q.forEach(function(q){var k=D.createElement('button');k.type='button';k.textContent=q[0];k.addEventListener('click',function(){stop();W.DolphinChat.ask(q[1])});c.appendChild(k)});N.insertBefore(c,N.querySelector('.dxc-nx'));wait(function(){if(gone)return;N.style.transition='opacity .6s';N.style.opacity='0';setTimeout(stop,650)},9000)} /* QA 2026-10-31: the greeting no longer stays over the page for ever; it fades out 9 s after the chips appear */
  function fade(){var o=N.querySelector('.dxc-nb:not(.gone)');if(o){o.classList.add('gone');setTimeout(function(){if(o.parentNode)o.parentNode.removeChild(o)},900)}}
  function seq(i){if(i>=M.length)return;bub(M[i],i===0,function(){if(W.lchTone)W.lchTone();if(i===M.length-1)return wait(chips,700);wait(function(){fade();wait(function(){seq(i+1)},1400)},4300)})} /* one message at a time: each stays about 4 s, fades away, the next arrives */
  function show(){if(gone||open()||D.hidden)return;mark();N.hidden=false;var x=D.createElement('button');x.type='button';x.className='dxc-nx';x.textContent='Close';x.addEventListener('click',stop);N.appendChild(x);if(W.lchTone)W.lchTone();seq(0)}
  D.getElementById('dxcL').addEventListener('click',stop);
  function heroOn(){var c=D.getElementById('heroCap'),h=D.getElementById('hero');if(!c||c.hidden||(h&&h.classList.contains('scn-off')))return false;var r=c.getBoundingClientRect();return r.bottom>0&&r.top<W.innerHeight} /* QA 2026-10-31: never open the greeting on top of the hero caption; wait until it has scrolled away */
  function tryShow(){if(gone)return;if(heroOn())return wait(tryShow,1500);show()}
  wait(tryShow,6000)})();
 /* a counsellor's live-chat reply while the panel is closed (js/components/chat-live.js via chat.js): one bubble with their name and the first line, and a soft
    dot on the launcher until the chat is opened; tapping the bubble opens the live chat */
 DX.chatPing=function(name,text){var N=D.getElementById('dxcN'),L=D.getElementById('dxcL');if(!N||!L)return;if(W.__dxcHelloStop)W.__dxcHelloStop();
  L.classList.add('has-new');N.innerHTML='';N.style.opacity='';N.style.transition='';N.hidden=false;
  var b=D.createElement('button');b.type='button';b.className='dxc-nb dxc-ping';b.innerHTML='<span class="dxc-av"><i></i></span><span class="dxc-bd"><span class="dxc-nm"></span><span class="dxc-tx"></span></span>';
  b.querySelector('.dxc-nm').textContent=name||'Dolphin Education';b.querySelector('.dxc-tx').textContent=String(text||'').split(/\n/)[0].slice(0,110);
  var x=D.createElement('button');x.type='button';x.className='dxc-nx';x.textContent='Close';
  function hide(){N.hidden=true;N.innerHTML=''}
  b.addEventListener('click',function(){hide();W.DolphinChat.open('support')});x.addEventListener('click',hide);
  N.appendChild(b);N.appendChild(x);if(W.lchTone)W.lchTone()};
 var idle=function(){(W.requestIdleCallback||function(f){setTimeout(f,1200)})(function(){load()},{timeout:3000})};if(D.readyState==='complete')idle();else W.addEventListener('load',idle)});
h+='<div class="modal" id="md" role="dialog" aria-modal="true" aria-label="Details"><div class="card mbox"><button class="x" aria-label="Close">&#10005;</button><div class="mbody"></div></div></div>';
D.body.insertAdjacentHTML('afterbegin',h);(function(){var q=D.createElement('script');q.src='js/components/select.js';q.defer=true;D.head.appendChild(q)})();
(function(){var col=function(h,l){return'<div class="fc"><h3 class="fc-h">'+h+'</h3><ul>'+l+'</ul></div>'}; /* sweep v8.5: always-open groups (no accordion, no plus) */
var lk=function(h,t){return'<li><a href="'+h+'">'+t+'</a></li>'};
/* Footer (2026-10-28, v8): one oversized statement, four columns on hairlines, updates and social, legal with language and theme. Follows the theme (soft in light, navy in dark). Pages that end in their own #book scene get office pills instead of a second call to action. */
var hasBook=!!$('#book');
/* ocean behind the footer: a looping clip of dolphins when FT_VIDEO is set (see img/video/README.md), else the poster photograph with a slow drift */
var FT_VIDEO=(window.matchMedia&&matchMedia('(max-width:900px)').matches)?'img/video/ocean-m.mp4':'img/video/ocean.mp4',FT_POSTER='img/video/ocean-poster.jpg';
/* sweep v8.11: the clip (4-14 MB) gets its source only when the footer is near (see the observer below), never on first load; no autoplay under reduced motion */
var ftSea='<div class="ft-sea" aria-hidden="true"><img class="ft-poster" src="'+FT_POSTER+'" alt="" loading="lazy" decoding="async"><canvas class="ft-ocean"></canvas>'+(FT_VIDEO?'<video class="ft-video" muted loop playsinline preload="none" poster="'+FT_POSTER+'" data-src="'+FT_VIDEO+'"></video>':'')+'<div class="ft-wash"></div></div>';
var ftActs=''; /* 2026-10-30 user: no buttons in the ocean scene */ /* 2026-10-30 user: no contact pills in the ocean scene */
var ftOpen='<section class="ft-a" aria-labelledby="ftH">'+ftSea+'<div class="wrap ft-open"><div class="ft-st"><h2 id="ftH">'+(hasBook?'Dive into the world <em>with Dolphin.</em>':'Your journey starts <em>with Dolphin.</em>')+'</h2><div class="ft-side"><p>'+(hasBook?'New Baneshwor, Kathmandu. One counsellor from the first conversation to the departure gate.':'One counsellor from the first conversation to the departure gate. Free, in New Baneshwor or on the phone.')+'</p>'+ftActs+'</div></div></div><div class="ft-shade" aria-hidden="true"></div></section>';
/* 2026-10-31 real content pass: head office, the Pokhara and Biratnagar offices (details to confirm), both landlines, mobile/WhatsApp and email from dolphin.edu.np */
var ftOffice='<li><a href="contact.html#visit">New Baneshwor, Kathmandu</a></li><li><span class="mut">Pokhara and Biratnagar offices</span></li><li><a href="tel:'+DX.contact.tel+'">'+DX.contact.phone+'</a></li><li><a href="tel:'+(DX.contact.tel2||'')+'">'+(DX.contact.phone2||'')+'</a></li><li><a href="'+DX.contact.wa+'" target="_blank" rel="noopener">WhatsApp '+(DX.contact.mobile||'')+'</a></li><li><a href="mailto:'+DX.contact.email+'">'+DX.contact.email+'</a></li><li><span class="mut">Office hours to be confirmed</span></li>';
D.body.insertAdjacentHTML('beforeend','<footer class="ftr" id="footer">'+ftOpen+'<section class="ft-b" aria-label="Site map and contact"><div class="wrap">'
+'<div class="ft-top" data-r><div class="ft-brand"><a class="ft-bl" href="index.html" aria-label="Dolphin Education home"><img class="l" src="img/logo-400.webp" alt="" width="200" height="50" loading="lazy" decoding="async"><img class="d" src="img/logo-light-400.webp" alt="" width="200" height="50" loading="lazy" decoding="async"></a>'
+'<p class="ft-say">Study abroad, guided with <em>care.</em></p><p class="ft-tag">Study-abroad counselling since 2007 from New Baneshwor, Kathmandu, for New Zealand, Australia, the UK, the USA and Canada.</p>'
+'<div class="ft-nl"><label class="ft-lb" for="nlE">Your email address</label><form class="nl-f" data-form data-api="/api/forms/newsletter" novalidate><input id="nlE" type="email" name="email" required autocomplete="email" aria-describedby="nlM" placeholder="Your email"><input type="text" name="website" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0"><button class="btn btn-sm" type="submit"><span>Subscribe</span>'+ar+'</button></form><p class="ok-m" id="nlM" style="display:none" role="status">Thank you. You are on the list.</p></div></div>'
+'<div class="ft-globe" role="img" aria-label="Globe with flight routes from Kathmandu to Toronto, London, New York, Sydney and Auckland"><canvas aria-hidden="true"></canvas></div>'
+'<div class="ft-grid">'
+col('Destinations',DX.C.map(function(c){return lk('country.html?c='+c.slug,esc(c.name))}).join(''))
+col('Dolphin',lk('test-preparation.html','Test Preparation')+lk('events.html','Events')+lk('gallery.html','Gallery')+lk('videos.html','Videos')+lk('blogs.html','Blog')+lk('stories.html','Stories')+lk('universities.html','Partner universities')+lk('about.html','About')+lk('contact.html','Contact'))
+col('Portals',lk('../portal.html','Student and parent')+lk('../institution.html','University partner')+lk('../staff.html','Staff')+lk('../admin.html','Head office'))
+col('Office',ftOffice)
+'</div></div>'
+'<div class="ft-bar"><span class="ft-c">&copy; 2026 Dolphin Education. All rights reserved.</span><div class="soc" aria-label="Follow us"><span class="soc-l">Follow us</span><svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs><linearGradient id="igG" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset=".28" stop-color="#FA7E1E"/><stop offset=".5" stop-color="#D62976"/><stop offset=".76" stop-color="#962FBF"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient></defs></svg><a href="https://www.facebook.com/DolphinEducationBaneshwor" target="_blank" rel="noopener" aria-label="Facebook" title="Facebook"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg></a><a href="https://www.instagram.com/dolphin_education/" target="_blank" rel="noopener" aria-label="Instagram" title="Instagram"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/></svg></a><a href="https://www.youtube.com/@DolphinEducationNewBaneshwor" target="_blank" rel="noopener" aria-label="YouTube" title="YouTube"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg></a><a href="https://www.linkedin.com/company/dolphin-education-new-baneshwor/" target="_blank" rel="noopener" aria-label="LinkedIn" title="LinkedIn"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path fill="currentColor" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg></a><a href="https://www.tiktok.com/@dolphineducationn.b" target="_blank" rel="noopener" aria-label="TikTok" title="TikTok"><svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path class="tk-c" transform="translate(-.9 -.7)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path class="tk-r" transform="translate(.9 .7)" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/><path class="tk-m" d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg></a></div><span class="ft-lg"><a href="contact.html">Privacy</a><a href="contact.html">Terms</a></span></div></div></section></footer>');
/* the drawn ocean takes over from the poster when it can run. sweep v8.11: js/components/ocean.js + js/components/ripple.js and the clip load only once the footer is within
   900 px of the viewport (they were on every first load); the order of events after that is unchanged */
(function(){var fa=$('.ft-a');if(!fa)return;var started=0;
function getJs(src,cb){if(D.querySelector('script[src="'+src+'"]')){cb();return}var s=D.createElement('script');s.src=src;s.onload=s.onerror=cb;D.head.appendChild(s)}
function go(){if(started)return;started=1;var n=0,both=function(){if(++n<2)return;
 var c=$('.ft-ocean');if(c&&W.DXOcean){try{W.DXOcean.mount(c);c.classList.add('on')}catch(e){}}
 var v=$('.ft-video');if(v&&v.dataset.src&&!reduce){var on=function(){v.classList.add('on');var o=$('.ft-ocean');if(o)o.style.display='none'};v.addEventListener('playing',on);
  var so=D.createElement('source');so.src=v.dataset.src;so.type='video/mp4';v.appendChild(so);v.autoplay=true;v.preload='auto';v.load();var pp=v.play();if(pp&&pp.catch)pp.catch(function(){})}
 setTimeout(function(){var sea=$('.ft-sea');if(sea&&W.DXRipple){try{W.DXRipple.mount(fa,sea)}catch(e){}}},600)};
 getJs('js/components/ocean.js',both);getJs('js/components/ripple.js',both)}
if(!W.IntersectionObserver)return go();var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();go()}},{rootMargin:'900px 0px'});io.observe(fa)})();
/* sweep v8.4: the route globe (js/components/footer-globe.js + css/components/footer-globe.css + img/land.png) loads only once the ledger is within 900 px of the viewport */
(function(){var g=$('.ft-globe');if(!g||!W.IntersectionObserver)return;var io=new IntersectionObserver(function(es){if(!es[0].isIntersecting)return;io.disconnect();
 var l=D.createElement('link');l.rel='stylesheet';l.href='css/components/footer-globe.css';D.head.appendChild(l);
 var s=D.createElement('script');s.src='js/components/footer-globe.js';s.onload=function(){if(W.DXFooterGlobe){try{W.DXFooterGlobe.mount(g)}catch(e){}}};D.head.appendChild(s)},{rootMargin:'900px 0px'});io.observe(g)})();
})();
}
function wire(){
var hdr=$('#hdr'),last=0;
/* sweep v8.5: --hdr is the real header height (at rest, not the shorter frosted state); every scene pads its top by --hdr + 24 so nothing sits under the bar at a stop */
function hv(){if(!hdr||hdr.classList.contains('solid'))return;var h=hdr.offsetHeight;if(h>40)D.documentElement.style.setProperty('--hdr',h+'px')}hv();W.addEventListener('resize',hv);
var darkSel='.on-dark,.band-n,.ft-a,.v7h,.v7p,.v7l,.v7s,.v7cta,.v7v,.scn-cards';
/* 2026-10-30: in the all-white light theme the .band-n / .v7v sections are white, so the header must stay solid over them (it only turns transparent over photographic or dark scenes) */
function isDarkScene(e){return!!e.closest(darkSel)&&!(D.documentElement.dataset.theme!=='dark'&&e.closest('.band-n,.v7v,.how-t'))}
 function overPhoto(){var els=D.elementsFromPoint?D.elementsFromPoint(W.innerWidth/2,88):[];for(var i=0;i<els.length;i++){var e=els[i];if(hdr.contains(e))continue;return isDarkScene(e)}return false}
 /* sweep v8.3: the header never covers a photograph with a frosted band: over photographic scenes it stays transparent (white type on the scene's own scrim), frosted only over light content */
 /* sweep v8.12: hysteresis everywhere so the bar never flickers at a boundary: past = on beyond 80 px, off again only under 40 px; photo/light needs two
    sample points (88 and 116 px down) to agree before it changes; hide/show needs 24 px of travel in one direction. Classes change only on a real change. */
 var past=false,dk=false,hid=false,acc=0,cls=function(c,v){if(hdr.classList.contains(c)!==v)hdr.classList.toggle(c,v)};
 var dkT=0,dkE=0;function tone(){var a=photoAt(88),b=photoAt(116);if(a===b)dk=a;var lt=D.documentElement.dataset.theme!=='dark';cls('solid',!dk||lt);cls('over',past&&dk&&!lt)}
 function photoAt(y0){var els=D.elementsFromPoint?D.elementsFromPoint(W.innerWidth/2,y0):[];for(var i=0;i<els.length;i++){var e=els[i];if(hdr.contains(e)||e.closest('#dxDock'))continue;return isDarkScene(e)}return false}
 function lchTone(){var l=D.getElementById('dxcL');if(!l||!D.elementsFromPoint)return;var nn=D.getElementById('dxcN'),r=(nn&&!nn.hidden&&nn.firstElementChild?nn:l).getBoundingClientRect(),els=D.elementsFromPoint(r.left+r.width/2,r.top+r.height/2),on=false;for(var i=0;i<els.length;i++){var e=els[i];if(e.closest('#dxDock')||e.closest('.dxc-n'))continue;on=isDarkScene(e);break}l.classList.toggle('on-dark',on);var n=D.getElementById('dxcN');if(n)n.classList.toggle('on-dark',on)}W.lchTone=lchTone;
 var lchT=0,lchE=0;function lchQ(){clearTimeout(lchE);lchE=setTimeout(lchTone,140);if(lchT)return;lchT=setTimeout(function(){lchT=0;lchTone()},120)}   /* hit tests force layout: throttled, not per frame */W.addEventListener('scroll',lchQ,{passive:true});W.addEventListener('resize',lchQ);setTimeout(lchTone,400);setTimeout(lchTone,1500);
 function sc(){var y=W.scrollY;if(!past&&y>80)past=true;else if(past&&y<40)past=false;
  var tn=performance.now();if(tn-dkT>100){dkT=tn;var a=photoAt(88),b=photoAt(116);if(a===b)dk=a}clearTimeout(dkE);dkE=setTimeout(tone,140);   /* hit tests force layout: at most every 100 ms */ /* 2026-10-31: checked at every scroll position, not just past 80px, so a photo-less .band-n hero (no photograph behind the header) gets a solid bar from the very top instead of invisible white-on-white text */
  var dy=y-last;acc=(dy>0)===(acc>0)?acc+dy:dy;if(acc>24&&y>420)hid=true;else if(acc<-24||y<=420)hid=false;if($('#mm.open'))hid=false;
  var lt=D.documentElement.dataset.theme!=='dark'; /* light theme: the header is always the white bar, so the colour logo always shows (user 2026-10-31) */
  cls('solid',!dk||lt);cls('over',past&&dk&&!lt);cls('hide',hid);last=y;idle();var ak=$('#ask');if(ak)ak.classList.toggle('show',y>500)}
/* idle hide (user 2026-10-31): past the top, once scrolling stops the header slides away after 2 s; it stays while hovered, while a menu is open,
    while focus is inside it, and at the top of the page; scrolling up brings it back as before */
 var idT=0,hov=false;function idle(){clearTimeout(idT);if(hid)return;idT=setTimeout(function(){if(W.scrollY>420&&!hov&&!$('#mm.open')&&!hdr.contains(D.activeElement)&&!hdr.querySelector('.open')){hid=true;cls('hide',true)}},2000)}
 hdr.addEventListener('mouseenter',function(){hov=true;clearTimeout(idT)});hdr.addEventListener('mouseleave',function(){hov=false;idle()});
 hdr.addEventListener('focusout',function(){setTimeout(idle,0)});
W.addEventListener('scroll',sc,{passive:true});sc();if(W.MutationObserver)new MutationObserver(sc).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
var timer;$$('.nav>li.has-mega,.sign').forEach(function(li){var b=$('button',li);function op(v){li.classList.toggle('open',v);b.setAttribute('aria-expanded',v)}
li.addEventListener('mouseenter',function(){clearTimeout(timer);$$('.open',hdr).forEach(function(o){if(o!==li)o.classList.remove('open')});op(true)});li.addEventListener('mouseleave',function(){timer=setTimeout(function(){op(false)},180)});
b.addEventListener('click',function(){op(!li.classList.contains('open'))});li.addEventListener('focusout',function(e){if(!li.contains(e.relatedTarget))op(false)})});
D.addEventListener('keydown',function(e){if(e.key==='Escape'){$$('.open',hdr).forEach(function(o){o.classList.remove('open')});closeMenu();closeModal();if($('#ask'))$('#ask').classList.remove('open')}});
var bg=$('#bg'),mm=$('#mm'),mmOpener=null;
function mmPhoto(){var b=$('.mm-bg',mm);if(!b||b.dataset.on)return;b.dataset.on=1;var n=b.dataset.ph,im=D.createElement('img');im.alt='';im.decoding='async';
 im.src='img/photos/'+n+'-1600.webp';im.srcset='img/photos/'+n+'-800.webp 800w, img/photos/'+n+'-1200.webp 1200w, img/photos/'+n+'-1600.webp 1600w';im.sizes='100vw';im.onload=function(){b.classList.add('on')};b.appendChild(im)}
function closeMenu(){if(!mm.classList.contains('open'))return;mm.classList.remove('open');hdr.classList.remove('menu-open');mm.setAttribute('aria-hidden','true');bg.setAttribute('aria-expanded',false);DX.lock(false);if(mmOpener&&mmOpener.focus)mmOpener.focus()}
function openMenu(){mmPhoto();mmOpener=D.activeElement;mm.classList.add('open');hdr.classList.add('menu-open');mm.setAttribute('aria-hidden','false');bg.setAttribute('aria-expanded',true);DX.lock(true);setTimeout(function(){var f=$('.mm-l a',mm);if(f&&mm.classList.contains('open'))f.focus()},80)}
bg.onclick=function(){if(mm.classList.contains('open'))closeMenu();else openMenu()};$$('a',mm).forEach(function(a){a.addEventListener('click',closeMenu)});
/* focus stays inside the open menu (the burger in the header is part of the loop, so Tab from the last control lands on the close control) */
D.addEventListener('keydown',function(e){if(e.key!=='Tab'||!mm.classList.contains('open'))return;var f=[bg].concat($$('a[href],button:not([disabled])',mm).filter(function(x){return x.offsetParent!==null}));if(!f.length)return;var a=f[0],z=f[f.length-1];
 if(e.shiftKey&&D.activeElement===a){e.preventDefault();z.focus()}else if(!e.shiftKey&&D.activeElement===z){e.preventDefault();a.focus()}});
function thmLabel(){var d=D.documentElement.dataset.theme==='dark';$$('.thm-b').forEach(function(b){b.setAttribute('aria-label',d?'Switch to light theme':'Switch to dark theme');b.title=d?'Light theme':'Dark theme'});}thmLabel();
$$('.thm-b').forEach(function(b){b.onclick=function(){var t=D.documentElement.dataset.theme==='dark'?'light':'dark';D.documentElement.dataset.theme=t;try{localStorage.setItem('dx-theme',t)}catch(e){}thmLabel()}});
(function(){var I=W.DXI18n;if(!I)return;var hr=$('.hdr-r');if(hr)hr.insertBefore(I.menu(false),hr.firstChild);I.boot()})();
var m=$('#md');m.addEventListener('click',function(e){if(e.target===m||e.target.closest('.x'))closeModal()});
D.addEventListener('submit',function(e){var f=e.target.closest('[data-form]');if(!f)return;e.preventDefault();var ok=f.querySelector('.ok')||f.parentNode.querySelector('.ok-m'),em=f.querySelector('[name=email]'),API=W.DXAPI,sb=f.querySelector('button[type=submit]');
 /* sweep v8.7: one message line under the pill; an error is marked (.err, aria-invalid on the field), a success clears the field */
 function show(m,sent){if(ok){ok.textContent=m;ok.style.display='block';ok.classList.toggle('err',sent===false)}if(em)em.setAttribute('aria-invalid',sent===false?'true':'false');if(sent!==false)f.reset()}
 if(em&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test((em.value||'').trim())){show('Please add a valid email.',false);em.focus();return}
 if(!API||!f.dataset.api||f.dataset.busy){show('Thank you. You are on the list. (Preview: nothing was sent.)');return}
 var data=API.formData(f);f.dataset.busy='1';API.busy(sb,true);
 API.post(f.dataset.api,data).then(function(r){delete f.dataset.busy;API.busy(sb,false);if(r.ok)show(r.body&&r.body.duplicate?'You are already on the list.':'Thank you. You are on the list.');else show(r.body&&r.body.error||'We could not add you just now. Please try again later.',false)})
 .catch(function(){delete f.dataset.busy;API.busy(sb,false);show('Thank you. You are on the list. (Preview: nothing was sent.)')})});
D.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a||a.target||e.ctrlKey||e.metaKey)return;var u=a.getAttribute('href');if(/^(#|mailto|tel|http)/.test(u)||a.hostname!==location.hostname)return;if(u.charAt(0)==='#')return;e.preventDefault();D.body.classList.add('leaving');setTimeout(function(){location.href=u},220)});
W.addEventListener('pageshow',function(){D.body.classList.remove('leaving')});
var fv=$('.ft-video');if(fv){var on=function(){fv.classList.add('on')};fv.addEventListener('canplay',on);if(fv.readyState>=3)on();if(matchMedia('(prefers-reduced-motion:reduce)').matches){fv.pause();fv.removeAttribute('autoplay')}}
}
function motion(){
var G=W.gsap,ST=W.ScrollTrigger;D.body.classList.add('ready');
var lenis=null;if(!reduce&&fine&&W.Lenis&&G){/* smooth wheel on mouse and trackpad only (touch stays native): a slightly heavier glide than the default .1; the scene engine halves its own scrub smoothing when Lenis runs so the two never stack into lag */
 lenis=new W.Lenis({lerp:.07,wheelMultiplier:.85,touchMultiplier:1,smoothWheel:true,syncTouch:false}); /* sweep v8.5: .1 (was .085) so free scrolling inside tall blocks answers the wheel a little sooner */W.__lenis=lenis;if(ST){lenis.on('scroll',ST.update)}G.ticker.add(function(t){lenis.raf(t*1000)});G.ticker.lagSmoothing(0)}
/* sweep v8.6 (scroll audit): a looping clip (footer ocean, destinations plane) decodes video on every frame even while it is far off screen, which costs a weak
   PC more than any scroll effect; each autoplay video now plays only within a quarter screen of the viewport and pauses elsewhere (nothing changes under reduced motion) */
if(W.IntersectionObserver&&!reduce){var vio=new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;if(e.isIntersecting){if(v.paused){var pp=v.play();if(pp&&pp.catch)pp.catch(function(){})}}else if(!v.paused)v.pause()})},{rootMargin:'25% 0px'});
 var vwatch=function(){$$('video[autoplay]').forEach(function(v){if(!v._vio){v._vio=1;vio.observe(v)}})};vwatch();setTimeout(vwatch,1500)}
/* anchor jumps: duration grows with the distance (0.9 s to 2.4 s) on an expo in-out curve, so a jump across the whole page still reads as one motion */
/* 2026-10-31: a target inside a reading hold (js/core/imgfx.js, .dx-held is CSS-sticky) is measured from where it sits when not stuck (DX.holdNat), and
   the soft magnet stays off until the visitor's own next input, so an anchor / contents jump lands exactly where it was sent */
DX.scrollTo=function(y){DX._jump=1;if(typeof y!=='number'){var tp=W.DXScenes&&W.DXScenes.topOf?W.DXScenes.topOf(y):null,hd=y.closest&&y.closest('.dx-held'),hn=hd&&DX.holdNat?DX.holdNat(hd):null;
  y=tp!=null?tp:hn!=null?hn+(y.getBoundingClientRect().top-hd.getBoundingClientRect().top):y.getBoundingClientRect().top+W.scrollY}
 if(lenis){var d=Math.abs(y-W.scrollY);lenis.scrollTo(y,{duration:Math.min(2.4,.9+d/7000),lerp:0,easing:function(t){return t<.5?Math.pow(2,20*t-10)/2:(2-Math.pow(2,-20*t+10))/2}});return}else W.scrollTo({top:y,behavior:reduce?'auto':'smooth'})};
$$('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var t=$(a.getAttribute('href'));if(t){e.preventDefault();DX.scrollTo(t)}})});
$$('[data-tilt]').forEach(DX.tilt);
if(fine&&!reduce){$$('[data-mag]').forEach(function(b){b.addEventListener('mousemove',function(e){var r=b.getBoundingClientRect();b.style.transform='translate('+((e.clientX-r.left-r.width/2)*.22)+'px,'+((e.clientY-r.top-r.height/2)*.3)+'px)'});b.addEventListener('mouseleave',function(){b.style.transform=''})});}
if(!G||!ST||reduce){$$('[data-count]').forEach(function(e){e.textContent=e.dataset.count});if(DX.after)DX.after(false);return}
G.registerPlugin(ST);
/* 2026-10-31: with the Motion layer (js/core/reveal.js, DX.MO) the footer's [data-r] blocks use the same shared entrance as every other block */
if(DX.MO&&DX.reveal){var drs=$$('[data-r]');drs.forEach(function(e){e.removeAttribute('data-r')});DX.reveal(drs)}
$$('[data-r]').forEach(function(e){e.style.opacity=0});
/* fail-safe: if any script throws, or a reveal never fires, content must still be readable */
/* Round 6: the rescue runs again after every fast scroll or anchor jump, and also frees masked words and clip reveals that never entered. */
function rescue(){var H=W.innerHeight;function near(e){var r=e.getBoundingClientRect();return r.top<H*1.15&&r.bottom>-40&&r.width>0}
 $$('[data-r]').forEach(function(e){if(e.style.opacity==='0'&&near(e)){e.style.opacity='';e.style.transform=''}});
 $$('.mwi,.ln>span').forEach(function(e){if(!near(e))return;var m=getComputedStyle(e).transform;if(m&&m!=='none'){var p=m.match(/matrix\(([^)]+)\)/);if(p&&Math.abs(+p[1].split(',')[5])>e.offsetHeight*.5){e.style.transform='none'}}});
 $$('[data-clip]').forEach(function(e){if(!near(e))return;var c=getComputedStyle(e).clipPath;if(c&&c!=='none'&&/inset\(\s*[1-9]/.test(c)){e.style.clipPath='none';var im=$('img',e);if(im)im.style.transform=''}})}
var rsT;function rescueSoon(ms){clearTimeout(rsT);rsT=setTimeout(rescue,ms||900)}
setTimeout(rescue,3500);W.addEventListener('scroll',function(){rescueSoon(1400)},{passive:true});W.addEventListener('hashchange',function(){rescueSoon(1000)});
ST.batch('[data-r]',{start:'top 92%',once:true,onEnter:function(b){b=b.filter(function(e){return e.style.opacity==='0'});if(b.length)G.fromTo(b,{y:M.y,opacity:0},{y:0,opacity:1,duration:M.d,ease:M.ease,stagger:M.st,clearProps:'transform,opacity'})}}); /* v8.12 motion tokens */
$$('[data-par]').forEach(function(e){G.fromTo(e,{yPercent:-6},{yPercent:6,ease:'none',scrollTrigger:{trigger:e.parentNode,start:'top bottom',end:'bottom top',scrub:true}})});
$$('[data-count]').forEach(function(e){var n=+e.dataset.count,o={v:0};ST.create({trigger:e,start:'top 90%',once:true,onEnter:function(){G.to(o,{v:n,duration:1.8,ease:'power2.out',onUpdate:function(){e.textContent=Math.round(o.v)}})}})});
if(DX.after)DX.after(true);
/* footer: as the ledger rises over the ocean's empty lower band, the statement drifts up and the ocean dims a little; nothing is ever covered */
var fa=$('.ft-a'),fb=$('.ft-b');if(fa&&fb){var sh=$('.ft-shade',fa),fw=$(':scope>.wrap',fa);G.timeline({scrollTrigger:{trigger:fb,start:'top bottom',end:'bottom bottom',scrub:true,invalidateOnRefresh:true}}).to(sh,{opacity:.16,ease:'none'},0).fromTo(fw,{y:40},{y:-20,ease:'none'},0)}
setTimeout(function(){ST.refresh()},600);W.addEventListener('load',function(){ST.refresh()});
}
/* sweep v8.11: <video data-lazy data-src> gets its source and starts only within 600 px of the viewport (never under reduced motion) */
DX.lazyVideos=function(){var vs=$$('video[data-lazy][data-src]');if(!vs.length||reduce)return;
 var go=function(v){if(v.dataset.on)return;v.dataset.on=1;var so=D.createElement('source');so.src=v.dataset.src;so.type='video/mp4';v.appendChild(so);v.autoplay=true;v.preload='auto';v.load();var pp=v.play();if(pp&&pp.catch)pp.catch(function(){})};
 if(!W.IntersectionObserver)return vs.forEach(go);var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);go(e.target)}})},{rootMargin:'600px 0px'});vs.forEach(function(v){io.observe(v)})};
D.addEventListener('DOMContentLoaded',function(){chrome();wire();if(DX.page)DX.page();DX.lazyVideos();motion()});
})();

/* phone booking pill (sweep v8.12): lives in the bottom dock beside the chat launcher; DX.dockSync decides when it shows (never on the contact page) */
(function(){try{if(/contact\.html/.test(location.pathname))return;var DX=window.DX,a=document.createElement('a');a.className='btn btn-p bk-pill';a.href='contact.html#book';
a.innerHTML='<span>Book free counselling</span><span class="ar" aria-hidden="true">&#8594;</span>';var d=DX&&DX.dockEl?DX.dockEl():document.body;d.insertBefore(a,d.firstChild);if(DX&&DX.dockSync)DX.dockSync(true)}catch(e){}})();
/* phones: hide the dock's booking pill while a closing scene that carries its own "Book free counselling" button is on screen (no two identical buttons) */
(function(){var D=document,W=window;if(!('IntersectionObserver' in W))return;var on=new Set();
 function go(){var sel='.cl7,.cl8,.v7cta,.cx7,#book.scn';var els=[].slice.call(D.querySelectorAll(sel)).filter(function(e){return e.querySelector('a.btn[href*="#book"],a.btn[href*="contact"],button.btn')});if(!els.length)return;
  var io=new IntersectionObserver(function(es){es.forEach(function(x){if(x.intersectionRatio>=.35)on.add(x.target);else on.delete(x.target)});D.documentElement.classList.toggle('own-cta',on.size>0)},{threshold:[0,.35,.6]});
  els.forEach(function(e){io.observe(e)})}
 if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',function(){setTimeout(go,600)});else setTimeout(go,600)})();
/* desktop (trackpad, keyboard, scrollbar): if the page comes to rest inside the university-voice runway between two voices, glide to the nearest voice so a whole quote is always shown */
(function(){var W=window,D=document;if(matchMedia('(pointer:coarse)').matches||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
 function info(){var sec=D.getElementById('voices'),vb=sec&&sec.querySelector('.vb');if(!vb)return null;var n=vb.querySelectorAll('.vb-i').length-1;if(n<1)return null;
  if(vb._stopY)return{s:vb._stopY(0),step:vb._stopY(1)-vb._stopY(0),n:n};
  var t=W.DXScenes&&W.DXScenes.topOf?W.DXScenes.topOf(sec):null;if(t==null)return null;return{s:t,step:Math.round(W.innerHeight*(parseFloat(sec.dataset.step)||1)),n:n}}
 var tm,busy=false,vd=0;W.addEventListener('wheel',function(e){if(e.deltaY)vd=e.deltaY>0?1:-1},{passive:true,capture:true});
 W.addEventListener('keydown',function(e){var k=e.key;if(/^(ArrowDown|PageDown|End| )$/.test(k)&&!e.shiftKey)vd=1;else if(/^(ArrowUp|PageUp|Home)$/.test(k)||(k===' '&&e.shiftKey))vd=-1},{passive:true,capture:true});
 function go(){if(busy)return;var v=info();if(!v)return;var y=W.scrollY,e=v.s+v.n*v.step;if(y<v.s+6||y>e-6)return;
  /* 2026-11-01 soft stop ("never pulled back"): a small move (< 48 px) returns to its voice, otherwise the page glides on to the next voice in the
     direction of the visitor's own wheel / keys, never back against it */
  var k=(y-v.s)/v.step,r=Math.round(k),off=Math.abs(y-(v.s+r*v.step)),t=v.s+(off<48?r:(vd>0?Math.ceil(k):vd<0?Math.floor(k):r))*v.step;t=Math.max(v.s,Math.min(e,t));
  if(Math.abs(t-y)<8)return;busy=true;var done=function(){busy=false};
  if(W.__lenis)W.__lenis.scrollTo(t,{duration:.9,onComplete:done});else{W.scrollTo({top:t,behavior:'smooth'});setTimeout(done,900)}}
 W.addEventListener('scroll',function(){if(busy)return;clearTimeout(tm);tm=setTimeout(go,260)},{passive:true})})();
/* phones: mark the page while it scrolls (used to step the chat launcher aside) */
(function(){var W=window,R=document.documentElement,tm;if(!matchMedia('(max-width:700px)').matches)return;
 W.addEventListener('scroll',function(){R.classList.add('is-scrolling');clearTimeout(tm);tm=setTimeout(function(){R.classList.remove('is-scrolling')},450)},{passive:true})})();

/* scroll lock for the site modal (2026-10-31, user "background scroll must stop and that section must get scroll"): while #md is open the page
   (and Lenis smooth scroll) stops, and the wheel/touch scrolls the modal box itself; everything is restored on close */
(function(){var D=document,W=window,R=D.documentElement,locked=false,y=0;
 function apply(){var m=D.getElementById('md');if(!m)return;var open=m.classList.contains('open');if(open===locked)return;locked=open;
  var L=W.__lenis||W.lenis;
  if(open){y=W.scrollY;m.setAttribute('data-lenis-prevent','');if(L&&L.stop)L.stop();R.classList.add('md-lock')}
  else{R.classList.remove('md-lock');if(L&&L.start)L.start();if(Math.abs(W.scrollY-y)>2)W.scrollTo(0,y)}}
 function wire(){var m=D.getElementById('md');if(!m)return setTimeout(wire,200);new MutationObserver(apply).observe(m,{attributes:true,attributeFilter:['class']});apply()}
 if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',wire);else wire()})();
