/* imgfx.js (sweep v8.13): one image system for every public page. Loaded after js/photos.js; works on whatever the page scripts render.
   1. Framing (DX.fit): every photograph's object-position is computed from its focal point and safe box in js/photos.js (f, s; source img/focus.json)
      for the box it is drawn in, so the safe box (faces with shoulders, the whole landmark) stays inside the frame even at the largest zoom and drift
      the motion system applies. No page sets object-position by hand any more; data-pos is only the no-JS fallback.
   2. Watermark (DX.wm): the Dolphin mark (img/wm/dolphin-mark-white.png, cut from img/logo-light.png) on every content photograph, as span.wm in the
      photo's frame: never scaled with the photo, aria-hidden, no pointer events, small and always bottom-right, faint at rest, clear when zoomed.
   3. Motion (DX.imgMotion): once-only soft entrance for card photos (opacity, scale 1.08 -> 1 on the photo, clip-path inset reveal on the frame, 60 ms
      stagger), lazy photos fade in on decode over their dominant colour, scrubbed zoom on full-bleed inner-page scene photos, hover zoom on fine pointers.
      Transform, opacity and clip-path only; nothing replays; prefers-reduced-motion = static (no hidden state is ever applied). Tokens: css/site.css. */
(function(){
var W=window,D=document,DX=W.DX=W.DX||{},HTML=D.documentElement;
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
var MOB=matchMedia('(max-width:700px)').matches,FINE=matchMedia('(hover:hover) and (pointer:fine)').matches;
var LOW=(navigator.hardwareConcurrency||8)<=2||(navigator.deviceMemory||8)<=2;   /* 2026-10-31 (user: same effects on phones): was <=4 cores or <=4 GB, which put most mid-range Android phones on the plain fade; only genuinely weak devices skip the clip reveal now */
var ZMAX=MOB?1.03:1.04;                                     /* largest scale the motion system applies to a photo (tokens --zoom-max) */
var RX=/img\/photos\/([a-z0-9-]+?)-(\d+)\.webp/;
var SKIP='header,.hdr,.ft-a,.ft-b,footer,.chat,.cw,.uc,.pw,.pw-c,.dr-l,[data-no-wm]';  /* the voice slider photos carry the mark too (sweep v8.13) */
function PH(){return W.DX_PH||{}}
function nameOf(im){if(im.dataset.photo)return im.dataset.photo;var m=(im.currentSrc||im.getAttribute('src')||'').match(RX);return m?m[1]:null}
function photos(root){return[].slice.call((root||D).querySelectorAll('img')).filter(function(im){var n=nameOf(im);return n&&PH()[n]})}
function clamp(v,a,b){return v<a?a:v>b?b:v}
/* the element that clips the photo (its visible frame) */
function clipOf(im){var e=im.parentElement;while(e&&e!==D.body){var cs=getComputedStyle(e);if(cs.overflowX!=='visible'||cs.overflowY!=='visible'||cs.clipPath!=='none')return e;e=e.parentElement}return im.parentElement}
/* one axis: v = fraction of the image the img box shows on this axis; z = how much smaller the frame window is (box/frame x motion zoom);
   d = drift as a fraction of the box; returns the object-position (0..1) that keeps [s0,s1] inside the window, centred on f where possible */
function axis(v,f,s0,s1,z,d){var hw=v/(2*z)-d*v,lo=Math.max(v/2,s1-hw),hi=Math.min(1-v/2,s0+hw),ok=lo<=hi+1e-4,c;
 c=ok?clamp(f,lo,hi):clamp((s0+s1)/2,v/2,1-v/2);return{p:v>=.999?.5:(c-v/2)/(1-v),ok:ok,over:Math.max(0,lo-hi)}}
/* the full-bleed scene photos (story, closing, contact) drift 4 % and zoom to 1.04 (sweep v8.13: was 7 % and none; the safe box must survive both) */
var SCENE='.v7s,.v7cta,.v7p',ZS=MOB?1.03:1.04;
function calc(m,bw,bh,fw,fh,zm,dr,dx){var A=m.w/m.h,B=bw/bh,vx=A>B?B/A:1,vy=A>B?1:A/B,zx=Math.max(1,bw/fw),zy=Math.max(1,bh/fh),
 f=m.f||[(m.s[0]+m.s[2])/2,(m.s[1]+m.s[3])/2];return{x:axis(vx,f[0],m.s[0],m.s[2],zx*zm,dx||0),y:axis(vy,f[1],m.s[1],m.s[3],zy*zm,dr)}}
function params(im){var sc=im.closest(SCENE),rg=im.hasAttribute('data-rung-img')||!!im.closest('.se-drift'),zm=parseFloat((im.closest('[data-zmax]')||{dataset:{}}).dataset.zmax)||(rg?1.1:sc?ZS:ZMAX);
 var dr=parseFloat((im.closest('[data-drift]')||{dataset:{}}).dataset.drift);if(isNaN(dr))dr=sc?.04:/translate\([^)]*%/.test(im.style.transform||'')?.07:0; /* the photo itself drifts inside its frame (parallax) */
 var vb=!!im.closest('.vb');if(im.matches(BAN)&&!RM)zm=MOB?1.04:1.05;return{zm:vb?1:zm,dr:dr,dx:rg?.08:vb?.1:0}}   /* voice slider: the photo glides about 8 % sideways as it arrives */   /* home rungs: the scene engine scales the photo 1.1 and drifts it sideways about 8 % (js/core/scenes.js) */
function swap(im,n){var m=PH()[n],ws=[400,800,1200,1600,2400,3200].filter(function(w){return w<=m.w});
 im.srcset=ws.map(function(w){return'img/photos/'+n+'-'+w+'.webp '+w+'w'}).join(', ');im.src='img/photos/'+n+'-'+Math.min(1600,m.w)+'.webp';
 im.width=m.w;im.height=m.h;im.dataset.photo=n;im.style.setProperty('--phc',m.c)}
DX.fit=function(im){var n=nameOf(im),m=n&&PH()[n];if(!m||!m.s)return;var bw=im.offsetWidth,bh=im.offsetHeight;if(!bw||!bh)return;
 if(m.m&&!im.dataset.ad){im.dataset.ad='1';var k=DX.phPick(n,im);if(k!==n){swap(im,k);n=k;m=PH()[n]}}   /* late art direction, once per photo */
 var fr=clipOf(im),p=params(im),r=calc(m,bw,bh,fr.clientWidth||bw,fr.clientHeight||bh,p.zm,p.dr,p.dx);
 im.style.objectPosition=(r.x.p*100).toFixed(2)+'% '+(r.y.p*100).toFixed(2)+'%';im.dataset.fit=r.x.ok&&r.y.ok?'ok':'tight';
 if(!im.style.getPropertyValue('--phc')&&m.c)im.style.setProperty('--phc',m.c)};
/* art direction (Part E): when a photo's safe box cannot fit the frame it is about to be drawn in (a landscape photo in a tall phone scene or a narrow
   strip), the page's photo pipeline (DX.phExpand) asks for its portrait alternate (photos.js "m", same subject, own safe box) before anything loads */
DX.phPick=function(n,im){var P=PH(),m=P[n];if(!m||!m.m||!m.s||!P[m.m]||!P[m.m].s)return n;if(im&&im.dataset&&im.dataset.altMax&&W.innerWidth>+im.dataset.altMax)return n; /* data-alt-max="700": the portrait alternate only on phones (closing scene: desktop windows keep the three graduates, user 2026-10-31) */if(im&&im.closest&&im.closest('.vb'))return n; /* the partner voices keep the photograph of their own place: no portrait alternate (it showed the same Columbia building for two partners) */var fr=clipOf(im),fw=fr.clientWidth,fh=fr.clientHeight;if(!fw||!fh)return n;
 var bw=im.offsetWidth||fw,bh=im.offsetHeight||fh,p=params(im),a=calc(m,bw,bh,fw,fh,p.zm,p.dr,p.dx);if(a.x.ok&&a.y.ok)return n;
 var alt=P[m.m];if((alt.w<alt.h)!==(fw<fh))return n;                  /* a portrait alternate only for a tall frame, a landscape one only for a wide frame */
 var b=calc(alt,bw,bh,fw,fh,p.zm,p.dr,p.dx);if(!(b.x.ok&&b.y.ok)&&Math.max(b.x.over,b.y.over)>=Math.max(a.x.over,a.y.over))return n; /* only when the alternate frames better */
 if(im.getAttribute('alt')&&alt.a)im.setAttribute('alt',alt.a);return m.m};
/* ---------- watermark ---------- */
/* a wrapper that scales the photo (zoom-through hero, rung zoom) must not carry the mark; one that only translates (parallax figure) may, the mark moves with it */
function animated(e){var sc=e.style.scale;return!!(sc&&sc!=='none'&&sc!=='1')||/scale|matrix/.test(e.style.transform||'')||e.matches('.v7h-bg,.v7h-pan,.v7h-pan>figure,[data-zoom-img]')}
function inflow(e){return[].every.call(e.children,function(c){var p=getComputedStyle(c).position;return p==='static'||p==='relative'})}
function frameOf(im){var e=im.parentElement;while(e&&e!==D.body){var cs=getComputedStyle(e),clip=cs.overflowX!=='visible';
  if(!animated(e)){if(cs.position!=='static'&&(clip||/^(FIGURE|SECTION|ARTICLE)$/.test(e.tagName)||e.classList.contains('rung')))return e;
   if(clip&&e.tagName==='FIGURE'&&inflow(e)){e.style.position='relative';return e}}e=e.parentElement}return null}
/* user rule (2026-10-30): the mark is small and in the same place on every photo (bottom-right); it never moves to dodge text. At rest it is barely
   visible (.22, .4 on high-density or pinch-zoomed screens); hover, focus or a zoomed photo (.zoomed) raise it to .75; on touch screens it rises to .6
   while the photo sits in the central 40 % of the viewport (one IntersectionObserver change, no flicker) */
var nio=null;
function hiDensity(){var v=W.visualViewport;HTML.classList.toggle('wm-hi',(W.devicePixelRatio||1)>=1.5||!!(v&&v.scale>1.01))}
DX.wm=function(root){var used=[];if(!FINE&&!nio&&'IntersectionObserver' in W)nio=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('wm-near',e.isIntersecting)})},{rootMargin:'-30% 0px -30% 0px'});
 photos(root).forEach(function(im){if(im.closest(SKIP))return;if(im.offsetWidth&&im.offsetWidth<120)return;
  var fr=frameOf(im);if(!fr||fr.closest(SKIP))return;var w=fr.querySelector(':scope>.wm');
  if(!w){w=D.createElement('span');w.className='wm';w.setAttribute('aria-hidden','true');fr.appendChild(w);if(nio)nio.observe(w)}used.push(w)});
 if(!root)[].forEach.call(D.querySelectorAll('.wm'),function(w){if(used.indexOf(w)<0){if(nio)nio.unobserve(w);w.parentNode.removeChild(w)}})};
/* ---------- motion ---------- */
var ENTER='.v7w-p figure,.v7v-c figure,.stk-c figure,.split>figure,.fph,.tm figure,.tc-p,[data-reveal]';
var io=null,queue=[],qt=0;
function settle(f){f.classList.add('imx-run');var done=function(e){if(e&&e.target!==f&&e.target.parentNode!==f)return;f.classList.remove('imx-run');f.removeEventListener('transitionend',done)};
 f.addEventListener('transitionend',done);setTimeout(done,1600)}
function show(list){list.forEach(function(f,k){f.style.setProperty('--imx-d',(k*60)+'ms');var im=f.querySelector('img');
  var go=function(){requestAnimationFrame(function(){settle(f);f.classList.add('imx-in')})};
  if(!im||im.complete)go();else{var once=function(){im.removeEventListener('load',once);im.removeEventListener('error',once);go()};im.addEventListener('load',once);im.addEventListener('error',once)}})}
DX.imgMotion=function(root){if(RM)return;
 if(!io&&'IntersectionObserver' in W)io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){io.unobserve(e.target);queue.push(e.target)}});
  if(queue.length&&!qt)qt=requestAnimationFrame(function(){qt=0;var l=queue.splice(0);l.sort(function(a,b){var p=a.compareDocumentPosition(b);return p&4?-1:1});show(l)})},{rootMargin:'0px 0px -18% 0px',threshold:0});   /* 2026-10-31: same trigger line as js/core/reveal.js (82 % of the screen) */
 [].slice.call((root||D).querySelectorAll(ENTER)).forEach(function(f){if(f.dataset.imx||f.closest('#voices,.vb,.scn'))return;var im=f.querySelector('img');if(!im)return;
  f.dataset.imx='1';f.classList.add('imx');if(FINE)f.classList.add('imx-h');if(!f.dataset.reveal)f.dataset.reveal=MOB&&LOW?'fade':'clip';
  f.style.setProperty('--imx-r',getComputedStyle(f).borderRadius||'0px');
  var r=f.getBoundingClientRect();if(!io||(r.top<W.innerHeight&&r.bottom>0)||f.offsetParent===null)f.classList.add('imx-in');else io.observe(f)});
 /* lazy photos that are not loaded yet fade in on decode over their dominant colour (never pop) */
 photos(root).forEach(function(im){if(im.complete||im.dataset.lz||im.closest('.imx'))return;im.dataset.lz='1';im.classList.add('imx-lz');
  var on=function(){im.removeEventListener('load',on);im.removeEventListener('error',on);requestAnimationFrame(function(){im.classList.add('imx-lzin')})};im.addEventListener('load',on);im.addEventListener('error',on)});
 HTML.classList.add('imx-on')};
/* banner motion (DX.bannerMotion, user 2026-10-30: "framer-motion-like zoom-out, and slow zoom-in, images not cut"): every full-bleed banner photo
   (inner-page and country heroes, story, closing and contact scenes; not the home hero video or the home scenes, which scenes.js drives) settles
   from 1.04 to 1 over 2.4 s the first time it comes into view, then pushes in very slowly (1 -> 1.03 over 18 s, back and forth) while on screen (soft tokens).
   CSS keyframes on the individual `scale` property only (composes with the scroll parallax on `transform`, never fights GSAP), scale never below 1
   of the cover size (so no edge can show), the frame clips it and the watermark sits on the frame (does not scale). Paused off screen,
   will-change only while running, static under reduced motion. Framing (DX.fit) budgets for the peak so the safe box stays whole. */
var BAN='.v7h-bg img,.v7s>img,.v7cta>img,.v7p>figure img',bio=null;
DX.bannerMotion=function(){if(RM||!('IntersectionObserver' in W))return;
 if(!bio)bio=new IntersectionObserver(function(es){es.forEach(function(e){var im=e.target;if(e.isIntersecting){var go=function(){im.classList.add('bm-go');im.classList.remove('bm-pause')};if(im.complete)go();else im.addEventListener('load',go,{once:true})}
  else if(im.classList.contains('bm-go'))im.classList.add('bm-pause')})},{threshold:.12});
 [].slice.call(D.querySelectorAll(BAN)).forEach(function(im){if(im.dataset.bm||im.closest('.scn,#voices,.vb'))return;im.dataset.bm='1';im.classList.add('bm');bio.observe(im)})};
/* ---------- view motion (DX.viewMotion, sweep v8.13; MOTION_SYSTEM.md): ONE enter/exit system for every component outside the home scenes ----------
   ENTER: every block not already handled gets the shared once-only entrance DX.reveal (site.js: rise DX.M.y, fade, DX.M.d, DX.M.ease, stagger DX.M.st,
   one ScrollTrigger batch; anything already on screen is left alone, so nothing blinks). Containers of repeated items (grids, lists) reveal their items.
   EXIT: as a block's bottom passes through the top 22 % of the screen it eases up DX.M.xy px and to opacity 1 - DX.M.xo (a pure function of the scroll,
   so scrolling back restores it exactly; nothing is ever left hidden at rest). One shared, rAF-throttled scroll handler over the blocks that an
   IntersectionObserver reports near the top; reads first, then writes; `translate` + opacity only. Reduced motion: none of it. */
var VM_SKIP='.scn,.v7h,#voices,.vbs,.vb,.dr,header,.hdr,.chat,.cw,.ft-a,.dx-spc,[data-no-vm]';   /* .dx-spc: the empty hold room of DX.hold */
var VM_GROUP='ul,ol,dl,.tc-g,.vc-g,.ug7,.v7cm,.tm,.pw,.cells,.v7v-l,.fsplit,.mp7,.v7w-g,.v7c-g,.v7u-g,.mn-g,.split,.stk-g,.ft-cols,.ft-grid';
var vmDone=false,vmEls=[],vmNear=new Set(),vmRaf=0;
function handled(e){if(e.hasAttribute('data-rvl')||e.querySelector('[data-rvl]'))return true;for(var p=e.parentElement;p;p=p.parentElement)if(p.hasAttribute&&p.hasAttribute('data-rvl'))return true;return false}
DX.viewMotion=function(){if(vmDone||RM||!W.gsap||!W.ScrollTrigger||!DX.reveal)return;vmDone=true;var M=DX.M||{xy:10,xo:.45},blocks=[];
 [].slice.call(D.querySelectorAll('main section, footer section, footer .wrap')).forEach(function(sec){if(sec.closest(VM_SKIP))return;
  [].slice.call(sec.querySelectorAll(':scope>.wrap>*,:scope>.wrap>.zi>*,:scope>.zi>*,:scope>.wrap.zi>*')).forEach(function(b){
   if(b.closest(VM_SKIP)||b.offsetParent===null||/^(SCRIPT|STYLE|BR)$/.test(b.tagName))return;
   if(b.matches(VM_GROUP))[].slice.call(b.children).forEach(function(c){if(c.offsetParent!==null)blocks.push(c)});else blocks.push(b)})});
 blocks=blocks.filter(function(b,i){return blocks.indexOf(b)===i&&!handled(b)});
 if(blocks.length)DX.reveal(blocks);
 /* exit: the revealed blocks plus the ones the pages reveal themselves (data-rvl), each at most one level (no nested fades) */
 var all=[].slice.call(D.querySelectorAll('[data-rvl]')).concat(blocks).filter(function(e,i,a){return a.indexOf(e)===i&&!e.closest(VM_SKIP)&&!e.closest('.cl7,.cx7,.v7cta,.v7s,#compare')});   /* banner scenes keep their own photo motion; their copy does not fade out */
 vmEls=all.filter(function(e){for(var p=e.parentElement;p;p=p.parentElement)if(all.indexOf(p)>-1)return false;return true});
 var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting)vmNear.add(e.target);else{vmNear.delete(e.target);if(e.target._vmo&&e.boundingClientRect.bottom>0){e.target.style.translate='';e.target.style.opacity='';e.target._vmo=0}}   /* above the screen it keeps its exit state (no off-on-off) */});vmTick()},{rootMargin:'0px 0px -70% 0px'});
 vmEls.forEach(function(e){io.observe(e)});DX.vmCount={enter:blocks.length,exit:vmEls.length};
 var on=function(){if(!vmRaf)vmRaf=requestAnimationFrame(vmFrame)};if(W.__lenis&&W.__lenis.on)W.__lenis.on('scroll',on);W.addEventListener('scroll',on,{passive:true});
 function vmTick(){on()}
 function vmFrame(){vmRaf=0;var H=W.innerHeight,z=H*.22,w=[];vmNear.forEach(function(e){var r=e.getBoundingClientRect();
   var p=r.bottom>=z?0:r.bottom<=0?1:(z-r.bottom)/z;if(e.matches(':focus-within')||r.height>H*1.2||r.height<200||e.matches('button,a,.uc')||(W.gsap&&W.gsap.isTweening(e))||e._moRun||e.hasAttribute('data-mo-wait'))p=0;   /* 2026-10-31: entrances now run on Motion (js/core/reveal.js): skip while one runs or waits */w.push([e,p])   /* no exit while its entrance still runs (fast scroll), none on small items */});
  w.forEach(function(x){var e=x[0],p=x[1];if(p<=0){if(e._vmo){e.style.translate='';e.style.opacity='';e._vmo=0}return}   /* never touches a block it did not move (GSAP may be mid-entrance) */
   e._vmo=1;e.style.translate='0 '+(-(M.xy||10)*p).toFixed(1)+'px';e.style.opacity=(1-(M.xo||.45)*p).toFixed(3)})}
};
/* ---------- reading holds (DX.hold, sweep v8.13; MOTION_SYSTEM.md): every section, or every major block of a long section, rests on screen
   for DX.HOLD screens of scroll once it is fully in view (CSS sticky inside a runway, like the voice slider's DX.stick; no ScrollTrigger pin, so no
   layout jump), centred under the header; the soft magnet gets a stop in the middle of each hold, so a normal wheel gesture rests there. Free
   scrolling stays; scrolling back mirrors it; anything taller than the screen is never held; reduced motion: none. Home scenes, banners, the
   voice slider, the destinations ladder and the visa card stack (already sticky) are left as they are. */
/* 2026-10-31 (user: "maintain this stop like scroll effect in all components ... all pages", "spacing also auto on top bottom, so that section
   gets proper focus"): ONE hold for every page, the about.html feel everywhere.
   - Same feel: every held unit rests for DX.HOLD screens (0.7 desktop, 0.4 phones), CSS sticky (native, never fights a finger), and the soft magnet
     (site.js DX.magnet, Lenis on mouse / trackpad only) gets one stop in the middle of each hold, so a wheel gesture that ends near it settles there.
   - Auto spacing: a held unit is centred in the free part of the screen: between the header (+ --hold-gap) and the chat launcher / phone dock
     (measured, at least --hold-bottom), so the space above and below it is balanced (never under the header, never past the bottom edge).
   - The section keeps its own background: the hold room is a spacer (div.dx-spc) right after the held block inside its own parent, so the section
     simply grows and its own colour / gradient / map fills the room (no copied colour, so no flat strips and no stale colour after a theme switch,
     and `section > .wrap` rules keep matching). Only a block whose parent is a grid / flex row gets the old runway wrapper (div.dx-run.dx-hold).
     Bands (brand + closing gradient bands, the gallery map band, home #stats) are held this way too: their own gradient covers the room.
   - Long sections hold per major block (content block, else each block, else each row group that fits). Free reading (filterable lists, the
     blog article, the gallery grid, the event list, anything taller than the screen with no block that fits, [data-no-hold]) is never held: it
     gets a magnet rest at its start instead, so the reader is never trapped. Photo banners (closing / story scenes) get a rest that frames them.
   - Home: scenes.js owns the scenes; its plain blocks (#stats) are held the same way inside themselves, then ScrollTrigger.refresh() re-measures.
   - Reduced motion: nothing (normal scrolling). Anchor jumps land on the natural position (DX.holdNat, site.js DX.scrollTo). */
DX.HOLD=MOB?.4:.7;            /* hold length in screens (tune here) */
var HOLD_OWN='.scn,.v7h,#voices,.vbs,.vb,.dr,.dx-run,.cl7,.cx7,.v7cta,.v7s,.v7p,.v7l,.v7v,.stk-l,.stk-c,.stk-g,#offer';   /* own engines (sticky stacks, sliders, ladders) and photo banners: never wrapped */
var HOLD_SKIP=HOLD_OWN+',[data-no-hold]',NO_REST='.v7h,.v7l,#voices,.vbs,.dx-run,.scn',holds=[],rests=[],held=false,userIn=false;
['wheel','touchstart','keydown','pointerdown'].forEach(function(ev){W.addEventListener(ev,function(){userIn=true},{passive:true,capture:true})});
function hdrH(){var h=D.querySelector('.hdr,header'),r=parseFloat(getComputedStyle(HTML).getPropertyValue('--hdr'))||0;return h?Math.min(Math.max(h.offsetHeight,r),120):72}   /* --hdr = the bar's full height (site.js), not its shorter scrolled state */
function tok(n,d){var v=parseFloat(getComputedStyle(HTML).getPropertyValue(n));return isNaN(v)?d:v}
function insets(){var H=W.innerHeight,hh=hdrH(),b=tok('--hold-bottom',24),dk=D.getElementById('dxDock');
 if(dk){var r=dk.getBoundingClientRect();if(r.height>0&&r.top<H)b=Math.max(b,Math.min(H-r.top+8,140))}   /* launcher / phone pill zone */
 return{H:H,hh:hh,t:hh+tok('--hold-gap',20),b:b,room:H-hh-24}}
function relayout(){if(W.__lenis&&W.__lenis.resize)W.__lenis.resize();if(W.ScrollTrigger)W.ScrollTrigger.refresh()}   /* the page got longer: Lenis limit + ScrollTrigger positions */
function docTop(e){return e.getBoundingClientRect().top+W.scrollY}
/* 2026-11-01: layout position without transforms: a block measured while its entrance (rise 20 px, js/core/reveal.js) or exit lift is still applied
   used to get a rest that started up to 20 px early and let go that much early, so the block ended its rest cut by the header */
function layTop(e){var y=0;while(e){y+=e.offsetTop;e=e.offsetParent}return y}
function natTop(u){return docTop(u.spc||u.run)-u.d}   /* where the block sits when not stuck: its spacer / runway never move, u.d is measured unstuck in holdSize (margins, collapsing) */
function canStick(e){for(var p=e.parentElement;p&&p!==D.body&&p!==HTML;p=p.parentElement){var cs=getComputedStyle(p);if(/(hidden|auto|scroll)/.test(cs.overflowX+cs.overflowY))return false}return true}
function flowParent(e){var d=getComputedStyle(e.parentElement).display;if(d!=='block'&&d!=='flow-root')return false;
 for(var n=e.nextElementSibling;n;n=n.nextElementSibling)if(!/^(SCRIPT|STYLE|TEMPLATE)$/.test(n.tagName)&&!n.classList.contains('dx-spc')&&n.offsetParent!==null&&!/absolute|fixed/.test(getComputedStyle(n).position))return false;
 return true}   /* spacer mode only for the parent's last block: a sticky block stays stuck to the end of its parent, so anything after it would slide under it */
function holdSize(u,I){var h=u.el.offsetHeight,ok=h>=120&&h<=I.room,T=0;   /* 120: the copy of a short band (its section is >= 160) */
 u.el.style.position='';u.el.style.top='';u.d=layTop(u.spc||u.run)-layTop(u.el);   /* unstuck for one synchronous measure (no paint in between) */
 if(ok){var nt=natTop(u);T=I.t+(I.H-I.t-I.b-h)/2;T=Math.max(I.hh+12,Math.min(T,I.H-12-h));T=Math.min(T,nt);if(T<I.hh+11)ok=false}   /* never pushed down on load (T <= its own first-screen position), never under the header */
 u.el.style.position=ok?'sticky':'';u.el.style.top=ok?Math.round(T)+'px':'';u.el.classList.toggle('dx-held',ok);
 var L=Math.round(I.H*DX.HOLD);if(u.spc)u.spc.style.height=ok?L+'px':'0px';else u.run.style.height=ok?Math.round(h+L)+'px':'';
 u.ok=ok;u.T=Math.round(T);u.L=L;u.mb=Math.max(0,parseFloat(getComputedStyle(u.el).marginBottom)||0)}   /* 2026-11-01: a sticky block lets go its margin-bottom earlier than the end of its room */
function holdUnit(el){var u={el:el};
 if(el.tagName!=='SECTION'&&flowParent(el)){u.spc=D.createElement('div');u.spc.className='dx-spc';u.spc.setAttribute('aria-hidden','true');el.parentNode.insertBefore(u.spc,el.nextSibling)}
 else{var run=D.createElement('div');run.className='dx-run dx-hold';var z=getComputedStyle(el).zIndex;if(z&&z!=='auto'){run.style.position='relative';run.style.zIndex=z}
  el.parentNode.insertBefore(run,el);run.appendChild(el);u.run=run;
  if(el.tagName==='SECTION'){u.bg=1;var bg=getComputedStyle(el).backgroundColor;if(bg&&bg!=='rgba(0, 0, 0, 0)')run.style.background=bg}}   /* last resort (a section with several loose children): runway in the section's colour, re-read on theme switch */
 return u}
/* the single content block of a section (its .wrap), so the section's own background stays around the hold */
function body(sec){var k=[].filter.call(sec.children,function(c){return!/^(SCRIPT|STYLE|TEMPLATE)$/.test(c.tagName)&&c.offsetParent!==null&&!/absolute|fixed/.test(getComputedStyle(c).position)});return k.length===1?k[0]:null}
function unitsOf(sec,room,out){var b0=body(sec);
 if(sec.querySelector('.seg-b,[role=group] [aria-pressed],[data-filter]'))return false;   /* a filterable list (stories wall): free reading, its height changes with the filter */
 if(sec.offsetHeight<=room){if(sec.offsetHeight>=160)out.push(b0&&b0.offsetHeight>=120&&flowParent(b0)?b0:sec);return true}
 var inner=sec.querySelector(':scope>.wrap>.zi,:scope>.wrap.zi,:scope>.zi,:scope>.wrap');if(inner&&inner.offsetHeight>=160&&inner.offsetHeight<=room&&!inner.matches(HOLD_SKIP)){out.push(inner);return true}   /* the section's content block fits: hold it as one (a photo and its form stay together) */
 var n=out.length;
 [].slice.call(sec.querySelectorAll(':scope>.wrap>*,:scope>.wrap>.zi>*,:scope>.zi>*')).forEach(function(b){var h=b.offsetHeight;
  if(b.closest(HOLD_SKIP)||b.offsetParent===null||/^(SCRIPT|STYLE)$/.test(b.tagName)||b.classList.contains('dx-spc'))return;
  if(h>=200&&h<=room){out.push(b);return}
  if(h>room)[].slice.call(b.children).forEach(function(c){var ch=c.offsetHeight;if(c.offsetParent!==null&&!c.hidden&&ch>=300&&ch<=room)out.push(c)})});   /* a long grid: hold each row group that fits */
 if(out.length-n>6){out.length=n;return false}   /* more than six stops in one section is a list, not a set of blocks: free reading with a rest at its start */
 return out.length>n}
DX.hold=function(){if(held||RM)return;held=true;
 var I=insets(),units=[],home=!!D.querySelector('main[data-scenes]');
 if(home){   /* home: scenes stay scenes.js's; a plain block between them (the #stats band) holds its own content inside itself */
  [].slice.call(D.querySelectorAll('main[data-scenes] > *')).forEach(function(b){if(b.dataset.scene||b.matches(HOLD_SKIP+',.scn-run,.scn-gap')||b.offsetParent===null||b.offsetHeight<160)return;
   /* 2026-11-01: the band itself may be taller than the screen (its padding): its content block is what has to fit, so the band still rests as one unit */
   var k=body(b);if(k&&k.offsetHeight>=120&&k.offsetHeight<=I.room&&flowParent(k)&&canStick(k))units.push(k)})}
 else [].slice.call(D.querySelectorAll('main > section')).forEach(function(sec){if(sec.offsetParent===null)return;
  var own=sec.matches(HOLD_SKIP)||!!sec.querySelector('.scn,[data-scene]'),mine=[],got=!own&&unitsOf(sec,I.room,mine);
  mine=mine.filter(canStick);if(got&&mine.length)units=units.concat(mine);else if(!sec.matches(NO_REST))rests.push(sec)});   /* not held (or inside a clipping box, where sticky cannot work): a rest at its start (free reading) or framing it (photo banners) */
 units=units.filter(function(e,i){return units.indexOf(e)===i&&canStick(e)});
 units.forEach(function(el){var u=holdUnit(el);holdSize(u,I);holds.push(u)});
 if(!holds.length&&!rests.length)return;
 /* magnet: one stop in the middle of each hold; the other systems' stops that fall inside a hold are dropped (one rest per hold) */
 var ranges=function(){var o=[];holds.forEach(function(u){if(!u.ok)return;var s=natTop(u)-u.T;o.push([s,s+Math.max(0,u.L-(u.mb||0))])});return o};   /* [start, end] of the rest: the block is stuck (whole, centred) for every position in it */
 var stops=function(){var I2=insets(),o=[],rg=ranges();rg.forEach(function(r){o.push(Math.round((r[0]+r[1])/2))});
  rests.forEach(function(s){if(s.offsetParent===null)return;var t=docTop(s),h=s.offsetHeight,fr=I2.H-I2.t-I2.b,y=h<=fr&&!s.hasAttribute('data-no-hold')?t-(I2.t+(fr-h)/2):t;
   if(t<I2.H*.6)return;if(rg.some(function(r){return y>r[0]-8&&y<r[1]+8}))return;o.push(Math.round(y))});return o};
 if(DX.magnetAdd)DX.magnetAdd(stops);if(DX.magnetMask)DX.magnetMask(ranges);if(W.__lenis&&FINE&&DX.magnet&&!DX._mag)DX.magnet(function(){return[]});
 DX.holdRanges=ranges;
 /* 2026-11-01 soft stop on touch (phones, tablets): the scroll stays the browser's own (never fought, no Lenis). Only once the finger is lifted and the
    momentum has died out (no scroll for 260 ms), a held section that is ARRIVING (its hold edge lies ahead in the direction of travel, within 0.18
    screen) settles there with the browser's smooth scroll, so it rests whole and centred; never pulled back, never inside a hold (already resting);
    a new touch interrupts the settle at once (the browser cancels a smooth scroll on touch). */
 if(!FINE){var tD=1,tY=W.scrollY,tOn=0,tT=0,tGo=0,
   tSettle=function(){if(tOn||tGo||DX._jump||HTML.classList.contains('lenis-stopped')||HTML.classList.contains('md-lock'))return;var y=W.scrollY,h=W.innerHeight,rg=ranges(),a=null;
    if(rg.some(function(r){return y>=r[0]-2&&y<=r[1]+2}))return;
    rg.forEach(function(r){var e=tD>0?r[0]:r[1],k=(e-y)*tD;if(k>2&&k<=h*.18&&(a==null||k<Math.abs(a-y)))a=e});
    if(a==null)return;tGo=1;W.scrollTo({top:Math.round(a),behavior:'smooth'});setTimeout(function(){tGo=0},800)};
  W.addEventListener('touchstart',function(){tOn=1;tGo=0;DX._jump=0;clearTimeout(tT)},{passive:true,capture:true});
  var tUp=function(){tOn=0;clearTimeout(tT);if(!tGo)tT=setTimeout(tSettle,260)};W.addEventListener('touchend',tUp,{passive:true,capture:true});W.addEventListener('touchcancel',tUp,{passive:true,capture:true});   /* no momentum: no scroll event after the finger lifts, so check from here too */
  W.addEventListener('scroll',function(){var y=W.scrollY;if(Math.abs(y-tY)>.5&&!tGo)tD=y>tY?1:-1;tY=y;clearTimeout(tT);if(!tOn&&!tGo)tT=setTimeout(tSettle,260)},{passive:true})}
 DX.holdNat=function(el){for(var i=0;i<holds.length;i++)if(holds[i].el===el)return natTop(holds[i]);return null};DX.holdEl=function(i){return holds[i]?holds[i].el:null};
 DX.holdInfo=function(){return{holds:holds.map(function(u){var s=natTop(u)-u.T;return{el:(u.el.id?'#'+u.el.id:'')+u.el.tagName+'.'+[].join.call(u.el.classList,'.'),ok:u.ok,h:u.el.offsetHeight,T:u.T,start:Math.round(s),mid:Math.round(s+u.L/2),L:Math.max(0,u.L-(u.mb||0)),mode:u.spc?'spacer':'run'}}),rests:rests.map(function(s){return(s.id?'#'+s.id+' ':'')+s.className}),stops:stops()}};
 var lw=W.innerWidth;W.addEventListener('resize',function(){clearTimeout(DX.hold._t);DX.hold._t=setTimeout(function(){if(MOB&&W.innerWidth===lw)return;lw=W.innerWidth;var I3=insets();holds.forEach(function(u){holdSize(u,I3)});relayout()},200)},{passive:true});
 /* a held block that changes size later (late photos, fonts, an FAQ opened, filters) is re-centred and its room re-measured; one that no longer fits is released */
 if(W.ResizeObserver){var rq=[],rt=0,stuck=function(u){if(!u.ok)return false;var s=natTop(u)-u.T,y=W.scrollY;return y>s-2&&y<s+u.L+2},
   flush=function(){var I4=insets(),n=0;rq=rq.filter(function(u){if(stuck(u))return true;holdSize(u,I4);n++;return false});if(n)relayout()},   /* never while it is resting on screen (it would jump): once it has left */
   ro=new ResizeObserver(function(es){es.forEach(function(e){for(var i=0;i<holds.length;i++)if(holds[i].el===e.target&&rq.indexOf(holds[i])<0)rq.push(holds[i])});clearTimeout(rt);rt=setTimeout(flush,150)});
  holds.forEach(function(u){ro.observe(u.el)});W.addEventListener('scroll',function(){if(rq.length){clearTimeout(rt);rt=setTimeout(flush,200)}},{passive:true})}
 if(W.MutationObserver)new MutationObserver(function(){holds.forEach(function(u){if(!u.bg)return;var bg=getComputedStyle(u.el).backgroundColor;u.run.style.background=bg&&bg!=='rgba(0, 0, 0, 0)'?bg:''})}).observe(HTML,{attributes:true,attributeFilter:['data-theme']});
 relayout();DX.holdCount=holds.filter(function(u){return u.ok}).length;DX.restCount=rests.length;
 /* a #hash link opened from another page: the holds above the target just made the page longer, so land it again (only if the visitor has not moved) */
 var hs=location.hash;if(hs&&hs.length>1&&!userIn)setTimeout(function(){if(userIn)return;var t;try{t=D.querySelector(hs)}catch(e){}if(!t)return;var hd=t.closest('.dx-held'),y=hd&&DX.holdNat(hd)!=null?DX.holdNat(hd)+(t.getBoundingClientRect().top-hd.getBoundingClientRect().top):docTop(t);
  DX._jump=1;W.scrollTo(0,y);if(W.__lenis)W.__lenis.scrollTo(y,{immediate:true,force:true})},60)};   /* _jump: the magnet / touch settle stay off until the visitor's own input (as DX.scrollTo) */
/* ---------- driver ---------- */
var raf=0,lastW=W.innerWidth;
function pass(full){photos().forEach(DX.fit);if(full){DX.wm();DX.imgMotion();DX.bannerMotion()}}
function soon(full){if(raf)return;raf=requestAnimationFrame(function(){raf=0;pass(full)})}
function boot(){hiDensity();if(W.visualViewport)W.visualViewport.addEventListener('resize',hiDensity);pass(true);
 var mo=new MutationObserver(function(ms){for(var i=0;i<ms.length;i++){var m=ms[i];if(m.type==='childList'&&m.addedNodes.length){for(var j=0;j<m.addedNodes.length;j++){var nd=m.addedNodes[j];if(nd.nodeType===1&&(nd.tagName==='IMG'||nd.querySelector&&nd.querySelector('img'))){soon(true);return}}}
  else if(m.type==='attributes'&&m.target.tagName==='IMG'){soon(false);return}}});
 mo.observe(D.body,{childList:true,subtree:true,attributes:true,attributeFilter:['src','data-photo']});
 W.addEventListener('resize',function(){if(W.innerWidth===lastW&&MOB)return;lastW=W.innerWidth;clearTimeout(boot._t);boot._t=setTimeout(function(){pass(false);DX.wm()},180)},{passive:true});
 W.addEventListener('load',function(){pass(true);setTimeout(function(){pass(true);DX.hold()},700);setTimeout(function(){DX.viewMotion()},1400)})}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',boot);else boot();
})();
