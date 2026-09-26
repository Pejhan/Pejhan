(() => {
  const sky = document.querySelector(".constellation-sky");
  if (!sky) return;

  const stars = sky.querySelector(".constellation-stars");
  const links = sky.querySelector(".constellation-links");
  const rays = sky.querySelector(".constellation-rays");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const points = [];
  const edges = [];
  const activeRays = [];
  const intro = sky.closest(".hero");
  let frame;
  let lastFrame = 0;
  let scrollTarget = 0;
  let hovered = null;
  let visible = false;
  let timer;
  let hoverStarted = null;
  let lastHover = -Infinity;
  let lastBurst = -Infinity;
  const visited = new Set();
  const rayTravel = 650;
  const rayHold = 250;
  const rayLifetime = rayTravel * 2 + rayHold;

  function element(tag, attributes, parent) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", tag);
    Object.entries(attributes).forEach(([name, value]) => node.setAttribute(name, value));
    parent.append(node);
    return node;
  }

  // Uneven spacing and varied star weights give each visit its own constellation.
  for (let attempt = 0; points.length < 24 && attempt < 1000; attempt++) {
    const point = { x: 35 + Math.random() * 350, y: 35 + Math.random() * 350 };
    if (points.some((other) => Math.hypot(point.x - other.x, point.y - other.y) < 42)) continue;
    point.depth = Math.random();
    point.offset = 0;
    points.push(point);
  }

  points.sort((a, b) => a.depth - b.depth);

  points.forEach((point, index) => {
    if (index % 2 === 0) {
      const nearest = points.filter((other) => other !== point).sort((a, b) =>
        Math.hypot(a.x - point.x, a.y - point.y) - Math.hypot(b.x - point.x, b.y - point.y)
      )[0];
      const line = element("line", { x1: point.x, y1: point.y, x2: nearest.x, y2: nearest.y }, links);
      edges.push({ line, from: point, to: nearest });
    }

    const group = element("g", { class: "constellation-star" }, stars);
    point.group = group;
    const core = element("g", { class: "constellation-star-core", opacity: 0.4 + point.depth * 0.6 }, group);
    const radius = 3.5 + point.depth * 5;
    element("circle", { cx: point.x, cy: point.y, r: radius + 7, opacity: 0.06 + point.depth * 0.06, stroke: "none" }, core);
    element("circle", { cx: point.x, cy: point.y, r: radius, "stroke-width": 0.6 + point.depth * 1.2 }, core);
    if (index % 4 === 0) {
      const arm = radius + 5;
      element("path", {
        d: `M${point.x - arm},${point.y}h${arm * 2} M${point.x},${point.y - arm}v${arm * 2}`,
        "stroke-width": 0.7 + point.depth, "stroke-linecap": "round", opacity: 0.65
      }, core);
    }
    element("circle", { class: "constellation-hit", cx: point.x, cy: point.y, r: 15 }, group);
    group.addEventListener("pointerenter", () => {
      hovered = index;
      shoot(index);
      trackHover(index);
      schedule();
    });
    group.addEventListener("pointerleave", () => {
      hovered = null;
      schedule();
    });
  });

  function trackHover(index) {
    if (!visible || document.hidden || reducedMotion.matches) return;
    const now = performance.now();
    // A pause ends the gesture; a stationary hover never triggers a burst.
    if (now - lastHover > 900) {
      hoverStarted = now;
      visited.clear();
    }
    lastHover = now;
    visited.add(index);
    if (now - hoverStarted >= 2000 && visited.size >= 4 && now - lastBurst >= 3000) {
      lastBurst = now;
      hoverStarted = now;
      visited.clear();
      const sources = points.map((point, index) => index);
      const count = Math.floor(points.length / 2);
      for (let i = 0; i < count; i++) {
        const pick = i + Math.floor(Math.random() * (sources.length - i));
        [sources[i], sources[pick]] = [sources[pick], sources[i]];
        shoot(sources[i], Math.random() * 220, 2);
      }
    }
  }

  function shoot(source, delay = 0, durationScale = 1) {
    if (!visible || document.hidden || reducedMotion.matches) return;
    // Choose a different target, including when the last star is the source.
    let target = Math.floor(Math.random() * (points.length - 1));
    if (target >= source) target++;
    const from = points[source];
    const to = points[target];
    const group = element("g", { opacity: 0 }, rays);
    // Leave room for bursts alongside normal hover rays.
    if (activeRays.length >= points.length * 3) activeRays.shift().group.remove();
    const attributes = {
      "stroke-linecap": "round", pathLength: 1,
      "stroke-dasharray": 1, "stroke-dashoffset": 1
    };
    const halo = element("line", { ...attributes, "stroke-width": 7, opacity: 0.1 }, group);
    const line = element("line", { ...attributes, "stroke-width": 2.6, opacity: 0.9 }, group);
    const core = element("line", {
      ...attributes, "stroke-width": 0.75, stroke: "var(--paper)", opacity: 0.75
    }, group);
    const spark = element("circle", { r: 3.2, stroke: "none" }, group);
    activeRays.push({ group, lines: [halo, line, core], spark, from, to, durationScale, started: performance.now() + delay });
    requestFrame();
  }

  function positionLine(line, from, to) {
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y + from.offset);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y + to.offset);
  }

  function requestFrame() {
    if (!frame && !document.hidden && !reducedMotion.matches) {
      frame = requestAnimationFrame(render);
    }
  }

  function render(now) {
    frame = null;
    const elapsed = Math.min(64, lastFrame ? now - lastFrame : 16);
    lastFrame = now;
    let moving = false;
    points.forEach((point) => {
      // Near stars respond later, then travel farther and faster than distant ones.
      const target = -scrollTarget * (0.08 + point.depth * 0.55);
      const response = 25 + point.depth * 115;
      point.offset += (target - point.offset) * (1 - Math.exp(-elapsed / response));
      if (Math.abs(target - point.offset) < 0.05) point.offset = target;
      else moving = true;
      point.group.setAttribute("transform", `translate(0 ${point.offset})`);
    });
    edges.forEach(({ line, from, to }) => positionLine(line, from, to));
    for (let i = activeRays.length - 1; i >= 0; i--) {
      const ray = activeRays[i];
      const age = (now - ray.started) / ray.durationScale;
      if (age < 0) continue;
      if (age >= rayLifetime) {
        ray.group.remove();
        activeRays.splice(i, 1);
        continue;
      }
      // Draw toward the target, then erase in that same direction.
      const progress = 1 - Math.pow(1 - Math.min(1, age / rayTravel), 3);
      const erasePhase = Math.max(0, (age - rayTravel - rayHold) / rayTravel);
      const erased = 1 - Math.pow(1 - erasePhase, 3);
      const dashOffset = erasePhase > 0 ? -erased : 1 - progress;
      ray.lines.forEach((line) => {
        positionLine(line, ray.from, ray.to);
        line.setAttribute("stroke-dashoffset", dashOffset);
      });
      ray.group.setAttribute("opacity", 1);
      ray.spark.setAttribute("cx", ray.from.x + (ray.to.x - ray.from.x) * progress);
      const fromY = ray.from.y + ray.from.offset;
      const toY = ray.to.y + ray.to.offset;
      ray.spark.setAttribute("cy", fromY + (toY - fromY) * progress);
      ray.spark.setAttribute("opacity", age < rayTravel ? 0.9 : 0);
    }
    if (moving || activeRays.length) requestFrame();
    else lastFrame = 0;
  }

  function updateScroll() {
    const bounds = sky.getBoundingClientRect();
    const scale = 420 / Math.max(1, Math.min(bounds.width, bounds.height));
    const distance = Math.max(0, window.scrollY - intro.offsetTop);
    scrollTarget = Math.min(distance, window.innerHeight) * scale;
    if (visible) requestFrame();
  }

  function schedule() {
    clearTimeout(timer);
    if (!visible || document.hidden || reducedMotion.matches) return;
    timer = setTimeout(() => {
      shoot(hovered ?? Math.floor(Math.random() * points.length));
      schedule();
    }, 2000);
  }

  function reset() {
    rays.replaceChildren();
    activeRays.length = 0;
    hoverStarted = null;
    lastHover = -Infinity;
    lastBurst = -Infinity;
    visited.clear();
    hovered = null;
    cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    if (reducedMotion.matches) {
      points.forEach((point) => {
        point.offset = 0;
        point.group.removeAttribute("transform");
      });
      edges.forEach(({ line, from, to }) => positionLine(line, from, to));
    } else {
      updateScroll();
    }
    schedule();
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    reset();
  }, { threshold: 0 }).observe(intro);
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", updateScroll);
  document.addEventListener("visibilitychange", reset);
  reducedMotion.addEventListener("change", reset);
})();
