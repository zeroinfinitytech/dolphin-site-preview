/* Dolphin scene engine (2026-10-28, R7). GSAP + ScrollTrigger (+ Lenis from site.js on fine pointers). Layout half: css/scenes.css.
   API (data attributes; everything is a direct child of <main data-scenes>):
     data-scene="cover"   sticky 100dvh layer; the next sibling slides up over it while it recedes (scales to 1.04) under one subtle shade, then it is hidden.
     data-scene="zoom"    cover whose [data-zoom-img] scales 1 -> 1.3 and whose [data-lift] content lifts and fades while covered (hero).
     data-scene="ladder"  cover holding a [data-track] of full-bleed rungs; a runway of (rungs-1) x step is inserted after it and the
                          track slides one viewport width per step. data-step="w" (default, step = innerWidth) or a number = fraction of innerHeight.
                          data-snap  snaps to whole rungs.
     data-scene="l"       L-shaped: a cover holding a [data-track] whose rung 0 is the vertical leg and rungs 1..n the horizontal leg.
                          On scroll the track first moves UP one viewport (rung 0 leaves, rung 1 arrives from below), then at a clean
                          corner pans LEFT through rungs 1..n; after the last rung the page continues down. Runway = n x step (data-step as ladder).
     data-peek="p"        (on a ladder) rungs are (1-p) of the width with a thin gap, so the next rung always shows at the right edge.
     data-cards           (on an l scene) the horizontal rungs become a deck of inset cards: each glides in from the right angled in 3D,
                          settles flat and centred (transform: none, so text is crisp), then swings away to the left, smaller and dimmer;
                          the next card always peeks at the right edge. The first card lifts off the title like a card tilting up off a table.
     data-hold="n"        extra runway of n x innerHeight after a cover scene (the scene rests while the page scrolls).
     Any other child (a band, a footer) is a plain block that simply slides over the scene before it.
   Inside a scene:  .scn-in (the layer),  .scn-shade (the shade),  [data-layer="bg|mid|fg"] parallax on arrival,  [data-rise] rises on arrival,
     [data-words="fill"] word-by-word colour fill on arrival,  [data-rung-img] a rung photo that drifts while the track slides.
   Rules: transform/opacity only; triggers use absolute scroll positions computed from layout (never from sticky boxes);
   ignoreMobileResize + normalizeScroll on touch; html.scn is added only when the engine runs, so no-JS and reduced motion are a plain stack.
   window.DXScenes = { init(root) -> boolean, refresh() } */
(function(){
var W=window,D=document;
var $=function(s,r){return(r||D).querySelector(s)},$$=function(s,r){return[].slice.call((r||D).querySelectorAll(s))};
function words(el){if(!el||el.dataset.sp)return;el.dataset.sp=1;(function walk(n){[].slice.call(n.childNodes).forEach(function(c){
 if(c.nodeType===3){if(!c.textContent.trim())return;var f=D.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(p){if(!p)return;if(/^\s+$/.test(p)){f.appendChild(D.createTextNode(' '));return}var w=D.createElement('span');w.className='wd';w.textContent=p;f.appendChild(w)});n.replaceChild(f,c)}
 else if(c.nodeType===1&&c.tagName!=='BR')walk(c)})})(el)}
/* masked words: <span class="sw"><span class="swi">word</span></span>; the inner span rises through the mask */
function mask(el){if(!el||el.dataset.mk)return;el.dataset.mk=1;(function walk(n){[].slice.call(n.childNodes).forEach(function(c){
 if(c.nodeType===3){if(!c.textContent.trim())return;var f=D.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(p){if(!p)return;if(/^\s+$/.test(p)){f.appendChild(D.createTextNode(' '));return}var o=D.createElement('span'),i=D.createElement('span');o.className='sw';i.className='swi';i.textContent=p;o.appendChild(i);f.appendChild(o)});n.replaceChild(f,c)}
 else if(c.nodeType===1&&c.tagName!=='BR')walk(c)})})(el)}
/* line reveal: GSAP SplitText (when loaded) splits a heading into lines, each inside its own mask (the text stays in the element, so screen readers read it as written), and re-splits itself when fonts load or the width changes.
   The lines never carry their own tween: CSS moves line k by the element's --rv (0 hidden, 1 at rest), so a re-split keeps its place in the scroll.
   Without SplitText the words are masked instead and rise together. */
/* sweep v8.12: the split itself is site.js DX.lines (after fonts are ready, hidden until split, re-split only on a > 24 px width change); no autoSplit */
function lines(el){if(!el||el._sl)return;if(W.DX&&W.DX.lines&&W.DX.lines(el))return;el._sl=1;el.classList.add('rv');mask(el)}
function init(root){
 root=root||$('[data-scenes]');var G=W.gsap,ST=W.ScrollTrigger;
 if(!root||!G||!ST||matchMedia('(prefers-reduced-motion:reduce)').matches)return false;
 G.registerPlugin(ST);if(W.SplitText)G.registerPlugin(W.SplitText);
 var touch=!matchMedia('(hover:hover) and (pointer:fine)').matches;
 ST.config({ignoreMobileResize:true});
 /* sweep v8.6 (scroll audit): no normalizeScroll any more: on phones it re-drove the scroll from JS every frame (measured 2.4 s of main thread per 7 s of swiping
    on a country page) and added its own momentum on top of the browser's; touch is now the browser's native scroll, address-bar resizes are ignored above */
 D.documentElement.classList.add('scn');
 var DX=W.DX||{};
 /* sweep v8.6: every scrub is exact (scrub:true): progress is proportional to the scroll with no lag, so a scene can be stopped at any pixel and reads the same
    going up as going down. ScrollTrigger snaps are gone too (they fought the visitor); on fine pointers site.js DX.magnet eases to a stop only when the page is
    left within 12 % of a screen of one. */
 var SC=true,SM=1;
 var stepper=false;
 var H=function(){return W.innerHeight},VW=function(){return root.clientWidth||W.innerWidth};
 /* 1. runways: inserted once after ladders and held scenes; their heights are set on every refresh */
 var shown=function(e){return e.tagName!=='SCRIPT'&&getComputedStyle(e).display!=='none'}; /* sweep v8.5: a scene hidden by CSS at this width (#stories on desktop) is not part of the chain, the stops or the runways */
 /* 2026-11-01 section gaps (user: "all sections must be separated properly with a standard gap"; css/core/site.css SECTION GAPS): two FILLED blocks in a row
    (a dark photo scene, a gradient band) get a page-colour spacer between them (div.scn-gap, height --sec-gap). It is a plain block, so it slides over
    the scene before it like any band and the next scene slides over it; layout() measures it like every other child, the stops skip it. */
 var filled=function(e){return!!e&&(!!(e.dataset.scene&&e.classList.contains('on-dark'))||/gradient/.test(getComputedStyle(e).backgroundImage))};
 var seq=$$(':scope>*',root).filter(shown).filter(function(e){return!e.classList.contains('scn-run')&&!e.classList.contains('scn-gap')});
 seq.forEach(function(e,i){var pv=e.previousElementSibling;if(i&&filled(seq[i-1])&&filled(e)&&!(pv&&pv.classList.contains('scn-gap'))){var g=D.createElement('div');g.className='scn-gap';g.setAttribute('aria-hidden','true');e.before(g)}});
 var kids=$$(':scope>*',root).filter(shown);
 kids.forEach(function(el){var kind=el.dataset.scene;if(!kind)return;var n=0;
  if(kind==='ladder'||kind==='l'){el._track=$('[data-track]',el);n=el._track?el._track.children.length-1:0}
  if(kind==='slider'){el._vb=$('.vb',el);n=el._vb?$$('.vb-i',el._vb).length-1:0} /* sweep v8.5: a pinned slider (voices.js); one stop per slide, runway = (slides-1) x step */
  if(el.dataset.hold)n=parseFloat(el.dataset.hold)||0;
  if(n>0){var r=D.createElement('div');r.className='scn-run';r.setAttribute('aria-hidden','true');el.after(r);el._run=r;el._n=n}});
 var all=$$(':scope>*',root).filter(shown),tops=[];
 function stepOf(el){var s=el.dataset.step,k=el.dataset.scene;if(k==='slider')return Math.round(H()*(parseFloat(s)||.5));if(k!=='ladder'&&k!=='l')return H();return(!s||s==='w')?VW():Math.round(H()*parseFloat(s))} /* whole pixels, so every resting panel lands exactly */
 function layout(){var y=root.offsetTop;all.forEach(function(el,i){
  if(el._run)el._run.style.height=Math.round(el._n*stepOf(el))+'px';
  if(el.dataset.scene)el.style.setProperty('--vw',VW()+'px');
  if(el.dataset.scene==='ladder'){var pk=parseFloat(el.dataset.peek)||0,rw=Math.round(VW()*(1-pk)),gp=pk?Math.round(VW()*.012):0;el._S=rw+gp;el._tail=pk?VW()-rw:0;el.style.setProperty('--rw',rw+'px');el.style.setProperty('--rg',gp+'px')}
  if(el.dataset.scene==='l'&&el._track){var rs=$$(':scope>*',el._track),hh=el.clientHeight||H(),vw=VW();
   /* sweep v8.3: on phones (< 700) a plain peeking L becomes a row of inset cards too (86 % wide, centred, radius 24, the next card's edge showing),
      without the 3D deck motion; the first panel leaves completely (lift = the whole height) so no strip of it shows above the cards */
   var deck=el.hasAttribute('data-cards'),card=deck||el.hasAttribute('data-peek'); /* sweep v8.3: every peeking L is a row of cards at every width (no navy seams, no cut photos) */el._card=card;el.classList.toggle('scn-cards',card);
   if(card){var ph=vw<700,cw=Math.round(Math.min(vw*(ph?.86:.78),1320)),ch=Math.round(hh*(ph?.72:.76)),gap=Math.round(vw*(ph?.03:.028)),S=cw+gap,ox=Math.round((vw-cw)/2),oy=Math.round((hh-ch)/2),lift=deck?Math.round(hh*(ph?.78:.72)):hh;
    el._S=S;el._lift=lift;el.style.setProperty('--tw',(2*ox+cw+Math.max(0,rs.length-2)*S)+'px');
    rs.forEach(function(r,k){if(!k){r.style.top='0px';r.style.left='0px';r.style.width=vw+'px';r.style.height=hh+'px';return}r.style.top=(lift+oy)+'px';r.style.left=(ox+(k-1)*S)+'px';r.style.width=cw+'px';r.style.height=ch+'px'})}
   else{/* peek: every horizontal panel rests at the left edge with the next one showing at the right; the last panel (nothing after it) is full width */
    var pk=parseFloat(el.dataset.peek)||0,rw=Math.round(vw*(1-pk)),gp=pk?Math.round(vw*.012):0,S2=rw+gp,last=rs.length-1;el._S=S2;el._lift=0;
    el.style.setProperty('--tw',(Math.max(0,rs.length-2)*S2+vw)+'px');
    rs.forEach(function(r,k){r.style.top=(k?hh:0)+'px';r.style.left=(k?(k-1)*S2:0)+'px';r.style.width=(k&&k<last?rw:vw)+'px';r.style.height=hh+'px'})}}
  el.style.zIndex=i+1;if(!el.dataset.scene&&!el.classList.contains('scn-run'))el.style.position='relative';
  tops[i]=y;y+=el.offsetHeight})}
 layout();ST.addEventListener('refreshInit',layout);
 var top=function(el){return tops[all.indexOf(el)]};
 /* layout position of any element inside the scenes (sticky boxes report where they are stuck, not where they sit in the page) */
 W.DXScenes.topOf=function(el){var k=el;while(k&&k.parentNode!==root)k=k.parentNode;return k&&all.indexOf(k)>-1?top(k):null};
 var scenes=all.filter(function(e){return e.dataset.scene});
 /* 2. ladders first (they own the longest runs), then covers */
 scenes.forEach(function(sc){var kind=sc.dataset.scene;if(kind!=='ladder'&&kind!=='l')return;var trk=sc._track,rungs=$$(':scope>*',trk),n=rungs.length;if(n<2)return;
  var L=kind==='l',legs=n-1; /* ladder: n-1 horizontal steps; l: 1 vertical + n-2 horizontal steps */
  var st={start:function(){return top(sc)},end:function(){return top(sc)+legs*stepOf(sc)},scrub:SC,invalidateOnRefresh:true};
  var tl=G.timeline({scrollTrigger:st}); /* sweep v8.6: data-snap is no longer honoured (see SC above) */
  if(L){tl.to(trk,{y:function(){return-(sc._lift||sc.clientHeight||H())},ease:'none',duration:1},0);
   if(n>2)tl.to(trk,{x:function(){return-(n-2)*(sc._S||VW())},ease:'none',duration:n-2},1);
   var r0=$('[data-rung-img],[data-leg-in]',rungs[0]);if(r0)tl.fromTo(r0,{yPercent:0,opacity:1},{yPercent:-16,opacity:.25,ease:'none',duration:1},0);
   if(sc.hasAttribute('data-cards')){var cards=rungs.slice(1);cards.forEach(function(c){$$('h3',c).forEach(lines)});
    /* depth from the track position: d = distance of a card from the centre in strides (0 centred, +1 next, -1 previous) */
    var setIn=function(c,v){v=v.toFixed(3);if(c._in!==v){c._in=v;c.style.setProperty('--in',v)}};
    var depth=function(){var x=G.getProperty(trk,'x'),y=G.getProperty(trk,'y'),lf=sc._lift||sc.clientHeight||H(),S=sc._S||VW(),v=Math.min(1,Math.max(0,-y/lf));
     cards.forEach(function(c,j){var d=(j*S+x)/S,a=Math.min(1.25,Math.abs(d)),lift=j===0?1-v:0,inn=Math.max(0,Math.min(1,(1-Math.max(d>0?d:0,lift))*1.8));
      if(a<.002&&lift<.002){c.style.transform='none';setIn(c,1);c.style.setProperty('--dim','0');return}
      setIn(c,inn);c.style.setProperty('--dim',(Math.min(1,a)*.55+lift*.2).toFixed(3));
      var ry=Math.max(-1.25,Math.min(1.25,d))*26,rx=lift*16,z=-a*160-lift*60,sc2=1-a*.08;
      c.style.transform='perspective(1600px) translate3d(0,0,'+z.toFixed(1)+'px) rotateX('+rx.toFixed(2)+'deg) rotateY('+ry.toFixed(2)+'deg) scale('+sc2.toFixed(4)+')'})};
    tl.eventCallback('onUpdate',depth);ST.addEventListener('refresh',function(){requestAnimationFrame(depth)});depth()}
   else{
    /* the L as one moving plane. Depth: every [data-z="f"] inside a panel sits at the panel's position times (1+f) (CSS translate via --zx/--zy), so on the
       way in the front layers trail and on the way out they lead: photo, number, heading, text and button separate like layers ("-, --, ---").
       Panel headings rise through their line masks as the panel arrives (--in, as on the deck). Everything is exactly at rest (no offset) when a panel is home.
       The map: a small L in the corner traces the route, with the current panel's name. */
    var hz=rungs.slice(1),zs=rungs.map(function(r){return $$('[data-z]',r).map(function(e){return[e,e.closest('.st,.rc')?.18:parseFloat(e.dataset.z)||0]})}); /* card copy (step / country text) moves as one block so its lines never drift apart (user 2026-10-31) */
    hz.forEach(function(r){$$('h2,h3',r).forEach(lines)});
    var mp=D.createElement('div');mp.className='lmap';mp.setAttribute('aria-hidden','true');
    mp.innerHTML='<svg viewBox="0 0 64 34" width="64" height="34"><path class="lm-b" d="M4 3V29H60"/><path class="lm-p" d="M4 3V29H60" pathLength="1"/><circle class="lm-d" r="3.2" cx="4" cy="3"/></svg><span class="lm-t"></span><span class="lm-n"></span>';
    $(':scope>.scn-in',sc).appendChild(mp);var mt=$('.lm-t',mp),mn=$('.lm-n',mp),mpp=$('.lm-p',mp),mpd=$('.lm-d',mp),lastK=-1;
    var lj=function(){var x=G.getProperty(trk,'x'),y=G.getProperty(trk,'y'),hh=sc._lift||sc.clientHeight||H(),S=sc._S||VW(),P=S,v=Math.min(1,Math.max(0,-y/hh));
     rungs.forEach(function(r,k){var dx=0,dy=0,inn=1;
      /* sweep v8.12: --in is a pure function of the position, arrival side only: a panel's text rises as it comes in and stays drawn while it leaves (it slides
         out with its panel), so fast scrolling never makes text blink on and off; it used to flip 0 / 1 with a .9 s transition (time-based, replayed both ways) */
      if(k===0)dy=-v*hh;else{var j=k-1,d=(x+j*P)/P;dx=d*P;if(j===0)dy=(1-v)*hh;inn=Math.max(0,Math.min(1,(1-Math.max(d>0?d:0,j===0?1-v:0))*1.8))}
      if(k>0){var iv=inn.toFixed(3);if(r._in!==iv){r._in=iv;r.style.setProperty('--in',iv)}}
      zs[k].forEach(function(z){var e=z[0],f=z[1],ox=dx*f,oy=dy*f;
       if(Math.abs(ox)<.5&&Math.abs(oy)<.5){if(e._zon){e._zon=0;e.style.removeProperty('--zx');e.style.removeProperty('--zy')}return}
       e._zon=1;e.style.setProperty('--zx',ox.toFixed(1)+'px');e.style.setProperty('--zy',oy.toFixed(1)+'px')})});
     /* map: progress along the L (first leg vertical, the rest horizontal) */
     var t=tl.progress(),u=t*legs,cx=4,cy=3;if(u<=1)cy=3+u*26;else{cy=29;cx=4+((u-1)/Math.max(1,legs-1))*56}
     mpd.setAttribute('cx',cx.toFixed(1));mpd.setAttribute('cy',cy.toFixed(1));mpp.style.strokeDashoffset=(1-(u<=1?u*26/82:(26+(u-1)/Math.max(1,legs-1)*56)/82)).toFixed(3);
     var K=Math.min(n-1,Math.round(u));if(K!==lastK){lastK=K;mt.textContent=rungs[K].dataset.label||'';mn.textContent=String(K+1).padStart(2,'0')+' / '+String(n).padStart(2,'0')}};
    tl.eventCallback('onUpdate',lj);ST.addEventListener('refresh',function(){requestAnimationFrame(lj)});lj()}}
  else tl.to(trk,{x:function(){return-((n-1)*(sc._S||VW())-(sc._tail||0))},ease:'none',duration:n-1},0); /* a peeking ladder ends with its last rung flush right */
  /* rung photos are scaled 1.1 so a 4 % drift never uncovers the rung behind them (sweep v8.1: was 1.2 / 8 %, which drew 2400px sources above 1:1) */
  rungs.forEach(function(r,i){var im=$('[data-rung-img]',r);if(!im||(L&&i===0))return;var at=L?i-1:i,o=L?1:0;G.set(im,{scale:1.1});
   if(at>0)tl.fromTo(im,{xPercent:4},{xPercent:0,ease:'none',duration:1},at-1+o);
   if(i<n-1)tl.fromTo(im,{xPercent:0},{xPercent:-4,ease:'none',duration:1,immediateRender:false},at+o)})});
 /* 2b. sliders (sweep v8.5): the scene is pinned while the page scrolls one step per slide; the slider draws itself from the scroll position (root._prog, scrubbed,
    so the parts move as the page flies between stops), touch snaps to whole slides, and a Previous / Next press moves the page to that slide's stop (root._stopY). */
 scenes.forEach(function(sc){if(sc.dataset.scene!=='slider'||!sc._vb||!(sc._n>0))return;var vb=sc._vb,legs=sc._n;
  vb._stopY=function(k){return top(sc)+k*stepOf(sc)};
  if(DX.voiceRotate)DX.voiceRotate(vb);
  var st={start:function(){return top(sc)},end:function(){return top(sc)+legs*stepOf(sc)},invalidateOnRefresh:true,onUpdate:function(s){if(vb._prog)vb._prog(s.progress*legs)}};
  ST.create(st)});
 /* 3. covers: arrival (photos settle from 1.14 to 1, phones 1.10, layers settle, words fill), departure (photos recede to 1.08, phones 1.06, under the shade, zoom scenes fly through), hide when covered.
    Only photographs are scaled, never the scene layer: a scaled text layer is rasterized as a bitmap and reads blurry while it moves, and a layer scaled below 1 exposes the scene background at its edges. */
 scenes.forEach(function(sc){var i=all.indexOf(sc),inn=$(':scope>.scn-in',sc),shade=$(':scope>.scn-shade',sc);
  var nextAny=all[i+1];while(nextAny&&nextAny.classList.contains('scn-run'))nextAny=all[all.indexOf(nextAny)+1];
  var nextSc=nextAny;while(nextSc&&!nextSc.dataset.scene)nextSc=all[all.indexOf(nextSc)+1];
  if(i>0&&inn){var ta=G.timeline({scrollTrigger:{start:function(){return top(sc)-H()},end:function(){return top(sc)},scrub:SC,invalidateOnRefresh:true}});
   var ai=$$('.ph img:not([data-rung-img]):not([data-zoom-img]),.ph-c img:not([data-rung-img])',sc);if(ai.length)ta.fromTo(ai,{scale:W.innerWidth<=700?1.10:1.14},{scale:1,ease:'none'},0);
   /* sweep v8.12: a full-bleed .ph layer drifts as a whole (it is oversized); an inset photo card drifts only its image inside its overflow-hidden figure
      (a quarter of the amplitude, within the 1.08 settle scale), so a card never slides over the text next to it */
   $$('[data-layer]',sc).forEach(function(l){var k=l.dataset.layer,y=k==='bg'?12:k==='fg'?-16:8,im=l.classList.contains('ph-c')?$('img',l):null;
    if(im)ta.fromTo(im,{yPercent:y*.25},{yPercent:0,ease:'none'},0);else ta.fromTo(l,{yPercent:y},{yPercent:0,ease:'none'},0)});
   /* sweep v8.12: the entrance plays ONCE (it used to reverse and replay whenever the direction changed); shared tokens (DX.M) */
   var MM=DX.M||{d:.65,ease:'expo.out',y:24,st:.07};
   var tt=G.timeline({paused:true,scrollTrigger:{start:function(){return top(sc)-H()*.72},once:true,toggleActions:'play none none none',invalidateOnRefresh:true}});
   $$('[data-rise]',sc).forEach(function(l,j){tt.fromTo(l,{y:MM.y,opacity:0},{y:0,opacity:1,ease:MM.ease,duration:MM.d},.3+j*MM.st)});
   /* word fill (sweep v8.12): scrubbed from the position (reversible, no replay), unfilled words at .55 (>= 3:1 on the soft stage, never .16), complete when the
      heading's top reaches 40 % of the screen height */
   $$('[data-words=fill]',sc).forEach(function(l){words(l);var off=function(){var o=0,e=l;while(e&&e!==sc){o+=e.offsetTop;e=e.offsetParent}return o};
    G.set($$('.wd',l),{opacity:.55});G.to($$('.wd',l),{opacity:1,ease:'none',stagger:.1,scrollTrigger:{start:function(){return top(sc)+off()-H()},end:function(){return top(sc)+off()-H()*.4},scrub:SC,invalidateOnRefresh:true}})});
   /* text: the eyebrow rises first, the heading's lines rise through their masks, then the lead, details and button follow.
      Rises use the CSS translate property (--ri), so a button keeps its own hover transform; nothing is scaled. */
   var hs=$$('h2:not([data-words]),.qs .q:first-child .qt',sc).filter(function(h){return!h.closest('[data-track]>*:not(:first-child)')}),h0=hs[0];
   hs.forEach(function(h){lines(h);tt.fromTo(h,{'--rv':0},{'--rv':1,ease:MM.ease,duration:MM.d+.05},.15)});
   var j=0;$$('.eyebrow,.lead,.btn,.ba-d,.ba-f,.qs .q:first-child .who',sc).forEach(function(e){if(e.closest('[data-track]>*:not(:first-child),[data-rise],[data-words]')||e.hasAttribute('data-rise'))return;
    var o=parseFloat(getComputedStyle(e).opacity)||1,pre=h0&&(h0.compareDocumentPosition(e)&2);e.classList.add('ri');
    tt.fromTo(e,{'--ri':0,opacity:0},{'--ri':1,opacity:o,ease:MM.ease,duration:MM.d},pre?.05:.4+(j++)*MM.st)})}
  else if(inn){$$('[data-words=fill]',sc).forEach(function(l){words(l);G.fromTo($$('.wd',l),{opacity:.55},{opacity:1,ease:'power2.out',stagger:.035,duration:.5,delay:.3})})}
  if(!nextAny||!inn)return;
  /* sweep v8.6: a cover may rest half-covered (the next block simply sits part-way over it under a light shade); the magnet in site.js tidies up only when the visitor stops close to a whole position */
  var td=G.timeline({scrollTrigger:{start:function(){return top(nextAny)-H()},end:function(){return top(nextSc||nextAny)},scrub:SC,invalidateOnRefresh:true,
   onUpdate:function(s){sc.classList.toggle('scn-off',s.progress>=.999)},onLeaveBack:function(){sc.classList.remove('scn-off')}}});
  var di=$$('.ph img:not([data-rung-img]):not([data-zoom-img]),.ph-c img:not([data-rung-img])',sc);if(di.length)td.to(di,{scale:W.innerWidth<=700?1.06:1.08,ease:'none'},0);
  if(shade)td.to(shade,{opacity:.38,ease:'none'},0);
  if(sc.dataset.scene==='zoom'){var zi=$('[data-zoom-img]',sc),lf=$$('[data-lift]',sc);
   if(zi)td.fromTo(zi,{scale:1},{scale:1.3,ease:'none',immediateRender:false},0); /* sweep v8.1: 1.5 drew the hero at 0.79x; 1.3 keeps the fly-through under the cover */
   if(lf.length)td.to(lf,{y:-80,opacity:0,ease:'none',duration:.7},0)}});
 /* 4. velocity depth (mouse and trackpad, where Lenis runs): while the page moves fast, full-bleed photographs swell a little (up to 3.5 %) and lag a few
    pixels behind the scroll, then return exactly to rest (no scale, no offset). Photos only. The swell is always larger than the lag, so no edge is ever exposed. */
 /* sweep v8.6 (scroll audit): the two variables used to be set on <main>, and an inherited custom property changing every frame recalculated the style of the
    whole page (measured 7.5 ms of style work per frame while free-scrolling the home page). They are now written only on the photo layers of the scenes that are
    on screen (a sticky scene is on screen until it is hidden under the next one), at most every other frame, and the effect is capped at 2.5 %. */
 if(W.__lenis&&W.__lenis.on){var vOn=false,vSkip=0,phs=$$('.scn .ph',root),vLive=function(){return phs.filter(function(p){var s=p.closest('.scn');if(!s||s.classList.contains('scn-off'))return false;var r=s.getBoundingClientRect();return r.bottom>0&&r.top<H()})},vSet=function(z,y){phs.forEach(function(p){if(z==null){if(p._vz){p._vz=0;p.style.removeProperty('--vz');p.style.removeProperty('--vy')}return}
    if(!p._vLive){if(p._vz){p._vz=0;p.style.removeProperty('--vz');p.style.removeProperty('--vy')}return}p._vz=1;p.style.setProperty('--vz',z);p.style.setProperty('--vy',y)})};
  W.__lenis.on('scroll',function(l){var v=(l&&l.velocity)||0,a=Math.min(.025,Math.abs(v)*.0005);
  if(a<.0006){if(vOn){vOn=false;vSet(null)}return}
  if(vSkip++&1)return;vOn=true;var live=vLive();phs.forEach(function(p){p._vLive=live.indexOf(p)>-1});vSet((1+a).toFixed(4),((v>0?1:-1)*a*40).toFixed(2)+'%')})}
 /* 5. one gesture, one scene (2026-10-29, user request): on a wheel or trackpad (Lenis) every scroll gesture moves to the NEXT resting position and stops there:
    each scene, each panel of a ladder / L journey, each band. Tall blocks (the footer, long bands) scroll freely inside, with a stop at their top and bottom.
    Touch keeps its native swipe plus the snapping above. Disabled while a menu or drawer holds the page (lenis-stopped) and inside scrollable children. */
 /* sweep v8.3: the stepper itself lives in site.js (DX.stepper, shared with destinations.html); the engine only describes its blocks.
    Blocks: every scene (one stop at its top; a ladder / L adds one stop per panel), every plain band (tall ones scroll freely with edge stops),
    then the footer: the ocean scene (.ft-a, one screen) and the ledger (.ft-b, free inside). */
 var blocks=function(){var b=[],h2=H();
  all.forEach(function(el){if(el.classList.contains('scn-run')||el.classList.contains('scn-gap'))return;var t=top(el),h=el.offsetHeight,k=el.dataset.scene,st=[];
   if(k==='ladder'||k==='l'){var tr=el._track,legs=tr?tr.children.length-1:0,sp=stepOf(el);for(var i=1;i<=legs;i++)st.push(t+i*sp)}
   if(k==='slider'){var sp2=stepOf(el);for(var j=1;j<=(el._n||0);j++)st.push(t+j*sp2)}
   b.push({t:t,h:k?h2:h,stops:st,tall:!k})});
  $$('.ft-a,.ft-b').forEach(function(f){var r=f.getBoundingClientRect();b.push({t:r.top+W.scrollY,h:f.offsetHeight,tall:f.classList.contains('ft-b')})});
  return b};
 W.DXScenes.blocks=blocks;W.DXScenes.stops=function(){return DX.stops?DX.stops():[]};
 if(W.__lenis&&!touch&&DX.magnet)DX.magnet(blocks); /* sweep v8.6: soft magnet (site.js) instead of the stepper */
 if(D.fonts&&D.fonts.ready)D.fonts.ready.then(function(){ST.refresh()});
 W.addEventListener('load',function(){ST.refresh()});
 return true}
W.DXScenes={init:init,refresh:function(){W.ScrollTrigger&&W.ScrollTrigger.refresh()}};
})();
