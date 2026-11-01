/* Public site <- Content Manager store (HANDOFF_PUBLIC_LIVE.md). Loaded right after data.js on every public page.
   The built-in content (data.js, each page's HTML) stays the fallback: on a static server, offline, or when /api/site/bundle is slow (2.5 s) or fails,
   nothing changes and nothing is logged.
   1. Same tab: the cached bundle (sessionStorage dx-live:<lang>) patches window.DX at once, before any page renders.
   2. Then GET /api/site/bundle?lang= (If-None-Match, no-store). On a 200 the cache is updated, DX is patched again, the shared parts of the page
      (notice line, page banner text, contact facts) are updated, and every subscriber of DX.live.on(fn) is called with the changed areas.
   3. A first-party page-view beacon (POST /api/hit, sendBeacon) once per page.
   DX.live.on(fn): fn(bundle, changed) - changed is null for the first call (the data that was already there), else the list of areas that changed. */
(function(){
var W=window,D=document,DX=W.DX;if(!DX)return;
var LANGS=['en','ne','es','ko','zh'];
var LANG='en';try{LANG=localStorage.getItem('dx-lang')||'en'}catch(e){}if(LANGS.indexOf(LANG)<0)LANG='en';
var Q=new URLSearchParams(location.search),PREVIEW=Q.get('preview')||'';
var KEY='dx-live:'+LANG;
var AREAS=['site_settings','notice','banners','events','posts','gallery','videos','team','universities','faqs','country_facts','test_classes'];
var esc=function(s){return String(s==null?'':s).replace(/[&<>"]/g,function(m){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[m]})};
var norm=function(s){return String(s==null?'':s).replace(/[‘’]/g,"'").replace(/\s+/g,' ').trim().toLowerCase()};

/* ---------- applying the bundle to window.DX (in place: page scripts keep references to these arrays and objects) ---------- */
function telOf(p){return String(p||'').replace(/[^\d+]/g,'')}
function relSrc(s){return s?String(s).replace(/^\/(img\/)/,'$1'):s}   /* site files work under / and /site/; uploads stay /media/... */
var FALLBACK_SOCIAL=(DX.social||[]).slice();
function applySettings(s){if(!s)return;var C=DX.contact,O=DX.office,F=(DX.offices||[])[0]||{};
 if(s.address){O.address=s.address;F.a=s.address}
 if(s.phones&&s.phones.length){C.phone=s.phones[0];C.tel=telOf(s.phones[0]);C.phone2=s.phones[1]||'';C.tel2=s.phones[1]?telOf(s.phones[1]):'';F.t=C.phone}
 if(s.mobiles&&s.mobiles.length){C.mobile=s.mobiles[0];C.mtel=telOf(s.mobiles[0]);C.mobile2=s.mobiles[1]||'';C.mtel2=s.mobiles[1]?telOf(s.mobiles[1]):''}
 if(s.whatsapp){C.whatsapp=String(s.whatsapp).replace(/\D/g,'');C.wa='https://wa.me/'+C.whatsapp+'?text='+encodeURIComponent(C.waText||'')}
 if(s.email)C.email=s.email;
 if(s.hours){C.hours=s.hours;C.hoursNote=s.hours}
 if(s.map&&isFinite(s.map.lat)&&isFinite(s.map.lng)&&s.map.lat!==null&&s.map.lng!==null){O.lat=+s.map.lat;O.lng=+s.map.lng;F.lat=O.lat;F.lng=O.lng}
 /* socials: [[name,url]] or [{name,url}]; LinkedIn is kept from the built-in list when the store has none */
 if(Array.isArray(s.socials)&&s.socials.length&&DX.social){
  var m=s.socials.map(function(x){return Array.isArray(x)?x:[x.name||x.label||x.network,x.url||x.href]}).filter(function(x){return x[0]&&/^https:\/\//.test(x[1]||'')});
  if(m.length){if(!m.some(function(x){return/linkedin/i.test(x[0])}))m=m.concat(FALLBACK_SOCIAL.filter(function(x){return/linkedin/i.test(x[0])}));DX.social.splice.apply(DX.social,[0,DX.social.length].concat(m))}}}
function applyTeam(t){if(!t||!t.length||!DX.team)return;
 /* the licence number lives in the bio ("ECANZ licence 2510455"): seven digits */
 var rows=t.filter(function(x){return x&&x.name}).map(function(x){var m=String(x.bio||'').match(/\b\d{7}\b/);return[x.name,x.role||'',m?m[0]:'']});
 DX.team.splice.apply(DX.team,[0,DX.team.length].concat(rows))}
function grpOf(n){n=norm(n);if(!n)return null;if(n==='u'||/^universit/.test(n))return'u';if(n==='p'||/private|pte/.test(n))return'p';if(n==='i'||/polytechnic|institute of technology|itp|government/.test(n))return'i';return null}
function applyUnis(list){if(!list||!list.length||!DX.P)return;var by={},live=DX.C.map(function(c){return c.slug});
 DX.P.forEach(function(p){by[norm(p.name)]=p});
 var np=list.filter(function(u){return u&&u.name&&live.indexOf(u.country)>-1}).map(function(u){var o=by[norm(u.name)]||{},m=u.logo||null,src=m?relSrc(m.src||m.full||''):'',same=src&&o.logo===src;
  var logoD=same?o.logoD:src&&/^img\/logos\/[^/]+\.webp$/.test(src)?src.replace(/\.webp$/,'-d.webp'):src;   /* dark-theme logo: the site's own <slug>-d.webp; an upload has none, so the same file */
  var lw=same?o.lw:(m&&m.width)||(o.lw||300),lh=same?o.lh:(m&&m.height)||(o.lh||128);
  return{name:u.name,country:u.country,grp:grpOf(u.note)||o.grp||null,logo:src||(m?null:o.logo||null),logoD:src?logoD:(m?null:o.logoD||null),lw:lw,lh:lh,url:u.url||null}});
 if(!np.length)return;
 DX.P.splice.apply(DX.P,[0,DX.P.length].concat(np));
 if(DX.PN)DX.PN.splice.apply(DX.PN,[0,DX.PN.length].concat(np.map(function(p){return p.name})))}
function applyFaqs(f){if(!f||!DX.faq)return;var g=f.filter(function(x){return x&&x.question&&(!x.page||x.page==='general')}).map(function(x){return[x.question,x.answer||'']});
 if(g.length)DX.faq.splice.apply(DX.faq,[0,DX.faq.length].concat(g))}
var GL=[['tuition_ug','Tuition, undergraduate'],['tuition_pg','Tuition, postgraduate'],['living','Living costs'],['english_req','English'],['work_after_study','Work after study'],['intakes','Intakes']];
function applyFacts(cf){if(!cf)return;DX.C.forEach(function(c){var f=cf[c.slug];if(!f||!c.glance)return;
 GL.forEach(function(k){var v=f[k[0]];if(!v)return;var r=c.glance.filter(function(g){return g[0]===k[1]})[0];if(r)r[1]=v;else c.glance.push([k[1],v])})})}
function applyData(b){try{applySettings(b.site_settings)}catch(e){}try{applyTeam(b.team)}catch(e){}try{applyUnis(b.universities)}catch(e){}try{applyFaqs(b.faqs)}catch(e){}try{applyFacts(b.country_facts)}catch(e){}}

/* ---------- shared page parts ---------- */
/* contact facts that were already written into the page (header, footer, page text, links): swap the shown value for the new one */
function snap(){var C=DX.contact||{},O=DX.office||{};return{phone:C.phone,phone2:C.phone2,tel:C.tel,tel2:C.tel2,mobile:C.mobile,mobile2:C.mobile2,mtel:C.mtel,mtel2:C.mtel2,whatsapp:C.whatsapp,email:C.email,address:O.address,hours:C.hoursNote}}
var SHOWN=null;
function swapContact(){var now=snap(),old=SHOWN;SHOWN=now;if(!old)return;
 var pairs=Object.keys(now).filter(function(k){return old[k]&&now[k]&&old[k]!==now[k]&&String(old[k]).length>=6}).map(function(k){return[String(old[k]),String(now[k])]});
 if(!pairs.length)return;
 var tw=D.createTreeWalker(D.body,NodeFilter.SHOW_TEXT,null),n,list=[];while((n=tw.nextNode()))list.push(n);
 list.forEach(function(t){var v=t.nodeValue,o=v;pairs.forEach(function(p){if(v.indexOf(p[0])>-1)v=v.split(p[0]).join(p[1])});if(v!==o)t.nodeValue=v});
 [].forEach.call(D.querySelectorAll('a[href^="tel:"],a[href^="mailto:"],a[href*="wa.me/"]'),function(a){var h=a.getAttribute('href'),o=h;
  pairs.forEach(function(p){if(h.indexOf(p[0])>-1)h=h.split(p[0]).join(p[1])});if(h!==o)a.setAttribute('href',h)})}
/* the notice line: inside the header, after .hdr-in, so it hides with the header */
function notice(n){var h=D.querySelector('header.hdr');if(!h)return;var el=h.querySelector('.dx-ntc');
 if(!n||!n.text){if(el)el.remove();return}
 if(!D.getElementById('dxNtcCss')){var st=D.createElement('style');st.id='dxNtcCss';
  st.textContent='.dx-ntc{margin:0;padding:8px 20px 9px;text-align:center;font:500 13px/1.4 var(--sans,system-ui);letter-spacing:.01em;background:#7a1f4b;color:#fff}'
   +'.dx-ntc a{color:inherit;text-decoration:underline;text-underline-offset:3px}:root[data-theme=dark] .dx-ntc{background:#eaa3cf;color:#161616}';
  D.head.appendChild(st)}
 if(!el){el=D.createElement('p');el.className='dx-ntc';el.setAttribute('role','status');var hi=h.querySelector('.hdr-in');if(hi&&hi.nextSibling)h.insertBefore(el,hi.nextSibling);else h.appendChild(el)}
 var safe=n.link&&/^(https:\/\/|\/|[a-z0-9-]+\.html)/i.test(n.link)?n.link:'';
 el.innerHTML=safe?'<a href="'+esc(safe)+'"'+(/^https:/.test(safe)?' target="_blank" rel="noopener"':'')+'>'+esc(n.text)+'</a>':esc(n.text)}
/* the page banner: text only (eyebrow, headline + italic accent, lead), written into the hero that is already there; nothing happens when it matches */
var PAGEKEY={home:'home',events:'events',gallery:'gallery',videos:'videos',blogs:'blog','test-preparation':'test-prep',stories:'stories',universities:'universities',about:'about',contact:'contact',destinations:'destinations'};
function bannerFor(b){var pg=D.body&&D.body.dataset.page,k=PAGEKEY[pg];
 if(pg==='country'){var c=Q.get('c');c=({uk:'united-kingdom',us:'usa',au:'australia',nz:'new-zealand'})[c]||c;k='country:'+c}
 var l=k&&b.banners&&b.banners[k];return l&&l[0]||null}
function heroRoot(){return D.querySelector('.hero-c')||D.querySelector('#hc')||(D.getElementById('hH')&&D.getElementById('hH').closest('section'))}
function banner(b){var x=b&&bannerFor(b),r=x&&heroRoot();if(!r)return;var h=r.querySelector('h1');
 var set=function(sel,t){var e=r.querySelector(sel);if(e&&t&&norm(e.textContent)!==norm(t))e.textContent=t};
 set('.eyebrow',x.eyebrow);set('.lead',x.lead);
 if(h&&x.headline){var want=x.headline+(x.accent?' '+x.accent:'');if(norm(h.textContent)===norm(want))return;
  var acc=x.accent?'<em>'+esc(x.accent)+'</em>':'';
  h.innerHTML=h.querySelector('.ln')?'<span class="ln"><span>'+esc(x.headline)+'</span></span>'+(acc?'<span class="ln"><span>'+acc+'</span></span>':''):esc(x.headline)+(acc?' '+acc:'')}}

/* ---------- state, subscribers ---------- */
var DATA=null,subs=[];
function changedAreas(a,b){return AREAS.filter(function(k){return !a||JSON.stringify(a[k])!==JSON.stringify(b[k])})}
function fire(changed){subs.forEach(function(f){try{f(DATA,changed)}catch(e){}});try{W.dispatchEvent(new CustomEvent('dx:live',{detail:{data:DATA,changed:changed}}))}catch(e){}}
DX.live={get data(){return DATA},lang:LANG,
 on:function(fn){subs.push(fn);if(DATA)try{fn(DATA,null)}catch(e){}},
 banner:function(){if(DATA)try{banner(DATA)}catch(e){}},
 api:api,esc:esc,norm:norm,relSrc:relSrc};

/* 1. the cached bundle of this tab, before anything renders */
var cache=null;if(!PREVIEW)try{cache=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch(e){cache=null}
if(cache&&cache.b){DATA=cache.b;applyData(DATA);try{banner(DATA)}catch(e){}}
SHOWN=snap();
/* after every DOMContentLoaded handler (site.js builds the header and the page there); deferred scripts run while readyState is already 'interactive' */
var Q2=[],DOMOK=D.readyState==='complete';
if(!DOMOK)D.addEventListener('DOMContentLoaded',function(){setTimeout(function(){DOMOK=true;Q2.splice(0).forEach(function(f){f()})},0)});
function ready(fn){if(DOMOK)setTimeout(fn,0);else Q2.push(fn)}
ready(function(){if(DATA){try{notice(DATA.notice)}catch(e){}try{banner(DATA)}catch(e){}}});

/* is the Dolphin server behind this page? (the same once-per-tab check as js/chat.js: it always sends security headers, a static server does not) */
var apiP=null;
function api(){if(apiP)return apiP;var c=null;try{c=sessionStorage.getItem('dxc-api')}catch(e){}
 if(c)return(apiP=Promise.resolve(c==='1'));
 if(location.protocol==='file:'||!W.fetch)return(apiP=Promise.resolve(false));
 apiP=fetch(location.pathname,{method:'HEAD',credentials:'same-origin',cache:'no-store'})
  .then(function(r){return!!(r.headers.get('content-security-policy')||r.headers.get('x-content-type-options'))},function(){return false})
  .then(function(ok){try{sessionStorage.setItem('dxc-api',ok?'1':'0')}catch(e){}return ok});
 return apiP}

/* 2. the live bundle */
function load(){api().then(function(ok){if(!ok)return;
 var ctl=W.AbortController?new AbortController():null,t=ctl&&setTimeout(function(){ctl.abort()},2500),h={Accept:'application/json'};
 if(cache&&cache.e)h['If-None-Match']=cache.e;
 return fetch('/api/site/bundle?lang='+LANG+(PREVIEW?'&preview='+encodeURIComponent(PREVIEW):''),{headers:h,cache:'no-store',credentials:'same-origin',signal:ctl?ctl.signal:undefined})
  .then(function(r){if(t)clearTimeout(t);if(!r.ok)return null;var e=r.headers.get('ETag');return r.text().then(function(x){return{e:e,x:x}})})
  .then(function(r){if(!r)return;var b=JSON.parse(r.x);if(!b||typeof b!=='object')return;
   if(!PREVIEW)try{sessionStorage.setItem(KEY,JSON.stringify({e:r.e,b:b}))}catch(e){}
   var ch=changedAreas(DATA,b);DATA=b;if(!ch.length)return;
   applyData(b);
   ready(function(){try{swapContact()}catch(e){}try{notice(b.notice)}catch(e){}try{banner(b)}catch(e){}
    /* the homepage partner wall (js/pages/home-v8.js renders it once) */
    if(ch.indexOf('universities')>-1&&DX.partnerWall){var pw=D.querySelector('#pwHome .pw-g');if(pw)try{pw.outerHTML=DX.partnerWall()}catch(e){}}
    fire(ch)})})})
 .catch(function(){})}
load();

/* 3. page view (honours DNT on the server; never in a preview) */
if(!PREVIEW)api().then(function(ok){if(!ok||!navigator.sendBeacon)return;
 try{navigator.sendBeacon('/api/hit',JSON.stringify({path:location.pathname.replace(/^\/site(?=\/)/,'')+location.search,ref:D.referrer||'',lang:LANG}))}catch(e){}});
})();
