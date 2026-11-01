/* Premium dropdowns (2026-10-30): every <select> inside a .frm form becomes a custom listbox (button + popover) on mouse/trackpad devices; the native select stays in the DOM
   (hidden, kept in sync, still submitted and validated) and phones keep the native picker. Keyboard: Arrow keys, Home/End, Enter/Space, Esc, type-ahead. */
(function () {
  'use strict';
  var D = document;
  if (window.__dxs) return;
  window.__dxs = 1;
  if (window.matchMedia && matchMedia('(pointer:coarse)').matches) return;
  var openOne = null, syncs = [];
  window.DXSelect = { sync: function () { syncs.forEach(function (f) { f(); }); } };

  function close(w, focus) {
    if (!w) return;
    var b = w.querySelector('.dxs-b'), l = w.querySelector('.dxs-l');
    l.classList.remove('on');
    b.setAttribute('aria-expanded', 'false');
    setTimeout(function () { if (!l.classList.contains('on')) l.hidden = true; }, 160);
    if (openOne === w) openOne = null;
    if (focus) b.focus();
  }

  function enhance(sel) {
    if (sel._dxs || !sel.closest('.frm') || sel.multiple) return;
    sel._dxs = 1;
    var w = D.createElement('div');
    w.className = 'dxs';
    sel.parentNode.insertBefore(w, sel);
    w.appendChild(sel);
    sel.classList.add('dxs-n');
    sel.tabIndex = -1;
    sel.setAttribute('aria-hidden', 'true');

    var b = D.createElement('button');
    b.type = 'button';
    b.className = 'dxs-b';
    b.setAttribute('aria-haspopup', 'listbox');
    b.setAttribute('aria-expanded', 'false');
    var lab = sel.id ? D.querySelector('label[for="' + sel.id + '"]') : null;
    if (lab) {
      if (!lab.id) lab.id = sel.id + '-lbl';
      b.setAttribute('aria-labelledby', lab.id);
      lab.addEventListener('click', function (e) { e.preventDefault(); b.focus(); });
    }
    var v = D.createElement('span');
    v.className = 'dxs-v';
    /* QA 2026-11-01 (WCAG 2.5.3 label in name): the button's name is the field label PLUS the visible value ("Level, Choose one") */
    v.id = (sel.id || ('dxs' + Math.random().toString(36).slice(2, 7))) + '-v';
    if (lab) b.setAttribute('aria-labelledby', lab.id + ' ' + v.id);
    b.appendChild(v);
    w.appendChild(b);

    var l = D.createElement('ul');
    l.className = 'dxs-l';
    l.setAttribute('role', 'listbox');
    l.hidden = true;
    l.tabIndex = -1;
    w.appendChild(l);

    var opts = [].slice.call(sel.options), act = sel.selectedIndex, tq = '', tt = 0;
    var uid = sel.id || ('dxs' + Math.random().toString(36).slice(2, 7));
    opts.forEach(function (o, i) {
      var li = D.createElement('li');
      li.setAttribute('role', 'option');
      li.id = uid + '-o' + i;
      li.textContent = o.textContent;
      if (!o.value) li.className = 'ph';
      if (o.disabled) li.setAttribute('aria-disabled', 'true');
      li._i = i;
      l.appendChild(li);
    });

    function paint() {
      var o = sel.options[sel.selectedIndex];
      v.textContent = o ? o.textContent : '';
      b.classList.toggle('ph', !sel.value);
      [].forEach.call(l.children, function (li, i) {
        li.setAttribute('aria-selected', i === sel.selectedIndex ? 'true' : 'false');
        li.classList.toggle('act', i === act);
      });
      var a = l.children[act];
      if (a && l.classList.contains('on')) b.setAttribute('aria-activedescendant', a.id);
      else b.removeAttribute('aria-activedescendant');
    }

    function pick(i) {
      if (i < 0 || i >= opts.length || opts[i].disabled) return;
      sel.selectedIndex = i;
      act = i;
      paint();
      sel.dispatchEvent(new Event('input', { bubbles: true }));
      sel.dispatchEvent(new Event('change', { bubbles: true }));
      close(w, true);
    }

    function open() {
      if (openOne && openOne !== w) close(openOne);
      act = sel.selectedIndex < 0 ? 0 : sel.selectedIndex;
      l.hidden = false;
      var r = b.getBoundingClientRect(), dk = innerWidth <= 700 ? 84 : 12, below = innerHeight - r.bottom - 16 - dk, above = r.top - 88;
      l.style.maxHeight = '';
      var need = Math.min(l.scrollHeight + 2, 320), up = below < need && above > below;
      w.classList.toggle('up', up);
      l.style.maxHeight = Math.max(160, Math.min(need, up ? above : below)) + 'px';
      void l.offsetWidth;
      l.classList.add('on');
      b.setAttribute('aria-expanded', 'true');
      openOne = w;
      paint();
      var a = l.children[act];
      if (a) a.scrollIntoView({ block: 'nearest' });
    }

    function move(d) {
      var n = act;
      do { n += d; } while (n >= 0 && n < opts.length && opts[n].disabled);
      if (n < 0 || n >= opts.length) return;
      act = n;
      paint();
      l.children[act].scrollIntoView({ block: 'nearest' });
    }

    b.addEventListener('click', function () { l.classList.contains('on') ? close(w) : open(); });
    b.addEventListener('keydown', function (e) {
      var k = e.key, isOpen = l.classList.contains('on');
      if (k === 'ArrowDown' || k === 'ArrowUp') {
        e.preventDefault();
        if (!isOpen) open(); else move(k === 'ArrowDown' ? 1 : -1);
      } else if (k === 'Home' || k === 'End') {
        if (isOpen) {
          e.preventDefault();
          act = k === 'Home' ? 0 : opts.length - 1;
          paint();
          l.children[act].scrollIntoView({ block: 'nearest' });
        }
      } else if (k === 'Enter' || k === ' ') {
        e.preventDefault();
        isOpen ? pick(act) : open();
      } else if (k === 'Escape') {
        if (isOpen) { e.preventDefault(); e.stopPropagation(); close(w, true); }
      } else if (k === 'Tab') {
        if (isOpen) close(w);
      } else if (k.length === 1 && !e.ctrlKey && !e.metaKey) {
        var now = Date.now();
        tq = (now - tt > 700 ? '' : tq) + k.toLowerCase();
        tt = now;
        for (var j = 0; j < opts.length; j++) {
          var ix = (sel.selectedIndex + 1 + j) % opts.length;
          if (opts[ix].value && opts[ix].textContent.toLowerCase().indexOf(tq) === 0) {
            if (isOpen) { act = ix; paint(); l.children[ix].scrollIntoView({ block: 'nearest' }); } else pick(ix);
            break;
          }
        }
      }
    });
    l.addEventListener('mousedown', function (e) { e.preventDefault(); });
    l.addEventListener('click', function (e) { var li = e.target.closest('li'); if (li) pick(li._i); });
    l.addEventListener('mousemove', function (e) {
      var li = e.target.closest('li');
      if (li && li._i !== act) { act = li._i; paint(); }
    });
    sel.addEventListener('change', paint);
    syncs.push(function () { opts.forEach(function (o, i) { if (l.children[i] && l.children[i].textContent !== o.textContent) l.children[i].textContent = o.textContent; }); paint(); });
    var f = sel.form;
    if (f) f.addEventListener('reset', function () { setTimeout(function () { act = sel.selectedIndex; paint(); }, 0); });
    paint();
  }

  function scan(r) { [].forEach.call((r || D).querySelectorAll('.frm select'), enhance); }

  D.addEventListener('click', function (e) { if (openOne && !openOne.contains(e.target)) close(openOne); });
  D.addEventListener('keydown', function (e) { if (e.key === 'Escape' && openOne) close(openOne, true); });
  scan();
  new MutationObserver(function (ms) {
    for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { scan(); break; }
  }).observe(D.documentElement, { childList: true, subtree: true });
})();
