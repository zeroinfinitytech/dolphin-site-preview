/* Test preparation page only (2026-10-31): self-contained photo expansion, the same as the one at the foot of gallery.html.
   This page does not load pages-v7.js / home-v8.js (where DX.phExpand lives), so data-ph images get their src/srcset here from window.DX_PH (js/photos.js, loaded first). */
(function(){
 function run(){
  var PH=window.DX_PH||{};
  var imgs=document.querySelectorAll('img[data-ph]');
  for(var i=0;i<imgs.length;i++){(function(im){
   var n=im.dataset.ph,m=PH[n];if(!m)return;
   var ws=[800,1200,1600,2400,3200].filter(function(w){return w<=m.w});if(!ws.length)ws=[m.w];
   var src=function(w){return'img/photos/'+n+'-'+w+'.webp'};
   im.src=src(Math.min(1600,ws[ws.length-1]));
   im.srcset=ws.map(function(w){return src(w)+' '+w+'w'}).join(', ');
   im.sizes=im.dataset.sizes||'100vw';im.width=m.w;im.height=m.h;
   if(!im.hasAttribute('loading'))im.loading='lazy';im.decoding='async';
   if(im.dataset.pos)im.style.objectPosition=im.dataset.pos;
   var f=im.closest('figure');if(f&&m.c)f.style.setProperty('--phc',m.c);
   im.removeAttribute('data-ph')
  })(imgs[i])}
 }
 /* Content Manager store (js/core/site-live.js, 2026-11-01): each published test-prep class adds a "Classes" row (schedule, mode, fee, next batch) to its test's facts.
    Without the store the facts stay exactly as written in the page. */
 function day(iso){try{return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'long',year:'numeric'}).format(new Date(iso+'T12:00:00'))}catch(e){return iso}}
 function live(b,ch){if(ch&&ch.indexOf('test_classes')<0)return;var T=(b&&b.test_classes)||[];
  ['ielts','pte','toefl'].forEach(function(t){var dl=document.querySelector('#'+t+' .tp-dl');if(!dl)return;
   var mine=T.filter(function(c){return c.test===t}),row=dl.querySelector('[data-live=classes]');
   if(!mine.length){if(row)row.remove();return}
   if(!row){row=document.createElement('div');row.dataset.live='classes';row.innerHTML='<dt>Classes</dt><dd></dd>';dl.insertBefore(row,dl.firstChild)}
   row.querySelector('dd').textContent=mine.map(function(c){return[c.schedule,c.mode,c.fee,c.next_start?'next batch starts '+day(c.next_start):''].filter(Boolean).join(', ')}).join('. ')+'.'})}
 /* "From first test to test day": photo drift + the step being read, desktop only (CSS pins the left column) */
 function method(){var sec=document.getElementById('method'),ol=sec&&sec.querySelector('.tp-steps'),fig=sec&&sec.querySelector('.tp-ph-m');if(!ol||!fig)return;
  var mq=matchMedia('(min-width:901px) and (prefers-reduced-motion:no-preference)'),li=[].slice.call(ol.querySelectorAll('li')),raf=0;
  function frame(){raf=0;if(!mq.matches){ol.classList.remove('tp-live');return}ol.classList.add('tp-live');
   var vh=innerHeight,r=sec.getBoundingClientRect(),p=Math.min(1,Math.max(0,(vh-r.top)/(r.height+vh)));fig.style.setProperty('--tpy',(-15+15*p).toFixed(2)+'%');
   /* the reading hold pins the whole list, so the step being read follows progress through the section, not its position */
   var q=Math.min(.999,Math.max(0,(vh*.35-r.top)/Math.max(1,r.height-vh*.6))),k=Math.floor(q*li.length);
   li.forEach(function(e,i){e.classList.toggle('is-on',i===k)})}
  function req(){if(!raf)raf=requestAnimationFrame(frame)}
  addEventListener('scroll',req,{passive:true});addEventListener('resize',req);if(mq.addEventListener)mq.addEventListener('change',req);frame()}
 function start(){run();method();if(window.DX&&DX.live)DX.live.on(live)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
