/* Destinations v7: destinations.html and country.html. Renders from js/data.js + js/photos.js and overrides DX.page for these two pages.
   Scroll effects are built here with GSAP + ScrollTrigger (zoom-through hero, horizontal ladder, stacked-cover visa steps, layered parallax,
   line-mask headline reveals). Easings expo.out / power3.inOut, 0.6 to 1.2 s, transform and opacity only, same on touch, static under reduced motion. */
(function(){
var D=document,W=window,DX=W.DX;if(!DX)return;
var pg=D.body.dataset.page;if(pg!=='destinations'&&pg!=='country')return;
var $=function(s,r){return(r||D).querySelector(s)},$$=function(s,r){return[].slice.call((r||D).querySelectorAll(s))};
var esc=DX.esc,ar=DX.ar,CF='Confirm with your counsellor',STEP=['Step one','Step two','Step three','Step four','Step five'];
var rm=matchMedia('(prefers-reduced-motion:reduce)').matches,PH=W.DX_PH||{};
/* photo pipeline (same contract as the other pages; home-r2.js is no longer loaded here) */
DX.phSrc=DX.phSrc||function(n,w){return'img/photos/'+n+'-'+w+'.webp'};
DX.phExpand=DX.phExpand||function(root){$$('img[data-ph]',root).forEach(function(im){var n=im.dataset.ph;if(DX.phPick)n=DX.phPick(n,im);var m=PH[n];if(!m)return;
 im.src=DX.phSrc(n,1600);im.srcset=[800,1200,1600,2400].concat(m.w>=3200?[3200]:[]).map(function(w){return DX.phSrc(n,w)+' '+w+'w'}).join(', ');im.sizes=im.dataset.sizes||'100vw';
 im.width=m.w;im.height=m.h;if(!im.hasAttribute('loading'))im.loading=im.dataset.eager?'eager':'lazy';im.decoding='async';
 if(im.dataset.pos)im.style.objectPosition=im.dataset.pos;im.style.setProperty('--phc',m.c);im.removeAttribute('data-ph');im.dataset.photo=n})};
/* QA-A 2026-10-31: cover-aware `sizes` (same as js/pages/home-v8.js): each srcset image gets sizes = the width it is really drawn at (cover crop + 6 % zoom) */
if(!DX.phCover){DX.phCover=function(){$$('img[srcset]').forEach(function(im){if(!/\dw/.test(im.getAttribute('srcset')))return;var w=im.offsetWidth,h=im.offsetHeight;if(!w||!h)return;
 var m=PH[im.dataset.photo]||{},a=(m.w&&m.h)?m.w/m.h:(im.naturalWidth&&im.naturalHeight?im.naturalWidth/im.naturalHeight:0),c=(a&&getComputedStyle(im).objectFit==='cover')?Math.max(w,h*a):w,px=Math.ceil(c*1.06);
 if(Math.abs((+im.dataset.szp||0)-px)<40)return;im.dataset.szp=px;im.sizes=px+'px'})};
 (function(){var t;W.addEventListener('load',function(){DX.phCover();setTimeout(DX.phCover,1500)});W.addEventListener('resize',function(){clearTimeout(t);t=setTimeout(DX.phCover,350)})})()}
/* split a heading into word spans for the scrubbed colour fill (same as scenes.js) */
function words(el){if(!el||el.dataset.sp)return;el.dataset.sp=1;(function walk(n){[].slice.call(n.childNodes).forEach(function(c){
 if(c.nodeType===3){if(!c.textContent.trim())return;var f=D.createDocumentFragment();c.textContent.split(/(\s+)/).forEach(function(p){if(!p)return;if(/^\s+$/.test(p)){f.appendChild(D.createTextNode(' '));return}var w=D.createElement('span');w.className='wd';w.textContent=p;f.appendChild(w)});n.replaceChild(f,c)}
 else if(c.nodeType===1&&c.tagName!=='BR')walk(c)})})(el)}
/* ---------- per-country editorial data: photos, promise, visa route and the five visa steps ---------- */
var K={
'united-kingdom':{promise:'One-year masters, three-year degrees and a Graduate visa afterwards.',line:'Shorter degrees, a Graduate visa after.',visa:'Student visa, issued against a CAS',
 steps:[['CAS from the university','Your Confirmation of Acceptance for Studies arrives once the offer is unconditional and the deposit is paid.'],['IHS payment','The Immigration Health Surcharge is paid online for the full length of the course.'],['Online application','The Student visa form is completed and the fee paid; we check every answer against your file.'],['Biometrics','Fingerprints and a photograph at the visa application centre in Kathmandu.'],['Decision','UK Visas and Immigration decides. We prepare you for either answer.']],
 /* sweep v8.13: ph = [hero, why (large), why (small), closing scene, story scene]; vph = one photo per visa step, chosen for what the step is about
    (the university, the form, the online application, Kathmandu for biometrics, the departure). Framing comes from js/photos.js (focus + safe box), not from here. */
 ph:[['uk-cam-bridge-sighs','St John’s College and the Bridge of Sighs, Cambridge'],['uk-glasgow','The University of Glasgow'],['students-notes','Students between lectures, illustrative photography'],['uk-kings-aerial','King’s College Chapel and its courts, Cambridge'],['uk-oxford-street','College buildings on an Oxford street at sunrise']],
 vph:[['uk-cam-kings-m','King’s College Chapel, Cambridge'],['docs-clipboard','Signing a form beside a laptop, illustrative photography'],['apply-laptop','An online application form on a laptop, illustrative photography'],['np-swayambhu','Swayambhunath above the Kathmandu Valley'],['airport-sunlit','Travellers in a departure hall, illustrative photography']]},
'usa':{promise:'Flexible degrees, research and up to three years of OPT for STEM graduates.',line:'The widest choice, and OPT after.',visa:'F-1 student visa, issued against an I-20',
 steps:[['I-20 from the university','The university issues your I-20 after admission and proof of funds.'],['SEVIS fee','The SEVIS I-901 fee is paid online and the receipt kept for the interview.'],['DS-160 form','The online visa form, completed carefully and matched to your documents.'],['Visa interview','A short interview at the US Embassy in Kathmandu. We rehearse it with you.'],['Decision','The consular officer decides on the day. We prepare you for either answer.']],
 ph:[['us-harvard-brick','Harvard Yard in autumn, Cambridge, Massachusetts'],['us-princeton','Princeton University, New Jersey'],['us-students-walk','Students on campus, illustrative photography'],['us-columbia-lib','Low Memorial Library, Columbia University, New York'],['nyc-skyline','Manhattan from the Brooklyn Bridge']],
 vph:[['us-columbia-m','Low Memorial Library, Columbia University, New York'],['apply-laptop','Paying a fee online, illustrative photography'],['study-laptop','Filling in a form carefully, illustrative photography'],['np-ktm-valley','The Kathmandu Valley at dusk'],['airport-terminal','An airport terminal, illustrative photography']]},
'canada':{promise:'A work permit after study and a clear route to residency.',line:'Work permit after study, route to residency.',visa:'Study permit, issued against a Letter of Acceptance',
 steps:[['Letter of Acceptance','The Letter of Acceptance from a designated learning institution.'],['GIC and funds evidence','A Guaranteed Investment Certificate and the first tuition payment show you can support yourself.'],['Online application','The study permit application on the IRCC portal, with every document uploaded.'],['Biometrics','Fingerprints and a photograph at the visa application centre in Kathmandu.'],['Decision','IRCC decides. We track it and prepare you for either answer.']],
 ph:[['ca-vancouver-beach','Vancouver’s West End above English Bay'],['ca-uoft-college','University College, University of Toronto'],['ca-students','Students on campus, illustrative photography'],['vancouver-mountains','Vancouver harbour and the North Shore'],['ca-toronto-skyline','Toronto and the CN Tower across Lake Ontario']],
 vph:[['study-laptop','Reading a letter of acceptance, illustrative photography'],['docs-clipboard','Funds paperwork, illustrative photography'],['apply-laptop','An online application form on a laptop, illustrative photography'],['np-swayambhu','Swayambhunath above the Kathmandu Valley'],['passport-hand','A passport and boarding pass, illustrative photography']]},
'australia':{promise:'Strongly ranked universities with work rights while you study.',line:'Ranked universities, work while you study.',visa:'Student visa (subclass 500), issued against a CoE',
 steps:[['CoE from the university','The Confirmation of Enrolment follows your offer and first payment.'],['Genuine Student statement','Your plans in your own words. We help you draft it honestly.'],['OSHC health cover','Overseas Student Health Cover is arranged for the whole stay.'],['Online application','The subclass 500 application on ImmiAccount, with health checks if asked.'],['Visa grant','Home Affairs decides. We prepare you for either answer.']],
 ph:[['au-sydney-harbour','Sydney Opera House and the Harbour Bridge'],['au-sydney-uni-quad','The Quadrangle, University of Sydney'],['au-students','Students on campus, illustrative photography'],['melbourne-river','Melbourne across the Yarra at twilight'],['sydney-opera','Sydney Harbour on a clear day']],
 vph:[['docs-clipboard','Enrolment paperwork, illustrative photography'],['study-laptop','Writing a statement, illustrative photography'],['a-counsel-folder-review','Going through the cover and costs with a counsellor, illustrative photography'],['apply-laptop','An online application form on a laptop, illustrative photography'],['passport-hand','A passport and boarding pass, illustrative photography']]},
'new-zealand':{promise:'Practical courses, safe cities and a post-study work visa route.',line:'Practical courses, safe cities, work after.',visa:'Fee Paying Student Visa, issued against an offer of place',
 steps:[['Offer of place','A written offer from an approved institution.'],['Funds evidence','Proof of tuition and NZ$20,000 a year for living costs.'],['Online application','The Fee Paying Student Visa application on the Immigration New Zealand portal.'],['Medical and police checks','A medical certificate and police clearance, when asked.'],['Decision','Immigration New Zealand decides. We prepare you for either answer.']],
 ph:[['nz-tekapo-alps','Lake Tekapo and the Southern Alps'],['nz-christchurch-arts','The Arts Centre, Christchurch, the first University of Canterbury campus'],['au-students','Students on campus, illustrative photography'],['auckland-skyline','Auckland and the Sky Tower'],['nz-queenstown','Queenstown and Lake Wakatipu']],
 vph:[['otago-clocktower','University of Otago, Dunedin'],['docs-clipboard','Funds paperwork, illustrative photography'],['apply-laptop','An online application form on a laptop, illustrative photography'],['study-laptop','Gathering certificates, illustrative photography'],['passport-hand','A passport and boarding pass, illustrative photography']]}};
function g(c,k){var r=c.glance.filter(function(x){return x[0].toLowerCase().indexOf(k)===0})[0];return r?r[1]:CF}
function tu(c,k){var v=g(c,'tuition, '+k);return v!==CF?v:g(c,'tuition')}
/* sweep v8.11: per-country title (<= 60), description (<= 155, cut at a word), canonical, Open Graph / Twitter and the breadcrumb's third step.
   The base URL comes from the static og:image (one placeholder in the HTML, see server/DEPLOY.md). */
DX.seoCountry=function(c,k){var cut=function(t,n){if(t.length<=n)return t;t=t.slice(0,n-1);return t.slice(0,t.lastIndexOf(' ')).replace(/[,;:.]$/,'')+'…'};
 var title=cut('Study in '+c.name+' from Nepal | Dolphin Education',60),desc=cut(c.name+': '+k.promise+' Counselling from Dolphin Education, New Baneshwor, Kathmandu.',155);
 D.title=title;var og=$('meta[property="og:image"]'),base=og?og.content.replace(/\/img\/og\/.*$/,''):location.origin,url=base+'/country.html?c='+c.slug;
 var set=function(sel,attr,v){var e=$(sel);if(e)e.setAttribute(attr,v)};
 set('meta[name=description]','content',desc);set('meta[property="og:title"]','content',title);set('meta[property="og:description"]','content',desc);set('meta[property="og:url"]','content',url);
 set('meta[name="twitter:title"]','content',title);set('meta[name="twitter:description"]','content',desc);
 var l=$('link[rel=canonical]');if(!l){l=D.createElement('link');l.rel='canonical';D.head.appendChild(l)}l.href=url;
 var bc=D.getElementById('ldCrumb');if(bc){try{var j=JSON.parse(bc.textContent);j.itemListElement=j.itemListElement.slice(0,2).concat([{'@type':'ListItem',position:3,name:c.name,item:url}]);bc.textContent=JSON.stringify(j)}catch(e){}}};
function img(n,alt,pos,sizes,eager){return'<img data-ph="'+n+'" alt="'+esc(alt||'')+'" data-pos="'+(pos||'50% 50%')+'" data-sizes="'+(sizes||'100vw')+'"'+(eager?' data-eager="1" loading="eager" fetchpriority="high"':'')+'>'}
function the(c){return(c.slug==='united-kingdom'||c.slug==='usa'?'the ':'')+c.name}
function btn(t,h,cls){return'<a class="btn '+(cls||'btn-p')+'" href="'+h+'"><span>'+t+'</span><span class="ar" aria-hidden="true">&#8594;</span></a>'}
function val(v){return'<dd'+(v===CF?' class="cf"':'')+'>'+esc(v)+'</dd>'}
/* country key facts changed in the Content Manager store after this page rendered (js/core/site-live.js patched DX.C): rewrite the shown values in place */
var FV={'Tuition, undergraduate':function(c){return tu(c,'undergraduate')},'Tuition, postgraduate':function(c){return tu(c,'postgraduate')},'Living costs':function(c){return g(c,'living')},
 'Work after study':function(c){return g(c,'work after')},'Intakes':function(c){return g(c,'intakes')},'English':function(c){return g(c,'english')}};
function liveFacts(b,ch){if(!ch||ch.indexOf('country_facts')<0)return;var C=DX.C,bySlug=function(s){return C.filter(function(x){return x.slug===s})[0]};
 var put=function(e,v){if(e&&v!=null&&e.textContent!==v){e.textContent=v;e.classList.toggle('cf',v===CF)}};
 var dl=function(root,c){$$('dl>div',root).forEach(function(d){var t=$('dt',d),f=t&&FV[t.textContent.trim()];if(f)put($('dd',d),f(c))})};
 if(pg==='country'){var s=new URLSearchParams(location.search).get('c')||'united-kingdom';s=({uk:'united-kingdom',us:'usa',au:'australia',nz:'new-zealand'})[s]||s;var c=bySlug(s);if(c)$$('#facts,#costs').forEach(function(r){dl(r,c)});return}
 $$('.v7ct-r:not(.v7ct-h)').forEach(function(r){var h=$('[role=rowheader]',r),f=h&&FV[h.textContent.trim()];if(!f)return;$$('[role=cell]',r).forEach(function(cell,i){if(C[i])put(cell,f(C[i]))})});
 $$('.v7cm-c').forEach(function(li){var a=$('h3 a',li),m=a&&a.getAttribute('href').match(/c=([a-z-]+)/),c=m&&bySlug(m[1]);if(c)dl(li,c)})}
/* ======================= DESTINATIONS ======================= */
function destinations(){var C=DX.C;
 return'<section class="v7h on-dark" id="top" aria-label="Destinations"><div class="v7h-pan" id="hpan" aria-hidden="true">'+C.map(function(c,i){var p=K[c.slug].ph[0];return'<figure>'+img(p[0],'',p[2],'60vw',true)+'</figure>'}).join('')+'</div><div class="wrap v7h-c" id="hc"><h1><span class="ln"><span>Five countries,</span></span> <span class="ln"><span>one <em>honest</em> conversation.</span></span></h1><p class="lead">Published ranges, the work route and the visa file for each country, told plainly.</p>'+btn('See the five','#ladder')+'</div></section>'
 /* 2026-10-31: Canada restored, so the countries (five, from DX.C) are a journey of rounded cards on a soft stage (same design as the home destinations journey), not full-bleed panels.
    NOTE for whoever owns css/dest-v7.css: .v7h-pan, .v7ct and .v7cm were hand-tuned to repeat(4,...) grid columns for the old four-country layout
    (see the "back to 5 if Canada returns" comment already in that file); they now receive a 5th item from DX.C and may need their column counts
    bumped to 5 to avoid an uneven wrap. Left untouched here since this pass is content-only (no CSS). */
 +'<section class="v7l" id="ladder" aria-label="The five destinations"><div class="v7l-tr" id="ltr">'+C.map(function(c,i){var k=K[c.slug],p=k.ph[0];return'<article class="v7l-p on-dark" data-i="'+i+'" aria-labelledby="ld-'+c.slug+'"><figure>'+img(p[0],p[1]||c.alt,p[2],'(max-width:699px) 95vw, 92vw',i<2)+'</figure><div class="v7l-c"><span class="eyebrow">Destination</span><h2 id="ld-'+c.slug+'">'+esc(c.name)+'</h2><p>'+esc(k.line)+'</p>'+btn('Explore '+esc(c.name),'country.html?c='+c.slug)+'</div></article>'}).join('')+'</div></section>'
 /* sweep v8.9: the comparison is one equal card per live country (five since 2026-10-31) (rows share one subgrid so they line up); a swipe row below 1100 px; only published facts */
 +'<section class="sec band-s z v7cm-s" id="compare"><div class="wrap zi"><div class="sh"><div><span class="eyebrow">Compare</span><h2 data-lines>Five countries, <em>side by side.</em></h2></div><p>Only published facts. Anything else, your counsellor confirms.</p></div>'
 +'<div class="v7ct" role="table" aria-label="Costs and work rights by country"><div class="v7ct-r v7ct-h" role="row"><span role="columnheader"></span>'+C.map(function(c){return'<a role="columnheader" class="v7ct-f f-'+c.slug+'" href="country.html?c='+c.slug+'"><span>'+esc(c.name)+'</span></a>'}).join('')+'</div>'
 +[['Tuition, undergraduate',function(c){return tu(c,'undergraduate')}],['Tuition, postgraduate',function(c){return tu(c,'postgraduate')}],['Living costs',function(c){return g(c,'living')}],['Work after study',function(c){return g(c,'work after')}]].map(function(r){return'<div class="v7ct-r" role="row"><span class="v7ct-l" role="rowheader">'+r[0]+'</span>'+C.map(function(c){var v=r[1](c);return'<span role="cell"'+(v===CF?' class="cf"':'')+'>'+esc(v)+'</span>'}).join('')+'</div>'}).join('')+'</div>'
 +'<ul class="v7cm">'+C.map(function(c){return'<li class="v7cm-c" data-rise><h3><a href="country.html?c='+c.slug+'">'+esc(c.name)+'<span class="ar" aria-hidden="true">&#8594;</span></a></h3><dl>'
 +[['Tuition, undergraduate',tu(c,'undergraduate')],['Tuition, postgraduate',tu(c,'postgraduate')],['Living costs',g(c,'living')],['Work after study',g(c,'work after')]].map(function(r){return'<div><dt>'+r[0]+'</dt>'+val(r[1])+'</div>'}).join('')+'</dl></li>'}).join('')+'</ul>'
 +'<p class="v7-note">Visa routes, intakes and English requirements are on each country page. Rules change, and the decision always comes from the immigration authority.</p></div></section>'
 +cta(null)}
function cta(c){var nx=null;if(c){var C=DX.C;nx=C[(C.indexOf(c)+1)%C.length]}
 return'<section class="v7cta on-dark z" id="book">'+img(c?K[c.slug].ph[3][0]:'flight-clouds','',c?K[c.slug].ph[3][2]:'50% 50%','100vw')+(c?'':'<video class="v7cta-v" muted loop playsinline preload="none" poster="img/video/plane-poster.jpg" aria-hidden="true" data-lazy data-src="'+(matchMedia('(max-width:900px)').matches?'img/video/plane-m.mp4':'img/video/plane.mp4')+'"></video>')+'<div class="wrap zi"><span class="eyebrow">Start here</span><h2 data-lines>'+(c?'Thinking about <em>'+esc(c.name)+'?</em>':'One conversation. <em>Then a plan.</em>')+'</h2><p>Tell us where you want to study. A counsellor in New Baneshwor, Kathmandu will call you back.</p>'+btn('Book free counselling','contact.html#book','btn-a')+(nx?'<a class="v7-next" href="country.html?c='+nx.slug+'">Next: '+esc(nx.name)+'</a>':'')+'</div></section>'}
/* ======================= COUNTRY ======================= */
function country(){
 var s=new URLSearchParams(location.search).get('c')||'united-kingdom',C=DX.C,s=({uk:'united-kingdom',us:'usa',au:'australia',nz:'new-zealand'})[s]||s,c=C.filter(function(x){return x.slug===s})[0];if(!c){location.replace('destinations.html');return''}var k=K[c.slug],hp=k.ph[0];
 DX.seoCountry(c,k);
 var story=DX.voices?DX.voices({voice:'student',country:c.slug})[0]:null; /* 2026-10-31: a REAL review published on dolphin.edu.np, or no section at all (no invented fallback) */
 var tg=c.tagline,ti=tg.indexOf(' and ');var h2=ti>-1?esc(tg.slice(0,ti))+' <em>and '+esc(tg.slice(ti+5))+'.</em>':esc(tg)+'.';
 var sum=c.summary.split('. ')[0];if(sum.slice(-1)!=='.')sum+='.';
 return'<section class="v7h on-dark" id="top"><div class="v7h-bg" id="hbg2" aria-hidden="true">'+img(hp[0],'',hp[2],'(max-width:700px) 140vw, 210vw',true)+'</div><div class="wrap v7h-c" id="hc"><p class="crumb"><a href="destinations.html">Destinations</a><span>/</span>'+esc(c.name)+'</p><h1 class="v7-n"><span class="ln"><span>'+esc(c.name)+'</span></span></h1><p class="lead">'+esc(k.promise)+'</p>'+btn('Talk to a counsellor','#book')+'</div><p class="v7h-cap">'+esc(hp[1])+'</p></section>'
 +'<section class="sec band-s v7f z" id="facts" aria-label="Key facts"><div class="wrap zi"><dl class="v7f-l">'+[['Intakes',g(c,'intakes')],['Work after study',g(c,'work after')],['Visa route',k.visa],['Living costs',g(c,'living')]].map(function(f){return'<div data-rise><dt>'+f[0]+'</dt>'+val(f[1])+'</div>'}).join('')+'</dl></div></section>'
 +'<section class="sec v7w z" id="why"><div class="wrap zi v7w-g"><div class="v7w-t"><div class="sh"><div><span class="eyebrow">Why study here</span><h2 data-lines>'+h2+'</h2></div></div><p class="lead">'+esc(sum)+'</p><ul class="v7w-l">'+c.highlights.slice(0,3).map(function(h,i){return'<li data-rise>'+esc(h)+'</li>'}).join('')+'</ul></div><div class="v7w-p"><figure class="a" data-v7p="5">'+img(k.ph[1][0],k.ph[1][1],k.ph[1][2],'(max-width:900px) 100vw, 50vw')+'</figure><figure class="b" data-v7p="-7">'+img(k.ph[2][0],k.ph[2][1],k.ph[2][2],'(max-width:900px) 60vw, 26vw')+'<figcaption>Illustrative photography</figcaption></figure></div></div></section>'
 +'<section class="v7v band-n" id="visa" aria-label="Visa steps"><div class="wrap v7v-g"><div class="v7v-s"><span class="eyebrow">The visa file</span><h2 data-lines>Five steps to <em>'+esc(the(c))+'.</em></h2><p>We prepare the file in this order. The official decision always comes from the immigration authority.</p></div><ol class="v7v-l">'+k.steps.map(function(st,i){var p=(k.vph&&k.vph[i])||k.ph[3+i]||k.ph[i];return'<li class="v7v-c" style="--i:'+i+'"><figure>'+img(p[0],p[1],p[2],'(max-width:900px) 100vw, 50vw')+'</figure><div><span class="v7v-n">'+STEP[i]+'</span><h3>'+esc(st[0])+'</h3><p>'+esc(st[1])+'</p></div></li>'}).join('')+'</ol></div></section>'
 +'<section class="sec band-s z" id="costs"><div class="wrap zi v7c-g"><div class="sh"><span class="eyebrow">Costs</span><h2 data-lines>Only <em>published</em> ranges.</h2><p>Your counsellor writes the full cost on one page before you choose.</p></div><dl class="v7k">'+[['Tuition, undergraduate',tu(c,'undergraduate')],['Tuition, postgraduate',tu(c,'postgraduate')],['Living costs',g(c,'living')],['English',g(c,'english')]].map(function(r){return'<div data-rise><dt>'+r[0]+'</dt>'+val(r[1])+'</div>'}).join('')+'</dl></div></section>'
 +(story?'<section class="v7s on-dark z" id="story" aria-label="What our students say">'+img(k.ph[4][0],'',k.ph[4][2],'100vw')+'<div class="wrap zi"><span class="eyebrow">What our students say</span><blockquote data-words="fill">'+esc(story.text)+'</blockquote><p class="who">'+esc(story.name)+(story.course?', '+esc(story.course):'')+'</p></div></section>':'')
 +voice(c)+cta(c)}
/* 2026-10-31 (user): the invented "What the institution says" quote is gone. This section now shows the country's REAL institutions with their logos
   (New Zealand: Dolphin's own "We proudly represent" list; elsewhere the institutions listed on the universities page). No institutions: no section. */
function voice(c){var l=(DX.P||[]).filter(function(p){return p.country===c.slug});if(!l.length||!DX.logoImg)return'';var nz=l.some(function(p){return p.grp});
 var sh=l.filter(function(p){return p.logo}).concat(l.filter(function(p){return!p.logo})).slice(0,8);
 return'<section class="sec band-s z v7u" id="voice" aria-labelledby="uvH"><div class="wrap zi v7u-g"><div class="v7u-t"><span class="eyebrow" id="uvH">Institutions in '+esc(the(c))+'</span><h2 data-lines>'+(nz?'We proudly <em>represent.</em>':'Institutions we <em>work with.</em>')+'</h2><p>'+(nz?'Universities, private institutions and polytechnics across New Zealand. Your counsellor shortlists the ones that fit you.':'Your counsellor also applies to institutions not listed here, when they fit you.')+'</p>'+btn('All institutions','universities.html#grid','btn-g')+'</div>'
 +'<ul class="v7u-l">'+sh.map(function(p){return'<li>'+(p.logo?DX.logoImg(p):'')+'<span>'+esc(DX.shortName(p))+'</span></li>'}).join('')+'</ul></div></section>'}
/* ======================= MOTION ======================= */
function motion(){var G=W.gsap,ST=W.ScrollTrigger;if(rm||!G||!ST)return;
 G.registerPlugin(ST);
 var touch=matchMedia('(hover:none)').matches||'ontouchstart' in W;
 ST.config({ignoreMobileResize:true});
 /* sweep v8.6 (scroll audit): no normalizeScroll (touch is the browser's own scroll) and every scrub exact (SCR = true), so a scene's progress is proportional to
    the scroll with no lag and can be stopped at any pixel; the old smoothed scrubs (.6-.8 s) kept the hero and the ladder moving after the page had stopped */
 var SCR=true;
 /* 1. line-mask headline reveal on load */
 /* sweep v8.12: the intro is CSS (site.css html.intro, once per page per session); this script runs after load, so animating here hid text that was already shown */
 /* 2. zoom-through hero: photo settles on load, then while pinned scales to 1.4 and fades as the copy lifts */
 var zones=[];function stz(st,pts){return function(){return{a:st.start,b:st.end,l:pts.map(function(p){return st.start+p*(st.end-st.start)})}}}
 var top=$('#top'),bg=$('#hbg2'),pan=$('#hpan');
 if(top){var vis=bg||pan;
  /* pinSpacing off: the next scene slides over the hero while it zooms, so there is never a blank gap between the two */
  var tl=G.timeline({scrollTrigger:{trigger:top,start:'top top',end:'+=100%',pin:true,pinSpacing:false,scrub:SCR,anticipatePin:1,invalidateOnRefresh:true}});zones.push(stz(tl.scrollTrigger,[0,1]));
  tl.to(vis,{scale:1.4,ease:'power3.inOut'},0).to(vis,{opacity:.15,ease:'power2.in'},.3).to('#hc',{yPercent:-22,opacity:0,ease:'power2.in'},0);
  if(pan)$$('#hpan figure').forEach(function(f,i){tl.to(f,{yPercent:(i%2?1:-1)*(6+i*2),ease:'none'},0)})}
 /* 3. arrival: the scene's copy lifts in (translate and opacity only, so text stays crisp); its photographs settle from 1.08 to 1 */
 /* sweep v8.12: shared once-only entrance (DX.reveal): anything already on screen when this late script runs is left alone (it used to be hidden, then faded in) */
 $$('.z .zi').forEach(function(e){var st={trigger:e.parentNode,start:'top 96%',end:'top 60%',scrub:SCR};
  if(DX.reveal)DX.reveal([e]);
  /* sweep v8.13: the photographs' own entrance (1.08 -> 1, clip reveal, once) is js/core/imgfx.js DX.imgMotion, the same on every page */});
 /* 3b. headings rise line by line through masks (site.js DX.riseLines); the student quote fills word by word; rows and facts rise once */
 $$('[data-lines]').forEach(function(h){if(DX.riseLines)DX.riseLines(h)});
 /* word fill: scrubbed (reversible), unfilled words at .55 (never .16), complete when the quote's top reaches 40 % of the screen */
 $$('[data-words=fill]').forEach(function(h){words(h);G.set($$('.wd',h),{opacity:.55});G.to($$('.wd',h),{opacity:1,ease:'none',stagger:.1,scrollTrigger:{trigger:h,start:'top bottom',end:'top 40%',scrub:true,invalidateOnRefresh:true}})});
 var ris=$$('[data-rise]');if(ris.length&&DX.reveal)DX.reveal(ris);
 /* 4. horizontal ladder: vertical scroll slides the country panels left, photos drift at a different speed (layered) */
 var lad=$('#ladder'),tr=$('#ltr');
 /* sweep v8.12: the ladder slides the country photos past in a few hundred pixels of scroll; lazy ones decoded mid-slide and popped in. They are fetched on the first scroll. */
 if(lad){var warm=function(){$$('img[loading=lazy]',lad).forEach(function(i){i.loading='eager'})};['scroll','wheel','touchstart','keydown'].forEach(function(e){W.addEventListener(e,warm,{once:true,passive:true})})}
 /* sweep v8.6: half a screen of scroll per panel (was 0.9 of the width, about 1300 px: too much distance per card, which read as "hard") */
 /* sweep v8.9: the track holds rounded cards; card k rests centred with the next card's edge peeking. Pinned only from 700 px up (css/pages/dest-v7.css uses the same
    query); on phones the cards are a native swipe row with scroll-snap proximity, so nothing is pinned or hijacked there */
 if(lad&&tr&&G.matchMedia)G.matchMedia().add('(min-width:700px)',function(){var n=tr.children.length,dx=function(){var c=tr.children;return c[n-1].offsetLeft-c[0].offsetLeft};
  /* sweep v8.12: held by CSS sticky inside a runway (DX.stick) instead of a ScrollTrigger pin (no swap jump, no layout shift) */
  var hold=function(){return Math.round(W.innerHeight*(n-1)*.5)},run=DX.stick?DX.stick(lad,hold):null;
  var slide=G.to(tr,{x:function(){return-dx()},ease:'none',scrollTrigger:run?{trigger:run,start:'top top',end:function(){return'+='+hold()},scrub:SCR,invalidateOnRefresh:true}:{trigger:lad,start:'top top',end:function(){return'+='+hold()},pin:true,scrub:SCR,anticipatePin:1,invalidateOnRefresh:true}});
  var zf=stz(slide.scrollTrigger,[0,.25,.5,.75,1]);zones.push(zf);
  $$('.v7l-p',tr).forEach(function(p,i){var im=$('img',p),c=$('.v7l-c',p);
   G.fromTo(im,{xPercent:-4},{xPercent:4,ease:'none',scrollTrigger:{trigger:p,containerAnimation:slide,start:'left right',end:'right left',scrub:true}});
   /* sweep v8.12: scrubbed with the slide (pure function of the scroll; it used to play on time and replay in reverse on the way back) */
   if(i)G.fromTo(c,{x:48,opacity:0},{x:0,opacity:1,ease:'none',scrollTrigger:{trigger:p,containerAnimation:slide,start:'left 96%',end:'left 62%',scrub:true}})});
  return function(){var k=zones.indexOf(zf);if(k>-1)zones.splice(k,1);if(run&&run._off)run._off()}})
 /* 5. stacked-cover visa steps: each card is sticky; the one beneath dims and eases up a little as the next covers it (no scaling: a shrunk card shows its own edges and blurs its text) */
 var cards=$$('.v7v-c');
 if(cards.length>1)zones.push(function(){var ol=cards[0].parentNode,t0=ol.getBoundingClientRect().top+W.pageYOffset,y=0,l=[];cards.forEach(function(c,i){var cs=getComputedStyle(c),dock=t0+y-parseFloat(cs.top);l.push(dock);y+=c.offsetHeight+(parseFloat(cs.marginBottom)||0)});return{a:l[0],b:l[l.length-1],l:l}});
 cards.forEach(function(c,i){var nx=cards[i+1];if(!nx)return;G.to(c,{y:-18,'--dim':.62,ease:'none',scrollTrigger:{trigger:nx,start:'top 62%',end:'top 18%',scrub:true}})});
 /* 6. layered parallax on figures and scene photos */
 $$('[data-v7p]').forEach(function(e){var s=parseFloat(e.dataset.v7p)||6;G.fromTo(e,{yPercent:-s},{yPercent:s,ease:'none',scrollTrigger:{trigger:e.closest('section')||e.parentNode,start:'top bottom',end:'bottom top',scrub:true}})});
 $$('.v7s>img,.v7cta>img').forEach(function(e){G.fromTo(e,{yPercent:-4},{yPercent:4,ease:'none',scrollTrigger:{trigger:e.parentNode,start:'top bottom',end:'bottom top',scrub:true}})});
 /* sweep v8.6 (scroll audit): the stepper and the own "settle" ticker (which glided to the nearest rest point whenever the page went quiet inside a pinned scene,
    i.e. fought a visitor who had stopped on purpose) are gone. Both pages scroll freely; on fine pointers site.js DX.magnet eases to a rest point only when the
    page is left within 12 % of a screen of one: the hero's ends, each ladder panel, each visa card dock, the compare band's edges, the closing scene, the footer. */
 if(DX.magnet&&W.__lenis&&!touch)DX.magnet(function(){var b=[],h2=W.innerHeight,y0=W.scrollY;
  zones.forEach(function(f){var z=f();b.push({t:z.a,h:h2,stops:z.l.slice(1)})});
  $$('#compare,#book,.ft-a,.ft-b').forEach(function(el){var r=el.getBoundingClientRect();b.push({t:r.top+y0,h:el.offsetHeight,tall:!el.classList.contains('ft-a')&&el.id!=='book'})});
  return b});
 /* arriving with a hash (destinations.html#compare): the browser jumped before this page was rendered, so land again once the pins are measured */
 var moved=false;['wheel','touchstart','keydown'].forEach(function(ev){W.addEventListener(ev,function(){moved=true},{passive:true})});
 function hashJump(){var h=location.hash,t;if(moved||!h||h.length<2)return;try{t=$(h)}catch(e){}if(!t)return;var y=t.getBoundingClientRect().top+W.scrollY;W.scrollTo(0,y);if(W.__lenis)W.__lenis.scrollTo(y,{immediate:true,force:true})}
 setTimeout(function(){ST.refresh();hashJump()},800);W.addEventListener('load',function(){setTimeout(function(){ST.refresh();hashJump()},300)})}
/* ---------- page entry ---------- */
DX.page=function(){var m=D.getElementById('main');m.className='v7';m.innerHTML=pg==='country'?country():destinations();DX.phExpand&&DX.phExpand(m);
 /* the shared footer CTA is injected before this page renders its own #book scene; one CTA per page */
 $$('.fcta').forEach(function(f){f.parentNode.removeChild(f)});
 if(DX.live){DX.live.banner();DX.live.on(liveFacts)}
 /* run after load so pins measure the final layout */
 function run(){setTimeout(motion,rm?0:200)}
 if(D.readyState==='complete')run();else W.addEventListener('load',run)};
})();
;(function(){document.addEventListener('playing',function(e){var v=e.target;if(v&&v.classList&&v.classList.contains('v7cta-v'))v.classList.add('on')},true)})();
