/* Gallery page only (2026-10-31).
   1. Self-contained photo expansion, the same as js/page-events.js: this page does not load pages-v7.js / home-v8.js (where DX.phExpand lives),
      so data-ph images get their src/srcset here from window.DX_PH (js/photos.js, loaded first). Every img carries data-alt-max="0" so imgfx.js
      never swaps in a portrait alternate (two of them belong to the homepage).
   2. Editorial layout: the visible tiles are dealt sizes in blocks that fill the six-column grid exactly (L+T, S+S+S, T+L, W+W; on phones F, P+P),
      so a filtered set never leaves holes. The data-s values in the HTML are the "All" layout, used without JS.
   3. Filter: buttons with aria-pressed hide tiles of other chapters; the status line (chapter name, no counts) is a polite live region. The hero's Browse links set the filter
      before jumping to the grid. Without JS the bar stays hidden (CSS shows it under html.js) and every photo is visible.
   4. Lightbox: native <dialog> via showModal. Previous/Next buttons and the arrow keys walk the visible photos, Esc closes, and focus goes back to the
      link of the photo on screen. Each photo is a link to its large file, so it still opens without JS. */
(function(){
 var NAMES={office:'Office and events',tests:'Test preparation',visits:'Institution visits',life:'Student outings',grad:'Graduation'};
 var PHONE=window.matchMedia?matchMedia('(max-width:700px)'):{matches:false};

 function photos(){
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
   var f=im.closest('.gl-fr,figure');if(f&&m.c)f.style.setProperty('--phc',m.c);   /* the frame shows the photo's own colour while it loads */
   im.removeAttribute('data-ph')
  })(imgs[i])}
 }

 var grid,items,shown;
 function visible(){return items.filter(function(li){return!li.hidden})}

 /* deal tile sizes to the visible tiles */
 function layout(){
  shown=visible();
  var phone=PHONE.matches,cyc=phone?[['F'],['P','P']]:[['L','T'],['S','S','S'],['T','L'],['W','W']];
  var rest={1:['F'],2:phone?['P','P']:['W','W'],3:phone?['F','P','P']:['S','S','S']};
  var out=[],k=0;
  while(out.length<shown.length){
   var left=shown.length-out.length,b=cyc[k%cyc.length];k++;
   if(b.length>left)b=rest[left];
   out=out.concat(b)
  }
  shown.forEach(function(li,i){li.dataset.s=out[i]});
  requestAnimationFrame(function(){
   if(window.DX&&DX.fit)grid.querySelectorAll('img').forEach(function(im){try{DX.fit(im)}catch(e){}});
   if(window.ScrollTrigger)window.ScrollTrigger.refresh()
  })
 }

 function filter(){
  var bar=document.querySelector('.gl-filt'),out=document.getElementById('glCount');
  if(!bar)return;
  var btns=[].slice.call(bar.querySelectorAll('button[data-f]'));
  function set(f){
   var b=btns.filter(function(x){return x.dataset.f===f})[0]||btns[0],n=0;f=b.dataset.f;
   btns.forEach(function(x){x.setAttribute('aria-pressed',x===b?'true':'false')});
   items.forEach(function(li){var show=f==='all'||li.dataset.t===f;li.hidden=!show;if(show)n++});
   if(out)out.textContent=f==='all'?'Showing every chapter':NAMES[f];   /* 2026-10-31: no visible counts (house rule) */
   layout()
  }
  bar.addEventListener('click',function(e){var b=e.target.closest('button[data-f]');if(b)set(b.dataset.f)});
  [].forEach.call(document.querySelectorAll('.gl-browse a[data-go]'),function(a){a.addEventListener('click',function(){set(a.dataset.go)})});
 }

 function lightbox(){
  var dlg=document.getElementById('glLb');
  if(!dlg||typeof dlg.showModal!=='function')return;   /* no <dialog> support: the links open the large file */
  var img=document.getElementById('glLbImg'),cap=document.getElementById('glLbCap'),kk=document.getElementById('glLbK'),nn=document.getElementById('glLbN'),note=dlg.querySelector('.gl-lb-note');
  var cur=null;
  function show(li){
   cur=li;
   var g=li.querySelector('.gl-fr img');
   img.removeAttribute('srcset');img.src=g.currentSrc||g.src;   /* the size already loaded shows at once, then the large one */
   if(g.srcset){img.sizes='(max-width:700px) 100vw, 86vw';img.srcset=g.srcset}
   img.alt=g.alt;
   cap.textContent=li.querySelector('figcaption').textContent;
   kk.textContent='';
   nn.textContent=NAMES[li.dataset.t]||'';   /* the chapter (no 'N of M' count: house rule) */
   if(note)note.hidden=!li.hasAttribute('data-illus')   /* only the stock graduation photographs are illustrative */
  }
  function step(d){var list=shown||visible(),i=list.indexOf(cur);if(i<0)return;show(list[(i+d+list.length)%list.length])}
  grid.addEventListener('click',function(e){
   var a=e.target.closest('a.gl-open');if(!a||e.ctrlKey||e.metaKey||e.shiftKey||e.button)return;
   e.preventDefault();e.stopPropagation();   /* site.js fades the page out and follows any same-site link on document click, even a prevented one */
   show(a.closest('.gl-it'));
   document.documentElement.classList.add('gl-lock');dlg.showModal();
   var x=dlg.querySelector('[data-lb=close]');if(x)x.focus()
  });
  dlg.addEventListener('click',function(e){
   var b=e.target.closest('[data-lb]');if(!b)return;
   var a=b.dataset.lb;if(a==='close')dlg.close();else step(a==='next'?1:-1)
  });
  dlg.addEventListener('keydown',function(e){
   if(e.key==='ArrowRight'){e.preventDefault();step(1)}
   else if(e.key==='ArrowLeft'){e.preventDefault();step(-1)}
  });
  /* swipe on touch screens */
  var sx=null,sy=0,pic=dlg.querySelector('.gl-lb-pic');
  pic.addEventListener('touchstart',function(e){var t=e.touches[0];sx=t.clientX;sy=t.clientY},{passive:true});
  pic.addEventListener('touchend',function(e){if(sx===null)return;var t=e.changedTouches[0],dx=t.clientX-sx,dy=t.clientY-sy;sx=null;if(Math.abs(dx)>50&&Math.abs(dx)>Math.abs(dy))step(dx<0?1:-1)},{passive:true});
  dlg.addEventListener('close',function(){
   document.documentElement.classList.remove('gl-lock');
   var a=cur&&cur.querySelector('a.gl-open');if(a)a.focus({preventScroll:false})
  })
 }

 /* 5. Content Manager store (js/core/site-live.js, 2026-11-01): the bundle's gallery sets the photos, their order, captions and chapters. A tile is matched by its
    photo name (the media file name); photos the store no longer lists are taken out; new uploads are added. The CMS chapter names differ from the page's. */
 var CH={counsel:'office',apply:'tests',campus:'visits',office:'office',tests:'tests',visits:'visits',life:'life',grad:'grad'};
 function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function live(b,ch){if(ch&&ch.indexOf('gallery')<0)return;var G=b&&b.gallery;if(!grid||!G||!G.length)return;
  var R=window.DX&&DX.live?DX.live.relSrc:function(s){return s},by={},keep=[];
  [].forEach.call(grid.querySelectorAll('.gl-it'),function(li){if(li.dataset.k)by[li.dataset.k]=li});
  G.forEach(function(g){var m=g.media;if(!m||!m.filename)return;var k=String(m.filename).replace(/\.[a-z0-9]+$/i,''),li=by[k],t=CH[g.chapter]||'office',cap=g.caption||'';
   if(!li){var PH=window.DX_PH||{},full=R(m.full||m.src||'');li=document.createElement('li');li.className='gl-it';li.dataset.k=k;li.dataset.s='S';
    var im=PH[k]?'<img data-alt-max="0" data-ph="'+esc(k)+'" alt="'+esc(m.alt||'')+'" data-sizes="(max-width:700px) 92vw, 40vw">'
     :'<img data-alt-max="0" src="'+esc(R(m.src||''))+'"'+(m.urls?' srcset="'+esc(Object.keys(m.urls).map(function(w){return R(m.urls[w])+' '+w+'w'}).join(', '))+'" sizes="(max-width:700px) 92vw, 40vw"':'')+(m.width?' width="'+m.width+'" height="'+m.height+'"':'')+' alt="'+esc(m.alt||'')+'" loading="lazy" decoding="async">';
    li.innerHTML='<figure><a class="gl-open" href="'+esc(full)+'"><span class="gl-fr">'+im+'</span></a><figcaption></figcaption></figure>'}
   li.dataset.t=t;var fc=li.querySelector('figcaption');if(fc&&cap&&fc.textContent!==cap)fc.textContent=cap;
   grid.appendChild(li);keep.push(li)});
  if(!keep.length)return;
  [].forEach.call(grid.querySelectorAll('.gl-it'),function(li){if(keep.indexOf(li)<0)li.remove()});
  photos();items=[].slice.call(grid.querySelectorAll('.gl-it'));
  var on=document.querySelector('.gl-filt button[aria-pressed="true"]'),f=on?on.dataset.f:'all';
  items.forEach(function(li){li.hidden=!(f==='all'||li.dataset.t===f)});layout()}
 function run(){
  grid=document.getElementById('glGrid');
  if(grid)[].forEach.call(grid.querySelectorAll('.gl-it'),function(li){var im=li.querySelector('img[data-ph]');if(im)li.dataset.k=im.dataset.ph});
  photos();
  if(!grid)return;
  items=[].slice.call(grid.querySelectorAll('.gl-it'));
  filter();layout();lightbox();
  if(window.DX&&DX.live)DX.live.on(live);
  if(PHONE.addEventListener)PHONE.addEventListener('change',layout);else if(PHONE.addListener)PHONE.addListener(layout)
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
