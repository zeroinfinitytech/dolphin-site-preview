/* Pages v7 (2026-10-28): stories, universities, about, contact. Renders each page from js/data.js + js/photos.js into main.v7 (DX.page)
   and builds the scroll language of home-v7 / dest-v7 (DX.after): zoom-through hero pinned without spacing, .z > .zi scenes scaling in,
   a featured university voice (js/components/voices.js), stacked-cover cards, layered parallax, line-mask reveals.
   GSAP + ScrollTrigger + Lenis (site.js) only; touch gets ignoreMobileResize (native scroll, sweep v8.6). Transform and opacity only.
   Without GSAP, under reduced motion or on any error html.pv7 is absent and every scene is a plain readable block. */
(function(){
var W=window,D=document,DX=W.DX;if(!DX)return;var PH=W.DX_PH||{};
var pg=D.body.dataset.page;if(['stories','universities','about','contact'].indexOf(pg)<0)return;
var $=function(s,r){return(r||D).querySelector(s)},$$=function(s,r){return[].slice.call((r||D).querySelectorAll(s))};
var esc=DX.esc,rm=matchMedia('(prefers-reduced-motion:reduce)').matches,CF='To be confirmed by Dolphin';
var CT=DX.contact||{phone:'+977-1-4797331',tel:'+97714797331',wa:'https://wa.me/9779801045116',email:'nb@dolphin.edu.np',days:'',hoursNote:'Office hours to be confirmed'},TEL=CT.phone,WA=CT.wa,HRS=CT.hoursNote||'Office hours to be confirmed';
/* 2026-10-31 real content pass: offices (head office + Pokhara + Biratnagar, data.js DX.offices), social links (DX.social), counsellors (DX.team) */
var OFF=DX.offices||[],SOC=DX.social||[];
function offRows(){return OFF.filter(function(o){return!o.head}).map(function(o){return'<div><dt>'+esc(o.n)+'</dt><dd class="cf">'+esc(o.k)+', details to be confirmed</dd></div>'}).join('')}
var TKP='M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z';
var SOCI={
 Facebook:'<path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>',
 Instagram:'<path fill="url(#igG)" d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>',
 LinkedIn:'<path fill="#0A66C2" d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.125 2.062 2.062 0 0 1 0 4.125zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>',
 YouTube:'<path fill="#FF0000" d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>',
 TikTok:'<path fill="#25F4EE" transform="translate(-.9 -.7)" d="'+TKP+'"/><path fill="#FE2C55" transform="translate(.9 .7)" d="'+TKP+'"/><path class="tk-m" d="'+TKP+'"/>'
};
function socLinks(){return SOC.length?'<p class="soc7"><span>Follow Dolphin</span>'+SOC.map(function(s){var n=esc(s[0]);return'<a href="'+s[1]+'" target="_blank" rel="noopener" aria-label="'+n+'" title="'+n+'">'+(SOCI[s[0]]?'<svg viewBox="0 0 24 24" aria-hidden="true">'+SOCI[s[0]]+'</svg>':n)+'</a>'}).join('')+'</p>':''}
/* photo pipeline (same contract as the other pages) */
DX.phSrc=DX.phSrc||function(n,w){return'img/photos/'+n+'-'+w+'.webp'};
DX.phExpand=DX.phExpand||function(root){$$('img[data-ph]',root).forEach(function(im){var n=im.dataset.ph;if(DX.phPick)n=DX.phPick(n,im);var m=PH[n];if(!m)return;
 var ws=[800,1200,1600,2400,3200].filter(function(w){return w<=m.w});if(!ws.length)ws=[m.w];   /* only the widths that exist (a narrow art-direction crop has no 1600 file) */
 im.src=DX.phSrc(n,Math.min(1600,ws[ws.length-1]));im.srcset=ws.map(function(w){return DX.phSrc(n,w)+' '+w+'w'}).join(', ');im.sizes=im.dataset.sizes||'100vw';
 im.width=m.w;im.height=m.h;if(!im.hasAttribute('loading'))im.loading=im.dataset.eager?'eager':'lazy';im.decoding='async';
 if(im.dataset.pos)im.style.objectPosition=im.dataset.pos;im.style.setProperty('--phc',m.c);im.removeAttribute('data-ph');im.dataset.photo=n})};
function img(n,alt,pos,sizes,eager){return'<img data-ph="'+n+'" alt="'+esc(alt||'')+'" data-pos="'+(pos||'50% 50%')+'" data-sizes="'+(sizes||'100vw')+'"'+(eager?' data-eager="1" loading="eager" fetchpriority="high"':'')+'>'}
var AR='<span class="ar" aria-hidden="true">&#8594;</span>';
function btn(t,h,cls,ext){return'<a class="btn '+(cls||'btn-p')+'" href="'+h+'"'+(ext?' target="_blank" rel="noopener"':'')+'><span>'+t+'</span>'+AR+'</a>'}
function bt(t,type,cls,attr){return'<button class="btn '+(cls||'btn-p')+'" type="'+(type||'button')+'"'+(attr||'')+'><span>'+t+'</span>'+AR+'</button>'}
function L(a,b){return'<span class="ln"><span>'+a+'</span></span> <span class="ln"><span>'+b+'</span></span>'}
function hero(eb,h1,lead,bt,bh,ph,pos){return'<section class="v7h on-dark" id="top" aria-label="'+esc(String(eb).replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim())+'"><div class="v7h-bg" id="hbg" aria-hidden="true">'+img(ph,'',pos,'(max-width:700px) 140vw, 210vw',true)+'</div><div class="wrap v7h-c" id="hc"><p class="eyebrow">'+eb+'</p><h1>'+h1+'</h1><p class="lead">'+lead+'</p>'+btn(bt,bh)+'</div></section>'}
function closing(h2,lead,ph,pos,bt,bh){return'<section class="v7p cl7 on-dark z" id="book" aria-labelledby="clH"><figure class="faint" aria-hidden="true">'+img(ph,'',pos)+'</figure><div class="wrap zi"><h2 id="clH">'+h2+'</h2><p class="lead">'+lead+'</p>'+btn(bt,bh,'btn-a')+'<p class="cl-d">New Baneshwor, Kathmandu &middot; <a href="tel:'+CT.tel+'">'+TEL+'</a> &middot; <a href="mailto:'+esc(CT.email||'nb@dolphin.edu.np')+'">'+esc(CT.email||'nb@dolphin.edu.np')+'</a></p></div></section>'}
/* sweep v8.7 form system: a visible <label for>, the control, optional helper text and an inline error that is empty until the field is wrong
   (the message waits in data-msg, so a screen reader never hears an error that is not there). o = {opt:true, help:'...'} */
var FID=0;
function fld(lab,inner,er,o){o=o||{};var id='f7-'+(++FID),db=(o.help?id+'-h ':'')+id+'-e';
 inner=inner.replace(/^<(input|select|textarea)/,'<$1 id="'+id+'" aria-describedby="'+db+'"');
 return'<div class="fld"><label for="'+id+'">'+lab+(o.opt?' <i class="opt">optional</i>':'')+'</label>'+inner+(o.help?'<small class="hl" id="'+id+'-h">'+o.help+'</small>':'')+'<small class="er" aria-live="polite" id="'+id+'-e" data-msg="'+esc(er||'')+'"></small></div>'}
function ck(name,text,er,req){var id='f7-'+(++FID);return'<div class="ck"><input type="checkbox" id="'+id+'" name="'+name+'"'+(req?' required aria-describedby="'+id+'-e"':'')+'><label for="'+id+'">'+text+'</label>'+(er?'<small class="er" aria-live="polite" id="'+id+'-e" data-msg="'+esc(er)+'"></small>':'')+'</div>'}
function sel(name,opts,req){return'<select name="'+name+'"'+(req?' required':'')+'><option value="">Choose one</option>'+opts.map(function(o){return'<option>'+esc(o)+'</option>'}).join('')+'</select>'}
var HP='<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">'; /* honeypot: the API drops any post where it is filled */
function tb(t,attr){return'<button class="tbtn" type="button"'+(attr||'')+'>'+t+'</button>'}
/* the photo beside a form: same height as the card, photo over-sized so its parallax never shows an edge; on phones a short banner above the form */
function fph(n,alt,pos,cap){return'<figure class="fph" data-v7p="5">'+img(n,alt,pos,'(max-width:900px) 100vw, 1400px') /* images agent B: the tall card draws a 3:2 photo about 1000-1400 px wide on desktop (cover + parallax), so ask for the 1600 file, not the 800 one */+(cap?'<figcaption>'+cap+'</figcaption>':'')+'</figure>'}
function done(h,p,acts){return'<div class="done" role="status" tabindex="-1"><p class="eyebrow">Thank you</p><h3>'+h+'</h3><p data-sent>'+p+' <span class="smp">Preview: nothing was sent</span></p>'+(acts?'<div class="btns">'+acts+'</div>':'')+'</div>'}
/* office map (sweep v8.7 M2/M3, js/components/office-map.js): opens on the whole of Nepal with the Dolphin logo marker at Baneshwor; the marker, a double click or
   "Zoom to Baneshwor" fly in to street level, "Back to Nepal" flies out; the card's own round zoom buttons; never traps the page scroll (wheel only after
   a click or focus, Google 'cooperative' gestures; on touch screens the Leaflet map waits for "Tap to move the map"). */
function mapCard(){var o=DX.office||{address:'New Baneshwor, Kathmandu'};
 return'<div class="mapc"><div class="mapc-f"><p class="mapc-ph" aria-hidden="true">'+esc(o.address)+'</p><div class="mapc-m" role="region" aria-label="Map of Nepal with the Dolphin Education office in '+esc(o.address)+'. Arrow keys move the map, plus and minus zoom."></div>'
 +'<div class="mapc-zm"><button class="mapc-zb" type="button" data-zoom="in" aria-label="Zoom in" disabled>+</button><button class="mapc-zb" type="button" data-zoom="out" aria-label="Zoom out" disabled>&minus;</button></div>'
 +'<div class="mapc-ui"><button class="btn btn-sm btn-p" type="button" data-fly="in" disabled><span>Zoom to New Baneshwor</span>'+AR+'</button><button class="btn btn-sm btn-p" type="button" data-fly="out" hidden><span>Back to Nepal</span></button></div><button class="mapc-t" type="button"><span>Tap to move the map</span></button></div></div>'}
function mapLinks(){var o=DX.office||{lat:27.6915,lng:85.342},q=o.lat+','+o.lng;
 return btn('Get directions','https://www.google.com/maps/dir/?api=1&amp;destination='+q,'btn-p',true)+btn('Open in Google Maps','https://www.google.com/maps/search/?api=1&amp;query='+q,'btn-g',true)}
var VL={student:'Student',parent:'Parent',university:'University'};
/* ======================= STORIES ======================= */
/* sweep v8.17: the wall opens on partner universities (large typographic feature rows, DX.uniFeature), then portrait cards (DX.storyCard) for parents and students.
   Filter order Universities, Students, Parents, All; 'All' shows three university rows, then the parents, then three students (data-a). No counts. */
/* 2026-10-31 real content pass: the wall shows the REAL reviews published on dolphin.edu.np (data.js), filtered by destination or preparation classes.
   The invented university quotes are gone (user: never an invented quote under a real institution's name). No counts. */
var WF=[['all','All'],['new-zealand','New Zealand'],['australia','Australia'],['united-kingdom','United Kingdom'],['test','Test preparation']];
var BAND=[1,2,3,4,12]; /* short reviews for the scroll band: New Zealand, Australia, UK, preparation classes, New Zealand */
function wrapW(html,tags){return html.replace(/^<figure class="/,'<figure data-t="'+esc((tags||[]).join(' '))+'" class="')}
function stories(){var all=DX.voices({voice:'student'}),band=BAND.map(function(id){return all.filter(function(x){return x.id===id})[0]}).filter(Boolean);
 return hero('Stories',L('Told in their','<em>own words.</em>'),'Reviews that students have published on Dolphin Education&rsquo;s own site: counselling, visas and preparation classes, in their words.','Share your story','#share','b-grad-sea','66% 55%')
 +'<section class="vbs on-dark" id="voices" aria-labelledby="fsH"><p class="eyebrow st-eb" id="fsH">What our students say</p>'+DX.voiceBand(band,{id:'vbStories',label:'What our students say'})+'</section>'
 +'<section class="sec white z sw" id="wall" aria-labelledby="wH"><div class="wrap"><div class="sh sw-h"><div><p class="eyebrow">Student reviews</p><h2 id="wH">Students, <em>in their words.</em></h2></div><div class="seg" role="group" aria-label="Show reviews about">'+WF.map(function(f){return'<button class="seg-b" type="button" data-v="'+f[0]+'" aria-pressed="'+(f[0]==='all')+'">'+f[1]+'</button>'}).join('')+'</div></div><p class="vh" id="wlS" role="status" aria-live="polite"></p>'
 +'<div class="tc-g sw-p" id="wl">'+all.map(function(s){return wrapW(DX.storyCard(s),s.tags)}).join('')+'</div></div></section>'
 +'<section class="sec soft z" id="partners" aria-labelledby="pH"><div class="wrap zi"><div class="sh"><div><p class="eyebrow" id="pH">Partner universities</p><h2>Institutions in <em>five countries.</em></h2></div><p>In New Zealand, the universities, private institutions and polytechnics Dolphin proudly represents. In the other countries, institutions Dolphin works with.</p></div>'+DX.partnerWall()+'</div></section>'
 +'<section class="sec white z" id="share" aria-labelledby="shH"><div class="wrap zi fsplit"><div class="frm" id="shF"><p class="eyebrow" id="shH">Share your story</p><h2 class="frm-t">Three short steps.</h2><p class="frm-l">A few lines about what happened and what helped. Nothing is published until you say yes.</p><form novalidate id="shForm" data-api="/api/forms/share-story">'+HP
 +'<ol class="wst" aria-label="Progress"><li aria-current="step">About you</li><li>Your story</li><li>Consent</li></ol>'
 +'<div data-step="1" aria-label="About you" role="group">'+fld('First name','<input name="name" required autocomplete="given-name">','Please add your first name.',{help:'Only your first name is ever shown.'})+'<div class="r2">'+fld('You are',sel('role',['A student','A parent','University staff'],true),'Please choose one.')+fld('Country',sel('country',DX.C.map(function(c){return c.name}).concat(['Other']),true),'Please choose a country.')+'</div><div class="fb7"><span></span>'+bt('Continue','button','btn-p','data-next')+'</div></div>'
 +'<div data-step="2" aria-label="Your story" role="group" hidden>'+fld('In your words','<textarea name="story" required data-min="40" maxlength="3000" placeholder="What happened, and what helped?"></textarea>','Please write a few sentences (at least 40 characters).',{help:'At least 40 characters. Plain words are best.'})+fld('Year',sel('year',['2026','2025','2024','2023'],true),'Please choose a year.')+'<div class="fb7">'+tb('Back',' data-back')+bt('Continue','button','btn-p','data-next')+'</div></div>'
 +'<div data-step="3" aria-label="Consent" role="group" hidden>'+ck('consent','Dolphin may publish this story with my first name, country and year. I can withdraw it at any time.','Consent is needed before anything can be published.',true)+ck('photo','Dolphin may contact me about adding a photo.')+'<p class="note">A counsellor confirms with you before anything appears on the site.</p><p class="fe" role="alert"></p><div class="fb7">'+tb('Back',' data-back')+bt('Send my story','submit','btn-a')+'</div></div>'
 +'</form>'+done('Received.','A counsellor will confirm with you before anything is published.',btn('Read more stories','#wall','btn-g'))+'</div>'+fph('students-notes','Students writing notes together','50% 50%','Your story helps the next family decide.')+'</div></section>'
 +closing('Your story <em>could be next.</em>','One free conversation in New Baneshwor, or on the phone. A counsellor calls you back.','b-grads-sunset','50% 45%','Book free counselling','contact.html#book')}
/* ======================= UNIVERSITIES ======================= */
var ADJ={'usa':'American','united-kingdom':'British','canada':'Canadian','australia':'Australian','new-zealand':'New Zealand'};
/* 2026-10-31 real content pass: New Zealand first (Dolphin's own positioning), grouped as on Dolphin's "We proudly represent" list; the other countries keep
   the institutions listed before. No count in the headline (house rule). */
function cell(p){var sm=DX.logoSmall(p);return'<button class="uc'+(sm?' uc-n':'')+'" type="button" data-u="'+DX.P.indexOf(p)+'">'+(sm?'<b>'+esc(DX.shortName(p))+'</b>':DX.logoImg(p,'')+'<span>'+esc(p.name)+'</span>')+'</button>'}
/* the institutions by country (#ug); also re-rendered when the store's list changes (js/core/site-live.js) */
function ugBody(){var C=DX.C.filter(function(c){return c.slug==='new-zealand'}).concat(DX.C.filter(function(c){return c.slug!=='new-zealand'})),G=DX.PGRP||{};
 return C.map(function(c){var l=DX.P.filter(function(p){return p.country===c.slug});var v=DX.voices({voice:'student',country:c.slug})[0];var grp=l.some(function(p){return p.grp});
  var body=!l.length?'<p class="none7">No institution listed for '+esc(c.name)+' yet. Your counsellor still applies to any '+ADJ[c.slug]+' institution that fits you.</p>'
   :grp?'<p class="ug-n">We proudly represent</p>'+['u','p','i'].map(function(g){var s=l.filter(function(p){return p.grp===g});return s.length?'<h4 class="ug-g">'+esc(G[g]||'')+'</h4><div class="cells">'+s.map(cell).join('')+'</div>':''}).join('')
   :'<div class="cells">'+l.map(cell).join('')+'</div>';
  return'<div class="ugp" data-c="'+c.slug+'"><div class="gh"><h3>'+esc(c.name)+'</h3><a href="country.html?c='+c.slug+'">Studying in '+esc(c.name)+'</a></div>'+body+(v?'<div class="ug-v">'+DX.voiceCard(v)+'</div>':'')+'</div>'}).join('')}
function unis(){var C=DX.C.filter(function(c){return c.slug==='new-zealand'}).concat(DX.C.filter(function(c){return c.slug!=='new-zealand'}));
 return hero('Partner universities',L('Institutions we','<em>represent.</em>'),'In New Zealand, the universities, private institutions and polytechnics Dolphin proudly represents; in four more countries, institutions we work with. Your counsellor shortlists and applies on your behalf.','See the institutions','#grid','uni-greenwich','50% 42%') /* universities images pass 2026-10-31: real campus (Old Royal Naval College, Greenwich: University of Greenwich, NOT a Dolphin partner; see img/CREDITS.md), was a public library */
 +'<section class="sec soft z" id="means" aria-labelledby="mH"><div class="wrap zi mn-g"><div><p class="eyebrow">What partner means</p><h2 id="mH">A direct line, <em>not a limit.</em></h2></div><ul class="pr7"><li><i>New Zealand first</i><b>If it&rsquo;s New Zealand, it is Dolphin</b><span>Dolphin was Nepal&rsquo;s first education consultancy to start Study in New Zealand.</span></li><li><i>Your options</i><b>Any university</b><span>We also apply to institutions that are not listed here, when they fit you.</span></li><li><i>Your shortlist</i><b>No list games</b><span>Your shortlist follows your marks and budget, not our partnerships.</span></li></ul></div></section>'
 +'<section class="sec white" id="grid" aria-labelledby="gH"><div class="wrap"><div class="sh"><div><p class="eyebrow">Institutions</p><h2 id="gH">By <em>country.</em></h2></div><div class="pills" role="group" aria-label="Filter by country"><button class="pill" type="button" data-c="all" aria-pressed="true">All</button>'+C.map(function(c){return'<button class="pill" type="button" data-c="'+c.slug+'" aria-pressed="false">'+esc(c.name)+'</button>'}).join('')+'</div></div><div class="ug7" id="ug" aria-live="polite">'
 +ugBody()
 +'</div></div></section>'
 +closing('Not sure <em>which one?</em>','One free conversation and a short, honest shortlist. A counsellor in New Baneshwor calls you back.','uni-melb-cloister','50% 60%','Book free counselling','contact.html#book')
 +'<div class="dr" id="dr" data-lenis-prevent><div class="dr-bg" data-x></div><div class="dr-p" role="dialog" aria-modal="true" aria-labelledby="drT" tabindex="-1"><button class="dr-x" type="button" data-x aria-label="Close">&#10005;</button><div class="dr-l" id="drL"></div><h3 id="drT"></h3><p class="m" id="drM"></p><dl id="drD"></dl><div id="drV"></div><div class="btns">'+btn('Ask about this university','contact.html#book')+'<a class="btn btn-g" id="drC" href="#"><span>Studying there</span>'+AR+'</a></div></div></div>'}
/* ======================= ABOUT ======================= */
var TEAM=DX.team||[]; /* real counsellors (ECANZ licence cards on dolphin.edu.np), text only: no portraits exist and no stock face is used for a real person */
function teamItems(){return TEAM.map(function(t){return'<li><b>'+esc(t[0])+'</b><span>'+esc(t[1])+'</span>'+(t[2]?'<small>ECANZ licence <span>'+esc(t[2])+'</span></small>':'')+'</li>'}).join('')}
var HOW=[['Listen','You and your family sit down with one counsellor. Marks, budget and hopes, in plain words.','b-family-consult','42% 42%'],['Apply','A short, honest shortlist. We prepare every application and the visa file with you.','apply-laptop','50% 40%'],['Depart','Pre-departure briefing, airport day, and a counsellor still on the phone after you land.','airport-sunlit','50% 55%']];
function about(){
 return hero('About Dolphin',L('If it&rsquo;s New Zealand,','it is <em>Dolphin.</em>'),'Study-abroad counselling from New Baneshwor, Kathmandu, since 2007, for New Zealand, Australia, the UK, the USA and Canada.','Visit us','#visit','np-boudha-sunrise','50% 50%')
 +'<section class="sec soft z" id="story" aria-labelledby="sH"><div class="wrap zi split rev"><div class="ab-t"><p class="eyebrow">Our story</p><h2 id="sH" style="margin-bottom:24px">Honest advice, <em>one family at a time.</em></h2><p>Since 2007, Dolphin Education has counselled students and families from its head office in New Baneshwor, Kathmandu, with offices in Pokhara and Biratnagar, for five countries: New Zealand, Australia, the United Kingdom, the USA and Canada.</p><p>Dolphin was the first education consultancy in Nepal to introduce and officially promote Study in New Zealand, and it organised Nepal&rsquo;s first Study in New Zealand Fair, in collaboration with Immigration New Zealand, Education New Zealand and ITPs/Te Pūkenga.</p><p>Each student has one counsellor from the first meeting to the airport. Costs are written on one page before any university is chosen, and parents are welcome in every conversation.</p><dl class="dl7"><div><dt>Founded</dt><dd>2007</dd></div><div><dt>Offices</dt><dd>New Baneshwor, Kathmandu (head office), Pokhara, Biratnagar</dd></div><div><dt>Countries</dt><dd>New Zealand, Australia, UK, USA, Canada</dd></div><div><dt>Licensed counsellors</dt><dd>Five New Zealand Licensed Education Counsellors (ECANZ)</dd></div></dl></div><figure data-v7p="6">'+img('dx-p-nz-campus','A Dolphin visitor with three students on a campus lawn in New Zealand','50% 55%','(max-width:900px) 100vw, 60vw')+'</figure></div></section>'
 +'<section class="sec band-n on-dark" id="journey" aria-labelledby="jH"><div class="wrap stk-g"><div class="stk-s"><p class="eyebrow">How counselling works</p><h2 id="jH">Three steps, <em>one counsellor.</em></h2><p class="lead">The same person from the first call to the visa. Nothing is sent before you have seen it.</p></div><ol class="stk-l">'+HOW.map(function(h,i){return'<li class="stk-c" style="--i:'+i+'"><figure>'+img(h[2],'',h[3],'(max-width:900px) 100vw, 60vw')+'</figure><div><span class="stk-n">'+['Step one','Step two','Step three'][i]+'</span><h3>'+h[0]+'</h3><p>'+h[1]+'</p></div></li>'}).join('')+'</ol></div></section>'
 +'<section class="sec white z" id="team" aria-labelledby="tH"><div class="wrap zi"><div class="sh"><div><p class="eyebrow">Counsellors</p><h2 id="tH">Licensed for <em>New Zealand.</em></h2></div><p>Five Dolphin counsellors hold New Zealand Licensed Education Counsellor cards issued by the Education Counsellor Authority of New Zealand (ECANZ), valid to July 2027.</p></div><ul class="tm7">'+teamItems()+'</ul><p class="tm7-v"><a href="https://www.ecanz.org/" target="_blank" rel="noopener">Verify a licence on ECANZ</a></p></div></section>'
 +'<section class="sec soft z pm7" id="promise" aria-labelledby="pmH"><div class="wrap zi pm-grid"><div class="pm-t"><p class="eyebrow" id="pmH">Our promise</p><h2 class="stmt">Plain costs, one counsellor, and <em>a straight answer,</em> <span class="stmt-u">even when the answer is no.</span></h2><p class="lead">If a country or a course is wrong for you, we say so before you spend anything.</p></div><figure class="pm-logo"><img src="img/logo.png" width="900" height="224" alt="Dolphin Education" loading="lazy" decoding="async"><figcaption>Study-abroad counselling<br>New Baneshwor, Kathmandu</figcaption></figure></div></section>'
 +'<section class="sec white z" id="visit" aria-labelledby="vH"><div class="wrap zi mp7">'+mapCard()+'<div><p class="eyebrow">Visit us</p><h2 id="vH">Our offices. <em>Walk in.</em></h2><dl class="dl7"><div><dt>Head office</dt><dd><span>'+esc(DX.office?DX.office.address:'New Baneshwor, Kathmandu')+'</span> <span class="smp">Exact pin to confirm</span></dd></div>'+offRows()+'<div><dt>Phone</dt><dd><a href="tel:'+CT.tel+'">'+TEL+'</a><a href="tel:'+esc(CT.tel2||'')+'">'+esc(CT.phone2||'')+'</a></dd></div><div><dt>Mobile</dt><dd><a href="tel:'+esc(CT.mtel||'')+'">'+esc(CT.mobile||'')+'</a><a href="tel:'+esc(CT.mtel2||'')+'">'+esc(CT.mobile2||'')+'</a></dd></div><div><dt>Email</dt><dd><a href="mailto:'+esc(CT.email)+'">'+esc(CT.email)+'</a></dd></div><div><dt>Hours</dt><dd class="cf">'+esc(HRS)+'</dd></div></dl><div class="btns" style="margin-top:32px">'+mapLinks()+'</div>'+socLinks()+'</div></div></section>'
 +closing('One conversation. <em>Then a plan.</em>','Free, in New Baneshwor or on the phone. A counsellor calls you back.','b-wing-dusk','50% 50%','Book free counselling','contact.html#book')}
/* sweep v8.7 M2/M3: the office map lives in js/components/office-map.js (Google Maps when the server has a key, else self-hosted Leaflet + OpenStreetMap).
   That file loads only when a card is within 1500 px of the viewport; nothing here blocks rendering. Until the map draws, the card shows the address. */
var OMP=null;function officeMap(){if(DX.officeMap)return Promise.resolve(DX.officeMap);if(OMP)return OMP;
 OMP=new Promise(function(res,rej){var s=D.createElement('script');s.src='js/components/office-map.js';s.async=true;s.onload=function(){DX.officeMap?res(DX.officeMap):rej()};s.onerror=rej;D.head.appendChild(s)});return OMP}
function wireMaps(){$$('.mapc').forEach(function(m){if(!$('.mapc-m',m)||!DX.office)return;
 var go=function(){officeMap().then(function(M){M.mount(m)}).catch(function(){m.classList.add('nomap')})};
 if(W.IntersectionObserver){var io=new IntersectionObserver(function(es){if(es[0].isIntersecting){io.disconnect();go()}},{rootMargin:'1500px 0px'});io.observe(m)}else go()})}
/* ======================= CONTACT ======================= */
/* sweep v8.7 (HANDOFF 1d/1e): booking, support (WhatsApp, phone, email), the real map, Ask Dolphin (a search over published answers, NOT an AI),
   franchise, then a full-screen closing scene under one light scrim. Phone, email, hours and the pin come from DX.contact / DX.office (data.js). */
function spRow(h,v,s,act){return'<li><div><h3>'+h+'</h3><p class="v">'+v+'</p><p class="s">'+s+'</p></div>'+act+'</li>'}
function contact(){var H=DX.help||[];
 return hero('Contact',L('Talk to a','<em>counsellor.</em>'),'Free, in New Baneshwor or on the phone. Tell us a little and a counsellor calls you back.','Book free counselling','#book','advisor-office','62% 45%')
 +'<section class="sec soft z" id="book" aria-labelledby="bH"><div class="wrap zi fsplit ph-l">'+fph('b-family-table','Parents and their son at a table with papers, ready to talk it through, illustrative photography','35% 32%','Bring your parents. There is room at the table.')+'<div class="frm" id="bkF"><p class="eyebrow" id="bH">Book free counselling</p><h2 class="frm-t">Tell us a little.</h2><p class="frm-l">A counsellor calls you back to find a time that suits your family.</p><form novalidate id="bkForm" data-api="/api/forms/booking">'+HP
 +'<div class="r2">'+fld('Name','<input name="name" required autocomplete="name">','Please add your name.')+fld('Phone or WhatsApp','<input name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="+977">','Please add a number we can reach, with the country code.',{help:'With the country code, for example +977.'})+'</div>'
 +'<div class="r2">'+fld('Country of interest',sel('country',DX.C.map(function(c){return c.name}).concat(['Not sure yet']),true),'Please choose one.')+fld('Level',sel('level',['Bachelor','Master','Diploma or pathway','Other'],true),'Please choose a level.')+'</div>'
 +fld('Message','<textarea name="msg" maxlength="2000" placeholder="Course, budget, intake, anything on your mind"></textarea>','',{opt:true})
 +ck('consent','Dolphin may call or message me about this enquiry.','Please tick this so we can contact you.',true)
 +'<p class="fe" role="alert"></p><div class="fb7"><p class="note">A counsellor replies within one working day <span class="smp">To confirm</span></p>'+bt('Request a call back','submit','btn-a')+'</div></form>'
 +done('Received.','A counsellor will call you back.',btn('WhatsApp us instead',WA,'btn-g',true))+'</div></div></section>'
 +'<section class="sec white z" id="support" aria-labelledby="spH"><div class="wrap zi sp7"><div class="sp7-t"><p class="eyebrow">Support</p><h2 id="spH">Message us. <em>Any time.</em></h2><p class="lead">Message us any time on WhatsApp; a counsellor replies in office hours.</p><p class="sp7-n">'+esc(HRS)+'.</p><div class="btns sp7-b"><button class="btn btn-p" type="button" data-chat="assist"><span>Ask assistance</span>'+AR+'</button><button class="btn btn-g" type="button" data-chat="support"><span>Talk with support</span>'+AR+'</button></div></div><ul class="sp7-l">'
 +spRow('WhatsApp',esc(CT.mobile||TEL),'Write at any hour. A counsellor replies in office hours.',btn('Message on WhatsApp',WA,'btn-p',true))
 +spRow('Phone',TEL+(CT.phone2?' / '+esc(CT.phone2):''),'Landlines, in office hours. Mobile: '+esc(CT.mobile||'')+(CT.mobile2?' / '+esc(CT.mobile2):'')+'.',btn('Call us','tel:'+CT.tel,'btn-g'))
 +(CT.email?spRow('Email',esc(CT.email),'For documents and longer questions.',btn('Write to us','mailto:'+CT.email,'btn-g')):'')
 +'</ul>'+socLinks()+'</div></section>'
 +'<section class="sec soft z" id="visit" aria-labelledby="vH"><div class="wrap zi mp7 tx-l"><div><p class="eyebrow">Visit us</p><h2 id="vH">Head office in <em>New Baneshwor.</em></h2><dl class="dl7"><div><dt>Head office</dt><dd><span>'+esc(DX.office?DX.office.address:'New Baneshwor, Kathmandu')+'</span> <span class="smp">Exact pin to confirm</span></dd></div>'+offRows()+'<div><dt>Open</dt><dd class="cf">'+esc(HRS)+'</dd></div><div><dt>Phone</dt><dd><a href="tel:'+CT.tel+'">'+TEL+'</a>'+(CT.tel2?'<a href="tel:'+esc(CT.tel2)+'">'+esc(CT.phone2)+'</a>':'')+'</dd></div><div><dt>Mobile</dt><dd><a href="tel:'+esc(CT.mtel||'')+'">'+esc(CT.mobile||'')+'</a>'+(CT.mtel2?'<a href="tel:'+esc(CT.mtel2)+'">'+esc(CT.mobile2)+'</a>':'')+'</dd></div><div><dt>Email</dt><dd><a href="mailto:'+esc(CT.email)+'">'+esc(CT.email)+'</a></dd></div></dl><div class="btns" style="margin-top:32px">'+mapLinks()+'</div></div>'+mapCard()+'</div></section>'
 +'<section class="sec white z" id="help" aria-labelledby="hpH"><div class="wrap zi"><div class="sh"><div><p class="eyebrow">Ask Dolphin</p><h2 id="hpH">Ask Dolphin. <em>Quick answers.</em></h2></div><p>Search the answers we already publish, or pick a question. Answers come from facts we already publish, not from a person; for anything else, send us your question or talk with support.</p></div>'
 +'<div class="hp7"><div class="hp7-s"><form class="hp7-f" role="search" id="hpF"><label for="hpQ">Search the answers</label><div class="hp7-in"><input id="hpQ" type="search" autocomplete="off" placeholder="Try cost, IELTS, visa or documents" aria-controls="hpR"><button class="btn btn-p btn-sm" type="submit"><span>Search</span>'+AR+'</button></div></form>'
 +'<div class="hp7-q" role="group" aria-label="Suggested questions">'+[0,3,4,6,8,10].filter(function(i){return H[i]}).map(function(i){return'<button class="pill" type="button" data-h="'+i+'" aria-controls="hpR">'+esc(H[i].q)+'</button>'}).join('')+'</div>'
 +'<div class="hp7-r" id="hpR" aria-live="polite"></div></div>'
 +'<div class="frm" id="qF"><p class="eyebrow">Send us your question</p><h3 class="frm-t">Send us your question.</h3><form novalidate id="qForm" data-api="/api/forms/contact" data-kind="contact">'+HP
 +fld('Name','<input name="name" required autocomplete="name">','Please add your name.')
 +'<div class="r2">'+fld('Email','<input name="email" type="email" required autocomplete="email">','Please add a valid email.')+fld('Phone or WhatsApp','<input name="phone" type="tel" autocomplete="tel" inputmode="tel" placeholder="+977">','Please check the number, with the country code.',{opt:true})+'</div>'
 +fld('Your question','<textarea name="msg" required data-min="10" maxlength="3000" placeholder="Ask anything about studying abroad"></textarea>','Please write your question (at least 10 characters).')
 +'<p class="fe" role="alert"></p><div class="fb7"><p class="note">Replies in office hours <span class="smp">Hours to confirm</span></p>'+bt('Send question','submit','btn-a')+'</div></form>'
 +done('Received.','A counsellor will reply by email in office hours.')+'</div></div></div></section>'
 +'<section class="v7p cx7 on-dark z" id="next" aria-labelledby="cxH"><figure class="faint" aria-hidden="true">'+img('np-ktm-valley','','50% 50%')+'</figure><div class="wrap zi cx7-in"><h2 id="cxH">Walk in, <em>or write.</em></h2><div class="cx7-s"><p>Free counselling in New Baneshwor, with your family at the table. Or message us any time on WhatsApp.</p><div class="btns">'+btn('WhatsApp',WA,'btn-g',true)+'</div></div></div></section>'}
/* ======================= BEHAVIOUR ======================= */
function validate(scope,nf){var ok=true;(scope.matches&&scope.matches('.fld,.ck')?[scope]:$$('.fld,.ck',scope)).forEach(function(f){var i=$('input:not(.hp),select,textarea',f);if(!i)return;var v=(i.value||'').trim(),bad=false;
 if(i.type==='checkbox')bad=i.required&&!i.checked;else if(i.required&&!v)bad=true;else if(v&&i.dataset.min&&v.length<+i.dataset.min)bad=true;else if(v&&i.type==='tel'&&!/^\+?[\d][\d\s-]{6,}$/.test(v))bad=true;else if(v&&i.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))bad=true;
 f.classList.toggle('bad',bad);i.setAttribute('aria-invalid',bad);var e=$('.er',f);if(e)e.textContent=bad?(e.dataset.msg||''):'';if(bad&&ok){ok=false;if(!nf)i.focus()}});return ok}
function wireForms(){
 $$('.frm form').forEach(function(f){var box=f.parentNode;
  f.addEventListener('input',function(e){var w=e.target.closest('.fld,.ck');if(w&&w.classList.contains('bad'))validate(w,1)});
  f.addEventListener('change',function(e){var w=e.target.closest('.fld,.ck');if(w&&w.classList.contains('bad'))validate(w,1)});
  /* a field that was filled in and left is checked at once (a typo in an email shows before submit); empty fields wait for submit */
  f.addEventListener('focusout',function(e){var w=e.target.closest('.fld');if(w&&(e.target.value||'').trim())validate(w,1)});
  f.addEventListener('click',function(e){var b=e.target.closest('[data-next],[data-back]');if(!b)return;var cur=b.closest('[data-step]'),n=+cur.dataset.step+(b.hasAttribute('data-next')?1:-1);
   if(b.hasAttribute('data-next')&&!validate(cur))return;var nx=$('[data-step="'+n+'"]',f);if(!nx)return;cur.hidden=true;nx.hidden=false;$$('.wst li',f).forEach(function(li,k){var c=k+1===n;if(c)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');li.classList.toggle('dn',k+1<n)});var h=$('input:not(.hp),select,textarea',nx);if(h)h.focus({preventScroll:true});if(W.ScrollTrigger)W.ScrollTrigger.refresh()});
  f.addEventListener('submit',function(e){e.preventDefault();var steps=$$('[data-step]',f),scope=steps.length?steps.filter(function(s){return!s.hidden})[0]:f;if(!validate(scope))return;
   var ni=f.querySelector('[name=name]'),nm=(ni&&ni.value||'').trim(),fe=$('.fe',f),sb=$('button[type=submit]',scope)||$('button[type=submit]',f),API=W.DXAPI;
   function done(sent){var d=$('.done h3',box);if(d&&nm)d.textContent='Thank you, '+nm.split(' ')[0]+'.';var ps=$('.done [data-sent] .smp',box);if(ps)ps.style.display=sent?'none':'';box.classList.add('ok');var dn=$('.done',box);dn.tabIndex=-1;dn.focus();if(W.ScrollTrigger)W.ScrollTrigger.refresh()}
   function fail(m){if(fe){fe.textContent=m;fe.classList.add('on')}}
   if(fe){fe.textContent='';fe.classList.remove('on')}
   /* POST to the API when it is there; a static preview (no server) falls back to the old prototype confirmation */
   if(!API||!f.dataset.api||f.dataset.busy){if(!f.dataset.busy)done(false);return}
   /* the honeypot travels only when a bot filled it (formData drops empty fields); the API then answers 200 and stores nothing */
   var data=API.formData(f);if(f.dataset.kind)data.kind=f.dataset.kind;f.dataset.busy='1';API.busy(sb,true);
   API.post(f.dataset.api,data).then(function(r){delete f.dataset.busy;API.busy(sb,false);
    if(r.ok){done(true);return}
    if(r.status===400&&r.body&&r.body.details){if(!API.showErrors(f,r.body.details))fail(r.body.error||'Please check the form.');var bad=$('.bad',f),st=bad&&bad.closest('[data-step]');if(st&&st.hidden){steps.forEach(function(x){x.hidden=x!==st});$$('.wst li',f).forEach(function(li,k){var c=String(k+1)===st.dataset.step;if(c)li.setAttribute('aria-current','step');else li.removeAttribute('aria-current');li.classList.toggle('dn',k+1<+st.dataset.step)})}return}
    fail(r.body&&r.body.error?r.body.error:'We could not send this just now. Please try again or call us.')})
   .catch(function(){delete f.dataset.busy;API.busy(sb,false);done(false)})})})}
/* Ask Dolphin (contact, sweep v8.7): a keyword search over DX.help. NOT an AI and not a live chat: it only returns answers written in data.js
   from facts this site already publishes. No match -> the visitor's words go into the "Send us your question" form (posts /api/forms/contact). */
var STOP=['the','and','for','what','how','can','does','will','with','you','your','are','from','this','that','have','there','about','dolphin','want','need','study','abroad','much','any','who','why'];
/* coordination 2026-10-30: the global chat (js/components/chat.js, another agent) exposes window.DolphinChat.open('assist'|'support'); the two contact buttons use it
   when it is there, else they fall back to this page: Ask assistance -> the Ask Dolphin search, Talk with support -> the support block. No second launcher. */
function wireChatBtns(){$$('[data-chat]').forEach(function(b){b.addEventListener('click',function(){var m=b.dataset.chat,C=W.DolphinChat;
 if(C&&typeof C.open==='function'){try{C.open(m);return}catch(e){}}
 var t=$(m==='assist'?'#help':'#support');if(!t)return;if(DX.scrollTo)DX.scrollTo(t);else t.scrollIntoView();
 if(m==='assist'){var q=$('#hpQ');if(q)setTimeout(function(){q.focus({preventScroll:true})},800)}})})}
function wireHelp(){wireChatBtns();var F=$('#hpF'),R=$('#hpR'),Q=$('#hpQ'),H=DX.help||[];if(!F||!R||!Q)return;
 var norm=function(s){return String(s).toLowerCase().replace(/[^a-z0-9$£\- ]+/g,' ')};
 var idx=H.map(function(h){return{q:norm(h.q),k:' '+norm(h.k||'')+' ',a:norm(h.a+' '+(h.list||[]).join(' '))}});
 function find(t){var w=norm(t).split(/\s+/).filter(function(x){return x.length>1&&STOP.indexOf(x)<0}).map(function(x){return x.length>4?x.replace(/s$/,''):x});
  return H.map(function(h,i){var s=0,x=idx[i];w.forEach(function(v){if(x.k.indexOf(' '+v)>-1)s+=3;if(x.q.indexOf(v)>-1)s+=2;if(v.length>2&&x.a.indexOf(v)>-1)s+=1});return{i:i,s:s}})
   .filter(function(r){return r.s>1}).sort(function(a,b){return b.s-a.s}).slice(0,3).map(function(r){return r.i})}
 function card(i){var h=H[i];return'<article class="hp7-a"><h3>'+esc(h.q)+'</h3><p>'+esc(h.a)+'</p>'+(h.list?'<ul>'+h.list.map(function(l){return'<li>'+esc(l)+'</li>'}).join('')+'</ul>':'')+(h.go?'<a class="hp7-go" href="'+h.go[1]+'">'+esc(h.go[0])+' '+AR+'</a>':'')+'</article>'}
 function show(list,t){$$('[data-h]').forEach(function(x){x.setAttribute('aria-pressed',list.length===1&&+x.dataset.h===list[0]&&!t?'true':'false')});
  if(!list.length){var m=$('#qForm textarea[name=msg]');if(m&&t&&!m.value.trim())m.value=t;
   R.innerHTML='<div class="hp7-a hp7-no"><h3>No published answer for that yet.</h3><p>Send it to us and a counsellor replies in office hours. Your words are already in the form.</p><a class="hp7-go" href="#qF">Send us your question '+AR+'</a></div>'}
  else R.innerHTML=(t?'<p class="hp7-c">Closest answers for &ldquo;'+esc(t)+'&rdquo;</p>':'')+list.map(card).join('');
  if(W.ScrollTrigger)W.ScrollTrigger.refresh()}
 F.addEventListener('submit',function(e){e.preventDefault();var t=Q.value.trim();if(!t){R.innerHTML='';return}show(find(t),t)});
 var tm;Q.addEventListener('input',function(){clearTimeout(tm);tm=setTimeout(function(){var t=Q.value.trim();if(t.length<3)return;var l=find(t);if(l.length)show(l,t)},300)});
 $$('[data-h]').forEach(function(b){b.addEventListener('click',function(){show([+b.dataset.h])})});
 R.addEventListener('click',function(e){var a=e.target.closest('a[href^="#"]');if(!a)return;var t=$(a.getAttribute('href'));if(!t)return;e.preventDefault();if(DX.scrollTo)DX.scrollTo(t);else t.scrollIntoView();
  if(a.getAttribute('href')==='#qF'){var m=$('#qForm input[name=name]');if(m)setTimeout(function(){m.focus({preventScroll:true})},700)}})}
/* sweep v8.17: segmented filter. The active control keeps its place on screen (no jump when the list gets shorter), the newly shown items rise once
   (16 px, 600 ms expo.out, .06 s stagger; static with reduced motion), a short polite status names the view, arrow keys move between the four buttons. */
function wireStories(){var wall=$('#wall');if(!wall||!$('.seg',wall))return;var bs=$$('.seg-b',wall),items=$$('#wl>figure',wall),st=$('#wlS',wall),
 N={all:'Showing all reviews.','new-zealand':'Showing reviews about New Zealand.',australia:'Showing reviews about Australia.','united-kingdom':'Showing reviews about the United Kingdom.',test:'Showing reviews about preparation classes.'};
 function apply(b){var v=b.dataset.v,y0=b.getBoundingClientRect().top,shown=[],uf=false;
  items.forEach(function(f){var on=v==='all'||(' '+(f.dataset.t||'')+' ').indexOf(' '+v+' ')>-1;if(on&&f.hidden){shown.push(f);if(f.classList.contains('uf'))uf=true}f.hidden=!on});
  bs.forEach(function(x){x.setAttribute('aria-pressed',x===b)});if(st)st.textContent=N[v]||'';
  var dy=b.getBoundingClientRect().top-y0;if(Math.abs(dy)>1){if(W.__lenis)W.__lenis.scrollTo(W.scrollY+dy,{immediate:true,force:true});else W.scrollBy(0,dy)}
  if(uf)W.dispatchEvent(new Event('resize')); /* quotes split while hidden re-measure their lines (site.js re-splits on a width change) */
  if(W.ScrollTrigger)W.ScrollTrigger.refresh();
  var G=W.gsap;if(G&&!rm&&shown.length){shown.forEach(function(f){f._rvl=f._rvd=1;var q=$('.uf-q p',f);if(q&&q._sl&&!q._rv){q._rv=1;G.set(q,{'--rv':1})}});
   G.fromTo(shown,{y:16,opacity:0},{y:0,opacity:1,duration:1.1,ease:'power3.out',stagger:.06,overwrite:true,clearProps:'transform,opacity'})}}
 bs.forEach(function(b,i){b.addEventListener('click',function(){if(b.getAttribute('aria-pressed')!=='true')apply(b)});
  b.addEventListener('keydown',function(e){var k=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!k)return;e.preventDefault();bs[(i+k+bs.length)%bs.length].focus()})})}
function wireUnis(){var ug=$('#ug'),dr=$('#dr');if(!ug||!dr)return;var opener=null,pane=$('.dr-p',dr);
 $$('.pills .pill').forEach(function(p){p.onclick=function(){var c=p.dataset.c;$$('.pills .pill').forEach(function(x){x.setAttribute('aria-pressed',x===p)});$$('.ugp',ug).forEach(function(g){g.hidden=c!=='all'&&g.dataset.c!==c});if(W.ScrollTrigger)W.ScrollTrigger.refresh()}});
 function close(){dr.classList.remove('open');DX.lock(false);if(opener)opener.focus()}
 function open(i){var p=DX.P[i],cn=DX.cn(p.country),cs=DX.courses.filter(function(c){return c.u===i});
  $('#drL').innerHTML=DX.logoSmall(p)?'<b>'+esc(DX.shortName(p))+'</b>':DX.logoImg(p,'');$('#drT').textContent=p.name;$('#drM').textContent=cn+(p.grp?' · Dolphin proudly represents':'');
  $('#drD').innerHTML=(p.grp&&DX.PGRP?'<div><dt>Type</dt><dd>'+esc({u:'University',p:'Private institution',i:'Polytechnic or institute of technology'}[p.grp]||'')+'</dd></div>':'')+'<div><dt>Courses</dt><dd>Ask your counsellor</dd></div><div><dt>Fees and intakes</dt><dd>Confirm with your counsellor</dd></div>';
  $('#drV').innerHTML='';
  $('#drC').href='country.html?c='+p.country;dr.classList.add('open');DX.lock(true);setTimeout(function(){pane.focus()},60)}
 ug.addEventListener('click',function(e){var b=e.target.closest('.uc');if(!b)return;opener=b;open(+b.dataset.u)});
 dr.addEventListener('click',function(e){if(e.target.closest('[data-x]'))close()});
 dr.addEventListener('keydown',function(e){if(e.key==='Escape'){close();return}if(e.key!=='Tab')return;var f=$$('button,a[href],[tabindex="0"]',pane).filter(function(x){return x.offsetParent!==null});if(!f.length)return;var a=f[0],z=f[f.length-1];
  if(e.shiftKey&&(D.activeElement===a||D.activeElement===pane)){e.preventDefault();z.focus()}else if(!e.shiftKey&&D.activeElement===z){e.preventDefault();a.focus()}})}
/* split text nodes into word spans; wrap=true adds an overflow mask for line-mask reveals */
function words(el,wrap){if(!el||el.dataset.sp)return;el.dataset.sp=1;(function walk(n){[].slice.call(n.childNodes).forEach(function(c){
 if(c.nodeType===3){if(!c.textContent.trim())return;var f=D.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(p){if(!p)return;if(/^\s+$/.test(p)){f.appendChild(D.createTextNode(' '));return}var w=D.createElement('span');w.className='wd';w.textContent=p;if(wrap){var m=D.createElement('span');m.className='qw';m.appendChild(w);f.appendChild(m)}else f.appendChild(w)});n.replaceChild(f,c)}
 else if(c.nodeType===1)walk(c)})})(el)}
var userScrolled=false;['wheel','touchstart','keydown'].forEach(function(ev){W.addEventListener(ev,function(){userScrolled=true},{passive:true})});
function hashJump(){var h=location.hash;if(!h||h.length<2)return;var t;try{t=$(h)}catch(e){}if(!t)return;var y=t.getBoundingClientRect().top+W.scrollY;W.scrollTo(0,y);if(W.__lenis)W.__lenis.scrollTo(y,{immediate:true,force:true})}
/* ======================= MOTION ======================= */
function build(){var G=W.gsap,ST=W.ScrollTrigger;G.registerPlugin(ST);
 var touch=!matchMedia('(hover:hover) and (pointer:fine)').matches;
 ST.config({ignoreMobileResize:true});
 /* sweep v8.6 (scroll audit): no normalizeScroll (touch is the browser's own scroll), every scrub exact (SCR = true): no lag after the page stops, any pixel is a valid rest */
 var SCR=true;
 D.documentElement.classList.add('pv7');
 /* 1. hero: line-mask reveal, photo settles, then zoom-through while pinned without spacing (the next scene slides over it) */
 /* sweep v8.12: the intro (lines, copy, photo settle) is CSS (site.css html.intro, once per page per session); the hero copy now lifts out as a scrubbed part
    of the pin (a pure function of the scroll: it used to play on time and replay in reverse whenever the visitor scrolled back past 6 %) */
 var tl=G.timeline({scrollTrigger:{trigger:'#top',start:'top top',end:'+=100%',pin:true,pinSpacing:false,scrub:SCR,anticipatePin:1,invalidateOnRefresh:true}});
 tl.to('#hbg',{scale:1.4,ease:'power3.inOut'},0).to('#hbg',{opacity:.15,ease:'power2.in'},.3).to('#hc',{yPercent:-10,opacity:0,ease:'power1.in',duration:.35},0);
 /* 2. arrival: the scene's copy lifts in (translate and opacity only, so text stays crisp); its photographs settle from 1.08 to 1 */
 $$('.z .zi').forEach(function(e){if(DX.reveal)DX.reveal([e],{start:'top 92%'});
  /* sweep v8.13: the photographs' own entrance (1.08 -> 1, clip reveal, once) is js/core/imgfx.js DX.imgMotion, the same on every page */});
 /* 2b. section headings rise line by line through masks as they come up (site.js DX.riseLines); fully lit at rest, never dimmed */
 $$('.sh h2,.mn-g h2,.fr7-t h2,.stk-s h2,.v7p h2').forEach(function(h){if(DX.riseLines)DX.riseLines(h)});
 /* 3. layered parallax: figures with data-v7p, full-bleed scene photos */
 $$('[data-v7p]').forEach(function(e){var s=parseFloat(e.dataset.v7p)||6;G.fromTo($('img',e)||e,{yPercent:-s},{yPercent:s,ease:'none',scrollTrigger:{trigger:e.closest('section')||e.parentNode,start:'top bottom',end:'bottom top',scrub:true}})});
 $$('.v7p>figure img').forEach(function(e){G.fromTo(e,{yPercent:-4},{yPercent:4,ease:'none',scrollTrigger:{trigger:e.closest('section'),start:'top bottom',end:'bottom top',scrub:true}})});
 /* 4. featured university voice (sweep v8.5): the band is pinned one screen and the page scrolls half a screen per slide; the slider draws itself from the scroll
    (root._prog), touch snaps per slide, and on a mouse the shared stepper (site.js) lands one gesture on one slide: hero, then the slides, then the rest of the page free */
 var vs=$('#voices .vb'),vsec=$('#voices');if(vs&&vsec&&DX.voiceRotate){DX.voiceRotate(vs);var legs=$$('.vb-i',vs).length-1,vstep=function(){return Math.round(W.innerHeight*1.1)}; /* 2026-10-31: half a screen per voice (moving window); sweep v8.6: 0.6 screen per slide, no snap */
  /* sweep v8.12: held by CSS sticky inside a runway (DX.stick) instead of a ScrollTrigger pin (the pin swap measured CLS 1.6-2.9 per pass here) */
  var vrun=DX.stick?DX.stick(vsec,function(){return legs*vstep()}):null;
  var vst=ST.create({trigger:vrun||vsec,start:'top top',end:function(){return'+='+legs*vstep()},pin:!vrun,anticipatePin:vrun?0:1,invalidateOnRefresh:true,onUpdate:function(s){if(vs._prog)vs._prog(s.progress*legs)}});
  vs._stopY=function(k){return vst.start+k*vstep()};
  if(W.__lenis&&!touch&&DX.magnet)DX.magnet(function(){var H=W.innerHeight,t=vst.start,st=[];for(var i=1;i<=legs;i++)st.push(t+i*vstep());
   return[{t:0,h:H},{t:t,h:H,stops:st},{t:t+legs*vstep(),h:D.documentElement.scrollHeight-(t+legs*vstep()),tall:true,free:true}]});
  /* QA-B 2026-10-31: on touch screens a flick could stop between two voices, leaving two half quotes on screen (the moving window cuts both).
     Once the finger is up and the scroll has been still for 160 ms inside the slider's runway, glide to the nearest voice's stop. Free scrolling elsewhere. */
  /* 2026-11-01 (soft stop, "never fight the finger"): the glide goes to the next voice in the direction of the swipe, not the nearest one: a gentle
     swipe (under half a step, 1.1 screens) used to glide back to the voice it started from every time, so the page could not be left by touch.
     A move of less than 48 px still returns to its voice; past the last voice the page is free. */
  if(touch&&!rm){var vtm,vdown=false,vdir=0,vy=W.scrollY,vgo=function(){if(vdown)return;var y=W.scrollY,s=vst.start,st=vstep(),e=s+legs*st;if(y<s-2||y>e+2)return;
    var k=(y-s)/st,n=Math.round(k),off=Math.abs(y-(s+n*st)),t=off<48?s+n*st:s+(vdir>0?Math.ceil(k):vdir<0?Math.floor(k):n)*st;t=Math.max(s,Math.min(e,t));
    if(Math.abs(t-y)>2)W.scrollTo({top:t,behavior:'smooth'})};
   W.addEventListener('touchstart',function(){vdown=true;clearTimeout(vtm)},{passive:true});
   W.addEventListener('touchend',function(){vdown=false;clearTimeout(vtm);vtm=setTimeout(vgo,160)},{passive:true});
   W.addEventListener('scroll',function(){var y=W.scrollY;if(Math.abs(y-vy)>.5)vdir=y>vy?1:-1;vy=y;clearTimeout(vtm);vtm=setTimeout(vgo,160)},{passive:true})}}
 /* 5. stacked-cover cards: the one beneath dims and eases up a little as the next covers it (no scaling: a shrunk card shows its own edges and blurs its text) */
 var cards=$$('.stk-c');cards.forEach(function(c,i){var nx=cards[i+1];if(!nx)return;G.to(c,{y:-18,'--dim':.6,ease:'none',scrollTrigger:{trigger:nx,start:'top 70%',end:'top 20%',scrub:true}})});
 /* 6. statement word fill (about promise) */
 /* sweep v8.12: scrubbed (reversible, no replay), unfilled words at .55 (>= 3:1), complete when the statement's top reaches 40 % of the screen */
 var st=$('.stmt');if(st){words(st);G.set($$('.wd',st),{opacity:.55});G.to($$('.wd',st),{opacity:1,ease:'none',stagger:.1,scrollTrigger:{trigger:st,start:'top bottom',end:'top 40%',scrub:true,invalidateOnRefresh:true}})}
 /* 7. quiet once-only rises: wall items, logos, team, cells, faq */
 /* sweep v8.17: the stories wall rows and cards rise once; each university quote also rises line by line */
 $$('#wlu .uf-q p').forEach(function(q){if(DX.riseLines)DX.riseLines(q)});
 var ris=$$('.sw-h .eyebrow,.seg,.uf:not([hidden]),.tc:not([hidden]),.vc:not([hidden]),.pw-c,.ug-v,.tm figure,.tm7 li,.uc,.ug-g,.fq details,.pr7 li,.dl7>div,.gh');
 /* sweep v8.12: shared once-only entrance, hidden from the start (the batch used to show them, then hide them at 90 %, then fade them in: on-off-on) */
 if(ris.length&&DX.reveal)DX.reveal(ris);
 /* 8. safety: scrubbed state is a pure function of scroll; refresh after fonts, then re-land anchors */
 if(D.fonts&&D.fonts.ready)D.fonts.ready.then(function(){ST.refresh()});
 setTimeout(function(){ST.refresh();if(!userScrolled)hashJump()},900);
 W.addEventListener('load',function(){ST.refresh();if(!userScrolled)hashJump()})}
/* ---------- page entry ---------- */
DX.page=function(){var m=D.getElementById('main');m.className='v7';
 m.innerHTML=pg==='stories'?stories():pg==='universities'?unis():pg==='about'?about():contact();
 DX.phExpand(m);var dr=$('#dr');if(dr)D.body.appendChild(dr);$$('.fcta').forEach(function(f){f.parentNode.removeChild(f)});
 D.body.dataset.v7=pg;wireForms();wireStories();wireUnis();wireMaps();wireHelp();
 /* Content Manager store (js/core/site-live.js): banner text now, before the scenes start; later changes re-render only the parts they touch */
 if(DX.live){DX.live.banner();DX.live.on(live)}
 /* site.js wires anchor links at motion() time, after this render; hash on arrival lands after layout */
 setTimeout(hashJump,40)};
function live(b,ch){if(!ch)return;var has=function(a){return ch.indexOf(a)>-1},touched=false;
 if(has('team')){var tm=$('.tm7');if(tm){tm.innerHTML=teamItems();touched=true}}
 if(has('universities')){var ug=$('#ug');if(ug){var on=$('.pills .pill[aria-pressed="true"]'),c=on?on.dataset.c:'all';ug.innerHTML=ugBody();$$('.ugp',ug).forEach(function(g){g.hidden=c!=='all'&&g.dataset.c!==c});touched=true}
  var pw=$('#partners .pw-g');if(pw&&DX.partnerWall){pw.outerHTML=DX.partnerWall();touched=true}}
 if(has('site_settings')){$$('.soc7').forEach(function(s){s.outerHTML=socLinks()})}
 if(touched&&W.ScrollTrigger)W.ScrollTrigger.refresh()}
DX.after=function(on){if(!on||rm||!W.gsap||!W.ScrollTrigger)return;try{build()}catch(e){D.documentElement.classList.remove('pv7');throw e}};
})();
