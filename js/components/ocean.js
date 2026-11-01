/* Ocean (2026-10-28): a living underwater scene drawn on a canvas behind the footer. Layers back to front: deep gradient, light rays,
   caustic shimmer, far fish, kelp, dolphins, near fish, bubbles and motes. Everything drifts slowly; nothing flashes. Pauses when off screen,
   caps at 2x pixel density, draws one still frame under reduced motion. window.DXOcean.mount(canvas) */
(function(){
var W=window,D=document;
function mount(cv){
 var ctx=cv.getContext('2d',{alpha:false});if(!ctx)return;
 var reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,dark=function(){return D.documentElement.dataset.theme==='dark'};
 var w=0,h=0,dpr=1,t0=performance.now(),last=t0,run=false,raf=0;
 var R=function(a,b){return a+Math.random()*(b-a)};
 /* population */
 var motes=[],bubbles=[],fish=[],kelp=[],dolphins=[];
 function seed(){
  motes=[];for(var i=0;i<90;i++)motes.push({x:Math.random(),y:Math.random(),r:R(.6,2.2),s:R(.004,.012),d:R(0,6.28)});
  bubbles=[];for(i=0;i<26;i++)bubbles.push({x:Math.random(),y:Math.random(),r:R(1.5,5),s:R(.02,.05),w:R(.3,1.2)});
  kelp=[];var n=Math.max(6,Math.round(w/180));for(i=0;i<n;i++)kelp.push({x:(i+R(.2,.8))/n,hgt:R(.22,.46),seg:7,ph:R(0,6.28),wd:R(10,22),hue:R(-10,10)});
  fish=[];for(i=0;i<3;i++){var cx=Math.random(),cy=R(.25,.75),dir=Math.random()<.5?1:-1,m=[];for(var k=0;k<R(9,16);k++)m.push({ox:R(-.08,.08),oy:R(-.04,.04),ph:R(0,6.28),sz:R(5,9)});fish.push({x:cx,y:cy,dir:dir,sp:R(.012,.02),far:i===0,m:m,wob:R(0,6.28)})}
  dolphins=[];for(i=0;i<2;i++)dolphins.push({x:i?-.4:.6,y:R(.3,.55),dir:1,sp:R(.028,.036),sz:R(.11,.15),ph:R(0,6.28),depth:i?.75:1})
 }
 function size(){var r=cv.getBoundingClientRect();dpr=Math.min(2,W.devicePixelRatio||1);w=Math.max(1,Math.round(r.width));h=Math.max(1,Math.round(r.height));cv.width=w*dpr;cv.height=h*dpr;ctx.setTransform(dpr,0,0,dpr,0,0);seed()}
 /* shapes */
 function dolphin(x,y,s,flip,k){ /* k = tail flex -1..1 */
  ctx.save();ctx.translate(x,y);ctx.scale(flip?-s:s,s);
  ctx.beginPath();ctx.moveTo(-50,0);ctx.bezierCurveTo(-30,-14,-6,-18,14,-12);ctx.bezierCurveTo(20,-16,24,-20,28,-19);ctx.bezierCurveTo(25,-14,22,-11,21,-9);
  ctx.bezierCurveTo(30,-7,40,-3,50,0);ctx.bezierCurveTo(44,4,34,8,22,9);ctx.bezierCurveTo(12,14,0,15,-12,11);ctx.bezierCurveTo(-24,12,-36,9,-50,0);ctx.closePath();
  ctx.moveTo(-50,0);ctx.bezierCurveTo(-56,-6-10*k,-62,-10-12*k,-66,-9-12*k);ctx.bezierCurveTo(-60,-3,-58,-1,-56,0);ctx.bezierCurveTo(-58,1,-60,3,-66,9+12*k);ctx.bezierCurveTo(-62,10+10*k,-56,6+8*k,-50,0);ctx.closePath();
  ctx.moveTo(4,6);ctx.bezierCurveTo(8,12,10,16,16,18);ctx.bezierCurveTo(12,12,10,9,6,6);ctx.closePath();
  ctx.fill();ctx.restore()}
 function fishShape(x,y,s,flip,wag){ctx.save();ctx.translate(x,y);ctx.scale(flip?-s:s,s);ctx.beginPath();ctx.moveTo(-4,0);ctx.quadraticCurveTo(0,-2.6,4,0);ctx.quadraticCurveTo(0,2.6,-4,0);ctx.moveTo(-4,0);ctx.lineTo(-6.5,-1.8+wag);ctx.lineTo(-6.5,1.8+wag);ctx.closePath();ctx.fill();ctx.restore()}
 /* frame */
 function draw(now){
  var t=(now-t0)/1000,dk=dark();
  /* water */
  var g=ctx.createLinearGradient(0,0,0,h);
  if(dk){g.addColorStop(0,'#0f2a4a');g.addColorStop(.55,'#161616');g.addColorStop(1,'#040b16')}else{g.addColorStop(0,'#9fd0ea');g.addColorStop(.5,'#4f93c4');g.addColorStop(1,'#1d4f86')}
  ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
  /* light rays from the surface */
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(var i=0;i<7;i++){var px=w*(.1+i*.14)+Math.sin(t*.12+i)*40,wd=w*.06+Math.sin(t*.2+i*1.7)*w*.02,a=(dk?.055:.09)*(0.6+0.4*Math.sin(t*.25+i*2.1));
   var rg=ctx.createLinearGradient(0,0,0,h*.95);rg.addColorStop(0,'rgba(255,255,255,'+a+')');rg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=rg;
   ctx.beginPath();ctx.moveTo(px-wd*.3,0);ctx.lineTo(px+wd*.3,0);ctx.lineTo(px+wd*1.6+h*.25,h*.95);ctx.lineTo(px-wd*1.6+h*.25,h*.95);ctx.closePath();ctx.fill()}
  /* caustic shimmer near the surface */
  for(i=0;i<22;i++){var cx=(i*97.3+t*18)%(w+200)-100,cy=h*.06+Math.sin(t*.7+i*1.3)*h*.03,rr=R(0,0)+30+((i*37)%40);
   var cg=ctx.createRadialGradient(cx,cy,0,cx,cy,rr);cg.addColorStop(0,'rgba(255,255,255,'+(dk?.05:.09)+')');cg.addColorStop(1,'rgba(255,255,255,0)');ctx.fillStyle=cg;ctx.beginPath();ctx.ellipse(cx,cy,rr,rr*.35,0,0,6.283);ctx.fill()}
  ctx.restore();
  /* far fish (small, soft) */
  fish.forEach(function(f){if(!f.far)return;drawSchool(f,t,dk?'rgba(140,180,210,.35)':'rgba(10,40,80,.22)',.7)});
  /* kelp */
  kelp.forEach(function(k,ki){var bx=k.x*w,base=h+4,len=k.hgt*h;ctx.beginPath();ctx.moveTo(bx-k.wd/2,base);var px=bx,py=base;
   for(var s=1;s<=k.seg;s++){var p=s/k.seg,sway=Math.sin(t*.6+k.ph+p*2.2)*(14+22*p)*p;var nx=bx+sway,ny=base-len*p;ctx.quadraticCurveTo(px-k.wd*(1-p)*.5,(py+ny)/2,nx-k.wd*(1-p)/2,ny);px=nx;py=ny}
   ctx.lineTo(px+k.wd*.15,py);for(s=k.seg-1;s>=0;s--){p=s/k.seg;sway=Math.sin(t*.6+k.ph+p*2.2)*(14+22*p)*p;nx=bx+sway;ny=base-len*p;ctx.lineTo(nx+k.wd*(1-p)/2,ny)}
   ctx.closePath();ctx.fillStyle=dk?'rgba(6,24,40,'+(0.55+ki%3*.12)+')':'rgba(14,62,96,'+(0.42+ki%3*.12)+')';ctx.fill()});
  /* dolphins */
  dolphins.forEach(function(d){d.x+=d.sp*d.dir*(1/60);if(d.dir>0&&d.x>1.35){d.x=-.35;d.y=.25+Math.random()*.35}var yy=d.y*h+Math.sin(t*.9+d.ph)*h*.03,sz=d.sz*h/40*d.depth,flex=Math.sin(t*2.4+d.ph);
   ctx.fillStyle=dk?'rgba(190,215,235,'+(.22*d.depth)+')':'rgba(8,32,64,'+(.55*d.depth)+')';dolphin(d.x*w,yy,sz,false,flex)});
  /* near fish */
  fish.forEach(function(f){if(f.far)return;drawSchool(f,t,dk?'rgba(200,225,240,.55)':'rgba(10,36,70,.6)',1)});
  /* bubbles and motes */
  ctx.fillStyle=dk?'rgba(255,255,255,.35)':'rgba(255,255,255,.55)';
  bubbles.forEach(function(b){b.y-=b.s*(1/60);if(b.y<-.05){b.y=1.05;b.x=Math.random()}var bx=b.x*w+Math.sin(t*b.w+b.r)*8;ctx.beginPath();ctx.arc(bx,b.y*h,b.r,0,6.283);ctx.globalAlpha=.6;ctx.fill();ctx.globalAlpha=1});
  motes.forEach(function(m){m.x+=Math.cos(m.d)*m.s*(1/60);m.y+=Math.sin(m.d)*m.s*(1/60)-.002*(1/60);if(m.x<0)m.x=1;if(m.x>1)m.x=0;if(m.y<0)m.y=1;if(m.y>1)m.y=0;ctx.globalAlpha=dk?.18:.3;ctx.beginPath();ctx.arc(m.x*w,m.y*h,m.r,0,6.283);ctx.fill();ctx.globalAlpha=1});
  /* depth vignette */
  var v=ctx.createRadialGradient(w*.5,h*.4,h*.3,w*.5,h*.5,h*1.1);v.addColorStop(0,'rgba(0,0,0,0)');v.addColorStop(1,dk?'rgba(2,6,14,.55)':'rgba(10,40,80,.35)');ctx.fillStyle=v;ctx.fillRect(0,0,w,h)
 }
 function drawSchool(f,t,col,scale){f.x+=f.sp*f.dir*(1/60);if(f.dir>0&&f.x>1.25){f.x=-.25;f.y=.2+Math.random()*.55}if(f.dir<0&&f.x<-.25){f.x=1.25;f.y=.2+Math.random()*.55}
  ctx.fillStyle=col;f.m.forEach(function(m){var x=(f.x+m.ox)*w+Math.sin(t*1.6+m.ph)*3,y=(f.y+m.oy)*h+Math.sin(t*1.1+m.ph)*4,wag=Math.sin(t*9+m.ph)*1.2;fishShape(x,y,m.sz*scale/5,f.dir<0,wag)})}
 function loop(now){if(!run)return;draw(now);raf=requestAnimationFrame(loop)}
 function start(){if(run||reduce)return;run=true;raf=requestAnimationFrame(loop)}function stop(){run=false;cancelAnimationFrame(raf)}
 size();W.addEventListener('resize',function(){size();if(reduce)draw(performance.now())});
 if(reduce){draw(performance.now());return}
 if('IntersectionObserver' in W){new IntersectionObserver(function(es){es[0].isIntersecting?start():stop()},{threshold:.02}).observe(cv)}else start();
 D.addEventListener('visibilitychange',function(){D.hidden?stop():start()});
}
W.DXOcean={mount:mount};
})();
