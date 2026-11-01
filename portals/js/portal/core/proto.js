/* Dolphin CRM prototype: theme, scroll effects, toast. No dependencies. */
(function () {
  var root = document.documentElement;
  function store(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) { return null; } }
  var saved = store("dolphin-proto-theme");
  if (saved) root.setAttribute("data-theme", saved);

  window.DP = {
    toast: function (msg) {
      var t = document.querySelector(".toast");
      if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
      t.textContent = msg; t.classList.add("on");
      clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove("on"); }, 2200);
    }
  };

  document.addEventListener("click", function (e) {
    var b = e.target.closest("[data-theme-toggle]");
    if (!b) return;
    var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next); store("dolphin-proto-theme", next);
  });

  var reduce = window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* reveal on scroll */
  var io = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" }) : null;
  var cl = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add("in"); cl.unobserve(en.target); } });
  }, { threshold: 0, rootMargin: "0px 0px -10% 0px" }) : null;
  document.querySelectorAll("[data-r]").forEach(function (el) { io ? io.observe(el) : el.classList.add("in"); });
  document.querySelectorAll("[data-clip]").forEach(function (el) { cl ? cl.observe(el) : el.classList.add("in"); });

  /* count-up numbers */
  function count(el) {
    var to = parseFloat(el.dataset.count), suf = el.dataset.suf || "", dur = 1600, t0 = null;
    if (reduce) { el.textContent = to.toLocaleString() + suf; return; }
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(to * e).toLocaleString() + suf;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  var cio = "IntersectionObserver" in window ? new IntersectionObserver(function (es) {
    es.forEach(function (en) { if (en.isIntersecting) { count(en.target); cio.unobserve(en.target); } });
  }, { threshold: 0.6 }) : null;
  document.querySelectorAll("[data-count]").forEach(function (el) { cio ? cio.observe(el) : count(el); });

  /* animated bars in console */
  window.DP.growBars = function (scope) {
    (scope || document).querySelectorAll(".bar i[data-w]").forEach(function (i) {
      i.style.width = "0"; requestAnimationFrame(function () { requestAnimationFrame(function () { i.style.width = i.dataset.w + "%"; }); });
    });
  };

  /* public-site only effects */
  var nav = document.querySelector(".nav"), prog = document.querySelector(".progress i");
  var pars = document.querySelectorAll("[data-par]");
  var lastY = 0, ticking = false;
  function onScroll() {
    var y = window.scrollY, h = document.documentElement.scrollHeight - innerHeight;
    if (prog) prog.parentNode.style.setProperty("--p", h > 0 ? (y / h).toFixed(4) : 0);
    if (nav) {
      nav.classList.toggle("solid", y > innerHeight * 0.6);
      nav.classList.toggle("hide", y > lastY && y > 400);
    }
    lastY = y;
    if (!reduce) pars.forEach(function (el) {
      var r = el.parentNode.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) return;
      var k = parseFloat(el.dataset.par) || 0.15;
      el.style.transform = "translate3d(0," + ((r.top + r.height / 2 - innerHeight / 2) * -k).toFixed(1) + "px,0)";
    });
    ticking = false;
  }
  addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } }, { passive: true });
  onScroll();

  /* pinned journey: highlight step, swap picture */
  var steps = document.querySelectorAll(".j-steps li"), pics = document.querySelectorAll(".j-sticky img");
  if (steps.length && "IntersectionObserver" in window) {
    var jo = new IntersectionObserver(function (es) {
      es.forEach(function (en) {
        if (!en.isIntersecting) return;
        var i = Array.prototype.indexOf.call(steps, en.target);
        steps.forEach(function (s, k) { s.classList.toggle("on", k === i); });
        pics.forEach(function (p, k) { p.classList.toggle("on", k === i); });
      });
    }, { rootMargin: "-45% 0px -45% 0px" });
    steps.forEach(function (s) { jo.observe(s); });
  }
})();
