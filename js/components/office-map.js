/* Office map (sweep v8.7 M2/M3). Loaded on demand by pages-v7.js (wireMaps) when a .mapc card is within 1500 px of the viewport.

   Two renderers, one card:
   - GOOGLE MAPS (primary) when a Maps JavaScript API key is configured on the server (env GOOGLE_MAPS_API_KEY, served by GET /api/config,
     or a <meta name="dx-maps-key"> injected at serve time). Styled with a soft silver/blue-grey JSON style (navy in the dark theme), POIs off,
     no default controls (the card's own zoom pills), gestureHandling "cooperative" (never traps the page scroll), the Dolphin logo marker as an
     HTML overlay. If the script fails to load, times out or Google reports an auth failure (gm_authFailure), the card falls back to Leaflet.
   - LEAFLET + OpenStreetMap (fallback, always works, no key): self-hosted js/vendor/leaflet, tiles from DX.mapTiles (data.js), toned to the site
     palette with a CSS filter (pages-v7.css). CARTO basemaps were tried and now return "API KEY REQUIRED" tiles, so they are not used.

   Both open on the whole of Nepal with the logo marker at Baneshwor (DX.office), fly in to street level (zoom 16, about 1.4 s) on the marker, a double
   click or "Zoom to Baneshwor", and "Back to Nepal" returns. Reduced motion: jumps instead of flights, the ring does not pulse. */
(function(){
var W=window,D=document,DX=W.DX;if(!DX)return;
var $=function(s,r){return(r||D).querySelector(s)},esc=DX.esc||function(s){return String(s)};
var RM=matchMedia('(prefers-reduced-motion:reduce)').matches,COARSE=matchMedia('(hover:none),(pointer:coarse)').matches;
var dark=function(){return D.documentElement.dataset.theme==='dark'};

/* the marker: round white badge with the real Dolphin mark (cropped from img/logo.png, 1x/2x), a pointed tail, a pulsing ring and the label card */
function markerHTML(o){return'<div class="dx-mk"><div class="dx-card" aria-hidden="true"><b>Dolphin Education</b><span>'+esc(o.address)+'</span></div>'
 +'<button class="dx-badge" type="button" aria-label="Zoom to '+esc(o.label)+'"><span class="dx-ring" aria-hidden="true"></span><img src="img/logo-mark-96.webp" srcset="img/logo-mark-96.webp 1x, img/logo-mark-192.webp 2x" width="40" height="40" alt=""></button>'
 +'<span class="dx-tail" aria-hidden="true"></span></div>'}

/* ---------- key ---------- */
function getKey(){var m=$('meta[name="dx-maps-key"]');if(m&&m.content)return Promise.resolve(m.content);
 if(location.protocol==='file:'||!W.fetch)return Promise.resolve(null);
 var ctl=W.AbortController?new AbortController():null,t=setTimeout(function(){if(ctl)ctl.abort()},3000);
 return fetch('/api/config',{credentials:'same-origin',signal:ctl?ctl.signal:undefined}).then(function(r){clearTimeout(t);return r.ok?r.json():null})
  .then(function(j){return j&&j.mapsKey?String(j.mapsKey):null}).catch(function(){clearTimeout(t);return null})}

/* ---------- Google Maps ---------- */
var GCB='__dxGmapsReady';
function gurl(key){return'https://maps.googleapis.com/maps/api/js?key='+encodeURIComponent(key)+'&v=weekly&loading=async&callback='+GCB+'&language=en&region=NP'}
var GP=null,authFail=[];
W.gm_authFailure=function(){authFail.forEach(function(f){try{f()}catch(e){}})}; /* Google calls this global when the key is invalid or not allowed for this referrer */
function gload(key){if(W.google&&W.google.maps&&W.google.maps.Map)return Promise.resolve(W.google.maps);if(GP)return GP;
 GP=new Promise(function(res,rej){var done=0,to=setTimeout(function(){if(!done){done=1;rej(new Error('timeout'))}},10000);
  W[GCB]=function(){if(done)return;done=1;clearTimeout(to);res(W.google.maps)};
  authFail.push(function(){if(!done){done=1;clearTimeout(to);rej(new Error('auth'))}});
  var s=D.createElement('script');s.src=gurl(key);s.async=true;s.onerror=function(){if(!done){done=1;clearTimeout(to);rej(new Error('load'))}};D.head.appendChild(s)});
 return GP}
var GSTYLE={light:[
 {elementType:'geometry',stylers:[{color:'#eef2f7'}]},{elementType:'labels.text.fill',stylers:[{color:'#4a5a72'}]},{elementType:'labels.text.stroke',stylers:[{color:'#ffffff'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#a9bcd3'}]},{featureType:'administrative.country',elementType:'geometry.stroke',stylers:[{color:'#6D1428'},{weight:1.2}]},
 {featureType:'poi',stylers:[{visibility:'off'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{visibility:'on'},{color:'#dfe9e6'}]},
 {featureType:'road',elementType:'geometry',stylers:[{color:'#ffffff'}]},{featureType:'road.highway',elementType:'geometry',stylers:[{color:'#e5e5e5'}]},
 {featureType:'road',elementType:'labels.icon',stylers:[{visibility:'off'}]},{featureType:'transit',stylers:[{visibility:'off'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#bcd5ec'}]},{featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#6D1428'}]}],
dark:[
 {elementType:'geometry',stylers:[{color:'#0f1f3d'}]},{elementType:'labels.text.fill',stylers:[{color:'#9fb3cc'}]},{elementType:'labels.text.stroke',stylers:[{color:'#0b1830'}]},
 {featureType:'administrative',elementType:'geometry.stroke',stylers:[{color:'#2a4a7a'}]},{featureType:'administrative.country',elementType:'geometry.stroke',stylers:[{color:'#6f9fd0'},{weight:1.2}]},
 {featureType:'poi',stylers:[{visibility:'off'}]},{featureType:'poi.park',elementType:'geometry',stylers:[{visibility:'on'},{color:'#13304a'}]},
 {featureType:'road',elementType:'geometry',stylers:[{color:'#1a3360'}]},{featureType:'road.highway',elementType:'geometry',stylers:[{color:'#24477f'}]},
 {featureType:'road',elementType:'labels.icon',stylers:[{visibility:'off'}]},{featureType:'transit',stylers:[{visibility:'off'}]},
 {featureType:'water',elementType:'geometry',stylers:[{color:'#081428'}]},{featureType:'water',elementType:'labels.text.fill',stylers:[{color:'#6f9fd0'}]}]};
function mountGoogle(m,key){var o=DX.office;return gload(key).then(function(G){
 var el=$('.mapc-m',m),NP=new G.LatLngBounds({lat:o.nepal[0][0],lng:o.nepal[0][1]},{lat:o.nepal[1][0],lng:o.nepal[1][1]}),P={lat:o.lat,lng:o.lng};
 var map=new G.Map(el,{center:NP.getCenter(),zoom:7,disableDefaultUI:true,gestureHandling:'cooperative',keyboardShortcuts:true,clickableIcons:false,isFractionalZoomEnabled:true,
  styles:GSTYLE[dark()?'dark':'light'],backgroundColor:dark()?'#0f1f3d':'#eef2f7',restriction:{latLngBounds:{north:36,south:20,west:74,east:94},strictBounds:false}});
 var nepalView=function(){map.fitBounds(NP,12)};nepalView();
 new MutationObserver(function(){map.setOptions({styles:GSTYLE[dark()?'dark':'light'],backgroundColor:dark()?'#0f1f3d':'#eef2f7'})}).observe(D.documentElement,{attributes:true,attributeFilter:['data-theme']});
 /* the logo marker as an HTML overlay, so it matches the Leaflet one exactly */
 function Mk(){this.div=null}Mk.prototype=new G.OverlayView();
 Mk.prototype.onAdd=function(){var d=D.createElement('div');d.className='dx-gm';d.innerHTML=markerHTML(o);this.div=d;this.getPanes().floatPane.appendChild(d);
  var b=$('.dx-badge',d);b.addEventListener('click',function(e){e.stopPropagation();fly(true)})};
 Mk.prototype.draw=function(){var p=this.getProjection().fromLatLngToDivPixel(new G.LatLng(P.lat,P.lng));if(p&&this.div){this.div.style.left=p.x+'px';this.div.style.top=p.y+'px'}};
 Mk.prototype.onRemove=function(){if(this.div&&this.div.parentNode)this.div.parentNode.removeChild(this.div)};
 new Mk().setMap(map);
 /* smooth camera: center and zoom eased together (moveCamera, fractional zoom), about 1.4 s; reduced motion jumps */
 var anim=0;function fly(){var z0=map.getZoom(),c0=map.getCenter(),tz=o.zoom,tc=new G.LatLng(P.lat,P.lng);
  if(RM){map.moveCamera({center:tc,zoom:tz});return}
  var t0=performance.now(),dur=1400,id=++anim,E=function(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2};
  (function step(now){if(id!==anim)return;var k=Math.min(1,(now-t0)/dur),e=E(k),ec=1-Math.pow(1-k,3);
   map.moveCamera({center:{lat:c0.lat()+(tc.lat()-c0.lat())*ec,lng:c0.lng()+(tc.lng()-c0.lng())*ec},zoom:z0+(tz-z0)*e});if(k<1)requestAnimationFrame(step)})(t0)}
 map.addListener('dblclick',function(){fly(true)});map.setOptions({disableDoubleClickZoom:true});
 return{map:map,near:function(){return map.getZoom()>=12},zoomIn:function(){map.setZoom(Math.round(map.getZoom())+1)},zoomOut:function(){map.setZoom(Math.round(map.getZoom())-1)},
  flyIn:function(){fly(true)},flyOut:function(){anim++;if(RM){nepalView();return}
   /* back to Nepal: ease the zoom out first, then fit the country */
   var z0=map.getZoom(),c0=map.getCenter(),t0=performance.now(),id=++anim,tz=7,tc=NP.getCenter();
   (function step(now){if(id!==anim)return;var k=Math.min(1,(now-t0)/1200),e=1-Math.pow(1-k,3);map.moveCamera({center:{lat:c0.lat()+(tc.lat()-c0.lat())*e,lng:c0.lng()+(tc.lng()-c0.lng())*e},zoom:z0+(tz-z0)*e});if(k<1)requestAnimationFrame(step);else nepalView()})(t0)},
  on:function(f){map.addListener('zoom_changed',f)}}})}

/* ---------- Leaflet (fallback) ---------- */
var LF=null;
function leaflet(){if(W.L&&W.L.map)return Promise.resolve(W.L);if(LF)return LF;
 var get=function(tag,a){return new Promise(function(res,rej){var e=D.createElement(tag);Object.keys(a).forEach(function(k){e[k]=a[k]});e.onload=res;e.onerror=rej;
  if(tag==='link')D.head.insertBefore(e,D.head.querySelector('link[rel=stylesheet]'));else D.head.appendChild(e)})}; /* leaflet.css goes BEFORE the site css, so the card's styling wins at equal specificity */
 LF=Promise.all([get('link',{rel:'stylesheet',href:'js/vendor/leaflet/leaflet.css'}),get('script',{src:'js/vendor/leaflet/leaflet.js',async:true})]).then(function(){if(!W.L)throw new Error('no leaflet');return W.L});return LF}
function mountLeaflet(m){var o=DX.office,T=DX.mapTiles;return leaflet().then(function(L){
 var el=$('.mapc-m',m),NP=L.latLngBounds(o.nepal),P=L.latLng(o.lat,o.lng);
 var map=L.map(el,{zoomControl:false,scrollWheelZoom:false,doubleClickZoom:false,dragging:!COARSE,touchZoom:!COARSE,keyboard:true,zoomSnap:1,minZoom:5,maxBounds:NP.pad(1.5),maxBoundsViscosity:.8});
 map.attributionControl.setPrefix('<a href="https://leafletjs.com" target="_blank" rel="noopener">Leaflet</a>');
 var t=T.light;L.tileLayer(t.url,{subdomains:t.sub||'abc',maxZoom:t.max,attribution:t.attr}).addTo(map).once('load',function(){m.classList.add('on')});
 /* whole-number zooms only (fractional zooms showed hairline seams between tiles); the opening zoom is the largest one at which Nepal's width fits the card (a sliver may crop) */
 var nz=function(){var s=map.getSize(),lon=NP.getEast()-NP.getWest(),lat=NP.getNorth()-NP.getSouth();return Math.max(5,Math.min(8,Math.floor(Math.min(Math.log2(s.x*360/(256*lon)),Math.log2(s.y*360/(256*lat*1.25)))+.15)))},nepal=function(anim){var c=NP.getCenter();if(anim&&!RM)map.flyTo(c,nz(),{duration:1.2});else map.setView(c,nz(),{animate:false})};
 nepal(false);
 var mk=L.marker(P,{icon:L.divIcon({className:'dx-lf',html:markerHTML(o),iconSize:[0,0],iconAnchor:[0,0]}),keyboard:false,interactive:true,riseOnHover:true}).addTo(map);
 var flyIn=function(){if(RM)map.setView(P,o.zoom,{animate:false});else map.flyTo(P,o.zoom,{duration:1.4})};
 var b=$('.dx-badge',mk.getElement());L.DomEvent.disableClickPropagation(b);b.addEventListener('click',flyIn);
 map.on('dblclick',flyIn);
 /* wheel zoom is armed by a click or keyboard focus on the map and disarmed when the pointer leaves or focus moves on */
 var C=map.getContainer(),arm=function(){map.scrollWheelZoom.enable();m.classList.add('armed')},disarm=function(){map.scrollWheelZoom.disable();m.classList.remove('armed')};
 map.on('click',arm);C.addEventListener('focus',arm);C.addEventListener('mouseleave',disarm);C.addEventListener('blur',disarm);
 return{map:map,near:function(){return map.getZoom()>=12},zoomIn:function(){map.zoomIn()},zoomOut:function(){map.zoomOut()},flyIn:flyIn,flyOut:function(){nepal(true)},
  on:function(f){map.on('zoomend',f)},touch:function(on){if(on){map.dragging.enable();map.touchZoom.enable();C.focus({preventScroll:true})}else if(COARSE){map.dragging.disable();map.touchZoom.disable()}}}})}

/* ---------- the card: shared pills, touch overlay, mode switch ---------- */
function wire(m,R){var bin=$('[data-fly=in]',m),bout=$('[data-fly=out]',m),zi=$('[data-zoom=in]',m),zo=$('[data-zoom=out]',m),t=$('.mapc-t',m);
 var state=function(){var n=R.near();bin.hidden=n;bout.hidden=!n};R.on(state);state();
 bin.disabled=false;bin.onclick=R.flyIn;bout.onclick=R.flyOut;if(zi){zi.disabled=false;zi.onclick=R.zoomIn}if(zo){zo.disabled=false;zo.onclick=R.zoomOut}
 if(t&&R.touch){t.onclick=function(){m.classList.add('live');R.touch(true)};
  if(W.IntersectionObserver)new IntersectionObserver(function(es){if(!es[0].isIntersecting){m.classList.remove('live');R.touch(false)}},{threshold:0}).observe(m)}}
function fresh(m){var old=$('.mapc-m',m),n=D.createElement('div');n.className='mapc-m';n.setAttribute('role','region');n.setAttribute('aria-label',old.getAttribute('aria-label')||'Map');old.parentNode.replaceChild(n,old)}
function useLeaflet(m,why){m.dataset.mode='leaflet';if(why)m.dataset.fallback=why;m.classList.remove('on');
 return mountLeaflet(m).then(function(R){m._map=R.map;wire(m,R)}).catch(function(){m.classList.add('nomap')})}
function mount(m){if(m._mounting)return;m._mounting=1;
 return getKey().then(function(key){if(!key)return useLeaflet(m);
  m.dataset.mode='google';var failed=0,fb=function(why){if(failed)return;failed=1;fresh(m);return useLeaflet(m,why)};
  authFail.push(function(){fb('auth')}); /* an invalid or referrer-blocked key reports here even after the map was drawn */
  return mountGoogle(m,key).then(function(R){if(failed)return;m._map=R.map;m.classList.add('on');wire(m,R)}).catch(function(e){return fb(e&&e.message||'error')})})}
DX.officeMap={mount:mount,gurl:gurl,getKey:getKey};
})();
