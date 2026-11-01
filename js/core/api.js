/* Tiny API helper for the public site. window.DXAPI.post(path, data) -> Promise<{ok, status, body}>.
   Rejects only when the API is unreachable (static preview, offline): callers then fall back to the old prototype/mailto behaviour.
   Keeps the CSRF token from /api/auth responses for signed-in calls (portals use the same helper later). */
(function(){
var CSRF=null,BASE='';
function headers(json){var h={'Accept':'application/json'};if(json)h['Content-Type']='application/json';if(CSRF)h['X-CSRF-Token']=CSRF;return h}
function call(method,path,data){
 if(location.protocol==='file:')return Promise.reject(new Error('no-api'));
 var ctl=('AbortController'in window)?new AbortController():null,t=ctl&&setTimeout(function(){ctl.abort()},8000);
 return fetch(BASE+path,{method:method,headers:headers(data!==undefined),body:data===undefined?undefined:JSON.stringify(data),credentials:'same-origin',signal:ctl?ctl.signal:undefined})
 .then(function(r){if(t)clearTimeout(t);return r.text().then(function(txt){var b=null;try{b=txt?JSON.parse(txt):null}catch(e){b={error:'Unexpected reply.',code:'bad_reply'}}
  if(b&&b.csrf)CSRF=b.csrf;return{ok:r.ok,status:r.status,body:b}})})
 .catch(function(e){if(t)clearTimeout(t);throw e})}
/* form -> plain object; checkboxes become true/false; empty optional fields are dropped */
function formData(f){var o={};Array.prototype.forEach.call(f.elements,function(el){if(!el.name||el.disabled)return;if(el.type==='checkbox')o[el.name]=el.checked;else if(el.type==='radio'){if(el.checked)o[el.name]=el.value}else{var v=(el.value||'').trim();if(v!=='')o[el.name]=v}});return o}
/* show field errors returned as {details:{field:msg}} on the nearest .fld/.ck wrapper (same classes validate() uses) */
function showErrors(f,details){var first=null;Object.keys(details||{}).forEach(function(k){var i=f.querySelector('[name="'+k+'"]');if(!i)return;var w=i.closest('.fld,.ck');if(w){w.classList.add('bad');var e=w.querySelector('.er');if(e&&details[k])e.textContent=details[k]}i.setAttribute('aria-invalid','true');if(!first)first=i});if(first)first.focus();return !!first}
/* loading state on the submit pill (sweep v8.7): the label stays in place but turns transparent under a thin spinner (.btn.is-loading in site.css),
   so the button keeps its exact size (no layout shift); aria-busy + aria-disabled while the request runs. label is kept for old callers (unused). */
function busy(btn,on,label){if(!btn)return;if(on){btn.classList.add('is-loading');btn.setAttribute('aria-busy','true');btn.setAttribute('aria-disabled','true')}else{btn.classList.remove('is-loading');btn.removeAttribute('aria-busy');btn.removeAttribute('aria-disabled')}}
window.DXAPI={get:function(p){return call('GET',p)},post:function(p,d){return call('POST',p,d||{})},patch:function(p,d){return call('PATCH',p,d||{})},formData:formData,showErrors:showErrors,busy:busy,
 setCsrf:function(c){CSRF=c},hasCsrf:function(){return !!CSRF}};
})();
