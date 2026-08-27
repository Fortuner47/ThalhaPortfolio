/* ==========================================================================
   THALHA AHAMED — site behaviour
   Interactions ported from "Kintaro Awwwards Portfolio" (xkintaro, MIT):
   preloader, spring cursor, interactive particle field, scroll-driven hero,
   condensing navbar, pendulum profile card.
   Vanilla JS, no dependencies.
   ========================================================================== */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }

  /* ------------------------------------------------------------------
     Preloader — counts to 100, then lifts. Hard fallbacks throughout.
     ------------------------------------------------------------------ */
  (function preloader() {
    var el = document.getElementById('preloader') || document.getElementById('loader');
    if (!el) { document.body.classList.remove('loading'); return; }

    var countEl = el.querySelector('.loader-count');
    var barEl = el.querySelector('.loader-progress');
    var done = false;
    var shown = 0;

    function reveal() {
      if (done) return;
      done = true;
      if (countEl) countEl.textContent = '100';
      if (barEl) barEl.style.transform = 'scaleX(1)';
      el.classList.add('loaded');
      document.body.classList.remove('loading');
      document.dispatchEvent(new Event('site:ready'));
    }

    if (reduceMotion) { setTimeout(reveal, 150); return; }

    var pageReady = document.readyState === 'complete';
    window.addEventListener('load', function () { pageReady = true; });

    var start = performance.now();
    (function tick(now) {
      var elapsed = now - start;
      // Ease toward 100, but hold below it until the page is actually ready.
      var target = pageReady ? 100 : 92;
      shown = lerp(shown, target, 0.06);
      if (elapsed > 1400 && pageReady) shown = 100;

      if (countEl) countEl.textContent = String(Math.floor(shown)).padStart(3, '0');
      if (barEl) barEl.style.transform = 'scaleX(' + (shown / 100) + ')';

      if (shown >= 99.5 || elapsed > 4000) { reveal(); return; }
      requestAnimationFrame(tick);
    })(start);

    setTimeout(reveal, 5000);
  })();

  /* ------------------------------------------------------------------
     Scroll progress bar
     ------------------------------------------------------------------ */
  (function scrollProgress() {
    var bar = document.querySelector('.scroll-progress');
    if (!bar) return;

    var target = 0;
    var current = 0;
    var running = false;

    function measure() {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      target = max > 0 ? clamp(window.scrollY / max, 0, 1) : 0;
      if (!running) { running = true; requestAnimationFrame(spring); }
    }

    function spring() {
      current = lerp(current, target, 0.12);
      bar.style.transform = 'scaleX(' + current + ')';
      if (Math.abs(target - current) > 0.0005) {
        requestAnimationFrame(spring);
      } else {
        bar.style.transform = 'scaleX(' + target + ')';
        running = false;
      }
    }

    window.addEventListener('scroll', measure, { passive: true });
    window.addEventListener('resize', measure);
    measure();
  })();

  /* ------------------------------------------------------------------
     Custom cursor — spring-followed ring plus a hard dot
     ------------------------------------------------------------------ */
  (function cursor() {
    var dot = document.querySelector('.cursor-dot');
    var ring = document.querySelector('.cursor-outline');
    if (!dot || !ring || !finePointer || reduceMotion) return;

    var mx = window.innerWidth / 2, my = window.innerHeight / 2;
    var rx = mx, ry = my;

    document.body.classList.add('has-custom-cursor');

    window.addEventListener('mousemove', function (e) {
      mx = e.clientX;
      my = e.clientY;
      dot.style.transform = 'translate(' + mx + 'px,' + my + 'px)';
      if (!document.body.classList.contains('cursor-ready')) {
        document.body.classList.add('cursor-ready');
      }
    }, { passive: true });

    (function follow() {
      rx = lerp(rx, mx, 0.18);
      ry = lerp(ry, my, 0.18);
      ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px)';
      requestAnimationFrame(follow);
    })();

    function interactive(el) {
      return !!(el && el.closest && el.closest('a, button, [role="button"], input, select, textarea, .case-gallery-item, .ig-tile, .spline-stage'));
    }

    window.addEventListener('mouseover', function (e) {
      ring.classList.toggle('hovering', interactive(e.target));
    }, { passive: true });

    document.addEventListener('mouseleave', function () { document.body.classList.remove('cursor-ready'); });
    document.addEventListener('mouseenter', function () { document.body.classList.add('cursor-ready'); });
  })();

  /* ------------------------------------------------------------------
     Interactive particle field — drifting dots that flee the pointer
     ------------------------------------------------------------------ */
  (function particles() {
    var canvas = document.getElementById('particles');
    if (!canvas || reduceMotion) return;

    var ctx = canvas.getContext('2d');
    if (!ctx) return;

    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = 0, h = 0;
    var items = [];
    var mouse = { x: -9999, y: -9999, radius: 130 * dpr };
    var running = true;

    function resize() {
      var rect = canvas.getBoundingClientRect();
      w = canvas.width = Math.max(1, Math.floor(rect.width * dpr));
      h = canvas.height = Math.max(1, Math.floor(rect.height * dpr));

      var count = Math.min(140, Math.round((rect.width * rect.height) / 12000));
      items = [];
      for (var i = 0; i < count; i++) {
        var bvx = (Math.random() - 0.5) * 0.6 * dpr;
        var bvy = (Math.random() - 0.5) * 0.6 * dpr;
        items.push({
          x: Math.random() * w,
          y: Math.random() * h,
          bvx: bvx, bvy: bvy, vx: bvx, vy: bvy,
          r: (Math.random() * 1.5 + 0.5) * dpr,
          a: Math.random() * 0.5 + 0.15
        });
      }
    }

    canvas.parentElement.addEventListener('mousemove', function (e) {
      var rect = canvas.getBoundingClientRect();
      mouse.x = (e.clientX - rect.left) * dpr;
      mouse.y = (e.clientY - rect.top) * dpr;
    }, { passive: true });

    canvas.parentElement.addEventListener('mouseleave', function () {
      mouse.x = -9999; mouse.y = -9999;
    });

    var maxSpeed = 4 * dpr;

    function frame() {
      if (!running) return;
      ctx.clearRect(0, 0, w, h);

      for (var i = 0; i < items.length; i++) {
        var p = items[i];

        if (p.x < 0 || p.x > w) { p.bvx *= -1; p.vx *= -1; p.x = clamp(p.x, 0, w); }
        if (p.y < 0 || p.y > h) { p.bvy *= -1; p.vy *= -1; p.y = clamp(p.y, 0, h); }

        var dx = mouse.x - p.x;
        var dy = mouse.y - p.y;
        var dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < mouse.radius && dist > 0.001) {
          var force = (mouse.radius - dist) / mouse.radius;
          p.vx -= (dx / dist) * force * 3 * dpr;
          p.vy -= (dy / dist) * force * 3 * dpr;
        }

        p.vx += (p.bvx - p.vx) * 0.04;
        p.vy += (p.bvy - p.vy) * 0.04;

        var speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (speed > maxSpeed) { p.vx = (p.vx / speed) * maxSpeed; p.vy = (p.vy / speed) * maxSpeed; }

        p.x += p.vx;
        p.y += p.vy;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255,255,255,' + p.a + ')';
        ctx.fill();
      }

      requestAnimationFrame(frame);
    }

    // Only burn frames while the hero is on screen.
    var io = new IntersectionObserver(function (entries) {
      var visible = entries[0].isIntersecting;
      if (visible && !running) { running = true; requestAnimationFrame(frame); }
      running = visible;
    }, { threshold: 0 });

    io.observe(canvas);

    resize();
    window.addEventListener('resize', resize);
    requestAnimationFrame(frame);
  })();

  /* ------------------------------------------------------------------
     Hero — scroll-driven fade / scale / lift / blur
     ------------------------------------------------------------------ */
  (function heroScroll() {
    var body = document.querySelector('.hero-body');
    var portraits = document.querySelector('.hero-portraits');
    if (!body || reduceMotion) return;

    var ticking = false;

    function update() {
      var p = clamp(window.scrollY / 800, 0, 1);
      var opacity = 1 - p;
      body.style.opacity = opacity;
      body.style.transform = 'translateY(' + (-150 * p) + 'px) scale(' + (1 - 0.06 * p) + ')';
      body.style.filter = 'blur(' + (10 * p) + 'px)';
      if (portraits) portraits.style.opacity = 0.28 * opacity;
      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    update();
  })();

  /* ------------------------------------------------------------------
     Navbar — background fades in and the rail condenses to container width
     ------------------------------------------------------------------ */
  var nav = document.querySelector('.nav');

  (function navbar() {
    if (!nav) return;

    var isCasePage = nav.classList.contains('solid');
    var ticking = false;

    function update() {
      var span = window.innerHeight || 800;
      var p = clamp(window.scrollY / span, 0, 1);
      if (isCasePage) p = 1;

      nav.style.setProperty('--nav-bg', String(p));
      nav.style.setProperty('--nav-blur', (16 * p) + 'px');
      nav.style.paddingBlock = (24 - 12 * p) + 'px';

      var startW = Math.max(window.innerWidth, 1280);
      nav.style.setProperty('--nav-w', lerp(startW, 1280, p) + 'px');

      ticking = false;
    }

    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    }, { passive: true });

    window.addEventListener('resize', update);
    update();
  })();

  /* ------------------------------------------------------------------
     Mobile menu — built from the desktop nav when a page lacks its own
     ------------------------------------------------------------------ */
  (function mobileNav() {
    if (!nav) return;

    var toggle = document.getElementById('nav-toggle');
    var panel = document.getElementById('mobile-nav');
    var inner = nav.querySelector('.nav-inner');
    if (!inner) return;

    if (!toggle) {
      toggle = document.createElement('button');
      toggle.id = 'nav-toggle';
      toggle.className = 'nav-toggle';
      toggle.innerHTML = '<span></span><span></span><span></span>';
      inner.appendChild(toggle);
    }

    if (!panel) {
      panel = document.createElement('div');
      panel.id = 'mobile-nav';
      panel.className = 'mobile-nav';
      nav.parentNode.insertBefore(panel, nav.nextSibling);

      nav.querySelectorAll('.nav-links a, .nav-cta-group a').forEach(function (link) {
        var copy = document.createElement('a');
        copy.href = link.getAttribute('href');
        copy.textContent = (link.textContent || '').trim();
        if (link.target) copy.target = link.target;
        if (link.rel) copy.rel = link.rel;
        if (link.classList.contains('nav-gamedev') || link.classList.contains('nav-cta')) {
          copy.className = 'mobile-gamedev';
        }
        panel.appendChild(copy);
      });
    }

    toggle.setAttribute('aria-controls', 'mobile-nav');
    toggle.setAttribute('aria-expanded', 'false');
    toggle.setAttribute('aria-label', 'Open menu');

    var links = panel.querySelectorAll('a');

    function setOpen(open) {
      toggle.classList.toggle('active', open);
      panel.classList.toggle('active', open);
      document.body.classList.toggle('menu-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');

      links.forEach(function (a, i) {
        a.style.transitionDelay = open ? (0.1 + i * 0.05) + 's' : '0s';
      });
    }

    toggle.addEventListener('click', function () { setOpen(!panel.classList.contains('active')); });
    panel.addEventListener('click', function (e) { if (e.target.tagName === 'A') setOpen(false); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && panel.classList.contains('active')) setOpen(false);
    });
    window.addEventListener('resize', function () {
      if (window.innerWidth >= 1280 && panel.classList.contains('active')) setOpen(false);
    });
  })();

  /* ------------------------------------------------------------------
     Spline scene — the runtime plus scene is ~2.5MB across two CDNs, so it
     is only fetched once the About card is actually approaching the viewport.
     ------------------------------------------------------------------ */
  (function splineScene() {
    var stage = document.querySelector('.spline-stage');
    var url = stage && stage.getAttribute('data-spline');
    if (!stage || !url) return;

    if (reduceMotion) {
      stage.querySelector('.spline-status').textContent = '3D scene paused';
      return;
    }

    var VIEWER = 'https://unpkg.com/@splinetool/viewer@2.0.5/build/spline-viewer.js';
    var started = false;

    function load() {
      if (started) return;
      started = true;

      var script = document.createElement('script');
      script.type = 'module';
      script.src = VIEWER;

      script.onload = function () {
        var viewer = document.createElement('spline-viewer');
        viewer.setAttribute('url', url);
        viewer.setAttribute('loading-anim-type', 'none');

        function markReady() {
          stage.classList.add('is-ready');
          var status = stage.querySelector('.spline-status');
          if (status) {
            status.style.opacity = '0';
            status.style.pointerEvents = 'none';
            setTimeout(function () { status.style.display = 'none'; }, 400);
          }
        }

        viewer.addEventListener('load', markReady);
        viewer.addEventListener('load-complete', markReady);
        stage.appendChild(viewer);

        // Fallback: guaranteed dismissal after 2.5s once viewer script is mounted
        setTimeout(markReady, 2500);

        // Hide the viewer's attribution anchor and dismiss loading label as soon as canvas mounts.
        (function hideBadge() {
          var tries = 0;

          function hide() {
            var root = viewer.shadowRoot;
            if (!root) return false;
            var logo = root.getElementById('logo');
            if (logo && logo.style.display !== 'none') {
              logo.style.display = 'none';
              logo.style.pointerEvents = 'none';
            }
            var canvas = root.querySelector('canvas');
            if (canvas) {
              markReady();
            }
            return true;
          }

          var timer = setInterval(function () {
            hide();
            if (++tries > 40) clearInterval(timer);
          }, 200);

          if ('MutationObserver' in window) {
            var start = setInterval(function () {
              if (!viewer.shadowRoot) return;
              clearInterval(start);
              new MutationObserver(hide).observe(viewer.shadowRoot, { childList: true, subtree: true });
            }, 100);
            setTimeout(function () { clearInterval(start); }, 10000);
          }
        })();
      };

      script.onerror = function () {
        var status = stage.querySelector('.spline-status');
        if (status) status.textContent = '3D scene unavailable';
      };

      document.head.appendChild(script);
    }

    if (!('IntersectionObserver' in window)) { load(); return; }

    var io = new IntersectionObserver(function (entries) {
      if (entries[0].isIntersecting) { load(); io.disconnect(); }
    }, { rootMargin: '400px 0px' });

    io.observe(stage);
  })();

  /* ------------------------------------------------------------------
     More-projects disclosure — <details> keeps the semantics and keyboard
     behaviour; the height is animated by hand because a native <details>
     hides its content instantly and so can't transition closed.
     ------------------------------------------------------------------ */
  (function moreDropdown() {
    var dd = document.querySelector('[data-dropdown]');
    if (!dd) return;

    var trigger = dd.querySelector('.dd-trigger');
    var menu = dd.querySelector('.dd-menu');
    if (!trigger || !menu) return;

    var options = Array.prototype.slice.call(menu.querySelectorAll('.dd-option'));

    function setOpen(open) {
      dd.toggleAttribute('data-open', open);
      trigger.setAttribute('aria-expanded', String(open));
    }

    function isOpen() { return dd.hasAttribute('data-open'); }

    trigger.addEventListener('click', function (e) {
      e.stopPropagation();
      setOpen(!isOpen());
    });

    document.addEventListener('click', function (e) {
      if (isOpen() && !dd.contains(e.target)) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && isOpen()) { setOpen(false); trigger.focus(); }
    });

    // Arrow keys walk the list, matching native select behaviour.
    dd.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      if (!isOpen()) { setOpen(true); options[0] && options[0].focus(); return; }
      var i = options.indexOf(document.activeElement);
      var next = e.key === 'ArrowDown' ? i + 1 : i - 1;
      if (next < 0) next = options.length - 1;
      if (next >= options.length) next = 0;
      options[next] && options[next].focus();
    });
  })();

  /* ------------------------------------------------------------------
     Scroll reveal
     ------------------------------------------------------------------ */
  (function reveals() {
    var items = document.querySelectorAll('.reveal');
    if (!items.length) return;

    if (!('IntersectionObserver' in window)) {
      items.forEach(function (el) { el.classList.add('visible'); });
      return;
    }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------
     Active section indicator
     ------------------------------------------------------------------ */
  (function activeSection() {
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-links a[href^="#"]'));
    if (!links.length || !('IntersectionObserver' in window)) return;

    var map = {};
    links.forEach(function (link) {
      var id = link.getAttribute('href').slice(1);
      if (id && document.getElementById(id)) map[id] = link;
    });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        links.forEach(function (l) { l.classList.remove('active'); });
        if (map[entry.target.id]) map[entry.target.id].classList.add('active');
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    Object.keys(map).forEach(function (id) { io.observe(document.getElementById(id)); });
  })();

  /* ------------------------------------------------------------------
     Stat counters
     ------------------------------------------------------------------ */
  (function counters() {
    var stats = document.querySelectorAll('.stat-value[data-target]');
    if (!stats.length) return;

    function run(el) {
      var target = parseFloat(el.dataset.target);
      var suffix = el.dataset.suffix || '';

      if (reduceMotion) { el.textContent = target + suffix; return; }

      var duration = 1200;
      var start = performance.now();

      (function tick(now) {
        var p = Math.min((now - start) / duration, 1);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(tick);
      })(start);
    }

    if (!('IntersectionObserver' in window)) { stats.forEach(run); return; }

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) { run(entry.target); io.unobserve(entry.target); }
      });
    }, { threshold: 0.5 });

    stats.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------
     Lightbox
     ------------------------------------------------------------------ */
  (function lightbox() {
    var box = document.getElementById('lightbox');
    var img = document.getElementById('lightbox-img');
    var close = document.getElementById('lightbox-close');
    if (!box || !img) return;

    var lastFocus = null;

    window.openLightbox = function (src) {
      lastFocus = document.activeElement;
      img.src = src;
      box.classList.add('active');
      document.body.classList.add('menu-open');
      if (close) close.focus();
    };

    function hide() {
      box.classList.remove('active');
      document.body.classList.remove('menu-open');
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    box.addEventListener('click', hide);
    if (close) close.addEventListener('click', function (e) { e.stopPropagation(); hide(); });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && box.classList.contains('active')) hide();
    });

    document.querySelectorAll('[onclick^="openLightbox"]').forEach(function (tile) {
      if (tile.hasAttribute('tabindex')) return;
      tile.setAttribute('tabindex', '0');
      tile.setAttribute('role', 'button');
      tile.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); tile.click(); }
      });
    });
  })();

  /* ------------------------------------------------------------------
     Drop portrait tiles whose image is missing, so a not-yet-added
     photo never leaves an empty frame in the hero.
     ------------------------------------------------------------------ */
  /* ------------------------------------------------------------------
     Gallery tiles with no screenshot yet fall back to a typographic card,
     so a missing asset never renders as a broken image.
     ------------------------------------------------------------------ */
  (function galleryFallbacks() {
    document.querySelectorAll('.case-gallery-item img').forEach(function (img) {
      function miss() {
        var item = img.closest('.case-gallery-item');
        if (item && item.parentNode) item.parentNode.removeChild(item);
      }
      if (img.complete && img.naturalWidth === 0) miss();
      img.addEventListener('error', miss);
    });

    document.querySelectorAll('.ig-tile[data-fallback] img').forEach(function (img) {
      var tile = img.closest('.ig-tile');
      function miss() { tile.classList.add('no-image'); }
      // `error` has already fired for anything that failed during parse.
      if (img.complete && img.naturalWidth === 0) miss();
      img.addEventListener('error', miss);
    });
  })();

  (function heroPortrait() {
    var fig = document.querySelector('.h4-photo');
    var src = fig && fig.getAttribute('data-portrait');
    if (!fig || !src) return;

    var img = fig.querySelector('img');

    function miss() { fig.classList.add('is-missing'); }
    function hit()  { fig.classList.remove('is-missing'); }

    // `error` has already fired for anything that failed during parse.
    if (img && img.complete) { (img.naturalWidth === 0 ? miss : hit)(); }
    if (img) { img.addEventListener('error', miss); img.addEventListener('load', hit); }
  })();

  /* ------------------------------------------------------------------
     Contact form — AJAX submission with live feedback (Formspree)
     ------------------------------------------------------------------ */
  (function contactForm() {
    var form = document.querySelector('[data-contact]');
    if (!form) return;

    var endpoint = form.getAttribute('data-endpoint') || 'https://formspree.io/f/meajdlrq';
    var note = form.querySelector('.cc-note');
    var submitBtn = form.querySelector('.cc-submit') || form.querySelector('button[type="submit"]');

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var name = (form.querySelector('[name="name"]') || {}).value || '';
      var email = (form.querySelector('[name="email"]') || {}).value || '';
      var phone = (form.querySelector('[name="phone"]') || {}).value || '';
      var message = (form.querySelector('[name="message"]') || {}).value || '';

      if (!name.trim() || !email.trim() || !message.trim()) {
        if (note) {
          note.className = 'cc-note is-error';
          note.textContent = 'Please fill in all required fields (Name, Email, and Message).';
        }
        return;
      }

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending…';
      }
      if (note) {
        note.className = 'cc-note';
        note.textContent = 'Sending message…';
      }

      var data = new FormData(form);

      fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: {
          'Accept': 'application/json'
        }
      }).then(function (response) {
        if (response.ok) {
          form.reset();
          if (note) {
            note.className = 'cc-note is-success';
            note.textContent = 'Thank you! Your message has been sent successfully.';
          }
        } else {
          return response.json().then(function (errData) {
            var msg = (errData && errData.errors && errData.errors.map(function (err) { return err.message; }).join(', ')) || 'Submission failed';
            throw new Error(msg);
          });
        }
      }).catch(function (error) {
        if (note) {
          note.className = 'cc-note is-error';
          note.textContent = 'Oops! ' + (error.message || 'There was a problem submitting your message. Please try again or email directly.');
        }
      }).finally(function () {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = 'Submit';
        }
      });
    });
  })();

})();
