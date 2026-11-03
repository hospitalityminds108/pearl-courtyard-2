/* ==========================================================================
   PEARL COURTYARD — main.js
   Modular vanilla ES6+ with progressive enhancement.
   Modules: Preloader, SmoothScroll, Header, Drawer, Reveal, SplitText,
            HeroSlider, Counters, Gallery, Lightbox, Menu, Accordion,
            Forms, Cursor, Magnetic, Parallax, SwiperInits, BookingBar, MapPanel
   ========================================================================== */
(function () {
  'use strict';

  document.documentElement.classList.add('js');

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouch = window.matchMedia('(hover: none)').matches;

  /* ---------------------------------------------------------------------
     1. Preloader
  --------------------------------------------------------------------- */
  function Preloader() {
    const el = $('.preloader');
    if (!el) { document.documentElement.classList.add('is-ready'); return; }
    const bar = $('.preloader__bar i', el);
    const pct = $('.preloader__pct', el);
    let p = 0;
    const tick = setInterval(() => {
      p = Math.min(100, p + Math.random() * 16 + 6);
      if (bar) bar.style.width = p + '%';
      if (pct) pct.textContent = String(Math.round(p)).padStart(3, '0');
      if (p >= 100) {
        clearInterval(tick);
        setTimeout(finish, 260);
      }
    }, 130);

    function finish() {
      el.classList.add('is-done');
      document.documentElement.classList.add('is-ready');
      document.body.classList.add('is-ready');
      window.dispatchEvent(new Event('pc:ready'));
      setTimeout(() => el.remove(), 1000);
    }
    // Never trap the user behind a slow network
    setTimeout(() => { if (document.body.contains(el)) finish(); }, 4200);
  }

  /* ---------------------------------------------------------------------
     2. Smooth scroll (Lenis) + ScrollTrigger sync
  --------------------------------------------------------------------- */
  let lenis = null;
  function SmoothScroll() {
    if (prefersReduced || typeof window.Lenis === 'undefined') return;
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
      touchMultiplier: 1.6
    });
    if (window.gsap && window.ScrollTrigger) {
      lenis.on('scroll', window.ScrollTrigger.update);
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      const raf = (t) => { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
    // anchor links
    $$('a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const id = a.getAttribute('href');
        if (!id || id === '#') return;
        const target = $(id);
        if (!target) return;
        e.preventDefault();
        lenis.scrollTo(target, { offset: -80 });
      });
    });
    window.pcLenis = lenis;
  }

  /* ---------------------------------------------------------------------
     3. Header behaviour + scroll progress
  --------------------------------------------------------------------- */
  function Header() {
    const header = $('.header');
    const progress = $('.progress');
    const solid = header && header.classList.contains('header--solid');
    let last = 0;
    function onScroll(y) {
      if (header && !solid) header.classList.toggle('is-scrolled', y > 60);
      if (progress) {
        const h = document.documentElement.scrollHeight - window.innerHeight;
        progress.style.transform = 'scaleX(' + (h > 0 ? Math.min(1, y / h) : 0) + ')';
      }
      last = y;
    }
    if (lenis) lenis.on('scroll', ({ scroll }) => onScroll(scroll));
    window.addEventListener('scroll', () => onScroll(window.scrollY), { passive: true });
    onScroll(window.scrollY);
  }

  /* ---------------------------------------------------------------------
     4. Mobile drawer
  --------------------------------------------------------------------- */
  function Drawer() {
    const burger = $('.burger');
    const drawer = $('.drawer');
    if (!burger || !drawer) return;
    const links = $$('.drawer__link', drawer);
    let open = false;

    function setOpen(state) {
      open = state;
      burger.setAttribute('aria-expanded', String(state));
      drawer.classList.toggle('is-open', state);
      drawer.setAttribute('aria-hidden', String(!state));
      document.body.style.overflow = state ? 'hidden' : '';
      if (lenis) state ? lenis.stop() : lenis.start();
      links.forEach((l, i) => {
        l.style.transitionDelay = state ? (0.18 + i * 0.055) + 's' : '0s';
      });
      if (state) setTimeout(() => links[0] && links[0].focus(), 500);
    }
    burger.addEventListener('click', () => setOpen(!open));
    links.forEach((l) => l.addEventListener('click', () => setOpen(false)));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && open) { setOpen(false); burger.focus(); }
      if (e.key === 'Tab' && open) {
        const f = [burger, ...links, ...$$('a,button', drawer)];
        const first = f[0], lastEl = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); lastEl.focus(); }
        else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); first.focus(); }
      }
    });
    window.addEventListener('resize', () => { if (window.innerWidth > 1024 && open) setOpen(false); });
  }

  /* ---------------------------------------------------------------------
     5. Scroll reveals
  --------------------------------------------------------------------- */
  function Reveal() {
    const items = $$('[data-reveal]');
    const masks = $$('[data-mask]');
    if (prefersReduced || !('IntersectionObserver' in window)) {
      items.forEach((i) => i.classList.add('is-in'));
      masks.forEach((i) => i.classList.add('is-revealed'));
      return;
    }
    if (masks.length) {
      const mio = new IntersectionObserver((entries) => {
        entries.forEach((en) => {
          if (en.isIntersecting) {
            en.target.classList.add('is-revealed');
            mio.unobserve(en.target);
          }
        });
      }, { threshold: 0.08, rootMargin: '0px 0px -6% 0px' });
      masks.forEach((i) => mio.observe(i));
    }
    if (!items.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -8% 0px' });
    items.forEach((i) => io.observe(i));
  }

  /* ---------------------------------------------------------------------
     6. Split text (headings) — respects reduced motion
  --------------------------------------------------------------------- */
  function SplitText() {
    if (prefersReduced) return;
    $$('[data-split]').forEach((el) => {
      const text = el.innerHTML;
      const parts = text.split(/(<br\s*\/?>)/gi);
      el.innerHTML = parts.map((p) => {
        if (/^<br/i.test(p)) return p;
        if (!p.trim()) return p;
        return '<span class="split-line"><span>' + p + '</span></span>';
      }).join('');
      el.classList.add('split-host');
    });
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('is-in');
          $$('.split-line', en.target).forEach((l, i) => {
            const inner = l.firstElementChild;
            if (inner) inner.style.transitionDelay = (i * 0.09) + 's';
          });
          io.unobserve(en.target);
        }
      });
    }, { threshold: 0.2 });
    $$('.split-host').forEach((el) => io.observe(el));
  }

  /* ---------------------------------------------------------------------
     7. Hero slider
  --------------------------------------------------------------------- */
  function HeroSlider() {
    const hero = $('.hero');
    if (!hero) return;
    const slides = $$('.hero__slide', hero);
    const dots = $$('.hero__dot', hero);
    if (slides.length < 2) return;
    let i = 0, timer = null;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach((s, k) => s.classList.toggle('is-active', k === i));
      dots.forEach((d, k) => d.classList.toggle('is-active', k === i));
    }
    function start() {
      stop();
      if (prefersReduced) return;
      timer = setInterval(() => go(i + 1), 7200);
    }
    function stop() { if (timer) clearInterval(timer); }
    dots.forEach((d, k) => d.addEventListener('click', () => { go(k); start(); }));
    hero.addEventListener('mouseenter', stop);
    hero.addEventListener('mouseleave', start);
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
    start();
  }

  /* ---------------------------------------------------------------------
     8. Counters
  --------------------------------------------------------------------- */
  function Counters() {
    const els = $$('[data-count]');
    if (!els.length) return;
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        const el = en.target;
        const target = parseFloat(el.dataset.count);
        const suffix = el.dataset.suffix || '';
        if (prefersReduced) { el.textContent = target + suffix; io.unobserve(el); return; }
        const dur = 1600, t0 = performance.now();
        function step(t) {
          const p = Math.min(1, (t - t0) / dur);
          const eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.round(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.6 });
    els.forEach((e) => io.observe(e));
  }

  /* ---------------------------------------------------------------------
     9. Gallery filter
  --------------------------------------------------------------------- */
  function Gallery() {
    const wrapEl = $('[data-gallery]');
    if (!wrapEl) return;
    const buttons = $$('.filter', wrapEl);
    const items = $$('.masonry__item', wrapEl);
    buttons.forEach((b) => {
      b.addEventListener('click', () => {
        buttons.forEach((x) => { x.classList.remove('is-active'); x.setAttribute('aria-pressed', 'false'); });
        b.classList.add('is-active');
        b.setAttribute('aria-pressed', 'true');
        const cat = b.dataset.filter;
        items.forEach((it) => {
          const show = cat === 'all' || it.dataset.cat === cat;
          it.classList.toggle('is-hidden', !show);
        });
        if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      });
    });
  }

  /* ---------------------------------------------------------------------
     10. Lightbox
  --------------------------------------------------------------------- */
  function Lightbox() {
    const box = $('.lightbox');
    if (!box) return;
    const img = $('.lightbox__img', box);
    const cap = $('.lightbox__cap', box);
    let group = [], idx = 0, lastFocus = null;

    function open(list, n) {
      group = list; idx = n; lastFocus = document.activeElement;
      render();
      box.classList.add('is-open');
      box.setAttribute('aria-hidden', 'false');
      document.body.style.overflow = 'hidden';
      if (lenis) lenis.stop();
      $('.lightbox__close', box).focus();
    }
    function close() {
      box.classList.remove('is-open');
      box.setAttribute('aria-hidden', 'true');
      document.body.style.overflow = '';
      if (lenis) lenis.start();
      if (lastFocus) lastFocus.focus();
    }
    function render() {
      const a = group[idx];
      if (!a) return;
      const source = a.getAttribute('data-full') || a.getAttribute('href');
      img.src = source;
      img.alt = a.getAttribute('data-alt') || '';
      cap.textContent = a.getAttribute('data-alt') || '';
    }
    function next(d) { idx = (idx + d + group.length) % group.length; render(); }

    $$('[data-lightbox]').forEach((a) => {
      a.addEventListener('click', (e) => {
        e.preventDefault();
        const list = $$('[data-lightbox="' + a.dataset.lightbox + '"]');
        open(list, list.indexOf(a));
      });
    });
    $('.lightbox__close', box).addEventListener('click', close);
    $('.lightbox__prev', box).addEventListener('click', () => next(-1));
    $('.lightbox__next', box).addEventListener('click', () => next(1));
    box.addEventListener('click', (e) => { if (e.target === box) close(); });
    document.addEventListener('keydown', (e) => {
      if (!box.classList.contains('is-open')) return;
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') next(1);
      if (e.key === 'ArrowLeft') next(-1);
    });
    // swipe
    let sx = 0;
    box.addEventListener('touchstart', (e) => { sx = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', (e) => {
      const dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 50) next(dx < 0 ? 1 : -1);
    }, { passive: true });
  }

  /* ---------------------------------------------------------------------
     11. Menu tabs
  --------------------------------------------------------------------- */
  function MenuTabs() {
    const root = $('[data-menu]');
    if (!root) return;
    const tabs = $$('.menu-tab', root);
    const panels = $$('.menu-panel', root);
    tabs.forEach((tab) => {
      tab.addEventListener('click', () => {
        tabs.forEach((t) => { t.classList.remove('is-active'); t.setAttribute('aria-selected', 'false'); t.tabIndex = -1; });
        panels.forEach((p) => p.classList.remove('is-active'));
        tab.classList.add('is-active');
        tab.setAttribute('aria-selected', 'true');
        tab.tabIndex = 0;
        const p = $('#' + tab.getAttribute('aria-controls'), root);
        if (p) p.classList.add('is-active');
      });
      tab.addEventListener('keydown', (e) => {
        const i = tabs.indexOf(tab);
        if (e.key === 'ArrowRight') { e.preventDefault(); tabs[(i + 1) % tabs.length].focus(); tabs[(i + 1) % tabs.length].click(); }
        if (e.key === 'ArrowLeft') { e.preventDefault(); tabs[(i - 1 + tabs.length) % tabs.length].focus(); tabs[(i - 1 + tabs.length) % tabs.length].click(); }
      });
    });
  }

  /* ---------------------------------------------------------------------
     12. Accordion
  --------------------------------------------------------------------- */
  function Accordion() {
    $$('.acc__btn').forEach((btn) => {
      const panel = $('#' + btn.getAttribute('aria-controls'));
      if (!panel) return;
      btn.addEventListener('click', () => {
        const isOpen = btn.getAttribute('aria-expanded') === 'true';
        // close siblings within same accordion
        const acc = btn.closest('.acc');
        if (acc) {
          $$('.acc__btn', acc).forEach((b) => {
            if (b !== btn) {
              b.setAttribute('aria-expanded', 'false');
              const p = $('#' + b.getAttribute('aria-controls'));
              if (p) p.style.height = '0px';
            }
          });
        }
        btn.setAttribute('aria-expanded', String(!isOpen));
        panel.style.height = isOpen ? '0px' : panel.scrollHeight + 'px';
      });
    });
    window.addEventListener('resize', () => {
      $$('.acc__btn[aria-expanded="true"]').forEach((b) => {
        const p = $('#' + b.getAttribute('aria-controls'));
        if (p) p.style.height = p.scrollHeight + 'px';
      });
    });
  }

  /* ---------------------------------------------------------------------
     13. Forms — progressive enhancement with real endpoint
  --------------------------------------------------------------------- */
  function Forms() {
    $$('form[data-enquiry]').forEach((form) => {
      const status = $('.form-status', form);
      const submit = $('button[type="submit"]', form);
      const type = form.dataset.enquiry;

      // min date for arrival fields
      $$('input[type="date"]', form).forEach((d) => {
        if (!d.min) d.min = new Date().toISOString().split('T')[0];
      });
      // checkout after checkin
      const ci = form.querySelector('[name="checkin"]');
      const co = form.querySelector('[name="checkout"]');
      if (ci && co) {
        ci.addEventListener('change', () => {
          if (ci.value) {
            const d = new Date(ci.value);
            d.setDate(d.getDate() + 1);
            co.min = d.toISOString().split('T')[0];
            if (co.value && co.value <= ci.value) co.value = co.min;
          }
        });
      }

      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        const data = Object.fromEntries(new FormData(form).entries());
        data.form_type = type;
        data.page = location.pathname;
        data.submitted_at = new Date().toISOString();

        if (submit) { submit.disabled = true; submit.dataset.label = submit.textContent; submit.textContent = 'Sending…'; }
        if (status) { status.className = 'form-status'; status.textContent = ''; }

        try {
          const res = await fetch(form.action || 'api/enquiry.php', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!res.ok) throw new Error('HTTP ' + res.status);
          const json = await res.json().catch(() => ({ ok: true }));
          if (json.ok === false) throw new Error(json.error || 'Submission failed');
          form.reset();
          if (status) {
            status.className = 'form-status is-visible is-success';
            status.textContent = 'Thank you — your enquiry has reached our team. We reply within a few hours, usually much sooner.';
          }
          if (window.gtag) window.gtag('event', 'generate_lead', { form_type: type });
        } catch (err) {
          if (status) {
            status.className = 'form-status is-visible is-error';
            status.innerHTML = 'We could not send this automatically. Please <a href="https://wa.me/918931065047?text=' +
              encodeURIComponent('Enquiry: ' + type) + '" target="_blank" rel="noopener" style="text-decoration:underline">message us on WhatsApp</a> or call +91 89310 65047 — we will take it from there.';
          }
        } finally {
          if (submit) { submit.disabled = false; submit.textContent = submit.dataset.label || 'Submit'; }
        }
      });
    });
  }

  /* ---------------------------------------------------------------------
     14. Premium cursor
  --------------------------------------------------------------------- */
  function Cursor() {
    if (isTouch || prefersReduced) return;
    const ring = $('.cursor'), dot = $('.cursor-dot');
    if (!ring || !dot) return;
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my;
    document.addEventListener('mousemove', (e) => {
      mx = e.clientX; my = e.clientY;
      dot.style.transform = `translate(${mx}px, ${my}px) translate(-50%,-50%)`;
      ring.classList.remove('is-hidden');
    });
    (function loop() {
      rx += (mx - rx) * 0.16; ry += (my - ry) * 0.16;
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%,-50%)`;
      requestAnimationFrame(loop);
    })();
    const hoverSel = 'a, button, .masonry__item, .room-card, .attraction-card, input, select, textarea, [data-cursor]';
    document.addEventListener('mouseover', (e) => {
      if (e.target.closest(hoverSel)) ring.classList.add('is-hover');
    });
    document.addEventListener('mouseout', (e) => {
      if (e.target.closest(hoverSel)) ring.classList.remove('is-hover');
    });
    document.addEventListener('mouseleave', () => ring.classList.add('is-hidden'));
  }

  /* ---------------------------------------------------------------------
     15. Magnetic buttons
  --------------------------------------------------------------------- */
  function Magnetic() {
    if (isTouch || prefersReduced) return;
    $$('[data-magnetic]').forEach((el) => {
      const strength = parseFloat(el.dataset.magnetic) || 14;
      el.addEventListener('mousemove', (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) / r.width * strength;
        const y = (e.clientY - r.top - r.height / 2) / r.height * strength;
        el.style.transform = `translate(${x}px, ${y}px)`;
      });
      el.addEventListener('mouseleave', () => { el.style.transform = ''; });
    });
  }

  /* ---------------------------------------------------------------------
     16. Parallax
  --------------------------------------------------------------------- */
  function Parallax() {
    if (prefersReduced) return;
    const els = $$('[data-parallax]');
    if (!els.length) return;
    if (window.gsap && window.ScrollTrigger) {
      els.forEach((el) => {
        const amt = parseFloat(el.dataset.parallax) || 12;
        window.gsap.to(el, {
          yPercent: amt,
          ease: 'none',
          scrollTrigger: { trigger: el.closest('[data-parallax-scope]') || el, start: 'top bottom', end: 'bottom top', scrub: true }
        });
      });
    } else {
      let ticking = false;
      const update = () => {
        els.forEach((el) => {
          const r = el.getBoundingClientRect();
          const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
          const amt = parseFloat(el.dataset.parallax) || 12;
          el.style.transform = `translate3d(0, ${(-p * amt).toFixed(2)}%, 0)`;
        });
        ticking = false;
      };
      window.addEventListener('scroll', () => {
        if (!ticking) { ticking = true; requestAnimationFrame(update); }
      }, { passive: true });
      update();
    }
  }

  /* ---------------------------------------------------------------------
     17. Swiper instances
  --------------------------------------------------------------------- */
  function SwiperInits() {
    if (typeof window.Swiper === 'undefined') return;
    const q = $('.quotes__swiper');
    if (q) {
      new window.Swiper(q, {
        loop: true,
        speed: 900,
        autoplay: prefersReduced ? false : { delay: 7000, disableOnInteraction: false },
        pagination: { el: '.quotes .swiper-pagination', clickable: true },
        keyboard: { enabled: true },
        a11y: { enabled: true }
      });
    }
    const g = $('.strip-swiper');
    if (g) {
      new window.Swiper(g, {
        slidesPerView: 1.15,
        spaceBetween: 14,
        speed: 800,
        breakpoints: { 640: { slidesPerView: 2.2 }, 1024: { slidesPerView: 3.3 }, 1400: { slidesPerView: 4 } },
        navigation: { nextEl: '.strip-next', prevEl: '.strip-prev' },
        keyboard: { enabled: true },
        a11y: { enabled: true }
      });
    }
  }

  /* ---------------------------------------------------------------------
     18. Booking bar
  --------------------------------------------------------------------- */
  function BookingBar() {
    $$('form[data-booking]').forEach((form) => {
      const ci = form.querySelector('[name="checkin"]');
      const co = form.querySelector('[name="checkout"]');
      const today = new Date();
      const iso = (d) => d.toISOString().split('T')[0];
      if (ci) { ci.min = iso(today); if (!ci.value) ci.value = iso(new Date(today.getTime() + 864e5)); }
      if (co) { co.min = iso(new Date(today.getTime() + 2 * 864e5)); if (!co.value) co.value = iso(new Date(today.getTime() + 3 * 864e5)); }
      if (ci && co) {
        ci.addEventListener('change', () => {
          const d = new Date(ci.value); d.setDate(d.getDate() + 1);
          co.min = iso(d);
          if (!co.value || co.value <= ci.value) co.value = iso(d);
        });
      }
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const d = new FormData(form);
        const params = new URLSearchParams();
        ['checkin', 'checkout', 'adults', 'children', 'rooms'].forEach((k) => { if (d.get(k)) params.set(k, d.get(k)); });
        // Hand off to the hotel's live booking engine (SwiftBook), preserving dates where supported
        const base = form.dataset.engine || 'https://www.swiftbook.io/inst/#home?propertyId=863MjIsHMgNEynRUvCLQeqeIQs4cgFxnDCNt9OKqzvJH4SwJz5MDA=&JDRN=Y&m_currency=INR';
        const url = base + (base.includes('#') ? '' : '') + (params.toString() ? '&' + params.toString() : '');
        if (window.gtag) window.gtag('event', 'begin_checkout', { checkin: d.get('checkin'), checkout: d.get('checkout') });
        window.open(url, '_blank', 'noopener');
      });
    });
  }

  /* ---------------------------------------------------------------------
     19. GSAP polish (subtle, optional)
  --------------------------------------------------------------------- */
  function revealSplitFallback() {
    $$('.split-line > span').forEach((el) => { el.style.transform = 'none'; });
  }

  function GsapPolish() {
    if (prefersReduced) { revealSplitFallback(); return; }
    if (!window.gsap || !window.ScrollTrigger) { revealSplitFallback(); return; }
    window.gsap.registerPlugin(window.ScrollTrigger);
    // Hero entrance is CSS-driven (see .is-ready rules in main.css) so the
    // headline paints immediately and never waits on a CDN script.
    // image masks are handled by the IntersectionObserver in Reveal() so they
    // never depend on ScrollTrigger's cached positions.
  }

  /* ---------------------------------------------------------------------
     20. Misc: year, active nav, external links
  --------------------------------------------------------------------- */
  function Misc() {
    $$('[data-year]').forEach((el) => { el.textContent = new Date().getFullYear(); });
    $$('a[target="_blank"]').forEach((a) => {
      if (!a.rel.includes('noopener')) a.rel += ' noopener noreferrer';
    });
    // lazy iframes
    $$('iframe[data-src]').forEach((f) => {
      const io = new IntersectionObserver((en) => {
        if (en[0].isIntersecting) { f.src = f.dataset.src; io.disconnect(); }
      }, { rootMargin: '300px' });
      io.observe(f);
    });
  }

  /* ---------------------------------------------------------------------
     21. Attraction map (Leaflet, lazy-loaded, no API key)
  --------------------------------------------------------------------- */
  function MapPanel() {
    const host = $('#pc-map');
    if (!host || !host.dataset.map) return;

    let points = [];
    try { points = JSON.parse(host.dataset.map) || []; } catch (e) { return; }
    const hotel = JSON.parse(host.dataset.mapHotel || '{"lat":25.3095,"lng":83.0104}');
    if (!points.length) return;

    let started = false;
    const start = () => {
      if (started) return;
      started = true;
      loadLeaflet().then(() => build()).catch(() => {
        host.innerHTML = '<p style="padding:2rem;font-size:.9rem">The map could not load. ' +
          '<a href="https://www.google.com/maps/search/?api=1&query=Pearl+Courtyard+Varanasi" target="_blank" rel="noopener" style="text-decoration:underline">Open Google Maps</a>.</p>';
      });
    };

    const io = new IntersectionObserver((en) => {
      if (en[0].isIntersecting) { start(); io.disconnect(); }
    }, { rootMargin: '400px' });
    io.observe(host);

    function loadLeaflet() {
      if (window.L) return Promise.resolve();
      return new Promise((resolve, reject) => {
        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        css.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
        css.crossOrigin = '';
        document.head.appendChild(css);
        const js = document.createElement('script');
        js.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        js.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
        js.crossOrigin = '';
        js.onload = resolve;
        js.onerror = reject;
        document.head.appendChild(js);
      });
    }

    function build() {
      const map = L.map(host, {
        scrollWheelZoom: false,
        zoomControl: true,
        attributionControl: true
      }).setView([hotel.lat, hotel.lng], 13);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors'
      }).addTo(map);

      const hotelIcon = L.divIcon({
        className: 'pc-marker pc-marker--hotel',
        html: '<span class="pc-marker__pulse"></span><span class="pc-marker__dot"></span>',
        iconSize: [26, 26], iconAnchor: [13, 13]
      });
      const pinIcon = L.divIcon({
        className: 'pc-marker',
        html: '<span class="pc-marker__dot"></span>',
        iconSize: [18, 18], iconAnchor: [9, 9]
      });

      L.marker([hotel.lat, hotel.lng], { icon: hotelIcon, title: 'Pearl Courtyard', zIndexOffset: 1000 })
        .addTo(map)
        .bindPopup('<strong>Pearl Courtyard</strong><br>Godowlia, Luxa &middot; 600 m from Kashi Vishwanath');

      const markers = {};
      points.forEach((p) => {
        const m = L.marker([p.lat, p.lng], { icon: pinIcon, title: p.name })
          .addTo(map)
          .bindPopup(
            '<div class="pc-pop">' +
            (p.img ? '<img src="' + p.img + '" alt="" loading="lazy">' : '') +
            '<strong>' + p.name + '</strong>' +
            '<span>' + p.cat + ' &middot; ' + p.dist + ' &middot; ' + p.time + '</span>' +
            '<a href="' + p.url + '">Read the guide &rarr;</a></div>',
            { maxWidth: 240, minWidth: 200 }
          );
        markers[p.slug] = m;
      });

      // sidebar focus buttons
      $$('[data-map-focus]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const slug = btn.dataset.mapFocus;
          $$('[data-map-focus]').forEach((b) => b.classList.toggle('is-active', b === btn));
          if (slug === 'pearl-courtyard') {
            map.flyTo([hotel.lat, hotel.lng], 15, { duration: prefersReduced ? 0 : 0.9 });
          } else if (markers[slug]) {
            const ll = markers[slug].getLatLng();
            map.flyTo(ll, 15, { duration: prefersReduced ? 0 : 0.9 });
            markers[slug].openPopup();
          }
        });
      });

      // fit all markers once on first paint
      const bounds = L.latLngBounds([[hotel.lat, hotel.lng]].concat(points.map((p) => [p.lat, p.lng])));
      map.fitBounds(bounds, { padding: [40, 40] });
      setTimeout(() => map.invalidateSize(), 300);
    }
  }

  /* ---------------------------------------------------------------------
     Boot
  --------------------------------------------------------------------- */
  function boot() {
    Preloader();
    SmoothScroll();
    Header();
    Drawer();
    SplitText();
    Reveal();
    HeroSlider();
    Counters();
    Gallery();
    Lightbox();
    MenuTabs();
    Accordion();
    Forms();
    Cursor();
    Magnetic();
    Parallax();
    SwiperInits();
    BookingBar();
    MapPanel();
    Misc();
    window.addEventListener('pc:ready', GsapPolish);
    if (!document.querySelector('.preloader')) GsapPolish();
    // GSAP arrives deferred from a CDN — retry until it is available, then
    // make sure nothing is left stranded in its hidden pre-animation state.
    let tries = 0;
    (function waitGsap() {
      if (window.gsap && window.ScrollTrigger) { GsapPolish(); return; }
      if (++tries > 30) { revealSplitFallback(); return; }
      setTimeout(waitGsap, 200);
    })();
    setTimeout(revealSplitFallback, 6000);
    if (window.ScrollTrigger) setTimeout(() => window.ScrollTrigger.refresh(), 600);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
