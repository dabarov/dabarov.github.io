(function () {
  var logos = document.querySelectorAll('.floating-logo');
  if (!logos.length) return;

  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  var NS = 'http://www.w3.org/2000/svg';

  logos.forEach(function (logo) {
    var img = logo.querySelector('img');
    if (!img) return;
    img.addEventListener('error', function () {
      logo.style.display = 'none';
    });
  });

  // --- Timeline SVG ---
  var svg = document.createElementNS(NS, 'svg');
  svg.classList.add('timeline-svg');
  svg.setAttribute('aria-hidden', 'true');

  var timelinePath = document.createElementNS(NS, 'path');
  timelinePath.setAttribute('fill', 'none');
  timelinePath.setAttribute('stroke', 'rgba(0,0,0,0.10)');
  timelinePath.setAttribute('stroke-width', '1.2');
  timelinePath.setAttribute('stroke-dasharray', '6 6');
  timelinePath.setAttribute('stroke-linecap', 'round');
  svg.appendChild(timelinePath);

  var ARROW_W = 5;
  var ARROW_H = 3.5;
  var CHEVRON_D = 'M' + (-ARROW_W) + ',' + (-ARROW_H) + ' L0,0 L' + (-ARROW_W) + ',' + ARROW_H;

  var arrowEls = [];
  var arrowCount = Math.max(0, logos.length - 1);

  for (var a = 0; a < arrowCount; a++) {
    var arrow = document.createElementNS(NS, 'path');
    arrow.setAttribute('class', 'timeline-arrow');
    arrow.setAttribute('fill', 'none');
    arrow.setAttribute('stroke', 'rgba(0,0,0,0.22)');
    arrow.setAttribute('stroke-width', '1.2');
    arrow.setAttribute('stroke-linecap', 'round');
    arrow.setAttribute('stroke-linejoin', 'round');
    arrow.setAttribute('d', CHEVRON_D);
    svg.appendChild(arrow);
    arrowEls.push(arrow);
  }

  var container = document.querySelector('.floating-logos');
  container.insertBefore(svg, container.firstChild);

  // --- Position caching (avoid layout reads in animation loop) ---
  var basePos = [];
  var dragOffsets = [];

  function cachePositions() {
    basePos = [];
    for (var i = 0; i < logos.length; i++) {
      var el = logos[i];
      basePos.push({
        cx: el.offsetLeft + el.offsetWidth / 2,
        cy: el.offsetTop + el.offsetHeight / 2,
        depth: parseFloat(el.dataset.depth) || 20
      });
      if (!dragOffsets[i]) dragOffsets[i] = { x: 0, y: 0 };
    }
  }

  function updateTimeline(offX, offY) {
    var pts = [];
    for (var i = 0; i < basePos.length; i++) {
      var p = basePos[i];
      var dx = dragOffsets[i] ? dragOffsets[i].x : 0;
      var dy = dragOffsets[i] ? dragOffsets[i].y : 0;
      pts.push({
        x: p.cx + (offX || 0) * p.depth + dx,
        y: p.cy + (offY || 0) * p.depth + dy
      });
    }

    var n = pts.length;
    if (n < 2) return;

    var d = 'M' + pts[0].x.toFixed(1) + ',' + pts[0].y.toFixed(1);

    for (var i = 0; i < n - 1; i++) {
      var p0 = pts[Math.max(0, i - 1)];
      var p1 = pts[i];
      var p2 = pts[i + 1];
      var p3 = pts[Math.min(n - 1, i + 2)];

      var cp1x = p1.x + (p2.x - p0.x) / 6;
      var cp1y = p1.y + (p2.y - p0.y) / 6;
      var cp2x = p2.x - (p3.x - p1.x) / 6;
      var cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ' C' + cp1x.toFixed(1) + ',' + cp1y.toFixed(1) +
           ' ' + cp2x.toFixed(1) + ',' + cp2y.toFixed(1) +
           ' ' + p2.x.toFixed(1) + ',' + p2.y.toFixed(1);

      var mx = 0.125 * p1.x + 0.375 * cp1x + 0.375 * cp2x + 0.125 * p2.x;
      var my = 0.125 * p1.y + 0.375 * cp1y + 0.375 * cp2y + 0.125 * p2.y;
      var tx = 0.75 * (cp1x - p1.x) + 1.5 * (cp2x - cp1x) + 0.75 * (p2.x - cp2x);
      var ty = 0.75 * (cp1y - p1.y) + 1.5 * (cp2y - cp1y) + 0.75 * (p2.y - cp2y);
      var angle = Math.atan2(ty, tx) * 180 / Math.PI;

      arrowEls[i].setAttribute('transform',
        'translate(' + mx.toFixed(1) + ',' + my.toFixed(1) + ') rotate(' + angle.toFixed(1) + ')');
    }

    timelinePath.setAttribute('d', d);
  }

  cachePositions();
  updateTimeline(0, 0);
  window.addEventListener('resize', function () {
    cachePositions();
    updateTimeline(currentX, currentY);
  });

  // --- Draw animation ---
  svg.style.clipPath = 'inset(0 100% 0 0)';
  var drawAnim = null;

  function drawTimeline() {
    if (prefersReducedMotion) {
      svg.style.clipPath = 'inset(0 0 0 0)';
      return;
    }
    if (drawAnim) drawAnim.cancel();
    svg.style.clipPath = 'inset(0 100% 0 0)';
    drawAnim = svg.animate(
      [
        { clipPath: 'inset(0 100% 0 0)' },
        { clipPath: 'inset(0 -10% 0 0)' }
      ],
      {
        duration: 1800,
        easing: 'cubic-bezier(0.23, 1, 0.32, 1)',
        delay: 300,
        fill: 'forwards'
      }
    );
  }

  function resetTimeline() {
    if (drawAnim) drawAnim.cancel();
    svg.style.clipPath = 'inset(0 100% 0 0)';
  }

  // --- Show / hide ---
  var currentX = 0;
  var currentY = 0;

  setTimeout(function () {
    document.body.classList.add('logos-active');
    drawTimeline();
  }, 400);

  // --- Drag and drop ---
  var activeDragIndex = -1;
  var dragStartPointerX = 0;
  var dragStartPointerY = 0;
  var dragStartOffsetX = 0;
  var dragStartOffsetY = 0;

  function applyLogoPosition(index) {
    var dx = dragOffsets[index] ? dragOffsets[index].x : 0;
    var dy = dragOffsets[index] ? dragOffsets[index].y : 0;
    var moveX = currentX * basePos[index].depth + dx;
    var moveY = currentY * basePos[index].depth + dy;
    logos[index].style.translate = moveX + 'px ' + moveY + 'px';
  }

  function finishDrag(logo, index) {
    activeDragIndex = -1;
    var bob = logo.querySelector('.logo-bob');
    if (bob) bob.style.animationPlayState = '';
    logo.classList.remove('is-dragging');
  }

  logos.forEach(function (logo, index) {
    logo.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      if (activeDragIndex !== -1) return;

      activeDragIndex = index;
      dragStartPointerX = e.clientX;
      dragStartPointerY = e.clientY;
      dragStartOffsetX = dragOffsets[index].x;
      dragStartOffsetY = dragOffsets[index].y;

      logo.setPointerCapture(e.pointerId);

      var bob = logo.querySelector('.logo-bob');
      if (bob) bob.style.animationPlayState = 'paused';

      logo.classList.add('is-dragging');
      e.preventDefault();
    });

    logo.addEventListener('pointermove', function (e) {
      if (activeDragIndex !== index) return;

      dragOffsets[index].x = dragStartOffsetX + (e.clientX - dragStartPointerX);
      dragOffsets[index].y = dragStartOffsetY + (e.clientY - dragStartPointerY);

      applyLogoPosition(index);
      updateTimeline(currentX, currentY);
    });

    logo.addEventListener('pointerup', function (e) {
      if (activeDragIndex !== index) return;
      finishDrag(logo, index);
    });

    logo.addEventListener('pointercancel', function (e) {
      if (activeDragIndex !== index) return;
      finishDrag(logo, index);
    });
  });

  if (prefersReducedMotion || !hasFinePointer) return;

  var idleTimeout = null;
  var IDLE_DELAY = 3000;
  var isHovering = false;

  function hideLogos() {
    if (isHovering || activeDragIndex !== -1) return;
    document.body.classList.remove('logos-active');
    resetTimeline();
  }

  function resetIdleTimer() {
    if (idleTimeout) clearTimeout(idleTimeout);
    if (!document.body.classList.contains('logos-active')) {
      document.body.classList.add('logos-active');
      drawTimeline();
    }
    idleTimeout = setTimeout(hideLogos, IDLE_DELAY);
  }

  logos.forEach(function (logo) {
    logo.addEventListener('mouseenter', function () {
      isHovering = true;
      if (idleTimeout) clearTimeout(idleTimeout);
    });
    logo.addEventListener('mouseleave', function () {
      isHovering = false;
      resetIdleTimer();
    });
  });

  var targetX = 0;
  var targetY = 0;
  var damping = 0.06;

  document.addEventListener('mousemove', function (e) {
    targetX = (e.clientX / window.innerWidth - 0.5) * 2;
    targetY = (e.clientY / window.innerHeight - 0.5) * 2;
    resetIdleTimer();
  });

  document.addEventListener('mouseleave', function () {
    if (idleTimeout) clearTimeout(idleTimeout);
    if (!isHovering && activeDragIndex === -1) hideLogos();
  });

  document.addEventListener('mouseenter', function () {
    resetIdleTimer();
  });

  function animate() {
    currentX += (targetX - currentX) * damping;
    currentY += (targetY - currentY) * damping;

    for (var i = 0; i < logos.length; i++) {
      var dx = dragOffsets[i] ? dragOffsets[i].x : 0;
      var dy = dragOffsets[i] ? dragOffsets[i].y : 0;
      var moveX = currentX * basePos[i].depth + dx;
      var moveY = currentY * basePos[i].depth + dy;
      logos[i].style.translate = moveX + 'px ' + moveY + 'px';
    }

    updateTimeline(currentX, currentY);
    requestAnimationFrame(animate);
  }

  animate();
})();
