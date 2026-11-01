/* Videos page only (2026-10-31).
   0. Photo expansion for the YouTube posters (data-ph, the same as js/page-gallery.js: this page does not load pages-v7.js), and the YouTube links:
      each poster opens the video on YouTube in a new tab. EMBED (off) swaps a poster for a privacy-enhanced youtube-nocookie player in place instead;
      turn it on only after the server CSP (server/index.js) allows frame-src https://www.youtube-nocookie.com (and img-src https://i.ytimg.com for
      YouTube's own thumbnails). Today the CSP has frame-src 'self' only, so an embed would be blocked.
   1. Clips: every <video> in .vd-fr is muted, playsinline, preload="none". With JS the native controls are taken off until the first play (a clean
      poster and one round play button), then given back. A still (<picture>, lazy, phone crop under 700 px) covers the video until it really plays,
      and becomes the video's poster. One clip plays at a time; a clip pauses when less than a quarter of it is on screen. Clicking the picture
      plays or pauses it. The hero clip starts by itself only when motion is allowed and Save-Data is off, and never again once the visitor pauses it.
   2. Rows: the visible grid clips are laid out in rows of different widths with equal heights (flex-grow = aspect ratio); the plan depends on the
      width (phone, tablet, desktop). Without JS the clips sit in a plain grid with native controls.
   3. Country filter: buttons with aria-pressed, a polite status line (country name, no counts) and a link to that country's page. */
(function(){
 var D=document,W=window;
 var RM=W.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;
 var SAVE=!!(navigator.connection&&navigator.connection.saveData);
 var AUTO=!RM&&!SAVE;
 var vids=[],hero=null;
 var EMBED=false;   /* see note 0: needs frame-src https://www.youtube-nocookie.com in the CSP first */

 function photos(){
  var PH=W.DX_PH||{};
  [].forEach.call(D.querySelectorAll('.vd img[data-ph]'),function(im){
   var n=im.dataset.ph,m=PH[n];if(!m)return;
   var ws=[800,1200,1600,2400,3200].filter(function(w){return w<=m.w});if(!ws.length)ws=[m.w];
   var src=function(w){return'img/photos/'+n+'-'+w+'.webp'};
   im.src=src(Math.min(1600,ws[ws.length-1]));
   im.srcset=ws.map(function(w){return src(w)+' '+w+'w'}).join(', ');
   im.sizes=im.dataset.sizes||'100vw';im.width=m.w;im.height=m.h;
   if(!im.hasAttribute('loading'))im.loading='lazy';im.decoding='async';
   if(im.dataset.pos)im.style.objectPosition=im.dataset.pos;
   var f=im.closest('.vd-fr,figure');if(f&&m.c)f.style.setProperty('--phc',m.c);
   im.removeAttribute('data-ph')
  })
 }
 function yt(){
  if(!EMBED)return;   /* default: the links simply open YouTube in a new tab */
  D.addEventListener('click',function(e){
   var a=e.target.closest('a.vd-yl[data-yt]');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
   e.preventDefault();e.stopPropagation();
   var f=D.createElement('iframe');
   f.src='https://www.youtube-nocookie.com/embed/'+encodeURIComponent(a.dataset.yt)+'?autoplay=1&rel=0';
   f.title=(a.getAttribute('aria-label')||'YouTube video').replace(/ \(opens in a new tab\)$/,'');
   f.allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
   f.allowFullscreen=true;f.referrerPolicy='strict-origin-when-cross-origin';f.className='vd-yf';
   a.parentNode.replaceChild(f,a)
  },true)
 }

 function fr(v){return v.closest('.vd-fr')}
 function playing(){for(var i=0;i<vids.length;i++)if(!vids[i].paused)return vids[i];return null}
 function sysPause(v){if(!v.paused){v._sys=1;v.pause()}}
 function others(cur){vids.forEach(function(v){if(v!==cur)sysPause(v)})}
 function start(v){others(v);v.controls=true;fr(v).classList.add('is-wait');var p=v.play();if(p&&p.catch)p.catch(function(){fr(v).classList.remove('is-wait')})}

 function heroAuto(){
  if(!hero||!AUTO||hero._user||!hero._vis||!hero.paused)return;
  var p=playing();if(p&&p!==hero)return;
  start(hero)
 }

 function clips(){
  var io='IntersectionObserver' in W?new IntersectionObserver(function(es){es.forEach(function(e){var v=e.target;
   v._vis=e.isIntersecting&&e.intersectionRatio>=.25;
   if(!v._vis)sysPause(v);
   if(v===hero)heroAuto()})},{threshold:[0,.25,.5]}):null;

  IO=io;[].slice.call(D.querySelectorAll('.vd .vd-fr video')).forEach(wire);
  D.addEventListener('visibilitychange',function(){if(!D.hidden)heroAuto()});
 }
 var IO=null;
 function wire(v){
   if(v._wired)return;v._wired=1;var io=IO;
   var f=fr(v),b=f.querySelector('.vd-play'),im=f.querySelector('.vd-po img');
   vids.push(v);if(f.closest('[data-hero]'))hero=v;
   v.controls=false;v.muted=true;
   /* the still becomes the poster once it has loaded (same file, no second request) */
   if(im){var setP=function(){if(im.currentSrc&&!v.getAttribute('poster'))v.poster=im.currentSrc};if(im.complete)setP();else im.addEventListener('load',setP,{once:true})}
   v.addEventListener('play',function(){others(v);f.classList.add('is-playing');if(b)b.tabIndex=-1});
   v.addEventListener('playing',function(){f.classList.add('is-on');f.classList.remove('is-wait')});
   v.addEventListener('pause',function(){f.classList.remove('is-playing','is-wait');if(b)b.tabIndex=0;if(!v._sys&&!D.hidden)v._user=1;v._sys=0});   /* a pause from the browser hiding the tab is not the visitor's */
   if(b)b.addEventListener('click',function(){v._user=0;start(v);try{v.focus({preventScroll:true})}catch(e){}});
   /* click on the picture: play/pause. Where the browser already toggles it (native controls on), do nothing; ignore clicks on the controls bar */
   v.addEventListener('click',function(e){
    if(v.controls){var r=v.getBoundingClientRect();if(e.clientY>r.bottom-56)return}
    var was=v.paused;
    setTimeout(function(){if(v.paused!==was)return;if(was){v._user=0;start(v)}else v.pause()},0)});
   if(io)io.observe(v)
 }

 /* rows: a plan of aspect ratios per row for n visible clips */
 var mqP=W.matchMedia('(max-width:700px)'),mqT=W.matchMedia('(max-width:1000px)');
 function plan(n){
  var sizes=[],rem=n,k=0,rows=[],c2=0,c3=0;
  if(mqP.matches){if(n<=2)sizes=[n];else{sizes=[1];rem=n-1;while(rem>=2){sizes.push(2);rem-=2}if(rem)sizes.push(1)}}
  else if(mqT.matches){if(n%2){sizes.push(1);rem--}while(rem>0){sizes.push(2);rem-=2}}
  else if(n<=2)sizes=[n];
  else if(n===3)sizes=[1,2];
  else while(rem>0){var s=k%2?3:2;if(s>rem)s=rem;if(rem-s===1)s=s===3?2:s+1;sizes.push(s);rem-=s;k++}
  sizes.forEach(function(s){
   if(mqP.matches)rows.push(s===1?[.8]:[.75,.75]);
   else if(mqT.matches)rows.push(s===1?[1.9]:(c2++%2?[1.05,1.5]:[1.5,1.05]));
   else if(s===1)rows.push([2.2]);
   else if(s===2)rows.push(c2++%2?[1.05,1.9]:[1.9,1.05]);
   else if(s===3)rows.push(c3++%2?[1.6,1.2,1.6]:[1.2,1.6,1.2]);
   else{var a=[];for(var i=0;i<s;i++)a.push(1.3);rows.push(a)}
  });
  return rows
 }
 var grid,all=[],park;
 function layout(){
  if(!grid)return;
  var vis=all.filter(function(c){return!c.hidden}),i=0,frag=D.createDocumentFragment();
  plan(vis.length).forEach(function(ars){var row=D.createElement('div');row.className='vd-row vd-row-'+ars.length;
   ars.forEach(function(a){var c=vis[i++];c.style.setProperty('--ar',a);row.appendChild(c)});frag.appendChild(row)});
  all.forEach(function(c){if(c.hidden)park.appendChild(c)});
  grid.textContent='';grid.appendChild(frag);grid.appendChild(park);grid.classList.add('is-rows');
  if(W.ScrollTrigger)W.ScrollTrigger.refresh()
 }
 function rows(){
  grid=D.getElementById('vdGrid');if(!grid)return;
  all=[].slice.call(grid.querySelectorAll('.vd-clip'));
  park=D.createElement('div');park.className='vd-park';park.setAttribute('aria-hidden','true');
  layout();
  var on=function(){layout()};
  [mqP,mqT].forEach(function(m){if(m.addEventListener)m.addEventListener('change',on);else if(m.addListener)m.addListener(on)})
 }

 var GO={uk:['united-kingdom','Explore the United Kingdom'],us:['usa','Explore the USA'],au:['australia','Explore Australia'],nz:['new-zealand','Explore New Zealand']};
 function filter(){
  var bar=D.querySelector('.vd-filt'),out=D.getElementById('vdCount'),go=D.getElementById('vdGo');
  if(!bar||!all.length)return;
  var btns=bar.querySelectorAll('button[data-f]');
  bar.addEventListener('click',function(e){
   var b=e.target.closest('button[data-f]');if(!b)return;
   var f=b.dataset.f,n=0;
   for(var i=0;i<btns.length;i++)btns[i].setAttribute('aria-pressed',btns[i]===b?'true':'false');
   all.forEach(function(c){var show=f==='all'||c.dataset.c===f;if(!show){var v=c.querySelector('video');if(v)sysPause(v)}c.hidden=!show;if(show)n++});
   if(out)out.textContent=f==='all'?'Showing every country':b.textContent.trim();   /* no visible counts (house rule) */
   if(go){if(GO[f]){go.href='country.html?c='+GO[f][0];go.textContent=GO[f][1];go.hidden=false}else go.hidden=true}
   layout()
  })
 }

 /* 4. Content Manager store (js/core/site-live.js, 2026-11-01): the bundle's videos are the destination clips (mp4). A clip is matched by its file name; the store sets
    order, title, caption and country; clips it no longer lists are taken out; a new upload gets the same markup. The YouTube posters above stay as they are. */
 var CC={'united-kingdom':'uk',usa:'us',australia:'au','new-zealand':'nz',canada:'ca'},CN={'united-kingdom':'United Kingdom',usa:'United States',australia:'Australia','new-zealand':'New Zealand',canada:'Canada'};
 function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function keyOf(s){return String(s||'').split('/').pop().replace(/\.[a-z0-9]+$/i,'')}
 function live(b,ch){if(ch&&ch.indexOf('videos')<0)return;var V=b&&b.videos;if(!grid||!V||!V.length)return;
  var R=W.DX&&DX.live?DX.live.relSrc:function(s){return s},by={},keep=[];
  all.forEach(function(c){var ss=c.querySelectorAll('source[type="video/mp4"]'),s=ss[ss.length-1];if(s)by[keyOf(s.getAttribute('src'))]=c});
  V.forEach(function(x){var m=x.media;if(!m||!m.src)return;var k=keyOf(m.src),c=by[k];
   if(!c){c=D.createElement('figure');c.className='vd-clip';var po=x.poster&&x.poster.src?R(x.poster.src):'';
    c.innerHTML='<div class="vd-fr"><video muted playsinline loop preload="none" controls aria-label="'+esc(x.title||'')+'"><source src="'+esc(R(m.src))+'" type="'+esc(m.mime||'video/mp4')+'"></video>'
     +(po?'<picture class="vd-po" aria-hidden="true"><img src="'+esc(po)+'" alt="" width="'+(x.poster.width||1920)+'" height="'+(x.poster.height||1080)+'" loading="lazy" decoding="async"></picture>':'')
     +'<button type="button" class="vd-play" aria-label="Play the '+esc(x.title||'')+' clip"></button></div><figcaption><span class="vd-k"></span><span class="vd-pl"></span><span class="vd-t"></span></figcaption>'}
   if(x.country&&CC[x.country])c.dataset.c=CC[x.country];
   var set=function(s,v){var e=c.querySelector(s);if(e&&v&&e.textContent!==v)e.textContent=v};
   set('.vd-k',CN[x.country]);set('.vd-pl',x.title);set('.vd-t',x.caption);keep.push(c)});
  if(!keep.length)return;
  all.forEach(function(c){if(keep.indexOf(c)<0){var v=c.querySelector('video');if(v)sysPause(v);c.remove()}});
  all=keep;keep.forEach(function(c){var v=c.querySelector('video');if(v&&!v._wired)wire(v)});
  var on=D.querySelector('.vd-filt button[aria-pressed="true"]'),f=on?on.dataset.f:'all';all.forEach(function(c){c.hidden=!(f==='all'||c.dataset.c===f)});
  layout()}
 function run(){photos();yt();rows();clips();filter();if(W.DX&&DX.live)DX.live.on(live);
  /* the YouTube cards rise one by one through the shared Motion layer (js/core/reveal.js); the grid itself is then skipped by imgfx viewMotion */
  if(W.DX&&DX.reveal)DX.reveal(D.querySelectorAll('#ytGrid>.vd-yt'))}
 if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',run);else run();
})();
