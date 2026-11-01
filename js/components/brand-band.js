/* Brand bands (2026-11-01): one compact Dolphin band per page, same family, own layout: the white Dolphin logo, one Dolphin line, and one
   piece of real, moving proof read from window.DX (so Content Manager data from js/core/site-live.js flows in; 'dx:live' re-renders the proof).
   Pages that already have a gradient facts band get it extended; the others get one new band (section.bb-band) at a fixed spot.
   Facts: only what Dolphin publishes. No counts are shown. Reduced motion: nothing moves (rotators show their first item, marquees wrap). */
(function(){
var W=window,D=document,DX=W.DX=W.DX||{};
var RM=!!(W.matchMedia&&W.matchMedia('(prefers-reduced-motion: reduce)').matches);
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
var LOGO='img/logo-400.webp';   /* the colour logo, on its own white pill (logos are the one place a white shape is allowed) */
/* "Congratulations VISA GRANTED" posters on dolphin.edu.np/success-stories: name and institution as printed there (titles dropped). Text only:
   the posters are not reused (three show a visa approval letter). Consent to reuse on the new site is an open item, as for the reviews. */
var VISA=[['Shriya Shrestha','wintec','Wintec'],['Jyoti Sedhain','lincoln-nz','Lincoln University'],['Roshana Timalsina','otago','Otago Polytechnic'],
 ['Sarthak','vuw','Victoria University of Wellington'],['Pawel Shah','wintec','Wintec'],['Nisha Baral','unitec','Unitec'],['Spriha Tandukar','northtec','NorthTec'],
 ['Sushmita Shrestha','lincoln-nz','Lincoln University'],['John Maharjan','massey','Massey University'],['Sushil','ara','Ara Institute of Canterbury'],
 ['Sajina Kafle','lincoln-nz','Lincoln University'],['Gautam','unitec','Unitec'],['Sagar Jamarkattel',null,'IPU New Zealand'],['Gaurav','lincoln-nz','Lincoln University']];
/* institutions that presented at Dolphin sessions (dolphin.edu.np/events, 2025-2026) */
var VISITED=['waikato','massey','unitec','wintec','sit'];   /* CQUniversity and Kaplan also presented; no logo file exists for them, so they are not in the logo row */

function partners(){return DX.P||[]}
function bySlug(s){if(!s)return null;var re=new RegExp('/'+s.replace(/[-]/g,'\\-')+'\\.webp$');return partners().filter(function(p){return p.logo&&re.test(p.logo)})[0]||null}
/* partner logos: the original colour file on a white pill. Optical sizing: wide wordmarks get less height, compact crests more, so every
   logo reads at the same weight; desktop and phone sizes ride on CSS variables. */
var SZ={d:{k:42,lo:28,hi:50,mw:190},m:{k:32,lo:22,hi:36,mw:136}};
function fit(p,z){var a=(p.lw||300)/(p.lh||128),h=Math.max(z.lo,Math.min(z.hi,z.k*Math.sqrt(2.6/a))),w=h*a;if(w>z.mw){w=z.mw;h=w/a}return{w:Math.round(w),h:Math.round(h)}}
function hasLogo(p){return!!(p&&p.logo)}
function logo(p,dec){var d=fit(p,SZ.d),m=fit(p,SZ.m);
 return'<span class="bb-pl" style="--lw:'+d.w+'px;--lh:'+d.h+'px;--mw:'+m.w+'px;--mh:'+m.h+'px"><img src="'+esc(p.logo)+'" alt="'+(dec?'':esc(p.name))+'" width="'+d.w+'" height="'+d.h+'" loading="lazy" decoding="async"></span>'}
function the(c){return(c.slug==='united-kingdom'||c.slug==='usa'?'the ':'')+c.name}
/* one whole sentence of a real review, word for word (never cut, never edited): the first sentence that is complete, holds no "…" cut mark and fits */
function sentence(t,max){var s=[];String(t||'').replace(/\s+/g,' ').split(/\s*…\s*/).forEach(function(part){s=s.concat(part.trim().split(/(?<=[.!?])\s+(?=[A-Z“"])/))});
 for(var i=0;i<s.length;i++){var x=s[i].trim();if(x.length>=48&&x.length<=max&&x.indexOf('…')<0&&/^[A-Z“"]/.test(x)&&/[.!?]$/.test(x))return x}return null}

/* ---------- proof pieces ---------- */
function marquee(items,sec){   /* items = html strings; two copies, the second hidden from screen readers */
 var a='<ul class="bb-mq-l">'+items.map(function(h){return'<li>'+h+'</li>'}).join('')+'</ul>';
 var b=a.replace('<ul class="bb-mq-l">','<ul class="bb-mq-l" aria-hidden="true">').replace(/ alt="[^"]*"/g,' alt=""');
 return'<div class="bb-mq"><div class="bb-mq-t" style="--bb-d:'+Math.max(24,Math.round(items.length*(sec||4)))+'s">'+a+b+'</div></div>'}
function row(items){return'<ul class="bb-row">'+items.map(function(h){return'<li>'+h+'</li>'}).join('')+'</ul>'}
function rotator(items,texts){   /* stacked in one grid cell: the tallest item sets the height, so nothing jumps */
 return'<div class="bb-rot" aria-hidden="true">'+items.map(function(h,i){return'<div class="bb-ri'+(i?'':' on')+'">'+h+'</div>'}).join('')+'</div>'
  +'<ul class="bb-sr">'+texts.map(function(t){return'<li>'+esc(t)+'</li>'}).join('')+'</ul>'}
/* a set of logos on one full-width white strip: a slow, seamless marquee. The track is filled at run time (pager) with enough copies of the set to cover the row,
   then that run is doubled and moved by half, so the loop never shows a seam; the ends fade softly (no hard cut). One or two logos stay still. */
function logoSet(list){list=list.filter(hasLogo);if(!list.length)return'';
 return'<div class="bb-lp" data-n="'+list.length+'"><ul class="bb-sr">'+list.map(function(p){return'<li>'+esc(p.name)+'</li>'}).join('')+'</ul>'
  +'<div class="bb-lp-src" hidden>'+list.map(function(p){return logo(p,1)}).join('')+'</div><div class="'+(list.length>2?'bb-mq ':'')+'bb-lp-m" aria-hidden="true"></div></div>'}
function visaList(){return VISA.map(function(v){var p=bySlug(v[1]);return{name:v[0],inst:p?p.name:v[2],p:p}})}
function reviews(f){var v=DX.voices?DX.voices({voice:'student'}):(DX.stories||[]);return v.filter(function(x){return x&&x.text&&(!f||f(x))})}

var PROOF={
 partners:function(){var l=partners().filter(hasLogo);return l.length?{k:'We proudly represent',h:logoSet(l)}:null},
 nzUnis:function(){var l=partners().filter(function(p){return hasLogo(p)&&p.country==='new-zealand'&&p.grp==='u'});return l.length?{k:'We proudly represent',h:logoSet(l)}:null},
 country:function(slug){var c=(DX.C||[]).filter(function(x){return x.slug===slug})[0],l=partners().filter(function(p){return p.country===slug&&hasLogo(p)});
  return l.length?{k:'Partner institutions',h:logoSet(l),c:'logos'}:null},
 visaLine:function(){var v=visaList();return{k:'Visa granted',h:rotator(v.map(function(x){return(hasLogo(x.p)?'<span class="bb-v">'+logo(x.p,1)+'</span>':'')+'<span class="bb-a">'+esc(x.name)+'</span><span class="bb-b">'+esc(x.inst)+'</span>'}),v.map(function(x){return x.name+', '+x.inst}))}}, /* with the institution's logo pill, like visaCard (user 2026-11-01) */
 visaCard:function(){var v=visaList();return{k:'Visa granted',h:rotator(v.map(function(x){return(hasLogo(x.p)?'<span class="bb-v">'+logo(x.p,1)+'</span>':'')+'<span class="bb-a">'+esc(x.name)+'</span><span class="bb-b">'+esc(x.inst)+'</span>'}),v.map(function(x){return x.name+', '+x.inst}))}},
 visaRun:function(){var v=visaList();return{k:'Visa granted',h:marquee(v.map(function(x){return'<span class="bb-a">'+esc(x.name)+'</span><span class="bb-b">'+esc(x.inst)+'</span>'}),7)}},
 review:function(tag){var r=reviews(tag?function(x){return(x.tags||[]).indexOf(tag)>-1}:null).map(function(x){return{x:x,q:sentence(x.text,130)}}).filter(function(o){return o.q});if(!r.length)return null;
  return{k:'Student reviews',c:'review',h:rotator(r.map(function(o){return'<p class="bb-q">“'+esc(o.q)+'”</p><span class="bb-at"><span class="bb-a">'+esc(o.x.name)+'</span>'+(o.x.course?'<span class="bb-b">'+esc(o.x.course)+'</span>':'')+'</span>'}),r.map(function(o){return o.x.name+': '+o.q}))}},
 team:function(){var t=DX.team||[];if(!t.length)return null;
  return{k:'Licensed counsellors, ECANZ',h:rotator(t.map(function(m){return'<span class="bb-a">'+esc(m[0])+'</span><span class="bb-b">'+esc(m[1])+(m[2]?' · <span class="bb-lic">Licence</span> '+esc(m[2]):'')+'</span>'}),t.map(function(m){return m[0]+', '+m[1]+(m[2]?', licence '+m[2]:'')}))}},
 offices:function(){var o=DX.offices||[];if(!o.length)return null;
  return{k:'Our offices',h:'<ul class="bb-of">'+o.map(function(x,i){return'<li'+(i?'':' class="on"')+'><span class="bb-a">'+esc(x.n)+'</span><span class="bb-b">'+esc(x.k)+'</span></li>'}).join('')+'</ul>'}},
 visited:function(){var l=VISITED.map(bySlug).filter(hasLogo);return l.length?{k:'Institutions at our sessions',h:logoSet(l)}:null},
 atlas:function(){var C=(DX.C||[]).map(function(c){return{c:c,l:partners().filter(function(p){return p.country===c.slug&&hasLogo(p)})}}).filter(function(x){return x.l.length});if(!C.length)return null;
  return{k:'Partner institutions',h:rotator(C.map(function(x){return'<span class="bb-a bb-cn">'+esc(x.c.name)+'</span><span class="bb-lg">'+x.l.slice(0,4).map(function(p){return logo(p,1)}).join('')+'</span>'}),
   C.map(function(x){return x.c.name+': '+x.l.map(function(p){return p.name}).join(', ')}))}}};

/* ---------- pages: where the band lives, its layout, its line, its proof ---------- */
var PG=(location.pathname.split('/').pop()||'index.html').replace(/\.html?$/,'')||'index';
function slug(){var s=new URLSearchParams(location.search).get('c')||'united-kingdom';return({uk:'united-kingdom',us:'usa',au:'australia',nz:'new-zealand'})[s]||s}
var CFG={
 index:{inWrap:'#stats > .wrap',lay:'lockup',line:'If it’s New Zealand, it is <em>Dolphin.</em>',proof:['partners','visaLine']},
 destinations:{after:'#compare',lay:'stack',line:'One counsellor, <em>five countries.</em>',proof:['atlas']},
 country:{after:'#why',lay:'stack',line:function(){var c=(DX.C||[]).filter(function(x){return x.slug===slug()})[0];return c?'Study in '+esc(the(c))+' <em>with Dolphin.</em>':'Study abroad <em>with Dolphin.</em>'},proof:[function(){return PROOF.country(slug())}]},
 universities:{after:'#means',lay:'duo',line:'Empowering your global <em>education journey.</em>',proof:['visaCard']},
 stories:{before:'#partners',lay:'duo',line:'Study abroad, <em>guided with care.</em>',proof:['review']},
 about:{after:'#story',lay:'duo',line:'Study-abroad counselling <em>since 2007.</em>',proof:['team']},
 contact:{before:'#help',lay:'centre',line:'Your journey starts <em>with Dolphin.</em>',proof:['offices']},
 events:{inWrap:'.ev-band:not(.ev-cta) > .wrap',lay:'lockup',line:'Dive into the world <em>with Dolphin.</em>',proof:['visited']},
 gallery:{inWrap:'.gl-band:not(.gl-cta) > .wrap',lay:'stack',line:'Moments from the <em>Dolphin journey.</em>',proof:['visaRun']},
 videos:{inWrap:'.vd-band:not(.vd-cta) > .wrap',lay:'lockup',line:'See it first, <em>then ask Dolphin.</em>',proof:['nzUnis']},
 'test-preparation':{inWrap:'.tp-band:not(.tp-cta) > .wrap',lay:'stack',line:'Prepare with <em>Dolphin.</em>',proof:[function(){return PROOF.review('test')}]},
 blogs:{inWrap:'.bl-cta > .wrap',lay:'cta',line:null,proof:['visaLine']}};

var KIND={partners:'logos',nzUnis:'logos',visited:'logos',visaLine:'vline',visaCard:'vcard',visaRun:'vrun',review:'review',team:'team',offices:'offices',atlas:'atlas'};
function proofHtml(cfg){return cfg.proof.map(function(p){var r=typeof p==='function'?p():PROOF[p](),k=typeof p==='function'?(r&&r.c)||'':KIND[p];
 return r?'<div class="bb-p'+(k?' bb-'+k:'')+'"><p class="bb-k">'+esc(r.k)+'</p>'+r.h+'</div>':''}).join('')}
function headHtml(cfg){var line=typeof cfg.line==='function'?cfg.line():cfg.line;
 return'<div class="bb-h"><span class="bb-lw"><img class="bb-logo" src="'+LOGO+'" alt="Dolphin Education" width="400" height="100" decoding="async"></span>'+(line?'<p class="bb-line">'+line+'</p>':'')+'</div>'}

/* ---------- logo marquees: fill the track for the current width (rebuilt on resize) ---------- */
var SPEED=26;   /* px per second: slow and calm */
function pager(root){[].forEach.call(root.querySelectorAll('.bb-lp'),function(lp){var src=lp.querySelector('.bb-lp-src'),m=lp.querySelector('.bb-lp-m');if(!src||!m)return;
 var pills=[].slice.call(src.children).map(function(el){return el.outerHTML}).join('');
 if(!m.classList.contains('bb-mq')){m.innerHTML='<div class="bb-lp-row">'+pills+'</div>';return}
 if(RM){m.classList.add('bb-still');m.innerHTML='<div class="bb-mq-t"><div class="bb-mq-l">'+pills+'</div></div>';return}
 var ph=window.innerWidth<=700,cs=getComputedStyle(lp),num=function(n,d){var v=parseFloat(cs.getPropertyValue(n));return isNaN(v)?d:v},gap=num('--bb-gap',20),pad=num('--bb-pad',28);
 var unit=[].reduce.call(src.children,function(a,el){return a+parseFloat(el.style.getPropertyValue(ph?'--mw':'--lw'))+2*pad+gap},0)||1;
 var reps=Math.max(1,Math.ceil((m.clientWidth||lp.clientWidth)/unit)),run=new Array(reps+1).join(pills),dist=unit*reps;
 m.innerHTML='<div class="bb-mq-t" style="--bb-d:'+Math.round(dist/SPEED)+'s"><div class="bb-mq-l">'+run+'</div><div class="bb-mq-l">'+run+'</div></div>'})}

/* ---------- motion: rotators crossfade, marquees glide; both stop off screen, in a hidden tab, on hover and on focus ---------- */
var live=[];
/* the carousels run edge to edge across the screen: --bb-vw = the viewport without its scrollbar (100vw would add a sideways scroll) */
function vw(){D.documentElement.style.setProperty('--bb-vw',D.documentElement.clientWidth+'px')}
function engine(root){vw();pager(root);
 [].forEach.call(root.querySelectorAll('.bb-rot,.bb-of'),function(r){var it=r.children;if(it.length<2||RM)return;
  var o={r:r,i:0,t:0,vis:false,hold:false,step:r.classList.contains('bb-of')?2600:4600};
  o.tick=function(){if(!o.vis||o.hold||D.hidden)return;var c=it[o.i];c.classList.remove('on');o.i=(o.i+1)%it.length;it[o.i].classList.add('on')};
  o.t=setInterval(o.tick,o.step);live.push(o)});
 [].forEach.call(root.querySelectorAll('.bb-mq'),function(m){if(RM)m.classList.add('bb-still');live.push({r:m,mq:1})});
 var host=root.classList.contains('bb-ps')?root:root.querySelector('.bb-ps')||root;
 if(!host._bb){host._bb=1;var hold=function(on){return function(){live.forEach(function(o){if(host.contains(o.r)){o.hold=on;o.r.classList.toggle('bb-hold',on)}})}};
  host.addEventListener('mouseenter',hold(true));host.addEventListener('mouseleave',hold(false));host.addEventListener('focusin',hold(true));host.addEventListener('focusout',hold(false))}
 if(W.IntersectionObserver){var io=new IntersectionObserver(function(es){es.forEach(function(e){live.forEach(function(o){if(o.r===e.target){o.vis=e.isIntersecting;o.r.classList.toggle('bb-off',!e.isIntersecting)}})})});
  live.forEach(function(o){if(root.contains(o.r))io.observe(o.r)})}
 else live.forEach(function(o){o.vis=true})}
function stopIn(root){live=live.filter(function(o){if(root.contains(o.r)){if(o.t)clearInterval(o.t);return false}return true})}

/* ---------- build ---------- */
var built=null;
function build(){var cfg=CFG[PG];if(!cfg)return;var box,sec;
 if(cfg.inWrap){box=D.querySelector(cfg.inWrap);if(!box)return;sec=box.parentElement;
  var first=box.firstElementChild,h=D.createElement('div');h.innerHTML=headHtml(cfg);h=h.firstChild;box.insertBefore(h,first);
  var p=D.createElement('div');p.className='bb-ps';p.innerHTML=proofHtml(cfg);
  if(cfg.lay==='cta'){var b=box.querySelector('.btns');box.insertBefore(p,b||null)}else box.appendChild(p)}
 else{var ref=D.querySelector(cfg.after||cfg.before);if(!ref)return;sec=D.createElement('section');sec.className='bb-band';sec.setAttribute('aria-label','Dolphin Education');
  sec.innerHTML='<div class="wrap">'+headHtml(cfg)+'<div class="bb-ps">'+proofHtml(cfg)+'</div></div>';
  ref.parentNode.insertBefore(sec,cfg.after?ref.nextSibling:ref);box=sec.firstChild}
 sec.classList.add('bb-on');sec.setAttribute('data-bb',PG);sec.setAttribute('data-bb-l',cfg.lay);
 built={cfg:cfg,box:box,sec:sec};engine(box);
 if(DX.reveal)DX.reveal([].slice.call(box.querySelectorAll('.bb-h,.bb-p')))}
function refresh(){if(!built)return;var ps=built.box.querySelector('.bb-ps');if(!ps)return;stopIn(ps);ps.innerHTML=proofHtml(built.cfg);engine(ps)}
DX.brandBand={build:build,refresh:refresh,visa:VISA};
/* after site.js has rendered the page (its DOMContentLoaded handler runs first: this file loads after it) and before imgfx.js measures the holds on load */
/* pages rendered by DX.page may not exist yet at DOMContentLoaded: try again on the next task, then on load (imgfx.js measures its holds 700 ms after load) */
function tryBuild(){if(built||!CFG[PG])return;build()}
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',function(){tryBuild();if(!built)setTimeout(tryBuild,0)});else tryBuild();
W.addEventListener('load',tryBuild);
var rw=W.innerWidth,rt=0;W.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){if(!built||W.innerWidth===rw)return;rw=W.innerWidth;refresh()},250)},{passive:true});
W.addEventListener('dx:live',function(e){var ch=e.detail&&e.detail.changed;if(!ch||[].concat(ch).some(function(k){return/universit|team|site_settings/.test(k)}))refresh()});
})();
