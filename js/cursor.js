/* ==========================================================================
   Meheraj — Custom cursor (restored earlier design)
   Purple dot + smooth-delayed ring with hover expansion. Desktop / fine
   pointers only; every element is pointer-events:none so clicks never break.
   ========================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  var finePointer = !!(window.matchMedia && window.matchMedia('(pointer: fine)').matches);
  var allowMotion = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  if (!finePointer || !allowMotion) return;

  root.classList.add('has-cursor');
  var dot = document.createElement('div');
  dot.className = 'cursor-dot';
  var ring = document.createElement('div');
  ring.className = 'cursor-ring';
  document.body.appendChild(dot);
  document.body.appendChild(ring);

  var x = window.innerWidth / 2, y = window.innerHeight / 2;
  var rx = x, ry = y;
  var visible = false;

  window.addEventListener('pointermove', function (e) {
    x = e.clientX; y = e.clientY;
    if (!visible) { visible = true; root.classList.add('cursor-visible'); }
    dot.style.transform = 'translate(' + x + 'px,' + y + 'px)';
  }, { passive: true });

  (function loop() {
    rx += (x - rx) * 0.17; /* smooth follow delay */
    ry += (y - ry) * 0.17;
    ring.style.transform = 'translate(' + rx.toFixed(2) + 'px,' + ry.toFixed(2) + 'px)';
    window.requestAnimationFrame(loop);
  })();

  var hoverSel = 'a, button, [data-hover]';
  document.addEventListener('mouseover', function (e) {
    if (e.target && e.target.closest && e.target.closest(hoverSel)) root.classList.add('cursor-hover');
  });
  document.addEventListener('mouseout', function (e) {
    if (e.target && e.target.closest && e.target.closest(hoverSel)) root.classList.remove('cursor-hover');
  });
  document.addEventListener('pointerdown', function () { root.classList.add('cursor-down'); });
  document.addEventListener('pointerup', function () { root.classList.remove('cursor-down'); });
  document.addEventListener('mouseleave', function () { root.classList.remove('cursor-visible'); visible = false; });
  document.addEventListener('mouseenter', function () { root.classList.add('cursor-visible'); visible = true; });
})();
