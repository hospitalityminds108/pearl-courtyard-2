/* Pearl Courtyard — modern interaction layer (progressive enhancement) */
(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  /* Sliding highlight pill behind the nav links */
  function NavPill() {
    var nav = $('.nav');
    if (!nav || !fine) return;
    var pill = document.createElement('span');
    pill.className = 'nav__pill';
    pill.setAttribute('aria-hidden', 'true');
    nav.appendChild(pill);
    function to(link) {
      pill.style.width = link.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + link.offsetLeft + 'px)';
      pill.classList.add('is-on');
    }
    $$('.nav__link', nav).forEach(function (l) {
      l.addEventListener('mouseenter', function () { to(l); });
      l.addEventListener('focus', function () { to(l); });
    });
    nav.addEventListener('mouseleave', function () { pill.classList.remove('is-on'); });
    nav.addEventListener('focusout', function () { pill.classList.remove('is-on'); });
  }

  /* Header tucks away on scroll down, returns on scroll up */
  function HeaderHide() {
    var header = $('.header');
    if (!header) return;
    var last = window.scrollY, ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY, d = y - last;
        if (Math.abs(d) > 6) {
          header.classList.toggle('is-hidden', d > 0 && y > 420);
          last = y;
        }
        ticking = false;
      });
    }, { passive: true });
    header.addEventListener('focusin', function () { header.classList.remove('is-hidden'); });
  }

  /* Cursor-follow glow + gentle 3D tilt on cards */
  function Tilt() {
    if (!fine || reduced) return;
    $$('.room-card, .attraction-card').forEach(function (card) {
      var tilt = card.classList.contains('room-card');
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        card.style.setProperty('--mx', (x * 100) + '%');
        card.style.setProperty('--my', (y * 100) + '%');
        if (tilt) {
          card.style.transition = 'transform .18s ease-out, box-shadow .7s, border-color .6s';
          card.style.transform = 'perspective(1000px) translateY(-8px) rotateX(' + ((0.5 - y) * 5) + 'deg) rotateY(' + ((x - 0.5) * 6) + 'deg)';
        }
      });
      card.addEventListener('pointerleave', function () {
        card.style.transition = '';
        card.style.transform = '';
      });
    });
  }

  /* Hero copy drifts and fades as the page scrolls away */
  function HeroDrift() {
    var hero = $('.hero');
    var content = hero && $('.hero__content', hero);
    if (!content || reduced) return;
    var ticking = false;
    window.addEventListener('scroll', function () {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var p = Math.min(1, Math.max(0, window.scrollY / (hero.offsetHeight * 0.8)));
        content.style.transform = 'translate3d(0,' + (p * -50) + 'px,0)';
        content.style.opacity = String(1 - p * 0.9);
        ticking = false;
      });
    }, { passive: true });
  }

  /* Headings rise word by word when they scroll into view */
  function SplitHeadings() {
    if (reduced || !('IntersectionObserver' in window)) return;
    var io = new IntersectionObserver(function (en) {
      en.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add('is-split-in'); io.unobserve(e.target); } });
    }, { threshold: 0.3 });
    $$('main h2').forEach(function (h) {
      if (h.closest('.hero') || h.hasAttribute('data-split')) return;
      var label = h.textContent.replace(/\s+/g, ' ').trim();
      var n = 0;
      (function walk(node) {
        Array.prototype.slice.call(node.childNodes).forEach(function (c) {
          if (c.nodeType === 3) {
            var frag = document.createDocumentFragment();
            c.textContent.split(/(\s+)/).forEach(function (t) {
              if (!t) return;
              if (/^\s+$/.test(t)) { frag.appendChild(document.createTextNode(' ')); return; }
              var w = document.createElement('span'); w.className = 'w'; w.setAttribute('aria-hidden', 'true');
              var i = document.createElement('span'); i.textContent = t;
              w.style.setProperty('--wi', n++); w.appendChild(i); frag.appendChild(w);
            });
            node.replaceChild(frag, c);
          } else if (c.nodeType === 1 && c.tagName !== 'BR') walk(c);
        });
      })(h);
      h.setAttribute('aria-label', label);
      io.observe(h);
    });
  }

  /* Stagger grid children so cards rise one after another */
  function Stagger() {
    $$('.grid').forEach(function (g) {
      Array.prototype.forEach.call(g.children, function (c, i) { c.style.setProperty('--i', i % 3); });
    });
  }

  /* A scrolling ribbon between the welcome and rooms sections on the home page */
  function Ribbon() {
    var rooms = $('#rooms');
    if (!rooms || !document.body.classList.contains('page-home')) return;
    var words = ['Victorian heritage', 'Teak & pearl', 'Banarasi silk', 'Satvik kitchen', 'Ganga aarti', 'Steps from Kashi Vishwanath', 'Fifty-four keys', 'Rooftop Shamiyana'];
    var track = document.createElement('div'); track.className = 'ribbon__track';
    for (var k = 0; k < 2; k++) words.forEach(function (w) { var s = document.createElement('span'); s.textContent = w; track.appendChild(s); });
    var r = document.createElement('div'); r.className = 'ribbon'; r.setAttribute('aria-hidden', 'true'); r.appendChild(track);
    var wrap = document.createElement('div'); wrap.style.cssText = 'overflow:hidden;padding:2rem 0 1rem'; wrap.appendChild(r);
    rooms.parentNode.insertBefore(wrap, rooms);
  }

  /* Nearby page: one grid, simple filters */
  function PlaceFilter() {
    var bar = $('.place-filters');
    if (!bar) return;
    var cards = $$('.place-card'), empty = $('.place-empty');
    $$('[data-place-filter]', bar).forEach(function (btn) {
      btn.addEventListener('click', function () {
        var f = btn.getAttribute('data-place-filter'), n = 0;
        $$('[data-place-filter]', bar).forEach(function (b) { var on = b === btn; b.classList.toggle('is-active', on); b.setAttribute('aria-pressed', String(on)); });
        cards.forEach(function (c) {
          var show = f === 'all' || (c.getAttribute('data-cats') || '').split(' ').indexOf(f) > -1;
          c.classList.toggle('is-filtered-out', !show);
          c.classList.remove('is-pop');
          if (show) { void c.offsetWidth; c.classList.add('is-pop'); c.style.animationDelay = (n++ * 40) + 'ms'; }
        });
        if (empty) empty.hidden = n > 0;
      });
    });
  }

  /* "Show all" buttons on the nearby grid and the gallery */
  function ShowMore() {
    [['.place-more-btn', '.place-grid', '[data-place-filter]'], ['.gallery-more-btn', '.masonry', '[data-filter]']].forEach(function (c) {
      var btn = $(c[0]); var host = $(c[1]);
      if (!btn || !host) return;
      function open() { host.classList.add('is-expanded'); if (btn.parentNode) btn.parentNode.style.display = 'none'; }
      btn.addEventListener('click', open);
      $$(c[2]).forEach(function (b) { b.addEventListener('click', function () { var v = b.getAttribute('data-place-filter') || b.getAttribute('data-filter'); if (v && v !== 'all') open(); }); });
    });
  }

  /* Room slider: arrows, drag and a progress bar */
  function Rail() {
    $$('[data-rail]').forEach(function (rail) {
      var track = $('.rail__track', rail), prev = $('[data-rail-prev]', rail), next = $('[data-rail-next]', rail), bar = $('.rail__bar i', rail);
      if (!track) return;
      function step() { var c = track.firstElementChild; return c ? c.getBoundingClientRect().width + 19 : 380; }
      function sync() {
        var max = track.scrollWidth - track.clientWidth;
        var p = max > 0 ? track.scrollLeft / max : 1;
        if (bar) bar.style.transform = 'scaleX(' + Math.max(0.12, p) + ')';
        if (prev) prev.disabled = track.scrollLeft < 4;
        if (next) next.disabled = track.scrollLeft > max - 4;
      }
      if (prev) prev.addEventListener('click', function () { track.scrollBy({ left: -step(), behavior: 'smooth' }); });
      if (next) next.addEventListener('click', function () { track.scrollBy({ left: step(), behavior: 'smooth' }); });
      track.addEventListener('scroll', sync, { passive: true });
      window.addEventListener('resize', sync);
      var down = false, sx = 0, sl = 0, moved = 0;
      track.addEventListener('pointerdown', function (e) { if (e.pointerType !== 'mouse') return; down = true; moved = 0; sx = e.clientX; sl = track.scrollLeft; });
      window.addEventListener('pointermove', function (e) { if (!down) return; var dx = e.clientX - sx; moved = Math.max(moved, Math.abs(dx)); if (moved > 5) track.classList.add('is-dragging'); track.scrollLeft = sl - dx; });
      window.addEventListener('pointerup', function () { if (!down) return; down = false; setTimeout(function () { track.classList.remove('is-dragging'); }, 0); });
      sync();
    });
  }

  function boot() { Rail(); PlaceFilter(); NavPill(); Tilt(); HeroDrift(); SplitHeadings(); Stagger(); ShowMore(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
