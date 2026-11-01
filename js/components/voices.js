/* Testimonials component (sweep v8.2, 2026-10-29; slider rebuilt as a scroll-driven scene in sweep v8.5). One component for home, stories, universities and country pages; data from js/data.js (DX.voices, DX.P).
   DX.voiceBand(items,opts)  featured university voices (rebuilt 2026-10-31, editorial "moving window"): a PHOTO plane (each partner's own city / campus, side by side), ONE fixed soft
                             navy wash, and a COPY plane (every voice's copy in the same left column: opening mark, quote with one italic accent phrase, white logo, university in caps, role,
                             country, SAMPLE). No card, no buttons, no list. Markup only.
   DX.voiceRotate(root)      wires a band: the scene engine (home, scenes.js) / pages-v7 (stories, universities) call root._prog(p) from the scroll position (p = voices travelled, half a
                             screen per voice). The photos pan with parallax; the copy swaps cleanly between two photos (never overlapped, never half faded). ArrowLeft / Right, mouse drag, a
                             horizontal wheel swipe and a touch swipe move the page to the neighbouring voice's stop. No auto-timer (it would hijack the scroll). Transform / opacity only.
   DX.partnerWall()          logos grouped under the live destination names (DX.C, four since v8.16), soft-shadow tiles, no counts.
   DX.storyCard(s)           premium portrait card for a student or parent story.   DX.voiceCard(x)  small university quote card.
   DX.rise(els)              one quiet entrance (y 24 -> 0, 600 ms expo.out, stagger .07) once each element reaches 88% of the viewport.
   DX.voiceJsonLd()          Review structured data for APPROVED items only (none yet; the hook is in place).
   prefers-reduced-motion = static (no rotation, instant switch, no pinning). Without JS every quote is a plain stacked block. */
(function(){
var W=window,D=document,DX=W.DX;if(!DX)return;
var $=function(s,r){return(r||D).querySelector(s)},$$=function(s,r){return[].slice.call((r||D).querySelectorAll(s))};
var esc=DX.esc||function(s){return String(s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})};
var rm=matchMedia('(prefers-reduced-motion:reduce)').matches;
var POR={1:'b-por-s1',2:'b-por-s2',3:'b-por-s3',4:'b-por-s4',5:'b-por-s5',6:'b-por-s6',8:'b-por-s8',9:'b-por-s9'};DX.POR=POR; /* images agent B (2026-10-30): one distinct face per story, never reused on the team strip (img/CREDITS.md) */
var POS={w1:'50% 30%',m2:'50% 28%',w4:'50% 42%',m3:'50% 30%',w6:'50% 30%',m1:'50% 28%',w5:'50% 34%',w3:'50% 30%'}; /* crop per portrait so eyes, nose and mouth stay in the card photo (sweep v8.3) */ /* story id -> portrait file; w1/w2/w3 are the same person (the stock set has four women), see SWEEP_v8.2.md */
var VL={student:'Student',parent:'Parent',university:'University'};
function cn(s){return DX.cn?DX.cn(s):s}
function mark(x){if(x.mark==='From Dolphin reviews')return'';return'<span class="smp">'+esc(x.mark||'Sample')+'</span>'} /* published reviews carry no source label (user 2026-11-01) */
/* logos (2026-10-31, real content pass): the client's own files (img/logos/<slug>.webp, transparent) with a light-ink twin for the dark theme (<slug>-d.webp).
   No white plate (no-box rule): the theme picks the file (css/components/voices.css .lg-l / .lg-d). An institution without a clear logo file shows its name in the serif.
   lg-sq = a near-square mark (crest, stacked wordmark) drawn a little taller so it reads at the same visual weight as a wide wordmark. */
var SHORT={'Richmond, The American International University in London':'Richmond University London'};
DX.logoSmall=function(p){return!p.logo};
DX.shortName=function(p){return SHORT[p.name]||p.name};
DX.logoImg=function(p,alt){if(!p.logo)return'';var sq=p.lw&&p.lw/p.lh<1.7?' lg-sq':'',a=' alt="'+esc(alt==null?p.name:alt)+'" width="'+p.lw+'" height="'+p.lh+'" loading="lazy" decoding="async"';
 return'<img class="lg lg-l'+sq+'" src="'+p.logo+'"'+a+'>'};   /* 2026-11-01: colour logo only (on its white backing in both themes); the -d variant is never shown, so it is not downloaded */
function logo(p){return DX.logoSmall(p)?'<span class="vlg vlg-n">'+esc(DX.shortName(p))+'</span>':'<span class="vlg">'+DX.logoImg(p,'')+'</span>'}
/* ---------- featured band (sweep v8.5): a full-screen, scroll-driven scene ----------
   One slide = the institution's country photograph filling the WHOLE stage (v8.11, user decision 2026-10-30; no navy side wash any more, only a light top band for
   the header) and ONE glass card on one side (alternating) holding the quote, logo tile, institution / country / role / SAMPLE (contrast >= 4.5:1 over the
   photo; a per-photo glass alpha in GA where a bright photo needs it). Everything inside moves with the SCROLL (root._prog(p), p = slides travelled, set by the scene engine / pages-v7 pin): the arriving photo
   glides in from its edge and settles, the quote lines rise one after another (DX.lines), the logo and role follow, the leaving photo swells and fades while its text
   lifts away. Previous / Next pills, ArrowLeft / Right, drag and a horizontal wheel swipe move the page to that slide's stop (root._stopY), so scroll and slide agree.
   No counters, no dots. Reduced motion / no engine: plain stacked slides. */
/* sweep v8.13 (images): each partner's slide shows its own city where a free photo of it exists (London, Melbourne, Wellington, Auckland) and otherwise
   a neutral students-and-study photograph, never another university's landmark or another country's skyline (the old index map had drifted: Swansea showed
   Harvard, Wichita showed Auckland). Keyed by institution name so a change in the partner list cannot shift it. Framing comes from js/photos.js. */
var VPN={'Middlesex University London':['uk-london-tower-bridge'],'University of Lincoln':['uk-lincoln-cathedral'],'Swansea University':['uk-swansea-mumbles'],
 'Wichita State University':['us-wichita-keeper'],'Arkansas State University':['us-arkansas-hawksbill'],'Engineering Institute of Technology':['melbourne-river'],
 'Massey University':['a-nz-wellington'],'Unitec Institute of Technology':['auckland-skyline']};
/* editorial rebuild (2026-10-31, user: "premium, proper and luxurious"): each voice shows the city or campus of its own country (v8.13 rule kept: never a skyline of another
   country); the three UK partners outside London have no photograph of their own town on file, so they show historic UK campus architecture (see img/CREDITS.md). */
var VPH={};
var VPC={'united-kingdom':['uk-cam-bridge-sighs'],'usa':['us-columbia-lib'],'australia':['au-sydney-harbour'],'new-zealand':['nz-tekapo-alps'],'canada':['ca-vancouver-beach']};
/* wash strength per photograph (multiplier of the soft navy wash behind the copy in voices.css): raised where a bright or busy photo needs it for 4.5:1 (measured) */
var WA={'a-london-thames':1.6,'uk-oxford-street':1.5,'uk-kings-aerial':1.45,'us-harvard-brick':1.75,'uk-lincoln-cathedral':1.4,'uk-swansea-mumbles':1.3,'us-wichita-skyline':1,'us-wichita-keeper':1.2,'us-arkansas-hawksbill':1.4,'us-columbia-lib':2.0,'melbourne-river':1.35,'a-nz-wellington':1.5,'auckland-skyline':1.4,'flight-clouds':1.5};
DX.voicePhoto=function(x){var p=(x.inst&&VPN[x.inst.name])||(x.uni!=null&&VPH[x.uni])||VPC[x.country]||['flight-clouds'];return p};
/* editorial band (2026-10-31): no card; the quote stands on the photograph. Opening mark, quote (one italic accent phrase from ACC when the text contains it), white logo,
   university in small caps, role, country, SAMPLE. The names of all universities are the navigation at the foot. */
var ACC=['a good fit','clearly organised','the best start','every document in place','the real cost','honestly','helps everyone'];
DX.voiceAccent=function(t){for(var i=0;i<ACC.length;i++)if(t.indexOf(ACC[i])>-1)return ACC[i];return''};
/* logos (2026-10-31): white versions with transparent background made from the partner files (img/partners/w2/pNN.webp, cropped to the mark where the file carries a tiny
   sub-caption, enlarged 4x with Lanczos so they stay crisp at 2x; the name is always set in text under the logo). Marks that do not read as a mark (a seal, a badge) show
   the name in white Bodoni instead of a plate. */
var TYPO={'p16':1,'p04':1,'p18':1,'p22':1,'p25':1};
function wlogo(p){return p&&p.logoD?'<img class="vb-lg" src="'+p.logoD+'" alt="" loading="lazy" decoding="async">':''} /* the band is a dark stage in both themes: the light-ink logo */
DX.voiceBand=function(items,opts){opts=opts||{};if(!items||!items.length)return'';var n=items.length,last=null,ph='',tx='';
 items.forEach(function(x,i){var who=x.inst?x.inst.name:x.name,p=DX.voicePhoto(x);if(last&&p[0]===last[0])p=['flight-clouds','50% 50%'];last=p;var ac=DX.voiceAccent(x.text||''),lg=x.inst?wlogo(x.inst):'';
  ph+='<div class="vb-ph" data-i="'+i+'" style="--wa:'+(WA[p[0]]||1)+'"><div class="vb-pi"><img data-ph="'+p[0]+'" data-sizes="(max-width:700px) 130vw, 112vw" data-pos="'+(p[1]||'50% 50%')+'" alt="" loading="lazy"></div><i class="vb-wash" aria-hidden="true"></i>'
  +'<figure class="vb-i'+(i?'':' on')+'" data-i="'+i+'" role="group" aria-roledescription="slide" aria-label="Quote '+(i+1)+' of '+n+'"'+(i?' aria-hidden="true"':'')+'>'
  +'<div class="vb-t"><div class="vb-ti"><span class="vb-qm" aria-hidden="true">&ldquo;</span><blockquote class="vb-q"><p'+(ac?' data-acc="'+esc(ac)+'"':'')+'>'+esc(x.text)+'</p></blockquote>'
  +'<figcaption class="vb-c'+(lg||!x.inst?'':' vb-tw')+'">'+lg+(lg||!x.inst?'':'<span class="vb-wm" aria-hidden="true">'+esc(who)+'</span>')+'<span class="vb-w"><b>'+esc(who)+'</b>'+(x.role||x.course?'<span class="vb-ro">'+esc(x.role||x.course)+'</span>':'')+'<span class="vb-co">'+(x.country&&!(x.course&&(x.course.indexOf(cn(x.country))>-1||(x.country==='united-kingdom'&&/\bUK\b/.test(x.course))))?'<span>'+esc(cn(x.country))+'</span>':'')+mark(x)+'</span></span></figcaption></div></div></figure></div>'});
 return'<div class="vb" id="'+esc(opts.id||'vb')+'" role="region" aria-roledescription="carousel" aria-label="'+esc(opts.label||'What our students say')+'" tabindex="0">'
 +'<div class="vb-s">'+ph+'</div>'
 +'<span class="vb-st" role="status" aria-live="polite"></span></div>'};
var cl=function(v){return v<0?0:v>1?1:v},sm=function(v){v=cl(v);return v*v*(3-2*v)};
DX.voiceRotate=function(root,opts){if(!root||root._vr)return;root._vr=1;opts=opts||{};
 var items=$$('.vb-i',root),n=items.length,st=$('.vb-st',root),cur=0,G=W.gsap;
 if(DX.phExpand)DX.phExpand(root);
 root.classList.add('vb-on');
 /* the stage follows the theme: deep navy with white type in the dark theme, a soft-blue wash with navy type in the light theme (the section's on-dark class follows, so the header reads right) */
 var sec=root.closest('section');function tone(){var dark=true;/* 2026-10-29 user: the voice slider stays the dark navy stage in BOTH themes (the light variant looked washed out) */root.classList.toggle('vb-light',!dark);if(sec){sec.classList.toggle('on-dark',dark);sec.classList.toggle('vb-light',!dark)}}tone();
 if('MutationObserver' in W)new MutationObserver(tone).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
 /* v8.11 (user screenshot, ES, last slide stuck half-revealed: lines cut by their masks, institution at ~25 %): the quote is split into lines WITHOUT clipping masks
    (class vl, own CSS in voices.css: each line fades in and rises .45em, nothing can ever be cut), and re-split from its plain text on resize (width change), font
    load and whenever something else rewrites it (the language switch), so no stale line box survives. A quote that would need more than 5 lines steps its font
    size down until it fits in 5. */
 var SPL=W.SplitText,MAXL=function(){return W.innerWidth<=900?6:4};
 function mk(q,src){var a=q.getAttribute('data-acc'),h=esc(src);if(!a||src.indexOf(a)<0)return h;var e=esc(a),k=h.indexOf(e),t=h.charAt(k+e.length);/* a full stop or comma right after the phrase stays inside the italic, so SplitText never wraps it onto a line of its own */return h.slice(0,k)+'<em>'+e+(/[.,;:!?]/.test(t)?t:'')+'</em>'+h.slice(k+e.length+(/[.,;:!?]/.test(t)?1:0))}
 function split(x){var q=x.q;if(!q||!SPL)return false;var src=(q.textContent||'').replace(/\s+/g,' ').trim();if(!src)return false;
  q.style.fontSize='';var fs=0,lines=0;
  /* SplitText reverts an element's previous split (restoring the HTML it saw then) when it splits it again, so revert our own instance FIRST and only then
     put the current text back: otherwise a translated quote would come back in English */
  for(var k=0;k<6;k++){if(x.sp){try{x.sp.revert()}catch(e){}x.sp=null}q.innerHTML=mk(q,src);var s;try{s=x.sp=SPL.create(q,{type:'lines',linesClass:'vl',aria:'none'})}catch(e){q.textContent=src;return false}
   lines=s.lines.length;s.lines.forEach(function(l,i){l.style.setProperty('--k',i)});q.style.setProperty('--n',lines);
   if(lines<=MAXL())break;fs=(fs||parseFloat(getComputedStyle(q).fontSize))*.93;q.style.fontSize=fs.toFixed(1)+'px'}
  if(x.mo)x.mo.takeRecords();return true}
 var phs=$$('.vb-ph',root);
 var P=items.map(function(it,ix){var q=$('.vb-q p',it),ph=phs[ix];var x={it:it,ph:ph,pi:$('.vb-pi',ph),q:q,bq:$('.vb-q',it),qm:$('.vb-qm',it),c:$('.vb-c',it),w:$('.vb-c',it),t:$('.vb-ti',it),tw:$('.vb-t',it),lined:false,s:''};
  x.lined=split(x);if(!x.lined&&q)q.classList.add('rv-b');
  if(x.lined&&'MutationObserver' in W){x.mo=new MutationObserver(function(){resplit(true)});x.mo.observe(q,{childList:true,characterData:true,subtree:true})}
  return x});
 var rt=0,rRef=false;function resplit(ref){if(ref)rRef=true;clearTimeout(rt);rt=setTimeout(function(){P.forEach(function(x){if(x.lined)split(x)});lastP=-1;draw(curP);
  if(rRef&&W.ScrollTrigger)W.ScrollTrigger.refresh();rRef=false},120)}
 var lw=W.innerWidth;W.addEventListener('resize',function(){if(W.innerWidth!==lw){lw=W.innerWidth;resplit(false)}});
 if(D.fonts){if(D.fonts.ready)D.fonts.ready.then(function(){resplit(false)});if(D.fonts.addEventListener)D.fonts.addEventListener('loadingdone',function(){resplit(false)})}
 function set(k,manual){k=Math.max(0,Math.min(n-1,k));if(k===cur)return;cur=k;
  items.forEach(function(it,j){var on=j===k;it.classList.toggle('on',on);if(on)it.removeAttribute('aria-hidden');else it.setAttribute('aria-hidden','true')});
  if(manual&&st){var w=$('.vb-w b',items[k]);st.textContent='Quote '+(k+1)+' of '+n+(w?': '+w.textContent:'')}}
var eo=function(t){t=cl(t);return 1-Math.pow(1-t,2.2)}; /* scrubbed, so a gentle ease-out */
 /* moving window (2026-10-31): each voice is a PANEL of one horizontal plane: its photograph, its own soft wash (.vb-wash, identical strength at both edges so the seam between two
    panels is clean) and its own copy, all clipped by the panel (overflow hidden), so a word is never drawn over another voice's photograph. The page scroll pans the window across the
    panels (p = voices travelled, scrubbed 1:1 by the scene engine or by pages-v7; q = p eased so each voice rests a little at both ends of its stride; d = q - j).
      panel   x = -d x 100 %;  photo inside: x = d x 8.3 % of its 120 % box (parallax);  copy inside: x = -d x 22 % of the panel (lags on the way in, leads on the way out).
      swap    the copy is drawn in two steps by CSS (voices.css) when the window passes the half way point (set(): class .on): the outgoing lines fade out in .2 s, the incoming
              lines rise after it, so a resting position always shows complete copy and the two voices' copy are never both lit on the same photo.
    Only transform and class changes are written; pure functions of p, so scrolling back plays it backwards. */
 var lay=function(el,o){if(el)el.style.opacity=o>=1?'1':o.toFixed(3)};
 var lastP=-1,curP=0;function draw(p){curP=p;if(p===lastP)return;lastP=p;var fl=Math.floor(p+1e-6),fr=p-fl,q=fr<1e-4?fl:fl+sm((fr-.08)/.84);
  P.forEach(function(x,j){var d=q-j,a=Math.abs(d),ph=x.ph;
   if(a>=1){if(x.s!=='h'){x.s='h';ph.style.visibility='hidden';ph.classList.remove('vis')}return}
   if(x.s==='h'||!x.s){x.s='v';ph.style.visibility='visible';ph.classList.add('vis')}
   ph.style.transform=a<1e-4?'none':'translate3d('+(-d*100).toFixed(2)+'%,0,0)';
   if(x.pi)x.pi.style.transform=a<1e-4?'none':'translate3d('+(d*8.33).toFixed(2)+'%,0,0)';
   x.it.style.transform=a<1e-4?'none':'translate3d('+(-d*22).toFixed(2)+'%,0,0)'; /* the copy rides in its own panel (clipped by it) at a different speed: it lags on the way in and leads on the way out */
  });
  set(Math.round(q),false)}
 function prog(p){draw(p)}
 /* a manual change moves the page to that slide's stop; the scroll then drives the scene */
 function manual(k){k=Math.max(0,Math.min(n-1,k));if(k===cur)return;set(k,true);var y=root._stopY?root._stopY(k):null;
  if(y!=null){if(DX.stepFly)DX.stepFly(y);else if(W.__lenis)W.__lenis.scrollTo(y,{duration:1.1,lerp:0});else W.scrollTo({top:y,behavior:rm?'auto':'smooth'})}}
 /* touch: a clear horizontal swipe changes the slide, a vertical one still scrolls the page */
 var tx=0,ty=0,tt=0;root.addEventListener('touchstart',function(e){var t=e.touches[0];tx=t.clientX;ty=t.clientY;tt=e.touches.length},{passive:true});
 root.addEventListener('touchend',function(e){if(tt!==1)return;var t=e.changedTouches[0],ddx=t.clientX-tx,ddy=t.clientY-ty;if(Math.abs(ddx)>56&&Math.abs(ddx)>Math.abs(ddy)*1.6)manual(cur+(ddx<0?1:-1))},{passive:true});
 root.addEventListener('keydown',function(e){if(e.key==='ArrowRight'){e.preventDefault();manual(cur+1)}else if(e.key==='ArrowLeft'){e.preventDefault();manual(cur-1)}});
 /* drag with the mouse: a 60 px horizontal pull changes the slide (a vertical swipe still scrolls the page; touch keeps native scrolling) */
 var px=0,py=0,dx=0,drag=false,moved=false;
 root.addEventListener('pointerdown',function(e){if(e.button||e.pointerType==='touch'||e.target.closest('button,a'))return;drag=true;moved=false;px=e.clientX;py=e.clientY;dx=0});
 W.addEventListener('pointermove',function(e){if(!drag)return;dx=e.clientX-px;var dy=e.clientY-py;if(!moved&&Math.abs(dx)>6&&Math.abs(dx)>Math.abs(dy)){moved=true;root.classList.add('drag')}if(moved&&e.cancelable)e.preventDefault()},{passive:false});
 var up=function(){if(!drag)return;drag=false;root.classList.remove('drag');if(moved&&Math.abs(dx)>60)manual(cur+(dx<0?1:-1))};
 W.addEventListener('pointerup',up);W.addEventListener('pointercancel',up);
 root.addEventListener('click',function(e){if(moved){e.preventDefault();e.stopPropagation()}},true);
 var wt=0;root.addEventListener('wheel',function(e){if(Math.abs(e.deltaX)<=Math.abs(e.deltaY)||Math.abs(e.deltaX)<18)return;e.preventDefault();var now=performance.now();if(now-wt<800)return;wt=now;manual(cur+(e.deltaX>0?1:-1))},{passive:false});
 draw(0);
 /* the neighbouring photographs must be decoded before the window reaches them: load them all once the page is idle */
 var eager=function(){$$('img[loading=lazy]',root).forEach(function(im){im.loading='eager'})};if(D.readyState==='complete')setTimeout(eager,400);else W.addEventListener('load',function(){setTimeout(eager,400)});
 root._prog=prog;root._set=function(k){set(k,false)};root._cur=function(){return cur}};
/* ---------- partner wall ---------- */
/* New Zealand shows its six universities here (the full list of private institutions and polytechnics lives on the universities page) and the
   wall follows Dolphin's own order: New Zealand first. */
DX.partnerWall=function(){var P=DX.P,C=DX.C.filter(function(c){return c.slug==='new-zealand'}).concat(DX.C.filter(function(c){return c.slug!=='new-zealand'}));
 return'<div class="pw-g">'+C.map(function(c){var l=P.filter(function(p){return p.country===c.slug&&(!p.grp||p.grp==='u')});
  return'<div class="pw-c"><h3 class="pw-h"><a href="country.html?c='+c.slug+'">'+esc(c.name)+'</a></h3>'
  +(l.length?'<div class="pw-r">'+l.map(function(p){return DX.logoSmall(p)?'<a class="pw-t" href="universities.html#grid"><span class="pw-nm">'+esc(DX.shortName(p))+'</span></a>':'<a class="pw-t" href="universities.html#grid">'+DX.logoImg(p)+'</a>'}).join('')+'</div>'
  :'<p class="pw-n">Your counsellor applies to institutions in '+esc(c.name)+' that fit you.</p>')+'</div>'}).join('')+'</div>'};
/* ---------- cards ---------- */
DX.storyCard=function(s){var p=s.sample?POR[s.id]:null,pf=p&&(/^b-/.test(p)?p:'por-'+p);
 if(!p)return'<figure class="tc tc-np"><blockquote class="tc-q"><p>'+esc(s.text)+'</p></blockquote><figcaption class="tc-c"><b>'+esc(s.name)+'</b>'+(s.course||s.country?'<span>'+esc(s.course||cn(s.country))+(s.course&&s.country&&s.course.indexOf(cn(s.country))<0&&!(s.country==='united-kingdom'&&/\bUK\b/.test(s.course))?' &middot; '+esc(cn(s.country)):'')+'</span>':'')+mark(s)+'</figcaption></figure>';
 return'<figure class="tc"><div class="tc-p"'+(p?' style="--pos:'+(POS[p]||'50% 40%')+'"':'')+'>'+(p?'<img src="img/photos/'+pf+'-800.webp" srcset="img/photos/'+pf+'-400.webp 400w, img/photos/'+pf+'-800.webp 800w" sizes="(max-width:700px) 78vw, (max-width:1100px) 46vw, 30vw" width="800" height="800" alt="'+esc(s.name)+', '+VL[s.voice].toLowerCase()+', sample portrait" loading="lazy" decoding="async">':'')+'</div>'
 +'<blockquote class="tc-q"><p>'+esc(s.text)+'</p></blockquote><figcaption class="tc-c"><b>'+esc(s.name)+'</b><span>'+esc(s.course)+' &middot; '+esc(cn(s.country))+'</span>'+mark(s)+'</figcaption></figure>'};
DX.voiceCard=function(x,o){if(!x)return'';o=o||{};
 return'<figure class="vc'+(o.nologo||!x.inst?' min':'')+'">'+(x.inst&&!o.nologo?logo(x.inst):'')+'<blockquote class="vc-q"><p>'+esc(x.text)+'</p></blockquote><figcaption class="vc-c"><b>'+esc(x.inst?x.inst.name:x.name)+'</b><span>'+esc(x.role||x.course||'')+(x.role&&x.country?', '+esc(cn(x.country)):'')+'</span>'+mark(x)+'</figcaption></figure>'};
/* sweep v8.17: university feature row for the stories wall (typographic: logo tile + country label on the left, large serif pull-quote and attribution on the right) */
DX.uniFeature=function(x){if(!x)return'';var who=x.inst?x.inst.name:x.name;
 return'<figure class="uf"><div class="uf-l">'+(x.inst?logo(x.inst):'')+'<span class="uf-k">'+esc(cn(x.country))+'</span></div>'
 +'<div class="uf-r"><blockquote class="uf-q"><p>'+esc(x.text)+'</p></blockquote><figcaption class="uf-c"><b>'+esc(who)+'</b><span>'+esc(x.role||'')+'</span>'+mark(x)+'</figcaption></div></figure>'};
/* ---------- story card row (phones, sweep v8.5): a card less than 60 % in view shows only its photo (class peek), so no half word peeks at the edge ---------- */
DX.peekRow=function(row){if(!row||row._pk||!('IntersectionObserver' in W))return;row._pk=1;var cards=$$('.tc',row);
 var io=new IntersectionObserver(function(es){es.forEach(function(e){e.target.classList.toggle('peek',e.intersectionRatio<.6)})},{root:row,threshold:[0,.6,1]});
 var on=function(){var r=matchMedia('(max-width:1023px)').matches;cards.forEach(function(c){if(r)io.observe(c);else{io.unobserve(c);c.classList.remove('peek')}})};on();
 matchMedia('(max-width:1023px)').addEventListener('change',on)};
/* ---------- entrance ---------- */
DX.rise=function(els){var G=W.gsap,ST=W.ScrollTrigger;els=[].slice.call(els||[]);if(!els.length||!G||!ST||rm)return;
 ST.batch(els,{start:'top 88%',once:true,onEnter:function(b){G.fromTo(b,{y:24,opacity:0},{y:0,opacity:1,duration:1.1,ease:'power3.out',stagger:function(i){return Math.min(i*.06,.5)},clearProps:'transform,opacity'})}})};
/* ---------- structured data: approved items only ---------- */
DX.voiceJsonLd=function(){var ok=DX.voices(function(x){return x.consent&&x.consent.status==='approved'&&x.rating});if(!ok.length||$('#voicesLd'))return;
 var s=D.createElement('script');s.type='application/ld+json';s.id='voicesLd';
 s.textContent=JSON.stringify({'@context':'https://schema.org','@type':'EducationalOrganization',name:'Dolphin Education',address:{'@type':'PostalAddress',addressLocality:'Kathmandu',addressCountry:'NP'},
  review:ok.map(function(x){return{'@type':'Review',reviewBody:x.text,datePublished:x.consent.date||undefined,author:{'@type':x.voice==='university'?'Organization':'Person',name:x.inst?x.inst.name:x.name}}})});
 D.head.appendChild(s)};
})();
