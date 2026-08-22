/* ==========================================================================
   Fluid Flow Grid
   Interactive canvas vector flow field: a lattice of micro-directional lines
   aligned by layered trigonometric turbulence, curving and easing away around
   the cursor. Reimplemented in vanilla JS after the 21st.dev component by
   @daiwiikharihar (its source is paywalled, so this is built from the
   described behaviour and reference visual, not copied).

   Light variant: ink ticks on the near-white page.
   Mounts on #flow-grid. Pauses when the tab is hidden or it scrolls offscreen.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('flow-grid');
  if (!canvas) return;

  var ctx = canvas.getContext('2d');
  if (!ctx) return;

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- Field tuning ---------------------------------------------------- */
  var SPACING   = 30;      // lattice pitch, css px
  var LEN       = 13;      // segment length
  var WIDTH     = 1.15;    // stroke width
  var SPEED     = 0.00022; // time scale
  var RADIUS    = 165;     // cursor influence radius
  var PUSH      = 26;      // how far segments ease away from the cursor
  var SWIRL     = 1.35;    // how hard the field curls around the cursor

  var RGB = '16, 16, 16';      // ink, for the light variant
  var A_MIN = 0.10;
  var A_MAX = 0.30;
  var A_HOT = 0.68;            // alpha right at the cursor

  var dpr = 1, w = 0, h = 0, cols = 0, rows = 0, ox = 0, oy = 0;
  var pointer = { x: -9999, y: -9999, tx: -9999, ty: -9999, on: false };
  var frame = 0, onScreen = true, t0 = performance.now();

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    var rect = canvas.getBoundingClientRect();
    w = Math.max(1, Math.round(rect.width));
    h = Math.max(1, Math.round(rect.height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    cols = Math.ceil(w / SPACING) + 2;
    rows = Math.ceil(h / SPACING) + 2;
    // Centre the lattice so it doesn't drift with viewport size.
    ox = (w - (cols - 1) * SPACING) / 2;
    oy = (h - (rows - 1) * SPACING) / 2;
  }

  /* Layered trig turbulence — three octaves keeps the bands from looking
     like a single sine ripple. */
  function angleAt(x, y, t) {
    return Math.sin(x * 0.0042 + t * 0.9) * Math.cos(y * 0.0051 - t * 0.7) * Math.PI
         + Math.sin((x + y) * 0.0021 + t * 0.55) * 0.9
         + Math.cos((x - y * 1.7) * 0.0013 - t * 0.4) * 0.55;
  }

  function smoothstep(e0, e1, x) {
    var v = (x - e0) / (e1 - e0);
    v = v < 0 ? 0 : v > 1 ? 1 : v;
    return v * v * (3 - 2 * v);
  }

  function draw(now) {
    frame = 0;
    if (document.hidden || !onScreen) return;

    var t = (now - t0) * SPEED;

    // Ease the pointer so the wake trails rather than snapping.
    pointer.x += (pointer.tx - pointer.x) * 0.12;
    pointer.y += (pointer.ty - pointer.y) * 0.12;

    ctx.clearRect(0, 0, w, h);
    ctx.lineCap = 'round';
    ctx.lineWidth = WIDTH;

    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var px = ox + c * SPACING;
        var py = oy + r * SPACING;

        var ang = angleAt(px, py, t);
        var alpha = A_MIN + (A_MAX - A_MIN) *
          (0.5 + 0.5 * Math.sin(px * 0.006 - py * 0.004 + t * 0.8));
        var len = LEN;
        var dx = px, dy = py;

        if (pointer.on) {
          var vx = px - pointer.x;
          var vy = py - pointer.y;
          var dist = Math.sqrt(vx * vx + vy * vy);

          if (dist < RADIUS) {
            var f = 1 - smoothstep(0, RADIUS, dist);
            var nx = vx / (dist || 0.0001);
            var ny = vy / (dist || 0.0001);

            // Ease outward from the cursor.
            dx += nx * PUSH * f;
            dy += ny * PUSH * f;

            // Curl the field tangentially so lines flow around it.
            var tangent = Math.atan2(ny, nx) + Math.PI / 2;
            var d = Math.atan2(Math.sin(tangent - ang), Math.cos(tangent - ang));
            ang += d * f * SWIRL;

            alpha += (A_HOT - alpha) * f;
            len += 5 * f;
          }
        }

        var hx = Math.cos(ang) * len * 0.5;
        var hy = Math.sin(ang) * len * 0.5;

        ctx.strokeStyle = 'rgba(' + RGB + ',' + alpha.toFixed(3) + ')';
        ctx.beginPath();
        ctx.moveTo(dx - hx, dy - hy);
        ctx.lineTo(dx + hx, dy + hy);
        ctx.stroke();
      }
    }

    frame = requestAnimationFrame(draw);
  }

  function play() {
    if (!frame && !document.hidden && onScreen && !reduceMotion) {
      frame = requestAnimationFrame(draw);
    }
  }

  function pause() {
    if (frame) { cancelAnimationFrame(frame); frame = 0; }
  }

  /* ---- Pointer --------------------------------------------------------- */
  var host = canvas.parentElement || canvas;

  host.addEventListener('pointermove', function (e) {
    if (e.pointerType === 'touch') return;
    var rect = canvas.getBoundingClientRect();
    pointer.tx = e.clientX - rect.left;
    pointer.ty = e.clientY - rect.top;
    if (!pointer.on) { pointer.x = pointer.tx; pointer.y = pointer.ty; pointer.on = true; }
  }, { passive: true });

  host.addEventListener('pointerleave', function () {
    pointer.on = false;
    pointer.tx = pointer.x = -9999;
    pointer.ty = pointer.y = -9999;
  });

  /* ---- Lifecycle ------------------------------------------------------- */
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause(); else play();
  });

  window.addEventListener('resize', function () {
    resize();
    if (reduceMotion || !frame) draw(performance.now());
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      onScreen = entries[0].isIntersecting;
      if (onScreen) play(); else pause();
    }, { threshold: 0 }).observe(canvas);
  }

  resize();

  if (reduceMotion) {
    // One static frame, no loop.
    draw(performance.now());
  } else {
    play();
  }
})();
