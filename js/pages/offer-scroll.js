/* offer-scroll.js (2026-10-31): the home "What we offer / Four ways we help" section (#offer) as a sticky photo swap.
   Markup: every service row (ul.of-l > li) carries its own photo (figure.of-f), so the list stays the one source of truth.
   Desktop (>= 901 px): the four photos are moved into one sticky frame (.of-st .of-fr) on the right. The row whose top has crossed the middle of the
     screen is the active one: its photo gets .is-on (crossfade + soft clip reveal + 1.06 -> 1 scale settle, all CSS transitions in css/pages/home-v8.css,
     block "What we offer, sticky photo swap"), its row gets .is-act (brand-gradient title, others dimmed) and the caption under the frame shows its name.
   Phones / tablets (<= 900 px): the photos go back into their rows (above the text) and fade in once as they enter.
   One passive scroll listener (rAF-throttled, only while the section is near the screen), classes only: no inline transforms, so the watermark
   (js/core/imgfx.js DX.wm, a span inside each figure) moves with its photo and never scales. Reduced motion: CSS makes every change instant.
   js/core/reveal.js and the view-motion exit layer leave this section alone (#offer in reveal.js OWN, data-no-vm on the section). */
(function(){
var W=window,D=document;
function init(){
 var sec=D.getElementById('offer');if(!sec||sec._ofs)return;sec._ofs=1;
 var list=sec.querySelector('.of-l'),stk=sec.querySelector('.of-stk'),fr=sec.querySelector('.of-fr'),cap=sec.querySelector('.of-cap');if(!list||!fr||!cap)return;
 var rows=[].slice.call(list.children).filter(function(li){return li.querySelector('.of-f')});if(!rows.length)return;
 var figs=rows.map(function(li){return li.querySelector('.of-f')});
 var caps=rows.map(function(){var s=D.createElement('span');cap.appendChild(s);return s});
 var mq=matchMedia('(min-width:901px)'),pinned=null,act=-1,raf=0,near=false,fio=null;
 function name(i){var h=rows[i].querySelector('.of-h');return h?h.textContent.replace(/\s+/g,' ').trim():''}
 function frame(im,desk){var p=desk?im.dataset.pos:(im.dataset.pm||im.dataset.pos);if(p)im.style.objectPosition=p}
 function set(i){if(i===act)return;act=i;
  figs.forEach(function(f,k){f.classList.toggle('is-on',k===i)});
  rows.forEach(function(r,k){r.classList.toggle('is-act',k===i)});
  caps.forEach(function(s,k){if(k===i)s.textContent=name(k);s.classList.toggle('is-on',k===i)})}
 /* the active row: the last one whose top has passed the middle of the screen (the first one until then, the last one after the list) */
 function pick(){raf=0;if(!pinned)return;var y=W.innerHeight*.5,i=0;
  for(var k=0;k<rows.length;k++)if(rows[k].getBoundingClientRect().top<=y)i=k;set(i)}
 /* sticky offset: frame + caption centred in the part of the screen under the header (never under it) */
 function place(){if(!stk)return;if(!pinned){stk.style.top='';return}
  var hh=parseFloat(getComputedStyle(D.documentElement).getPropertyValue('--hdr'))||68,H=W.innerHeight,h=stk.offsetHeight;
  stk.style.top=Math.round(Math.max(hh+16,hh+(H-hh-h)/2))+'px'}
 function onScroll(){if(near&&pinned&&!raf)raf=requestAnimationFrame(pick)}
 /* phones: each photo fades in once as it enters (anything already on screen is shown at once, no blink) */
 function reveal(){if(!('IntersectionObserver' in W)){figs.forEach(function(f){f.classList.add('of-in')});return}
  if(!fio)fio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('of-in');fio.unobserve(e.target)}})},{rootMargin:'0px 0px -12% 0px'});
  figs.forEach(function(f){if(f.classList.contains('of-in'))return;var r=f.getBoundingClientRect();if(r.top<W.innerHeight&&r.bottom>0)f.classList.add('of-in');else fio.observe(f)})}
 function mode(){var desk=mq.matches;if(desk===pinned)return;pinned=desk;
  figs.forEach(function(f,i){if(desk)fr.appendChild(f);else rows[i].insertBefore(f,rows[i].firstChild);
   f.classList.remove('is-on');var im=f.querySelector('img');if(im)frame(im,desk)});
  sec.classList.toggle('of-pin',desk);act=-1;
  place();
  if(desk){if(fio)fio.disconnect();figs.forEach(function(f){f.classList.add('of-in')});pick()}
  else{rows.forEach(function(r){r.classList.remove('is-act')});caps.forEach(function(s){s.classList.remove('is-on')});reveal()}}
 caps.forEach(function(s,k){s.textContent=name(k)});
 sec.classList.add('of-js');
 mode();
 if(mq.addEventListener)mq.addEventListener('change',mode);else if(mq.addListener)mq.addListener(mode);
 if('IntersectionObserver' in W)new IntersectionObserver(function(es){near=es[0].isIntersecting;if(near)onScroll()},{rootMargin:'20% 0px 20% 0px'}).observe(sec);else near=true;
 W.addEventListener('scroll',onScroll,{passive:true});
 W.addEventListener('load',place);
 var rt=0;W.addEventListener('resize',function(){clearTimeout(rt);rt=setTimeout(function(){place();onScroll()},120)},{passive:true});
 /* the language switcher rewrites the titles: keep the caption in step */
 new MutationObserver(function(){if(act>-1)caps[act].textContent=name(act)}).observe(list,{subtree:true,characterData:true,childList:true});
}
/* after DOMContentLoaded handlers that ran first (site.js DX.page expands data-ph and writes the desktop object-position), so ours wins */
if(D.readyState==='loading')D.addEventListener('DOMContentLoaded',function(){setTimeout(init,0)});else init();
})();
