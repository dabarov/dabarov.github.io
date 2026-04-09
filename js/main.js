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

  var defs = document.createElementNS(NS, 'defs');
  var marker = document.createElementNS(NS, 'marker');
  marker.setAttribute('id', 'tl-arrow');
  marker.setAttribute('viewBox', '0 0 8 6');
  marker.setAttribute('refX', '7');
  marker.setAttribute('refY', '3');
  marker.setAttribute('markerWidth', '5');
  marker.setAttribute('markerHeight', '4');
  marker.setAttribute('orient', 'auto');
  var arrowPath = document.createElementNS(NS, 'path');
  arrowPath.setAttribute('d', 'M0.5,0.5 L7,3 L0.5,5.5');
  arrowPath.setAttribute('fill', 'none');
  arrowPath.setAttribute('stroke', 'rgba(0,0,0,0.18)');
  arrowPath.setAttribute('stroke-width', '1');
  arrowPath.setAttribute('stroke-linecap', 'round');
  arrowPath.setAttribute('stroke-linejoin', 'round');
  marker.appendChild(arrowPath);
  defs.appendChild(marker);
  svg.appendChild(defs);

  var timelinePath = document.createElementNS(NS, 'path');
  timelinePath.setAttribute('fill', 'none');
  timelinePath.setAttribute('stroke', 'rgba(0,0,0,0.12)');
  timelinePath.setAttribute('stroke-width', '1.2');
  timelinePath.setAttribute('stroke-dasharray', '6 6');
  timelinePath.setAttribute('stroke-linecap', 'round');
  timelinePath.setAttribute('marker-mid', 'url(#tl-arrow)');
  timelinePath.setAttribute('marker-end', 'url(#tl-arrow)');
  svg.appendChild(timelinePath);

  var container = document.querySelector('.floating-logos');
  container.insertBefore(svg, container.firstChild);

  // --- Position caching (avoid layout reads in animation loop) ---
  var basePos = [];

  function cachePositions() {
    basePos = [];
    for (var i = 0; i < logos.length; i++) {
      var el = logos[i];
      basePos.push({
        cx: el.offsetLeft + el.offsetWidth / 2,
        cy: el.offsetTop + el.offsetHeight / 2,
        depth: parseFloat(el.dataset.depth) || 20
      });
    }
  }

  function updateTimeline(offX, offY) {
    var points = [];
    for (var i = 0; i < basePos.length; i++) {
      var p = basePos[i];
      var px = p.cx + (offX || 0) * p.depth;
      var py = p.cy + (offY || 0) * p.depth;
      points.push(px + ',' + py);
    }
    if (points.length) {
      timelinePath.setAttribute('d', 'M' + points.join(' L'));
    }
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

  if (prefersReducedMotion || !hasFinePointer) return;

  var idleTimeout = null;
  var IDLE_DELAY = 3000;
  var isHovering = false;

  function hideLogos() {
    if (isHovering) return;
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
    if (!isHovering) hideLogos();
  });

  document.addEventListener('mouseenter', function () {
    resetIdleTimer();
  });

  function animate() {
    currentX += (targetX - currentX) * damping;
    currentY += (targetY - currentY) * damping;

    for (var i = 0; i < logos.length; i++) {
      var moveX = currentX * basePos[i].depth;
      var moveY = currentY * basePos[i].depth;
      logos[i].style.translate = moveX + 'px ' + moveY + 'px';
    }

    updateTimeline(currentX, currentY);
    requestAnimationFrame(animate);
  }

  animate();
})();
