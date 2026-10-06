/* ==========================================================================
   Meheraj — Personal Portfolio | script.js
   Vanilla JS only: theme, reveal, tilt, nav, typing, card menus, toast.
   ========================================================================== */
(function () {
  'use strict';

  /* ---------- Helpers ---------- */
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var clamp = function (v, min, max) { return Math.min(max, Math.max(min, v)); };

  /* Safe storage (sandboxed iframes throw on localStorage access) */
  var store = {
    get: function (k) { try { return window.localStorage.getItem(k); } catch (e) { return null; } },
    set: function (k, v) { try { window.localStorage.setItem(k, v); } catch (e) { /* noop */ } }
  };

  /* Environment capabilities */
  var prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(pointer: fine)').matches;
  var conn = navigator.connection || {};
  var saveData = conn.saveData === true;
  var lowPower = (navigator.hardwareConcurrency || 8) <= 4;
  var allowMotion = !prefersReduced;

  var root = document.documentElement;

  /* ================= THEME ================= */
  var themeBtn = $('#theme-toggle');
  var themeMeta = $('meta[name="theme-color"]');

  function currentTheme() { return root.getAttribute('data-theme') === 'light' ? 'light' : 'dark'; }

  function applyTheme(t) {
    root.setAttribute('data-theme', t);
    if (themeMeta) themeMeta.setAttribute('content', t === 'dark' ? '#0b0716' : '#f7f4ff');
    if (themeBtn) themeBtn.setAttribute('aria-label', t === 'dark' ? 'Switch to light theme' : 'Switch to dark theme');
    try { window.dispatchEvent(new CustomEvent('themechange', { detail: { theme: t } })); } catch (e) { /* noop */ }
  }

  applyTheme(currentTheme());

  if (themeBtn) {
    themeBtn.addEventListener('click', function () {
      var next = currentTheme() === 'dark' ? 'light' : 'dark';
      store.set('meheraj-theme', next);
      applyTheme(next);
      themeBtn.classList.remove('spin');
      void themeBtn.offsetWidth; /* restart animation */
      themeBtn.classList.add('spin');
    });
  }

  /* ================= HEADER / SCROLL STATE ================= */
  var header = $('#header');
  var progressBar = $('#progress-bar');
  var toTop = $('#to-top');
  var scrollTicking = false;

  function onScroll() {
    var y = window.scrollY || window.pageYOffset;
    if (header) header.classList.toggle('scrolled', y > 24);
    if (progressBar) {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      progressBar.style.transform = 'scaleX(' + (h > 0 ? clamp(y / h, 0, 1) : 0) + ')';
    }
    if (toTop) toTop.classList.toggle('show', y > 640);
    scrollTicking = false;
  }

  window.addEventListener('scroll', function () {
    if (!scrollTicking) { scrollTicking = true; window.requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  if (toTop) {
    toTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: allowMotion ? 'smooth' : 'auto' });
    });
  }

  /* ================= MOBILE MENU ================= */
  var navToggle = $('#nav-toggle');
  var navOverlay = $('#nav-overlay');

  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    if (navToggle) {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    }
  }

  if (navToggle) {
    navToggle.addEventListener('click', function () {
      setMenu(!root.classList.contains('menu-open'));
    });
  }
  if (navOverlay) navOverlay.addEventListener('click', function () { setMenu(false); });
  $$('#nav-menu a').forEach(function (a) {
    a.addEventListener('click', function () { setMenu(false); });
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && root.classList.contains('menu-open')) {
      setMenu(false);
      if (navToggle) navToggle.focus();
    }
  });

  /* ================= ACTIVE NAV LINK ================= */
  (function () {
    var sections = $$('main section[id]');
    var links = $$('#nav-menu a[href^="#"]');
    if (!('IntersectionObserver' in window) || !sections.length) return;
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var id = '#' + en.target.getAttribute('id');
        links.forEach(function (l) {
          var isActive = l.getAttribute('href') === id;
          l.classList.toggle('active', isActive);
          if (isActive) l.setAttribute('aria-current', 'true');
          else l.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px', threshold: 0 });
    sections.forEach(function (s) { spy.observe(s); });
  })();

  /* ================= TYPEWRITER ================= */
  (function () {
    var el = $('#typewrite');
    if (!el || !allowMotion) return;
    var phrases = ['a Web Developer', 'a Game Developer', 'an HSC Science Student'];
    var pi = 0, ci = 0, deleting = false;

    var tick = function () {
      var full = phrases[pi];
      ci += deleting ? -1 : 1;
      if (ci < 0) ci = 0;
      el.textContent = full.slice(0, ci);
      var delay = deleting ? 36 : 72;
      if (!deleting && ci === full.length) { delay = 1700; deleting = true; }
      else if (deleting && ci === 0) { deleting = false; pi = (pi + 1) % phrases.length; delay = 420; }
      window.setTimeout(tick, delay);
    };
    window.setTimeout(tick, 1000);
  })();

  /* ================= SCROLL REVEAL ================= */
  (function () {
    var els = $$('.reveal');
    if (!allowMotion || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -7% 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ================= PROJECT CARD THREE-DOT MENU ================= */
  (function () {
    var btns = $$('.card-menu-btn');
    if (!btns.length) return;

    var ICONS = {
      open: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><path d="M15 3h6v6"/><path d="M10 14 21 3"/></svg>',
      copy: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="9" width="12" height="12" rx="2.5"/><path d="M5 15h-.5A2.5 2.5 0 0 1 2 12.5v-8A2.5 2.5 0 0 1 4.5 2h8A2.5 2.5 0 0 1 15 4.5V5"/></svg>',
      share: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="18" cy="5" r="2.8"/><circle cx="6" cy="12" r="2.8"/><circle cx="18" cy="19" r="2.8"/><path d="m8.5 13.4 7 4.2M15.5 6.4l-7 4.2"/></svg>'
    };
    var ACTIONS = [
      { key: 'open', label: 'Open Live Demo' },
      { key: 'copy', label: 'Copy Link' },
      { key: 'share', label: 'Share' }
    ];

    /* One dropdown rendered at <body> level. Fixed positioning there is immune
       to every card's overflow/hidden + backdrop-filter + 3D-tilt stacking
       contexts (those would clip or trap an in-card menu), and a single open
       instance makes overlapping/mixed menu states impossible. */
    var menu = document.createElement('div');
    menu.className = 'card-menu';
    menu.setAttribute('role', 'menu');
    menu.setAttribute('aria-label', 'Project options');
    menu.style.display = 'none';
    document.body.appendChild(menu);

    var openBtn = null;
    var hideTimer = null;

    function closeMenu(refocus) {
      if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null; }
      menu.classList.remove('open');
      if (openBtn) {
        openBtn.setAttribute('aria-expanded', 'false');
        openBtn.classList.remove('active');
        var b = openBtn;
        openBtn = null;
        hideTimer = window.setTimeout(function () { menu.style.display = 'none'; }, 200);
        if (refocus) b.focus();
      } else {
        menu.style.display = 'none';
      }
    }

    function buildItems(name, url) {
      menu.innerHTML = '';
      ACTIONS.forEach(function (a) {
        var item = document.createElement('button');
        item.type = 'button';
        item.className = 'card-menu-item';
        item.setAttribute('role', 'menuitem');
        item.setAttribute('data-menu-action', a.key);
        item.setAttribute('data-url', url);
        item.setAttribute('data-name', name);
        item.innerHTML = ICONS[a.key] + '<span>' + a.label + '</span>';
        menu.appendChild(item);
      });
    }

    function openMenu(btn) {
      if (hideTimer) { window.clearTimeout(hideTimer); hideTimer = null; }
      buildItems(btn.getAttribute('data-menu-name') || 'This project', btn.getAttribute('data-menu-url') || '');

      menu.style.display = 'block';
      var mw = menu.offsetWidth || 200;
      var mh = menu.offsetHeight || 150;
      var r = btn.getBoundingClientRect();
      var vw = window.innerWidth, vh = window.innerHeight;

      var left = Math.max(8, Math.min(r.right - mw, vw - mw - 8));
      var top = r.bottom + 8;
      if (top + mh > vh - 8) top = Math.max(8, r.top - mh - 8); /* flip up near bottom edge */

      menu.style.left = left + 'px';
      menu.style.top = top + 'px';
      menu.classList.add('open');

      btn.setAttribute('aria-expanded', 'true');
      btn.classList.add('active');
      openBtn = btn;
    }

    btns.forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        if (openBtn === btn) { closeMenu(); return; }
        closeMenu();
        openMenu(btn);
        if (e.detail === 0) { /* keyboard activation: focus first item */
          var first = menu.querySelector('.card-menu-item');
          if (first) first.focus();
        }
      });
    });

    /* Menu item actions (delegated — items are rebuilt per open) */
    menu.addEventListener('click', function (e) {
      var item = e.target && e.target.closest ? e.target.closest('.card-menu-item') : null;
      if (!item) return;
      var action = item.getAttribute('data-menu-action');
      var url = item.getAttribute('data-url');
      var name = item.getAttribute('data-name') || 'This project';
      closeMenu();

      if (action === 'open') {
        var win = null;
        try { win = window.open(url, '_blank'); } catch (err) { win = null; }
        if (win) { try { win.opener = null; } catch (err2) { /* noop */ } }
        else { showToast('Popup blocked — use Copy Link: ' + url); }
      } else if (action === 'copy') {
        copyText(url, 'Link copied: ' + url);
      } else if (action === 'share') {
        if (navigator.share) {
          navigator.share({ title: name, text: name + ' — a project by Meheraj', url: url }).catch(function () { /* user cancelled */ });
        } else {
          copyText(url, 'Link copied: ' + url);
        }
      }
    });

    /* Close on any outside pointer interaction (works for mouse + touch) */
    document.addEventListener('pointerdown', function (e) {
      if (!openBtn) return;
      var t = e.target;
      if (t && t.closest && (t.closest('.card-menu') || t.closest('.card-menu-btn'))) return;
      closeMenu();
    });

    /* Escape closes (and returns focus); scroll/resize close so the fixed
       menu can never detach from its button */
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && openBtn) closeMenu(true);
    });
    document.addEventListener('scroll', function () { if (openBtn) closeMenu(); }, { capture: true, passive: true });
    window.addEventListener('resize', function () { if (openBtn) closeMenu(); }, { passive: true });

    /* Arrow-key navigation inside the menu */
    menu.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      e.preventDefault();
      var items = $$('.card-menu-item', menu);
      if (!items.length) return;
      var idx = items.indexOf(document.activeElement);
      var next = e.key === 'ArrowDown' ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
      items[next].focus();
    });
  })();

  /* ================= 3D TILT ================= */
  (function () {
    if (!finePointer || !allowMotion) return;
    $$('.tilt').forEach(function (el) {
      var strength = parseFloat(el.getAttribute('data-tilt') || '7');
      var raf = null;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width - 0.5;
        var py = (e.clientY - r.top) / r.height - 0.5;
        if (raf) window.cancelAnimationFrame(raf);
        raf = window.requestAnimationFrame(function () {
          el.style.transform = 'perspective(950px) rotateX(' + (-py * strength).toFixed(2) + 'deg) rotateY(' + (px * strength).toFixed(2) + 'deg)';
        });
      });
      el.addEventListener('pointerleave', function () {
        if (raf) window.cancelAnimationFrame(raf);
        el.style.transform = 'perspective(950px) rotateX(0deg) rotateY(0deg)';
      });
    });
  })();

  /* ================= MAGNETIC BUTTONS ================= */
  (function () {
    if (!finePointer || !allowMotion) return;
    $$('[data-magnetic]').forEach(function (el) {
      var strength = 0.2;
      el.addEventListener('pointermove', function (e) {
        var r = el.getBoundingClientRect();
        var dx = e.clientX - (r.left + r.width / 2);
        var dy = e.clientY - (r.top + r.height / 2);
        el.style.setProperty('--mx', (dx * strength).toFixed(1) + 'px');
        el.style.setProperty('--my', (dy * strength).toFixed(1) + 'px');
      });
      el.addEventListener('pointerleave', function () {
        el.style.setProperty('--mx', '0px');
        el.style.setProperty('--my', '0px');
      });
    });
  })();

  /* ================= TOAST + COPY ================= */
  var toast = $('#toast');
  var toastTimer = null;
  function showToast(msg, duration) {
    if (!toast) return;
    toast.textContent = msg;
    toast.classList.add('show');
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(function () { toast.classList.remove('show'); }, duration || 2600);
  }

  function copyText(val, msg) {
    var fallback = function () {
      try {
        var ta = document.createElement('textarea');
        ta.value = val;
        ta.setAttribute('readonly', '');
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        ta.remove();
        showToast(ok ? msg : 'Copy failed — ' + val);
      } catch (e) {
        showToast('Copy failed — ' + val);
      }
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(val).then(function () { showToast(msg); }, fallback);
    } else {
      fallback();
    }
  }

  $$('[data-copy]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      copyText(btn.getAttribute('data-copy'), btn.getAttribute('data-message') || 'Copied');
    });
  });

  /* Blocked-tab hint: in sandboxed previews (like in-app preview iframes) new
     tabs are silently blocked. If an external link was clicked but this page
     never lost visibility, the tab almost certainly didn't open — surface the
     URL so it can still be copied. In a normal browser the page hides when the
     new tab opens, so this never shows. */
  document.addEventListener('click', function (e) {
    var a = e.target && e.target.closest ? e.target.closest('a[target="_blank"][href^="http"]') : null;
    if (!a) return;
    var url = a.href;
    window.setTimeout(function () {
      if (!document.hidden) {
        showToast('This preview box blocks new tabs (the website itself is fine) — copy the link: ' + url, 6500);
      }
    }, 500);
  });

  /* ================= FOOTER YEAR ================= */
  var yearEl = $('#year');
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());
})();
