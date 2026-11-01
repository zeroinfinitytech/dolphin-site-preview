/* Dolphin home, premium copy: the view drifts right as you scroll down, without moving a single frame.
   Every section stays exactly one screen, pinned by the scene engine (js/core/scenes.js, untouched). Inside each photo frame (figure.ph) the picture sits on a
   wrapper that is 15% wider than the frame on BOTH sides; the wrapper drifts sideways with the scroll, so the photo travels left (the view travels right).
   Nothing outside the frame ever moves, so no gap can show. Text, buttons and the engine's own transforms are not touched: the engine keeps animating the
   img inside the wrapper. At the end of every section the photo has travelled 15vw. */
(function(){
var W=window,D=document;
function start(tries){
 var G=W.gsap,ST=W.ScrollTrigger,E=W.DXScenes,main=D.getElementById('main');
 if(!G||!ST||!main||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 if(!E||!E.topOf||!D.documentElement.classList.contains('scn')){if(tries>40)return;return setTimeout(function(){start(tries+1)},150)}
 var VH=function(){return W.innerHeight};
 [].slice.call(main.querySelectorAll(':scope>section')).forEach(function(sec){
  var run=sec.nextElementSibling&&sec.nextElementSibling.classList.contains('scn-run')?sec.nextElementSibling:null;
  var isL=sec.querySelector('[data-track]'),hold=run?0:(parseFloat(sec.dataset.hold)||0);
  var before=sec.id==='hero'?0:.8,
   rng={trigger:main,scrub:1.2,invalidateOnRefresh:true,
    start:function(){var t=E.topOf(sec);return Math.max(0,(t==null?0:t)-before*VH())},
    end:function(){var t=E.topOf(sec);return(t==null?0:t)+(run?run.offsetHeight:(hold?hold*VH():.5*VH()))+(sec.id==='hero'?.2*VH():0)}};
  /* (sweep v8.1) the text blocks no longer drift: every copy block keeps the shared left edge of the header and footer */
  [].slice.call(sec.querySelectorAll('figure.ph')).forEach(function(ph){
   if(ph.dataset.drift)return;var img=ph.querySelector('img');if(!img)return;ph.dataset.drift=1;
   var w=D.createElement('div');w.className='se-drift';ph.insertBefore(w,img);w.appendChild(img);
   /* extra width on each side of the frame: 10%, 6% above 1800px (sweep v8.1: the 2400px sources must never be drawn wider than 1:1, see IMAGE_NEEDS.md). The drift is 1% less than
      the extra, so the frame is always covered; the L panels drift half as much because the engine already moves their photos. */
   var ext=W.innerWidth>1800?6:10,wide=100+2*ext;
   w.style.left=w.style.right='-'+ext+'%';
   var amt=((ext-1)/wide*100)*(isL?.55:1);
   G.fromTo(w,{xPercent:amt},{xPercent:-amt,ease:'none',scrollTrigger:rng});
  });
 });
 ST.refresh();
}
if(D.readyState==='complete')start(0);else W.addEventListener('load',function(){start(0)});
})();
