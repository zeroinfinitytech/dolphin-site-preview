/* Water (2026-10-28, v2): a real wave simulation over the footer film. A height field (two floating-point textures, ping-pong) is stepped every frame:
   pointer drops and drags push the surface, waves travel, reflect off the edges and fade. The film is then drawn through the surface: refraction from the
   surface normal, a soft sun glint, a touch of colour in the troughs, and a faint always-on swell. A small unseen drop falls every couple of seconds.
   Falls back to the plain film if the browser has no float render targets. Pauses off screen; still under reduced motion. window.DXRipple.mount(section, sea) */
(function(){
var W=window,D=document;
function mount(host,sea){
 if(matchMedia('(prefers-reduced-motion:reduce)').matches)return;
 var cv=D.createElement('canvas');cv.className='ft-ripple';
 var gl=cv.getContext('webgl',{alpha:false,antialias:false,premultipliedAlpha:false});if(!gl)return;
 var tf=gl.getExtension('OES_texture_float'),cf=gl.getExtension('WEBGL_color_buffer_float'),th=gl.getExtension('OES_texture_half_float'),ch=gl.getExtension('EXT_color_buffer_half_float');
 var TY=null;
 function tryType(t){var tx=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,tx);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,4,4,0,gl.RGBA,t,null);
  var fb=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,tx,0);
  var ok=gl.checkFramebufferStatus(gl.FRAMEBUFFER)===gl.FRAMEBUFFER_COMPLETE;gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.deleteFramebuffer(fb);gl.deleteTexture(tx);return ok}
 if(tf&&cf&&tryType(gl.FLOAT))TY=gl.FLOAT;else if(th&&ch&&tryType(th.HALF_FLOAT_OES))TY=th.HALF_FLOAT_OES;
 if(!TY)return;
 function sh(ty,src){var s=gl.createShader(ty);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){console.warn('water shader: '+gl.getShaderInfoLog(s));throw 0}return s}
 var VS='attribute vec2 p;varying vec2 v;void main(){v=p*.5+.5;gl_Position=vec4(p,0.,1.);}';
 function prog(fs){var p=gl.createProgram();gl.attachShader(p,sh(gl.VERTEX_SHADER,VS));gl.attachShader(p,sh(gl.FRAGMENT_SHADER,fs));gl.bindAttribLocation(p,0,'p');gl.linkProgram(p);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw 0;return p}
 /* simulation step: state = (height, previous height) */
 var FSIM='precision highp float;varying vec2 v;uniform sampler2D s;uniform vec2 px;uniform vec4 d0,d1,d2,d3;uniform float asp;\n'+
 'float drop(vec4 d){if(d.w<=0.)return 0.;vec2 q=(v-d.xy)*vec2(asp,1.);float r=length(q);return d.w*smoothstep(d.z,0.,r);}\n'+
 'void main(){vec4 c=texture2D(s,v);float l=texture2D(s,v-vec2(px.x,0.)).r,r=texture2D(s,v+vec2(px.x,0.)).r,u=texture2D(s,v-vec2(0.,px.y)).r,dn=texture2D(s,v+vec2(0.,px.y)).r;\n'+
 'float n=(l+r+u+dn)*.5-c.g;n*=.989;n+=drop(d0)+drop(d1)+drop(d2)+drop(d3);gl_FragColor=vec4(n,c.r,0.,1.);}';
 /* draw: the film seen through the surface */
 var FDR='precision highp float;varying vec2 v;uniform sampler2D tx,hs;uniform vec2 cover,px;uniform float t;\n'+
 'float H(vec2 q){vec2 g=q/px-.5;vec2 f=fract(g);vec2 b=(floor(g)+.5)*px;float a=texture2D(hs,b).r,c=texture2D(hs,b+vec2(px.x,0.)).r,d=texture2D(hs,b+vec2(0.,px.y)).r,e=texture2D(hs,b+px).r;return mix(mix(a,c,f.x),mix(d,e,f.x),f.y);}\n'+
 'void main(){vec2 uv=vec2(v.x,1.-v.y);vec2 hv=v;\n'+
 'float hc=H(hv),hx=H(hv+vec2(px.x,0.)*1.5)-H(hv-vec2(px.x,0.)*1.5),hy=H(hv+vec2(0.,px.y)*1.5)-H(hv-vec2(0.,px.y)*1.5);\n'+
 'vec2 sw=vec2(sin(uv.y*8.+t*.55)+.5*sin(uv.y*19.-t*.4),cos(uv.x*6.+t*.5)+.5*cos(uv.x*15.+t*.35))*.0013;\n'+
 'vec3 nrm=normalize(vec3(-hx*5.5,hy*5.5,1.));\n'+
 'vec2 off=vec2(-hx,hy)*.11+sw;\n'+
 'vec2 q=(vec2(v.x,1.-v.y)+off-.5)*cover+.5;\n'+
 'vec3 col=texture2D(tx,clamp(q,0.,1.)).rgb;\n'+
 'vec3 L=normalize(vec3(-.35,.55,.75));float sp=pow(max(dot(nrm,L),0.),70.);float sp2=pow(max(dot(nrm,normalize(vec3(.4,-.3,.85))),0.),40.);\n'+
 'float dep=clamp(hc*1.6,-1.,1.);\n'+
 'col*=1.-.10*max(-dep,0.);col+=vec3(.30,.55,.80)*max(dep,0.)*.10;\n'+
 'col+=vec3(.85,.95,1.)*sp*.85+vec3(.55,.75,1.)*sp2*.25;\n'+
 'gl_FragColor=vec4(col,1.);}';
 var pS,pD;try{pS=prog(FSIM);pD=prog(FDR)}catch(e){return}
 var qb=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,qb);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,1,1]),gl.STATIC_DRAW);gl.enableVertexAttribArray(0);gl.vertexAttribPointer(0,2,gl.FLOAT,false,0,0);
 function loc(p,n){return gl.getUniformLocation(p,n)}
 var sS=loc(pS,'s'),sPx=loc(pS,'px'),sAsp=loc(pS,'asp'),sD=[loc(pS,'d0'),loc(pS,'d1'),loc(pS,'d2'),loc(pS,'d3')];
 var dTx=loc(pD,'tx'),dHs=loc(pD,'hs'),dCov=loc(pD,'cover'),dPx=loc(pD,'px'),dT=loc(pD,'t');
 function mkTex(filt){var x=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,x);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,filt);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,filt);return x}
 var tex=mkTex(gl.LINEAR);
 var SW=0,SH=0,st=[],fb=[],cur=0,w=0,h=0,asp=1,t0=performance.now(),run=false,raf=0,ok=false,queue=[],nextRain=0,lastV=-1;
 /* nearest filtering is the safe choice for float targets; the surface is smooth enough at this size */
 function mkSim(){SW=Math.min(512,Math.max(160,Math.round(w/3)));SH=Math.max(90,Math.round(SW*h/w));
  [0,1].forEach(function(i){if(st[i])gl.deleteTexture(st[i]);if(fb[i])gl.deleteFramebuffer(fb[i]);
   st[i]=mkTex(gl.NEAREST);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,SW,SH,0,gl.RGBA,TY,null);
   fb[i]=gl.createFramebuffer();gl.bindFramebuffer(gl.FRAMEBUFFER,fb[i]);gl.framebufferTexture2D(gl.FRAMEBUFFER,gl.COLOR_ATTACHMENT0,gl.TEXTURE_2D,st[i],0);gl.clearColor(0,0,0,1);gl.clear(gl.COLOR_BUFFER_BIT)});
  gl.bindFramebuffer(gl.FRAMEBUFFER,null)}
 /* sweep v8.6 (scroll audit): the water drew at up to 2x pixel density on every frame (measured 20 ms a frame on the main thread when the footer was on screen);
    it now draws at 1x (the refraction is soft, nothing is lost) and at most 30 frames a second, and skips frames while the page is moving fast */
 function size(){var r=sea.getBoundingClientRect(),d=Math.min(W.devicePixelRatio||1,1.5);w=Math.max(2,Math.round(r.width*d));h=Math.max(2,Math.round(r.height*d));cv.width=w;cv.height=h;asp=w/h;mkSim()}
 function srcEl(){var v=sea.querySelector('.ft-video'),p=sea.querySelector('.ft-poster');
  if(v&&v.readyState>=2&&!v.paused)return v;if(p&&p.complete&&p.naturalWidth)return p;return null}
 function dims(s){return s.videoWidth?[s.videoWidth,s.videoHeight]:[s.naturalWidth,s.naturalHeight]}
 var lastF=0;
 function frame(now){if(!run)return;var L=W.__lenis;if(now-lastF<33||(L&&Math.abs(L.velocity||0)>12)){raf=requestAnimationFrame(frame);return}lastF=now;var t=(now-t0)/1000,i;
  if(t>nextRain){nextRain=t+.8+Math.random()*1.3;queue.push([.12+Math.random()*.76,.15+Math.random()*.7,.022,.085])}
  var ds=[[0,0,0,0],[0,0,0,0],[0,0,0,0],[0,0,0,0]];for(i=0;i<4&&queue.length;i++){var q=queue.shift();ds[i]=[q[0],1-q[1],q[2],q[3]]}
  gl.useProgram(pS);gl.bindFramebuffer(gl.FRAMEBUFFER,fb[1-cur]);gl.viewport(0,0,SW,SH);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,st[cur]);
  gl.uniform1i(sS,0);gl.uniform2f(sPx,1/SW,1/SH);gl.uniform1f(sAsp,asp);for(i=0;i<4;i++)gl.uniform4f(sD[i],ds[i][0],ds[i][1],ds[i][2],ds[i][3]);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);cur=1-cur;
  var s=srcEl();
  if(s){var d=dims(s);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex);
   try{if(s.tagName==='VIDEO'){if(s.currentTime!==lastV){lastV=s.currentTime;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,s)}}else if(lastV!==-2){lastV=-2;gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,s)}}catch(e){}
   var ar=w/h,sr=d[0]/d[1],cx=1,cy=1;if(sr>ar)cx=ar/sr;else cy=sr/ar;
   gl.useProgram(pD);gl.uniform2f(dCov,cx,cy);
   if(!ok){ok=true;cv.classList.add('on');['.ft-poster','.ft-video','.ft-ocean'].forEach(function(k){var e=sea.querySelector(k);if(e)e.style.visibility='hidden'})}}
  gl.useProgram(pD);gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.viewport(0,0,w,h);
  gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,st[cur]);gl.activeTexture(gl.TEXTURE1);gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.uniform1i(dHs,0);gl.uniform1i(dTx,1);gl.uniform2f(dPx,1/SW,1/SH);gl.uniform1f(dT,t);
  gl.drawArrays(gl.TRIANGLE_STRIP,0,4);raf=requestAnimationFrame(frame)}
 function start(){if(run)return;run=true;raf=requestAnimationFrame(frame)}function stop(){run=false;cancelAnimationFrame(raf)}
 function add(x,y,rad,str){var r=sea.getBoundingClientRect();var u=(x-r.left)/r.width,vv=(y-r.top)/r.height;if(u<0||u>1||vv<0||vv>1)return;if(queue.length<24)queue.push([u,vv,rad,str])}
 var lx=null,ly=0;
 host.addEventListener('pointermove',function(e){if(lx!==null){var dx=e.clientX-lx,dy=e.clientY-ly,L=Math.sqrt(dx*dx+dy*dy),n=Math.min(6,Math.ceil(L/22));for(var i=1;i<=n;i++)add(lx+dx*i/n,ly+dy*i/n,.011,Math.min(.22,.05+L*.0016))}else add(e.clientX,e.clientY,.011,.08);lx=e.clientX;ly=e.clientY},{passive:true});
 host.addEventListener('pointerleave',function(){lx=null},{passive:true});
 host.addEventListener('pointerdown',function(e){add(e.clientX,e.clientY,.03,.9)},{passive:true});
 sea.appendChild(cv);size();var rz=0;W.addEventListener('resize',function(){clearTimeout(rz);rz=setTimeout(size,150)});
 var inView=!('IntersectionObserver' in W);   /* a tab coming back restarts the water only if the footer is on screen */
 if('IntersectionObserver' in W){new IntersectionObserver(function(es){inView=es[0].isIntersecting;inView&&!D.hidden?start():stop()},{threshold:.02}).observe(host)}else start();
 D.addEventListener('visibilitychange',function(){D.hidden||!inView?stop():start()});
}
W.DXRipple={mount:mount};
})();
