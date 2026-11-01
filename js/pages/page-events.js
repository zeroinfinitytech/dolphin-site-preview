/* Events page only (2026-10-31).
   1. Self-contained photo expansion, the same as js/page-test-prep.js: this page does not load pages-v7.js / home-v8.js (where DX.phExpand lives),
      so data-ph images get their src/srcset here from window.DX_PH (js/photos.js, loaded first).
   2. Session filter: buttons with aria-pressed hide rows of other types; a visually hidden polite status names the view (no counts, house rule). Without JS the filter bar stays
      hidden (CSS shows it under html.js) and every row is visible.
   4. Content Manager store (js/core/site-live.js, 2026-11-01): the bundle's events update the rows and the featured session. The bundle keeps only the six most recent
      past events, so built-in rows older than those stay as they are. Upcoming events get a row at the top, the featured block, and a registration form in the
      event view (POST /api/forms/event-registration). Without the server the page is exactly the built-in one. */
(function(){
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
   var f=im.closest('figure');if(f&&m.c)f.style.setProperty('--phc',m.c);
   im.removeAttribute('data-ph')
  })(imgs[i])}
 }
 function rows(){return document.querySelectorAll('#evList .ev-row')}
 var FILTER='all';
 function applyFilter(){var rs=rows();for(var j=0;j<rs.length;j++)rs[j].hidden=!(FILTER==='all'||rs[j].dataset.type===FILTER)}
 function filter(){
  var bar=document.querySelector('.ev-filt'),out=document.getElementById('evCount');
  if(!bar||!rows().length)return;
  var btns=bar.querySelectorAll('button[data-f]');
  bar.addEventListener('click',function(e){
   var b=e.target.closest('button[data-f]');if(!b)return;
   FILTER=b.dataset.f;
   for(var i=0;i<btns.length;i++)btns[i].setAttribute('aria-pressed',btns[i]===b?'true':'false');
   applyFilter();
   if(out)out.textContent=FILTER==='all'?'Showing all sessions':'Showing '+b.textContent.trim().toLowerCase();
   if(window.ScrollTrigger)window.ScrollTrigger.refresh()
  })
 }
 /* 3. Event details (user 2026-10-31): each row gets a "Details" button (and its title opens the same view) that fills the site modal (DX.modal,
    site.js) from the row itself plus a short type note: date, time, venue, what happens, who it suits, what to bring, then Register,
    Add to calendar (an .ics file built here) and Directions. Nothing is invented per event: venues outside the office say "to confirm". */
 var TYPE={
  road:{what:'An open day: meet a counsellor, compare countries and courses, and get your documents looked at on the spot.',who:'Students finishing +2 or a bachelor’s degree, and their parents.',bring:'Your latest transcripts, passport if you have one, and any test scores.'},
  adm:{what:'A working day for applications: counsellors check your documents with you and help you apply to your shortlist.',who:'Students who already know their country and intake.',bring:'Transcripts, character certificates, passport, test scores and a draft statement of purpose if you have one.'},
  info:{what:'A talk followed by questions: intakes, living costs, the funds to show and the student visa, explained plainly.',who:'Students and parents still deciding.',bring:'Just your questions; notes are shared after the session.'},
  online:{what:'A live online session with a trainer: how the test is scored, where marks are usually lost, and a short timed practice.',who:'Anyone planning IELTS or PTE in the next few months.',bring:'A laptop or phone with headphones, and a quiet place for half an hour.'},
  uni:{what:'Courses, entry requirements and pathway routes, with a visiting university representative where one is scheduled.',who:'Students considering that country and their parents.',bring:'Transcripts and test scores, so the representative can give you a straight answer.'}
 };
 function esc(t){return String(t==null?'':t).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
 function txt(r,sel){var e=r.querySelector(sel);return e?e.textContent.trim():''}
 function ics(ev){var d=ev.date.replace(/-/g,''),t=function(h){return d+'T'+h.replace(':','')+'00'};
  var lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Dolphin Education//Events//EN','BEGIN:VEVENT','UID:'+d+'-'+ev.title.toLowerCase().replace(/[^a-z0-9]+/g,'-')+'@dolphin.edu.np',
   'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d+/,''),'DTSTART;TZID=Asia/Kathmandu:'+t(ev.from),'DTEND;TZID=Asia/Kathmandu:'+t(ev.to),
   'SUMMARY:'+ev.title.replace(/[,;]/g,'\$&'),'LOCATION:'+ev.venue.replace(/[,;]/g,'\$&'),'DESCRIPTION:'+ev.desc.replace(/[,;]/g,'\$&')+' Register: https://dolphin.edu.np','END:VEVENT','END:VCALENDAR'];
  return URL.createObjectURL(new Blob([lines.join('\r\n')],{type:'text/calendar'}))}
 function read(r){var tm=r.querySelector('time'),meta=r.querySelectorAll('.ev-meta span'),hours=(meta[0]?meta[0].textContent:'').match(/(\d{1,2}:\d{2})\D+(\d{1,2}:\d{2})/)||[];
  return{type:r.dataset.type,kind:txt(r,'.ev-k'),title:txt(r,'h3'),desc:txt(r,'.ev-rs'),date:tm?tm.getAttribute('datetime'):'',
   day:txt(r,'.ev-dm span:last-child'),dn:txt(r,'.ev-dn'),dm:txt(r,'.ev-dm span:first-child'),time:meta[0]?meta[0].textContent.trim():'',from:hours[1]||'10:00',to:hours[2]||'12:00',
   venue:meta[1]?meta[1].textContent.trim():'',reg:(r.querySelector('a.ev-reg')||{}).href||'contact.html#book',past:!!r.dataset.past,poster:r.dataset.poster||'',guest:r.dataset.guest||'',live:r._ev||null}}
 var FB='https://www.facebook.com/DolphinEducationBaneshwor';
 /* a store photo (media object from the bundle) as an <img> */
 function mImg(m,sizes,alt){if(!m||!m.src)return'';var R=window.DX&&DX.live?DX.live.relSrc:function(s){return s};
  var ss=m.urls?Object.keys(m.urls).map(function(w){return R(m.urls[w])+' '+w+'w'}).join(', '):'';
  return'<img src="'+esc(R(m.src))+'"'+(ss?' srcset="'+esc(ss)+'" sizes="'+esc(sizes)+'"':'')+(m.width?' width="'+m.width+'" height="'+m.height+'"':'')+' alt="'+esc(alt||m.alt||'')+'" decoding="async">'}
 function openPast(ev){var m0=(window.DX_PH||{})[ev.poster]||{},lm=ev.live&&ev.live.media;
  var fig=ev.poster&&window.DX_PH&&DX_PH[ev.poster]?'<figure class="evm-ph evm-poster" data-no-wm><img data-ph="'+esc(ev.poster)+'" data-sizes="(max-width:700px) 86vw, 560px" alt="'+esc(m0.a||'')+'" loading="eager"></figure>'
   :lm?'<figure class="evm-ph evm-poster" data-no-wm>'+mImg(lm,'(max-width:700px) 86vw, 560px')+'</figure>':'';
  DX.modal(fig+'<article class="evm"><p class="evm-k">'+esc(ev.kind)+'</p><h2 class="evm-h">'+esc(ev.title)+'</h2>'
   +'<dl class="evm-f"><div><dt>When</dt><dd>'+esc(ev.day)+', '+esc(ev.dn)+' '+esc(ev.dm)+'<span>'+esc(ev.time)+'</span></dd></div><div><dt>Where</dt><dd>'+esc(/online/i.test(ev.venue)?'Online':ev.venue)+'</dd></div>'
   +(ev.guest?'<div><dt>Guest</dt><dd>'+esc(ev.guest)+'</dd></div>':'')+'</dl>'
   +'<p class="evm-lead">'+esc(ev.desc)+'</p>'
   +'<p class="evm-n">This session has taken place. New sessions are announced on this page and on Dolphin’s Facebook page.</p>'
   +'<div class="evm-b"><a class="btn btn-p" href="contact.html#book">Register your interest</a><a class="btn btn-g" href="'+FB+'" target="_blank" rel="noopener">Follow on Facebook</a></div></article>');
  var m=document.getElementById('md');if(m){m.setAttribute('aria-label',ev.title);m.classList.add('evm-open')}photos();if(m)focusX(m)}
 /* text from the store; the seed sometimes holds a lone "." where nothing was written */
 function has(t){return t&&String(t).replace(/[\s.]/g,'').length>2}
 /* QA 2026-11-01: DX.modal focuses the close button while the modal is still visibility:hidden (0.3 s transition), so the focus is lost
    and stays on the page behind; move it into the dialog once it is visible. */
 function focusX(m){setTimeout(function(){if(m.contains(document.activeElement))return;var x=m.querySelector('.x');if(x)x.focus()},60)}
 /* the built-in registration form (upcoming store events only) */
 var FID=0;
 function fld(lab,inner,er,o){o=o||{};var id='evf-'+(++FID);inner=inner.replace(/^<(input|select)/,'<$1 id="'+id+'" aria-describedby="'+id+'-e"');
  return'<div class="fld"><label for="'+id+'">'+lab+(o.opt?' <i class="opt">optional</i>':'')+'</label>'+inner+'<small class="er" aria-live="polite" id="'+id+'-e" data-msg="'+esc(er||'')+'"></small></div>'}
 function regForm(e){
  if(e.registration_open===false)return'<p class="evm-n">Registration for this session is closed. Call us and a counsellor will help.</p>';
  if(e.seats_left===0)return'<p class="evm-n">This session is full. Register your interest and a counsellor tells you about the next one.</p>';
  return'<div class="evm-s evm-reg"><h3 id="evRegH">Register for a seat</h3><form novalidate id="evReg" aria-labelledby="evRegH">'
   +'<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true" style="position:absolute;left:-9999px;width:1px;height:1px;opacity:0">'
   +'<div class="r2">'+fld('Name','<input name="name" required autocomplete="name" maxlength="120">','Please add your name.')+fld('Phone or WhatsApp','<input name="phone" type="tel" required autocomplete="tel" inputmode="tel" placeholder="+977" maxlength="40">','Please add a number we can reach, with the country code.')+'</div>'
   +'<div class="r2">'+fld('Email','<input name="email" type="email" autocomplete="email" maxlength="160">','Please check the email address.',{opt:true})+fld('Attending','<select name="attendees">'+[1,2,3,4,5].map(function(n){return'<option value="'+n+'">'+n+(n===1?' person':' people')+'</option>'}).join('')+'</select>','')+'</div>'
   +'<p class="fe" role="alert"></p><div class="evm-b"><button class="btn btn-p" type="submit"><span>Register</span></button></div></form>'
   +'<p class="evm-n evm-ok" role="status" tabindex="-1" hidden></p></div>'}
 function wireReg(e){var f=document.getElementById('evReg');if(!f)return;var ok=f.parentNode.querySelector('.evm-ok'),fe=f.querySelector('.fe'),sb=f.querySelector('button[type=submit]'),API=window.DXAPI;
  function check(){var first=null;[].forEach.call(f.querySelectorAll('.fld'),function(w){var i=w.querySelector('input,select'),v=(i.value||'').trim(),bad=false;
   if(i.required&&!v)bad=true;else if(v&&i.type==='tel'&&!/^\+?[\d][\d\s-]{6,}$/.test(v))bad=true;else if(v&&i.type==='email'&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v))bad=true;
   w.classList.toggle('bad',bad);i.setAttribute('aria-invalid',bad);var er=w.querySelector('.er');if(er)er.textContent=bad?er.dataset.msg:'';if(bad&&!first)first=i});if(first)first.focus();return!first}
  f.addEventListener('submit',function(ev){ev.preventDefault();if(fe)fe.textContent='';if(!check()||f.dataset.busy)return;
   var CT=(window.DX&&DX.contact)||{},call=CT.phone?' or call us on '+CT.phone:'';
   if(!API){if(fe)fe.textContent='We could not send this just now. Please try again'+call+'.';return}
   var d=API.formData(f);d.event_slug=e.slug;d.attendees=parseInt(d.attendees||'1',10);f.dataset.busy='1';API.busy(sb,true);
   API.post('/api/forms/event-registration',d).then(function(r){delete f.dataset.busy;API.busy(sb,false);
    if(r.ok){var nm=(d.name||'').split(' ')[0];f.hidden=true;ok.textContent='Thank you'+(nm?', '+nm:'')+'. Your place is noted; a counsellor confirms your seat by phone or email.';ok.hidden=false;ok.focus();return}
    if(r.status===400&&r.body&&r.body.details&&API.showErrors(f,r.body.details))return;
    if(fe)fe.textContent=r.body&&r.body.error?r.body.error:'We could not send this just now. Please try again'+call+'.'})
   .catch(function(){delete f.dataset.busy;API.busy(sb,false);if(fe)fe.textContent='We could not send this just now. Please try again'+call+'.'})})}
 function open(r){if(!window.DX||!DX.modal)return;var ev=read(r);if(ev.past){openPast(ev);return}var k=TYPE[ev.type]||{},L=ev.live,office=/office/i.test(ev.venue),online=/online/i.test(ev.venue);
  if(L){k={what:has(L.what)?L.what:k.what,who:has(L.who)?L.who:k.who,bring:has(L.bring)?L.bring:k.bring}}
  var where=online?'Online (the joining link is sent when you register)':office?'Dolphin Education, New Baneshwor, Kathmandu':ev.venue+' (venue confirmed when you register)';
  var dir=online?'':'<a class="btn btn-g" href="https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(office?'Dolphin Education New Baneshwor Kathmandu':ev.venue+' Nepal')+'" target="_blank" rel="noopener">Directions</a>';
  var cty=[[/australia/i,'sydney-opera','62% 45%'],[/united kingdom|uk|britain/i,'oxford-aerial','50% 50%'],[/usa|united states|america/i,'us-columbia','50% 50%'],[/canada/i,'hero-vancouver','50% 55%'],[/new zealand/i,'hero-tekapo','50% 50%']];
  var TPH={road:['dx-p-fair-team','50% 45%'],adm:['dx-p-admission-2024','40% 45%'],info:['dx-gal-talk-a','50% 50%'],online:['counsel-student-laptop','50% 45%'],uni:['dx-gal-talk-b','60% 50%']};   /* 2026-11-01: Dolphin's own photographs (dolphin.edu.np); online keeps the illustrative photo */
  var ph=null;for(var c=0;c<cty.length;c++)if(cty[c][0].test(ev.title)){ph=[cty[c][1],cty[c][2]];break}if(!ph)ph=TPH[ev.type]||['dx-gal-talk-a','50% 50%'];
  var fig=L&&L.media?'<figure class="evm-ph">'+mImg(L.media,'(max-width:700px) 92vw, 640px','')+'</figure>':'<figure class="evm-ph"><img data-ph="'+ph[0]+'" data-sizes="(max-width:700px) 92vw, 640px" data-pos="'+ph[1]+'" alt="" loading="eager"></figure>';
  var seats=L&&typeof L.seats_left==='number'&&L.seats_left>0&&L.seats_left<=10?'<div><dt>Places left</dt><dd>'+L.seats_left+'</dd></div>':'';
  DX.modal(fig+'<article class="evm"><p class="evm-k">'+esc(ev.kind)+'</p><h2 class="evm-h">'+esc(ev.title)+'</h2>'
   +'<dl class="evm-f"><div><dt>When</dt><dd>'+esc(ev.day)+', '+esc(ev.dn)+' '+esc(ev.dm)+'<span>'+esc(ev.time)+'</span></dd></div><div><dt>Where</dt><dd>'+esc(where)+'</dd></div><div><dt>Cost</dt><dd>Free</dd></div>'+seats+'</dl>'
   +'<p class="evm-lead">'+esc(ev.desc)+'</p>'
   +(k.what&&k.what!==ev.desc?'<div class="evm-s"><h3>What happens</h3><p>'+esc(k.what)+'</p></div>':'')
   +(k.who?'<div class="evm-s"><h3>Who it suits</h3><p>'+esc(k.who)+'</p></div>':'')
   +(k.bring?'<div class="evm-s"><h3>What to bring</h3><p>'+esc(k.bring)+'</p></div>':'')
   +(L&&L.slug?regForm(L)+'<div class="evm-b"><a class="btn btn-g" href="'+ics(ev)+'" download="dolphin-event-'+esc(ev.date)+'.ics">Add to calendar</a>'+dir+'</div>'
    :'<div class="evm-b"><a class="btn btn-p" href="'+esc(ev.reg)+'">Register</a><a class="btn btn-g" href="'+ics(ev)+'" download="dolphin-event-'+esc(ev.date)+'.ics">Add to calendar</a>'+dir+'</div>'
     +'<p class="evm-n">Places are limited; a counsellor confirms your seat by phone or email.</p>')
   +'</article>');
  var m=document.getElementById('md');if(m){m.setAttribute('aria-label',ev.title);m.classList.add('evm-open')}photos();if(window.DX&&DX.wm)try{DX.wm(m)}catch(e){}if(m)focusX(m);
  if(L&&L.slug)wireReg(L)}
 function details(){
  var rs=rows();
  for(var i=0;i<rs.length;i++){(function(r){
   if(r._det)return;r._det=1;
   var reg=r.querySelector('.ev-reg'),h=r.querySelector('h3'),b=document.createElement('button');
   b.type='button';b.className='btn btn-g btn-sm ev-det';b.innerHTML='Details<span class="ev-vh"> about '+esc(h?h.textContent:'')+'</span>';
   b.addEventListener('click',function(){open(r)});
   var wrap=document.createElement('div');wrap.className='ev-acts';if(reg){reg.parentNode.insertBefore(wrap,reg);wrap.appendChild(b);wrap.appendChild(reg)}else{wrap.appendChild(b);r.appendChild(wrap)}
   if(h){h.classList.add('ev-ht');h.addEventListener('click',function(){open(r)})}
  })(rs[i])}
 }

 /* ---------- 4. the Content Manager store ---------- */
 var T2R={university:'uni',roadshow:'road',admission:'adm',info:'info',online:'online'};
 var KIND={uni:'University visit',road:'Roadshow',adm:'Admission day',info:'Information session',online:'Online test prep'};
 function dParts(iso,long){var d=new Date(iso+'T12:00:00');if(isNaN(d))return null;var f=function(o){try{return new Intl.DateTimeFormat('en-GB',o).format(d)}catch(e){return''}};
  return{dn:String(d.getDate()),dm:f({month:long?'long':'short'})+' '+d.getFullYear(),day:f({weekday:'long'})}}
 function timeOf(e){return e.time_from&&e.time_to?e.time_from+' to '+e.time_to:e.time_from?'From '+e.time_from:''}
 function venueOf(e){return e.online?'Online':e.venue||'Dolphin Education, New Baneshwor'}
 function phName(m){var n=m&&m.filename?String(m.filename).replace(/\.[a-z0-9]+$/i,''):'';return n&&window.DX_PH&&DX_PH[n]?n:''}
 function timeHtml(e,long){var p=dParts(e.date,long)||{dn:'',dm:'',day:''};return'<time datetime="'+esc(e.date)+'"><span class="ev-dn">'+esc(p.dn)+'</span><span class="ev-dm"><span>'+esc(p.dm)+'</span><span>'+esc(p.day)+'</span></span></time>'}
 function fillRow(r,e,past){var t=T2R[e.type]||e.type||'info';r.dataset.type=t;r.dataset.slug=e.slug||'';if(past)r.dataset.past='1';else delete r.dataset.past;
  var pn=phName(e.media);if(pn)r.dataset.poster=pn;else if(r.dataset.poster&&!(e.media&&r.dataset.poster===phName(e.media)))delete r.dataset.poster;
  var d=r.querySelector('.ev-d');if(d)d.innerHTML=timeHtml(e);
  var set=function(s,v){var x=r.querySelector(s);if(x&&v!=null&&x.textContent!==v)x.textContent=v};
  set('.ev-k',KIND[t]||'Session');set('h3',e.title);set('.ev-rs',has(e.summary)?e.summary:'');
  var ms=r.querySelectorAll('.ev-meta span');if(ms[0])ms[0].textContent=timeOf(e);if(ms[1])ms[1].textContent=venueOf(e);
  var rb=r.querySelector('button.ev-reg');
  if(!past&&!rb&&e.registration_open!==false){rb=document.createElement('button');rb.type='button';rb.className='btn btn-p btn-sm ev-reg';rb.textContent='Register';var a=r.querySelector('.ev-acts');if(a)a.appendChild(rb);else r.appendChild(rb)}
  else if(rb&&(past||e.registration_open===false)){rb.remove();rb=null}
  if(rb)rb.onclick=function(){openReg(r)};
  r._ev=e}
 function openReg(r){open(r);setTimeout(function(){var n=document.querySelector('#evReg input[name=name]');if(n)n.focus()},80)}
 function newRow(e,past){var li=document.createElement('li');li.className='ev-row';
  li.innerHTML='<p class="ev-d"></p><div class="ev-rm"><p class="ev-k"></p><h3></h3><p class="ev-rs"></p></div><p class="ev-meta"><span></span><span></span></p>';
  fillRow(li,e,past);return li}
 function rowDate(r){var t=r.querySelector('time');return t?t.getAttribute('datetime'):''}
 function syncRows(E){var list=document.getElementById('evList');if(!list)return;
  var rec=E.recent||[],up=E.upcoming||[],claimed=[],all=[].slice.call(rows());
  var find=function(e){return all.filter(function(r){return claimed.indexOf(r)<0&&((r.dataset.slug&&r.dataset.slug===e.slug)||(!r.dataset.slug&&rowDate(r)===e.date))})[0]};
  var put=function(e,past){var r=find(e);if(r)fillRow(r,e,past);else{r=newRow(e,past);list.appendChild(r)}claimed.push(r);return r};
  var ups=up.map(function(e){return put(e,false)}),recs=rec.map(function(e){return put(e,true)});
  /* store rows that are gone (unpublished): any row from the store's range that it no longer lists */
  var oldest=rec.length?rec.map(function(e){return e.date}).sort()[0]:null;
  all.forEach(function(r){if(claimed.indexOf(r)>-1)return;if(r.dataset.slug||(oldest&&rowDate(r)>=oldest))r.remove()});
  /* order: upcoming (soonest first), then past sessions newest first */
  var past=[].slice.call(rows()).filter(function(r){return ups.indexOf(r)<0}).sort(function(a,b){return rowDate(b).localeCompare(rowDate(a))});
  ups.concat(past).forEach(function(r){list.appendChild(r)})}
 function syncFeat(E){var f=document.querySelector('#next .ev-feat');if(!f)return;var up=(E.upcoming||[])[0],e=up||(E.recent||[])[0];if(!e)return;
  var t=T2R[e.type]||'info',fb=f.querySelector('.ev-fb'),fd=f.querySelector('.ev-fd'),same=fd&&fd.querySelector('time')&&fd.querySelector('time').getAttribute('datetime')===e.date;
  if(fd)fd.innerHTML=timeHtml(e,true);
  var set=function(s,v){var x=fb&&fb.querySelector(s);if(x&&v!=null&&x.textContent!==v)x.textContent=v};
  set('.ev-k',(up?'Next session':'Most recent session')+' · '+(KIND[t]||'Session'));set('h3',e.title);if(has(e.summary))set('.ev-sum',e.summary);
  var dl=fb&&fb.querySelector('.ev-dl');if(dl){[].forEach.call(dl.children,function(d){var k=(d.querySelector('dt')||{}).textContent,dd=d.querySelector('dd');
   if(k==='Time'&&dd)dd.textContent=timeOf(e)||dd.textContent;else if(k==='Place'&&dd)dd.textContent=venueOf(e);else if(k==='Guest'&&!same)d.remove()})}
  if(!same){var fig=f.querySelector('figure'),pn=phName(e.media);
   if(fig){if(pn){fig.innerHTML='<img data-ph="'+esc(pn)+'" data-sizes="(max-width:900px) 92vw, 40vw" data-pos="50% 30%" alt="">';photos()}else if(e.media)fig.innerHTML=mImg(e.media,'(max-width:900px) 92vw, 40vw','');}}
  if(up){var sh=document.querySelector('#next .sh>p');if(sh)sh.textContent='Register for a seat below. It is free; a counsellor confirms your place by phone or email.';
   var btns=fb&&fb.querySelector('.btns');if(btns&&!btns.querySelector('[data-reg]')){var b=document.createElement('button');b.type='button';b.className='btn btn-p';b.dataset.reg='1';b.textContent='Register';
    var first=btns.querySelector('a.btn-p');if(first)first.remove();btns.insertBefore(b,btns.firstChild)}
   var rb=btns&&btns.querySelector('[data-reg]');if(rb)rb.onclick=function(){var r=[].slice.call(rows()).filter(function(x){return x.dataset.slug===up.slug})[0];if(r)openReg(r)}}}
 function live(b,ch){if(ch&&ch.indexOf('events')<0)return;var E=b&&b.events;if(!E)return;
  try{syncRows(E);syncFeat(E)}catch(e){}
  details();applyFilter();if(window.ScrollTrigger)window.ScrollTrigger.refresh()}
 function run(){photos();filter();details();if(window.DX&&DX.live)DX.live.on(live)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
})();
