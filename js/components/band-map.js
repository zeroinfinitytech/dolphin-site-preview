/* Band map (2026-10-31, user "in bg place here map of dolphin"): a quiet street map of New Baneshwor behind a brand-gradient band
   ([data-band-map], e.g. the Gallery closing band). Leaflet is the self-hosted copy (js/vendor/leaflet), tiles and office from data.js
   (DX.mapTiles, DX.office). The map is decoration: no dragging, zooming or keyboard, aria-hidden; the tiles are blended into the gradient by
   CSS (page-gallery.css) and the Dolphin pin sits on the office, to the right of the copy (below it on phones). Loads only when the band nears
   the screen; without Leaflet or the network the band simply stays a gradient. */
(function () {
  'use strict';
  var D = document, W = window;
  var bands = [].slice.call(D.querySelectorAll('[data-band-map]'));
  if (!bands.length) return;

  var LF = null;
  function leaflet() {
    if (W.L && W.L.map) return Promise.resolve(W.L);
    if (LF) return LF;
    function get(tag, attrs) {
      return new Promise(function (ok, no) {
        var e = D.createElement(tag); for (var k in attrs) e.setAttribute(k, attrs[k]);
        e.onload = ok; e.onerror = no;
        if (tag === 'link') D.head.insertBefore(e, D.head.querySelector('link[rel=stylesheet]')); else D.head.appendChild(e);
      });
    }
    LF = Promise.all([get('link', { rel: 'stylesheet', href: 'js/vendor/leaflet/leaflet.css' }), get('script', { src: 'js/vendor/leaflet/leaflet.js', async: '' })])
      .then(function () { if (!W.L) throw new Error('no leaflet'); return W.L; });
    return LF;
  }

  function mount(band) {
    var o = W.DX && DX.office, T = W.DX && DX.mapTiles;
    if (!o || !T) return;
    var box = D.createElement('div'); box.className = 'bmap'; box.setAttribute('aria-hidden', 'true');
    band.insertBefore(box, band.firstChild);
    leaflet().then(function (L) {
      /* OpenStreetMap streets from data.js (keyless; CARTO/Google need a key), toned by CSS into a clean grey street plan under the overlay */
      var P = L.latLng(o.lat, o.lng), t = T.light;
      var map = L.map(box, { zoomControl: false, attributionControl: true, dragging: false, touchZoom: false, scrollWheelZoom: false, doubleClickZoom: false, boxZoom: false, keyboard: false, tap: false, zoomSnap: 0.25 });
      map.attributionControl.setPrefix(false);
      L.tileLayer(t.url, { maxZoom: t.max || 19, attribution: t.attr }).addTo(map);
      /* the pin lives outside the map (the map layer is blended into the gradient; the pin must stay crisp) */
      var pin = D.createElement('div'); pin.className = 'bmap-pin'; pin.setAttribute('aria-hidden', 'true');
      pin.innerHTML = '<span class="bmap-ring"></span><span class="bmap-disc"><img src="img/logo-mark-96.webp" width="34" height="34" alt=""></span><span class="bmap-lab">Dolphin Education</span>';
      band.insertBefore(pin, box.nextSibling);
      function place() {
        map.invalidateSize();
        var s = map.getSize(), phone = s.x < 700, z = phone ? 15.5 : 16;
        map.setView(P, z, { animate: false });
        /* move the view so the office lands right of the centred copy (desktop) or under it (phone) */
        map.panBy(phone ? [0, -s.y * 0.36] : [-s.x * 0.36, -s.y * 0.24], { animate: false });
        var pt = map.latLngToContainerPoint(P); pin.style.left = pt.x + 'px'; pin.style.top = pt.y + 'px';
      }
      place();
      var rt = 0; W.addEventListener('resize', function () { clearTimeout(rt); rt = setTimeout(place, 150); });
      box.classList.add('on'); pin.classList.add('on');
      /* QA 2026-11-01: the map box is aria-hidden, so the Leaflet attribution links inside it must not take keyboard focus (axe aria-hidden-focus) */
      [].forEach.call(box.querySelectorAll('a,button,[tabindex]'), function (a) { a.tabIndex = -1; });
    }).catch(function () { box.remove(); var p = band.querySelector('.bmap-pin'); if (p) p.remove(); });
  }

  if (!('IntersectionObserver' in W)) { bands.forEach(mount); return; }
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (e) { if (e.isIntersecting) { io.unobserve(e.target); mount(e.target); } });
  }, { rootMargin: '600px 0px' });
  bands.forEach(function (b) { io.observe(b); });
})();
