/* Tiny QR code encoder (byte mode, versions 1-40, error correction L/M/Q/H, automatic mask). No dependencies.
   Written for the Dolphin system console (super.html) to show the authenticator set-up link as a QR code: the page's CSP allows no CDN.
   Follows ISO/IEC 18004 (same structure as the well-known public-domain reference designs).
   License: MIT. (c) 2026 Zero Infinity Infotech.
   API: window.DolphinQR.matrix(text, ecl?) -> {size, get(x,y)} ; window.DolphinQR.svg(text, {ecl, scale, margin, label}) -> "<svg ...>" */
(function (root) {
  "use strict";
  var ECL = { L: [0, 1], M: [1, 0], Q: [2, 3], H: [3, 2] }; /* [table index, format bits] */
  var ECC_PER_BLOCK = [
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]];
  var NUM_BLOCKS = [
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]];

  function rawModules(v) { var r = (16 * v + 128) * v + 64; if (v >= 2) { var n = Math.floor(v / 7) + 2; r -= (25 * n - 10) * n - 55; if (v >= 7) r -= 36; } return r; }
  function dataCodewords(v, e) { return Math.floor(rawModules(v) / 8) - ECC_PER_BLOCK[e][v] * NUM_BLOCKS[e][v]; }
  function gfMul(x, y) { var z = 0; for (var i = 7; i >= 0; i--) { z = (z << 1) ^ ((z >>> 7) * 0x11D); z ^= ((y >>> i) & 1) * x; } return z & 0xFF; }
  function rsDivisor(deg) { var r = []; for (var i = 0; i < deg - 1; i++) r.push(0); r.push(1); var root = 1; for (i = 0; i < deg; i++) { for (var j = 0; j < r.length; j++) { r[j] = gfMul(r[j], root); if (j + 1 < r.length) r[j] ^= r[j + 1]; } root = gfMul(root, 0x02); } return r; }
  function rsRemainder(data, div) { var r = div.map(function () { return 0; }); data.forEach(function (b) { var f = b ^ r.shift(); r.push(0); div.forEach(function (c, i) { r[i] ^= gfMul(c, f); }); }); return r; }
  function utf8(s) { var out = []; var e = unescape(encodeURIComponent(s)); for (var i = 0; i < e.length; i++) out.push(e.charCodeAt(i)); return out; }
  function bit(x, i) { return ((x >>> i) & 1) !== 0; }

  function encode(text, eclName) {
    var ecl = ECL[eclName || "M"] || ECL.M, e = ecl[0], bytes = utf8(text), v, cap;
    for (v = 1; v <= 40; v++) { cap = dataCodewords(v, e) * 8; var need = 4 + (v < 10 ? 8 : 16) + bytes.length * 8; if (need <= cap) break; }
    if (v > 40) throw new Error("Text too long for a QR code");
    /* bit stream */
    var bb = []; function put(val, len) { for (var i = len - 1; i >= 0; i--) bb.push((val >>> i) & 1); }
    put(4, 4); put(bytes.length, v < 10 ? 8 : 16); bytes.forEach(function (b) { put(b, 8); });
    put(0, Math.min(4, cap - bb.length)); put(0, (8 - bb.length % 8) % 8);
    for (var pad = 0xEC; bb.length < cap; pad ^= 0xEC ^ 0x11) put(pad, 8);
    var data = []; for (var i = 0; i < bb.length; i += 8) { var x = 0; for (var k = 0; k < 8; k++) x = (x << 1) | bb[i + k]; data.push(x); }
    /* error correction + interleave */
    var nb = NUM_BLOCKS[e][v], eccLen = ECC_PER_BLOCK[e][v], raw = Math.floor(rawModules(v) / 8), nShort = nb - raw % nb, shortLen = Math.floor(raw / nb);
    var blocks = [], div = rsDivisor(eccLen);
    for (i = 0, k = 0; i < nb; i++) { var dat = data.slice(k, k + shortLen - eccLen + (i < nShort ? 0 : 1)); k += dat.length; var ecc = rsRemainder(dat, div); if (i < nShort) dat.push(0); blocks.push(dat.concat(ecc)); }
    var all = []; for (i = 0; i < blocks[0].length; i++) blocks.forEach(function (b, j) { if (i !== shortLen - eccLen || j >= nShort) all.push(b[i]); });

    var size = v * 4 + 17, M = [], F = [];
    for (i = 0; i < size; i++) { M.push(new Array(size).fill(false)); F.push(new Array(size).fill(false)); }
    function setF(x, y, d) { M[y][x] = d; F[y][x] = true; }
    /* timing */
    for (i = 0; i < size; i++) { setF(6, i, i % 2 === 0); setF(i, 6, i % 2 === 0); }
    /* finders */
    function finder(cx, cy) { for (var dy = -4; dy <= 4; dy++) for (var dx = -4; dx <= 4; dx++) { var d = Math.max(Math.abs(dx), Math.abs(dy)), xx = cx + dx, yy = cy + dy; if (xx >= 0 && xx < size && yy >= 0 && yy < size) setF(xx, yy, d !== 2 && d !== 4); } }
    finder(3, 3); finder(size - 4, 3); finder(3, size - 4);
    /* alignment */
    var al = [];
    if (v > 1) { var na = Math.floor(v / 7) + 2, step = v === 32 ? 26 : Math.ceil((v * 4 + 4) / (na * 2 - 2)) * 2; al = [6]; for (var pos = size - 7; al.length < na; pos -= step) al.splice(1, 0, pos); }
    for (i = 0; i < al.length; i++) for (var j = 0; j < al.length; j++) {
      if ((i === 0 && j === 0) || (i === 0 && j === al.length - 1) || (i === al.length - 1 && j === 0)) continue;
      for (var dy = -2; dy <= 2; dy++) for (var dx = -2; dx <= 2; dx++) setF(al[i] + dx, al[j] + dy, Math.max(Math.abs(dx), Math.abs(dy)) !== 1);
    }
    function format(mask) {
      var d = ecl[1] << 3 | mask, r = d; for (var i = 0; i < 10; i++) r = (r << 1) ^ ((r >>> 9) * 0x537);
      var b = (d << 10 | r) ^ 0x5412;
      for (i = 0; i <= 5; i++) setF(8, i, bit(b, i));
      setF(8, 7, bit(b, 6)); setF(8, 8, bit(b, 7)); setF(7, 8, bit(b, 8));
      for (i = 9; i < 15; i++) setF(14 - i, 8, bit(b, i));
      for (i = 0; i < 8; i++) setF(size - 1 - i, 8, bit(b, i));
      for (i = 8; i < 15; i++) setF(8, size - 15 + i, bit(b, i));
      setF(8, size - 8, true);
    }
    format(0); /* reserve */
    if (v >= 7) { var r = v; for (i = 0; i < 12; i++) r = (r << 1) ^ ((r >>> 11) * 0x1F25); var vb = v << 12 | r; for (i = 0; i < 18; i++) { var bt = bit(vb, i), a = size - 11 + i % 3, c = Math.floor(i / 3); setF(a, c, bt); setF(c, a, bt); } }
    /* data */
    var n = 0;
    for (var right = size - 1; right >= 1; right -= 2) {
      if (right === 6) right = 5;
      for (var vert = 0; vert < size; vert++) for (j = 0; j < 2; j++) {
        var x = right - j, up = ((right + 1) & 2) === 0, y = up ? size - 1 - vert : vert;
        if (!F[y][x] && n < all.length * 8) { M[y][x] = bit(all[n >>> 3], 7 - (n & 7)); n++; }
      }
    }
    function maskFn(m, x, y) {
      switch (m) {
        case 0: return (x + y) % 2 === 0; case 1: return y % 2 === 0; case 2: return x % 3 === 0; case 3: return (x + y) % 3 === 0;
        case 4: return (Math.floor(x / 3) + Math.floor(y / 2)) % 2 === 0; case 5: return x * y % 2 + x * y % 3 === 0;
        case 6: return (x * y % 2 + x * y % 3) % 2 === 0; default: return ((x + y) % 2 + x * y % 3) % 2 === 0;
      }
    }
    function applyMask(m) { for (var y = 0; y < size; y++) for (var x = 0; x < size; x++) if (!F[y][x] && maskFn(m, x, y)) M[y][x] = !M[y][x]; }
    function penalty() {
      var p = 0, x, y, run, dark = 0;
      for (y = 0; y < size; y++) { run = 1; for (x = 1; x <= size; x++) { if (x < size && M[y][x] === M[y][x - 1]) run++; else { if (run >= 5) p += run - 2; run = 1; } } }
      for (x = 0; x < size; x++) { run = 1; for (y = 1; y <= size; y++) { if (y < size && M[y][x] === M[y - 1][x]) run++; else { if (run >= 5) p += run - 2; run = 1; } } }
      for (y = 0; y < size - 1; y++) for (x = 0; x < size - 1; x++) { var c = M[y][x]; if (c === M[y][x + 1] && c === M[y + 1][x] && c === M[y + 1][x + 1]) p += 3; }
      for (y = 0; y < size; y++) for (x = 0; x < size; x++) if (M[y][x]) dark++;
      var t = size * size; p += (Math.ceil(Math.abs(dark * 20 - t * 10) / t) - 1) * 10;
      return p;
    }
    var best = 0, bestP = Infinity;
    for (var m = 0; m < 8; m++) { applyMask(m); format(m); var pp = penalty(); if (pp < bestP) { bestP = pp; best = m; } applyMask(m); }
    applyMask(best); format(best);
    return { size: size, version: v, mask: best, get: function (x, y) { return x >= 0 && x < size && y >= 0 && y < size && M[y][x]; } };
  }

  function svg(text, o) {
    o = o || {}; var q = encode(text, o.ecl || "M"), mg = o.margin == null ? 4 : o.margin, s = q.size + mg * 2, d = "";
    for (var y = 0; y < q.size; y++) for (var x = 0; x < q.size; x++) if (q.get(x, y)) d += "M" + (x + mg) + "," + (y + mg) + "h1v1h-1z";
    var px = (o.scale || 5) * s;
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + s + " " + s + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges" role="img" aria-label="' + String(o.label || "QR code").replace(/"/g, "&quot;") + '">' +
      '<rect width="' + s + '" height="' + s + '" fill="#fff"/><path d="' + d + '" fill="#000"/></svg>';
  }
  var api = { matrix: encode, svg: svg };
  if (typeof module === "object" && module.exports) module.exports = api; else root.DolphinQR = api;
})(typeof window !== "undefined" ? window : this);
