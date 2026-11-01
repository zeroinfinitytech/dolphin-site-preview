Animated logo. Markup (paths relative to site/):

<span class="lg-anim" role="img" aria-label="Dolphin Education">
  <img class="la-base" src="img/logo-anim/base.png" alt="">
  <span class="la-clip"><img class="la-dol" src="img/logo-anim/dolphin.png" alt=""></span>
  <svg class="la-rip" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/></svg><svg class="la-rip second" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="9"/></svg>
  <img class="la-final" src="img/logo.png" alt="">
</span>

Add class "white" for the white, glowing version on dark backgrounds. Needs css/logo-anim.css.
base.png and dolphin.png are cut from logo.png (the dolphin lifted out, the globe filled behind it); logo.png itself is untouched.
