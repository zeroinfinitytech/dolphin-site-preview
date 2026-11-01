/* Footer globe (sweep v8.4): flight routes from Kathmandu to the live destinations (five since 2026-10-31, Canada restored), drawn on a 2D canvas inside the footer ledger.
   Adapted from DolphinHand/js/globe.js (land dots sampled from the img/land.png mask, great-circle arcs lifted off the surface, burgundy
   Kathmandu marker over a white halo) and globe-scroll.js (camera target per destination = the lifted midpoint of the arc, exponential
   easing of yaw / tilt / zoom, labels placed right or left of the point and hidden near the rim, frames only while something moves).
   Canvas 2D instead of WebGL: one context, no shaders, text drawn in the page font. About 30 fps, pixel ratio capped at 2, paused when the
   canvas is off screen or the tab is hidden; prefers-reduced-motion draws one still globe with every arc. Loaded by site.js chrome() only
   when the footer is near the viewport. window.DXFooterGlobe.mount(host) where host is .ft-globe holding one <canvas>. */
(function(){
'use strict';
var W=window,D=document,PI=Math.PI;
var KATH={lon:85.3,lat:27.7,name:'Kathmandu'};
/* tour order runs west from Kathmandu and on around the world: Toronto, London, New York, Sydney, Auckland, home.
   2026-10-31: Canada (Toronto) restored alongside the other four live destinations (was flagged hidden:1 under sweep v8.16, "4 countries
   for now"); 'canada' is back in LIVE in data.js and Toronto is back in the .ft-globe aria-label in site.js. */
var DEST=[{slug:'canada',name:'Toronto',lon:-79.4,lat:43.7},{slug:'uk',name:'London',lon:-.1,lat:51.5},{slug:'usa',name:'New York',lon:-74,lat:40.7},
 {slug:'australia',name:'Sydney',lon:151.2,lat:-33.9},{slug:'new-zealand',name:'Auckland',lon:174.8,lat:-36.8}].filter(function(d){return!d.hidden});
var SEG=72,STEP=1.9,DWELL=4.4,FINAL=6,FPS=30;
var clamp=function(v,a,b){return Math.min(b,Math.max(a,v))};
var xyz=function(lo,la,r){r=r||1;lo*=PI/180;la*=PI/180;return [r*Math.cos(la)*Math.sin(lo),r*Math.sin(la),r*Math.cos(la)*Math.cos(lo)]};
var wrap=function(a){while(a>PI)a-=2*PI;while(a<-PI)a+=2*PI;return a};
var ease=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
var reduce=W.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches;

/* land mask: img/land.png (720 x 360, white = land), sampled on rows of constant latitude so the dots read as an even grid */
var landDots=null,landCbs=[];
function loadLand(cb){
 if(landDots)return cb(landDots);landCbs.push(cb);if(landCbs.length>1)return;
 var img=new Image();img.decoding='async';
 img.onerror=function(){landCbs.splice(0).forEach(function(f){f(null)})};
 img.onload=function(){
  var Wd=720,Hd=360,c=D.createElement('canvas');c.width=Wd;c.height=Hd;var x=c.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0,Wd,Hd);
  var px=x.getImageData(0,0,Wd,Hd).data,out=[],r=0;
  for(var la=-78;la<=84;la+=STEP,r++){var n=Math.max(1,Math.round(360*Math.cos(la*PI/180)/STEP)),off=(r%2)*.5;
   for(var k=0;k<n;k++){var lo=-180+(k+off)*360/n,iy=clamp(Math.floor((90-la)*2),0,Hd-1),ix=clamp(Math.floor((lo+180)*2),0,Wd-1);
    if(px[(iy*Wd+ix)*4]>127&&px[(iy*Wd+ix)*4+3]>60){var p=xyz(lo,la);out.push(p[0],p[1],p[2])}}}
  landDots=new Float32Array(out);landCbs.splice(0).forEach(function(f){f(landDots)})};
 img.src='img/land.png';
}

function mount(host){
 var cv=host.querySelector('canvas');if(!cv||host._globe)return;host._globe=1;
 var ctx=cv.getContext('2d',{alpha:true});if(!ctx)return;
 var K=xyz(KATH.lon,KATH.lat);
 DEST.forEach(function(it){
  var B=xyz(it.lon,it.lat),om=Math.acos(clamp(K[0]*B[0]+K[1]*B[1]+K[2]*B[2],-1,1)),pts=[];
  for(var i=0;i<=SEG;i++){var u=i/SEG,A=Math.sin((1-u)*om)/Math.sin(om),Bb=Math.sin(u*om)/Math.sin(om),lift=1.003+.3*Math.sin(u*PI)*Math.pow(om/PI,.9);
   pts.push((A*K[0]+Bb*B[0])*lift,(A*K[1]+Bb*B[1])*lift,(A*K[2]+Bb*B[2])*lift)}
  it.pts=pts;it.vec=B;
  /* camera: look at the lifted midpoint of the arc, nudged toward the pole side so both ends stay on the near face */
  var m=[0,1,2].map(function(j){return K[j]*.46+B[j]*.54}),nn=[K[1]*B[2]-K[2]*B[1],K[2]*B[0]-K[0]*B[2],K[0]*B[1]-K[1]*B[0]],nl=Math.hypot(nn[0],nn[1],nn[2])||1,sg=nn[1]>0?-1:1,ml=Math.hypot(m[0],m[1],m[2]);
  m=m.map(function(x,j){return x/ml+sg*.2*nn[j]/nl});ml=Math.hypot(m[0],m[1],m[2]);var c=m.map(function(x){return x/ml});
  it.cam={yaw:-Math.atan2(c[0],c[2]),tilt:clamp(Math.asin(c[1]),-.55,.85),zoom:.9-.06*om/PI};
  it.ap=0});
 var cam={yaw:-KATH.lon*PI/180,tilt:.46,zoom:.86},T={yaw:cam.yaw,tilt:cam.tilt,zoom:cam.zoom};
 var S={size:0,dpr:1,vis:false,raf:0,last:0,idx:-1,t:0,fade:1,body:null,theme:'',dots:null,placed:[]};
 var dark=function(){return D.documentElement.dataset.theme==='dark'};

 function sizeIt(){
  var w=host.clientWidth||cv.clientWidth;if(!w)return;S.dpr=Math.min(W.devicePixelRatio||1,2);S.size=w;
  var px=Math.round(w*S.dpr);if(cv.width!==px||cv.height!==px){cv.width=cv.height=px}
  body();
 }
 /* the sphere (deep navy to soft blue toward the light) and its rim glow are drawn once per size / theme into an offscreen canvas */
 function body(){
  var th=dark()?'d':'l';S.theme=th;var s=S.size,px=Math.round(s*S.dpr),c=D.createElement('canvas');c.width=c.height=px;var x=c.getContext('2d');x.scale(S.dpr,S.dpr);
  var cx=s/2,cy=s/2,R=cam.zoom*s/2;
  var glow=x.createRadialGradient(cx,cy,R*.92,cx,cy,R*1.16);glow.addColorStop(0,th==='d'?'rgba(120,170,230,.42)':'rgba(109,20,40,.34)');glow.addColorStop(.5,th==='d'?'rgba(120,170,230,.12)':'rgba(109,20,40,.1)');glow.addColorStop(1,'rgba(109,20,40,0)');
  x.fillStyle=glow;x.beginPath();x.arc(cx,cy,R*1.16,0,2*PI);x.fill();
  var g=x.createRadialGradient(cx-R*.42,cy-R*.46,R*.1,cx,cy,R*1.02);
  if(th==='d'){g.addColorStop(0,'#1d4a80');g.addColorStop(.55,'#102b4f');g.addColorStop(1,'#161616')}else{g.addColorStop(0,'#1f4f88');g.addColorStop(.55,'#0f2c52');g.addColorStop(1,'#08172e')}
  x.fillStyle=g;x.beginPath();x.arc(cx,cy,R,0,2*PI);x.fill();
  var rim=x.createRadialGradient(cx,cy,R*.78,cx,cy,R);rim.addColorStop(0,'rgba(120,170,230,0)');rim.addColorStop(1,'rgba(120,170,230,.28)');
  x.fillStyle=rim;x.beginPath();x.arc(cx,cy,R,0,2*PI);x.fill();
  S.body=c;
 }
 function proj(x0,y0,z0){
  var ca=Math.cos(cam.yaw),sa=Math.sin(cam.yaw),ct=Math.cos(cam.tilt),st=Math.sin(cam.tilt);
  var x=x0*ca+z0*sa,z=-x0*sa+z0*ca,y2=y0*ct-z*st,z2=y0*st+z*ct,R=cam.zoom*S.size/2;
  return {x:S.size/2+x*R,y:S.size/2-y2*R,z:z2,out:x*x+y2*y2>1};
 }
 function label(name,P,lift,alpha){
  var R=cam.zoom*S.size/2,cx=S.size/2,cy=S.size/2;if(P.z<.14||alpha<=.02)return;
  ctx.font='500 13px "Hanken Grotesk",system-ui,sans-serif';ctx.textBaseline='middle';var w=ctx.measureText(name).width,gap=11,x=P.x+gap,y=P.y+lift;
  var inside=function(a,b){return Math.hypot(a-cx,b-cy)<R*.95};
  if(!(inside(x+w,y)&&inside(x,y))){x=P.x-gap-w;if(!(inside(x,y)&&inside(x+w,y)))return}
  /* neighbouring cities (Sydney / Auckland): a label that would sit on another one moves up a line */
  for(var t=0;t<3;t++){var hit=false;for(var i=0;i<S.placed.length;i++){var q=S.placed[i];if(Math.abs(q[1]-y)<15&&x<q[0]+q[2]+6&&x+w>q[0]-6){hit=true;break}}if(!hit)break;y-=15}
  S.placed.push([x,y,w]);
  ctx.globalAlpha=alpha;ctx.shadowColor='rgba(6,16,32,.9)';ctx.shadowBlur=6;ctx.fillStyle='rgba(255,255,255,.96)';ctx.fillText(name,x,y);ctx.shadowBlur=0;ctx.globalAlpha=1;
 }
 function dot(P,r,fill,alpha){ctx.globalAlpha=alpha==null?1:alpha;ctx.fillStyle=fill;ctx.beginPath();ctx.arc(P.x,P.y,r,0,2*PI);ctx.fill();ctx.globalAlpha=1}
 function draw(all){
  var s=S.size;if(!s)return;ctx.setTransform(S.dpr,0,0,S.dpr,0,0);ctx.clearRect(0,0,s,s);
  if(!S.body||S.theme!==(dark()?'d':'l'))body();ctx.drawImage(S.body,0,0,s,s);
  /* land: three depth buckets so the far edge fades without a fillStyle change per dot */
  var d=S.dots,R=cam.zoom*s/2,sz=Math.max(1.5,R*.0125),ca=Math.cos(cam.yaw),sa=Math.sin(cam.yaw),ct=Math.cos(cam.tilt),st=Math.sin(cam.tilt),cx=s/2,cy=s/2,b0=[],b1=[],b2=[];
  if(d)for(var i=0;i<d.length;i+=3){var x=d[i]*ca+d[i+2]*sa,z=-d[i]*sa+d[i+2]*ca,y2=d[i+1]*ct-z*st,z2=d[i+1]*st+z*ct;if(z2<=0)continue;(z2<.3?b0:z2<.62?b1:b2).push(cx+x*R,cy-y2*R)}
  ctx.fillStyle=dark()?'#cfe2f5':'#dbe9f6';var buckets=[[b0,.3],[b1,.62],[b2,.95]];
  for(var b=0;b<3;b++){var L=buckets[b][0];ctx.globalAlpha=buckets[b][1];for(var k=0;k<L.length;k+=2)ctx.fillRect(L[k]-sz/2,L[k+1]-sz/2,sz,sz)}
  ctx.globalAlpha=1;ctx.lineCap='round';ctx.lineJoin='round';S.placed=[];
  /* arcs: finished ones soft blue, the active one brighter with a glint at its head; clipped just outside the disc so a route over the
     horizon peeks past the rim instead of looping in space */
  var act=S.idx,f=S.fade;ctx.save();ctx.beginPath();ctx.arc(cx,cy,R*1.045,0,2*PI);ctx.clip();
  DEST.forEach(function(it,i){
   var p=all?1:it.ap;if(p<=0)return;var n=Math.floor(p*SEG),isAct=!all&&i===act&&p<1,pts=it.pts,open=false,head=null;
   ctx.beginPath();
   for(var j=0;j<=n;j++){var P=proj(pts[j*3],pts[j*3+1],pts[j*3+2]);if(P.z>0||P.out){if(open)ctx.lineTo(P.x,P.y);else{ctx.moveTo(P.x,P.y);open=true}head=P}else open=false}
   ctx.lineWidth=isAct?1.6:1.2;ctx.strokeStyle=isAct?'rgba(255,255,255,'+(.95*f)+')':'rgba(234,163,207,'+(.72*f)+')';ctx.stroke();
   if(isAct&&head&&n>0){var gl=ctx.createRadialGradient(head.x,head.y,0,head.x,head.y,9);gl.addColorStop(0,'rgba(255,255,255,.9)');gl.addColorStop(.35,'rgba(200,225,250,.45)');gl.addColorStop(1,'rgba(200,225,250,0)');ctx.fillStyle=gl;ctx.beginPath();ctx.arc(head.x,head.y,9,0,2*PI);ctx.fill();dot(head,2.2,'#fff')}
   if(p>=1||all){var Dp=proj(it.vec[0]*1.003,it.vec[1]*1.003,it.vec[2]*1.003);if(Dp.z>0){dot(Dp,2.6,'#fff',.95*f);if(i===act||all)dot(Dp,7,'rgba(255,255,255,.18)',f);label(it.name,Dp,-13,f*(all?1:clamp((it.ap-1)*4+1,0,1)))}}
  });
  ctx.restore();
  var Kp=proj(K[0]*1.004,K[1]*1.004,K[2]*1.004);
  if(Kp.z>0){dot(Kp,9,'rgba(255,255,255,.22)');dot(Kp,5.5,'#fff');dot(Kp,3.6,'#7f161a');label(KATH.name,Kp,-14,1)}
 }
 function target(){
  if(S.idx<0||S.idx>=DEST.length){T.tilt=.42;T.zoom=.84;return}
  var c=DEST[S.idx].cam;T.yaw=c.yaw;T.tilt=c.tilt;T.zoom=c.zoom;
 }
 /* the tour: 0.6 s turn toward the city, 1.8 s of arc, a rest, then the next; after Auckland a slow full turn with every route lit, then it begins again */
 function tick(now){
  S.raf=0;if(now-S.last<1000/FPS-2){S.raf=requestAnimationFrame(tick);return}
  var dt=Math.min(.05,Math.max(.001,(now-S.last)/1000));S.last=now;S.t+=dt;
  if(S.idx<0){S.idx=0;S.t=0;DEST.forEach(function(it){it.ap=0});S.fade=1}
  if(S.idx<DEST.length){
   var it=DEST[S.idx];it.ap=clamp((S.t-.6)/1.8,0,1);if(S.t>=DWELL){S.idx++;S.t=0}
   if(S.idx>=DEST.length){S.idx=DEST.length;S.t=0}
  }else{
   T.yaw=cam.yaw-dt*.16;S.fade=S.t>FINAL-1?clamp(FINAL-S.t,0,1):1;
   if(S.t>=FINAL){S.idx=0;S.t=0;DEST.forEach(function(it){it.ap=0});S.fade=1}
  }
  target();
  var k=1-Math.exp(-dt*2.6),dy=wrap(T.yaw-cam.yaw),dti=T.tilt-cam.tilt;
  cam.yaw+=dy*k;cam.tilt+=dti*k;cam.zoom+=(T.zoom-.04*Math.min(1,Math.abs(dy))-cam.zoom)*k;
  draw(false);
  if(S.vis&&!D.hidden)S.raf=requestAnimationFrame(tick);
 }
 function kick(){if(!S.raf&&S.vis&&!reduce&&S.dots){S.last=performance.now();S.raf=requestAnimationFrame(tick)}}
 /* reduced motion: one still frame seen from above the northern routes, every arc drawn */
 function still(){cam.yaw=-(KATH.lon-30)*PI/180;cam.tilt=.72;cam.zoom=.86;Object.assign(T,cam);body();draw(true)}
 function start(){
  sizeIt();
  if(reduce){still();return}
  draw(false);kick();
 }
 loadLand(function(d){if(!d){host.classList.add('off');return}S.dots=d;host.classList.add('on');start()});
 if(W.IntersectionObserver)new IntersectionObserver(function(es){S.vis=es[0].isIntersecting;if(S.vis)kick();else if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}},{rootMargin:'80px 0px',threshold:0}).observe(cv);else S.vis=true;
 D.addEventListener('visibilitychange',function(){if(!D.hidden)kick()});
 var rs=0;function onResize(){clearTimeout(rs);rs=setTimeout(function(){if(!S.dots)return;sizeIt();if(reduce)still();else{draw(false);kick()}},120)}
 if(W.ResizeObserver)new ResizeObserver(onResize).observe(host);else W.addEventListener('resize',onResize);
 new MutationObserver(function(){if(!S.dots)return;body();if(reduce)still();else{draw(false);kick()}}).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
 host._globe={pause:function(){S.vis=false;if(S.raf){cancelAnimationFrame(S.raf);S.raf=0}},running:function(){return !!S.raf},
  frame:function(){var t=performance.now();draw(false);return performance.now()-t}}; /* draw cost in ms, for tests */
}
W.DXFooterGlobe={mount:mount,DEST:DEST,KATH:KATH};
})();
