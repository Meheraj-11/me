/* ==========================================================================
   Meheraj — Background engine: particles + rainy storm atmosphere
   Canvas layers (bottom -> top): purple particle constellation (the original
   effect, restored) -> storm dust -> animated rain with depth -> splashes ->
   soft lightning. CSS layers (see style.css): sky gradient, drifting clouds,
   mist. Everything lives in .bg (z-index:-1, pointer-events:none) so it can
   never cover content or block clicks. Auto-scales down for mobile, low-power
   devices, data-saver and prefers-reduced-motion.
   ========================================================================== */
(function () {
  'use strict';

  var canvas = document.getElementById('fx');
  if (!canvas) return;

  var reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  var finePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  var conn = navigator.connection || {};
  var saveData = conn.saveData === true;
  var lowPower = (navigator.hardwareConcurrency || 8) <= 4;

  var ctx = null;
  try { ctx = canvas.getContext('2d'); } catch (e) { ctx = null; }
  if (!ctx || !ctx.clearRect) { canvas.style.display = 'none'; return; }

  var root = document.documentElement;
  var TAU = Math.PI * 2;
  var w = 0, h = 0, dpr = 1;

  var drops = [], splashes = [], dust = [], pts = [];
  var running = false, rafId = 0, last = 0;
  var flash = null, nextFlash = 0;
  var theme = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';

  /* Parallax + particle-mouse interaction */
  var parallaxEls = [];
  [['.bg-clouds', 14], ['.bg-fog', 22]].forEach(function (pair) {
    var el = document.querySelector(pair[0]);
    if (el) parallaxEls.push({ el: el, f: pair[1] });
  });
  var mx = 0.5, my = 0.5, px = 0.5, py = 0.5; /* normalized, for parallax */
  var mpx = -9999, mpy = -9999;                /* pixels, for particle repel */

  function palette() {
    if (theme === 'light') {
      return {
        rain: 'rgba(82, 60, 145, ', rainMax: 0.40,
        dot: 'rgba(109, 40, 217, ', line: 'rgba(124, 58, 237, ',
        lineMax: 0.10, dotA: 0.5,
        dust: 'rgba(124, 58, 237, ', dustMax: 0.10,
        flash: 'rgba(255, 255, 255, ', flashMax: 0.07,
        bolt: 'rgba(124, 58, 237, ', boltMax: 0.10
      };
    }
    return {
      rain: 'rgba(205, 190, 255, ', rainMax: 0.52,
      dot: 'rgba(167, 139, 250, ', line: 'rgba(139, 92, 246, ',
      lineMax: 0.14, dotA: 0.5,
      dust: 'rgba(167, 139, 250, ', dustMax: 0.18,
      flash: 'rgba(216, 180, 254, ', flashMax: 0.15,
      bolt: 'rgba(230, 215, 255, ', boltMax: 0.20
    };
  }
  var C = palette();

  function rand(a, b) { return a + Math.random() * (b - a); }
  function isSmall() { return window.innerWidth < 768; }
  function LINK() { return isSmall() ? 96 : 118; }

  /* ---------- particle constellation (original effect, restored) ---------- */
  function seedParticles() {
    pts = [];
    if (reduced) return;
    var n = Math.round((w * h) / (isSmall() ? 26000 : 21000));
    if (lowPower || isSmall()) n = Math.round(n * 0.6);
    n = Math.max(16, Math.min(n, isSmall() ? 40 : 80));
    for (var i = 0; i < n; i++) {
      pts.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: Math.random() * 1.8 + 0.7
      });
    }
  }

  /* ---------- rain ---------- */
  function newDrop(anywhere) {
    var depth = Math.random(); /* 0 = far, 1 = near */
    return {
      x: Math.random() * (w + 160) - 80,
      y: anywhere ? Math.random() * h : -30 - Math.random() * 90,
      v: (reduced ? 240 : 480) + depth * (reduced ? 150 : 640),
      len: 14 + depth * 17,                 /* clearly visible streaks */
      a: 0.45 + depth * 0.55,
      depth: depth
    };
  }

  function seedRain() {
    drops = [];
    var density = reduced ? 42000 : (isSmall() ? 13000 : 9500);
    var n = Math.round((w * h) / density);
    if (lowPower || saveData) n = Math.round(n * 0.6);
    n = Math.max(14, Math.min(n, reduced ? 26 : 150));
    for (var i = 0; i < n; i++) drops.push(newDrop(true));
  }

  function seed() {
    seedRain();
    seedParticles();
    dust = [];
    if (!reduced && !isSmall() && !saveData) {
      var dn = lowPower ? 8 : 14;
      for (var j = 0; j < dn; j++) {
        dust.push({ x: Math.random() * w, y: Math.random() * h, r: rand(0.8, 2), ph: rand(0, TAU), sp: rand(0.06, 0.18), al: rand(0.4, 1) });
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    w = window.innerWidth; h = window.innerHeight;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  }

  /* ---------- lightning ---------- */
  function scheduleFlash(now) {
    var minT = theme === 'light' ? 26 : 12;
    var maxT = theme === 'light' ? 52 : 28;
    nextFlash = now + rand(minT, maxT) * 1000;
  }

  function startFlash(now) {
    flash = { t0: now, dur: rand(420, 700), x: rand(0.15, 0.85) * w, seg: null };
    if (Math.random() < 0.4) {
      var seg = [], bx = flash.x, by = -10, step = h / rand(9, 14);
      var endY = h * rand(0.35, 0.6);
      while (by < endY) { seg.push([bx, by]); by += step * rand(0.7, 1.3); bx += rand(-26, 26); }
      seg.push([bx, by]);
      flash.seg = seg;
    }
  }

  function drawFlash(now) {
    if (!flash) return;
    var p = (now - flash.t0) / flash.dur;
    if (p >= 1) { flash = null; return; }
    var e = Math.max(0, Math.sin(p * Math.PI)) * (p < 0.35 ? 1 : 0.55) * (0.75 + 0.25 * Math.sin(p * 40));
    var a = C.flashMax * e;
    if (a > 0.004) {
      var g = ctx.createRadialGradient(flash.x, -h * 0.1, 0, flash.x, -h * 0.1, h * 0.95);
      g.addColorStop(0, C.flash + a.toFixed(3) + ')');
      g.addColorStop(1, C.flash + '0)');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, w, h);
    }
    if (flash.seg && p < 0.4) {
      var ba = C.boltMax * (1 - p / 0.4);
      if (ba > 0.004) {
        ctx.strokeStyle = C.bolt + ba.toFixed(3) + ')';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (var i = 0; i < flash.seg.length; i++) {
          var s = flash.seg[i];
          if (i === 0) ctx.moveTo(s[0], s[1]); else ctx.lineTo(s[0], s[1]);
        }
        ctx.stroke();
      }
    }
  }

  /* ---------- main loop ---------- */
  function frame(now) {
    if (!running) return;
    var dt = Math.min((now - last) / 1000, 0.033);
    last = now;
    ctx.clearRect(0, 0, w, h);

    /* pointer parallax on cloud/fog layers */
    px += (mx - px) * 0.04;
    py += (my - py) * 0.04;
    for (var k = 0; k < parallaxEls.length; k++) {
      var pe = parallaxEls[k];
      pe.el.style.transform = 'translate(' + ((px - 0.5) * pe.f).toFixed(1) + 'px,' + ((py - 0.5) * pe.f * 0.6).toFixed(1) + 'px)';
    }

    /* particle constellation — dots + connecting lines + mouse repel */
    if (pts.length) {
      var L = LINK();
      for (var i = 0; i < pts.length; i++) {
        var p = pts[i];
        p.x += p.vx; p.y += p.vy;

        var dxp = p.x - mpx, dyp = p.y - mpy;
        var d2 = dxp * dxp + dyp * dyp;
        if (d2 < 14400 && d2 > 0.01) {
          var dd = Math.sqrt(d2);
          var f = ((120 - dd) / 120) * 0.6;
          p.x += (dxp / dd) * f;
          p.y += (dyp / dd) * f;
        }

        if (p.x < -20) p.x = w + 20; else if (p.x > w + 20) p.x = -20;
        if (p.y < -20) p.y = h + 20; else if (p.y > h + 20) p.y = -20;

        for (var j = i + 1; j < pts.length; j++) {
          var q = pts[j];
          var lx = p.x - q.x, ly = p.y - q.y;
          var ld2 = lx * lx + ly * ly;
          if (ld2 < L * L) {
            var ld = Math.sqrt(ld2);
            var la = (1 - ld / L) * C.lineMax;
            ctx.strokeStyle = C.line + la.toFixed(3) + ')';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(q.x, q.y);
            ctx.stroke();
          }
        }

        ctx.fillStyle = C.dot + C.dotA + ')';
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, TAU);
        ctx.fill();
      }
    }

    /* storm dust */
    for (var d = 0; d < dust.length; d++) {
      var u = dust[d];
      u.ph += u.sp * dt;
      u.x += (Math.sin(u.ph) * 5 - 7) * dt;
      u.y -= 4 * dt;
      if (u.y < -8) { u.y = h + 8; u.x = Math.random() * w; }
      if (u.x < -8) u.x = w + 8;
      ctx.fillStyle = C.dust + (C.dustMax * u.al).toFixed(3) + ')';
      ctx.beginPath();
      ctx.arc(u.x, u.y, u.r, 0, TAU);
      ctx.fill();
    }

    /* rain — near-vertical fall with a light diagonal wind */
    var wind = -60;
    for (var r = 0; r < drops.length; r++) {
      var dr = drops[r];
      var wf = wind * (0.4 + dr.depth * 0.8);
      dr.x += wf * dt;
      dr.y += dr.v * dt;

      if (dr.y > h + 30) {
        if (!reduced && dr.depth > 0.55 && Math.random() < 0.08 && splashes.length < 40) {
          splashes.push({ x: dr.x, y: h - rand(0, 6), t: 0 });
        }
        drops[r] = newDrop(false);
        continue;
      }

      ctx.strokeStyle = C.rain + (C.rainMax * dr.a).toFixed(3) + ')';
      ctx.lineWidth = 0.9 + dr.depth * 1.1;
      ctx.beginPath();
      ctx.moveTo(dr.x, dr.y);
      ctx.lineTo(dr.x - (dr.len * wf) / dr.v, dr.y - dr.len);
      ctx.stroke();
    }

    /* ground splashes */
    for (var s = splashes.length - 1; s >= 0; s--) {
      var sp = splashes[s];
      sp.t += dt;
      if (sp.t > 0.4) { splashes.splice(s, 1); continue; }
      var pr = sp.t / 0.4;
      ctx.strokeStyle = C.rain + (0.26 * (1 - pr)).toFixed(3) + ')';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.ellipse(sp.x, sp.y, 3 + 11 * pr, 1 + 2.6 * pr, 0, 0, TAU);
      ctx.stroke();
    }

    /* subtle lightning */
    if (!reduced && !saveData) {
      if (!flash && now >= nextFlash) startFlash(now);
      drawFlash(now);
    }

    rafId = window.requestAnimationFrame(frame);
  }

  function start() {
    if (running) return;
    running = true;
    last = window.performance ? window.performance.now() : Date.now();
    scheduleFlash(last);
    rafId = window.requestAnimationFrame(frame);
  }
  function stop() {
    running = false;
    if (rafId) window.cancelAnimationFrame(rafId);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(resize, 180);
  }, { passive: true });

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  window.addEventListener('themechange', function (e) {
    theme = (e.detail && e.detail.theme) || (root.getAttribute('data-theme') === 'light' ? 'light' : 'dark');
    C = palette();
    if (running) scheduleFlash(last);
  });

  if (finePointer && !reduced) {
    window.addEventListener('pointermove', function (e) {
      mx = e.clientX / Math.max(1, window.innerWidth);
      my = e.clientY / Math.max(1, window.innerHeight);
      mpx = e.clientX; mpy = e.clientY;
    }, { passive: true });
  }

  resize();
  start();
})();
