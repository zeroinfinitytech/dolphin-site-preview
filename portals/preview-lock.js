/* Static test preview: the portals show their sign-in window only; nobody can sign in (no server). */
(function () {
  function note(form) {
    var n = form.querySelector('.preview-lock-msg');
    if (!n) {
      n = document.createElement('p'); n.className = 'preview-lock-msg'; n.setAttribute('role', 'alert');
      n.style.cssText = 'margin:14px 0 0;padding:10px 14px;border-radius:12px;background:#fbeaf2;color:#7a1f45;font:600 14px/1.4 system-ui,sans-serif';
      form.appendChild(n);
    }
    n.textContent = 'Sign-in is closed on this test preview. The portals open when the Dolphin server is live.';
  }
  document.addEventListener('submit', function (e) { e.preventDefault(); e.stopImmediatePropagation(); note(e.target); }, true);
  document.addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('button[type=submit], input[type=submit]');
    if (b && b.form) { e.preventDefault(); e.stopImmediatePropagation(); note(b.form); }
  }, true);
})();
