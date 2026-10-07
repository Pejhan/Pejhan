(() => {
  const sky = document.querySelector(".constellation-sky");
  if (!sky) return;

  const stars = sky.querySelector(".constellation-stars");
  const links = sky.querySelector(".constellation-links");
  const rays = sky.querySelector(".constellation-rays");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let prefersReducedMotion = reducedMotion.matches;
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
  let lastInteraction = -Infinity;
  // Network Cascade at the playground's 1× speed.
  const rayTravel = 380;
  const rayFade = 850;
  const cascadeInterval = 2700;
  const rayLifetime = rayTravel + rayFade;

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
    // Reveal outward from the center, independently of scroll and hover transforms.
    const revealDelay = 80 + Math.hypot(point.x - 210, point.y - 210) * 2.2;
    const entrance = element("g", {
      class: "constellation-star-entrance",
      style: `--reveal-delay: ${revealDelay}ms`
    }, group);
    const core = element("g", { class: "constellation-star-core", opacity: 0.4 + point.depth * 0.6 }, entrance);
    const radius = 3.5 + point.depth * 5;
    point.radius = radius;
    point.core = core;
    point.litAt = -Infinity;
    point.halo = element("circle", { cx: point.x, cy: point.y, r: radius + 7, opacity: 0.06 + point.depth * 0.06, stroke: "none" }, core);
    element("circle", { cx: point.x, cy: point.y, r: radius, "stroke-width": 0.6 + point.depth * 1.2 }, core);
    if (index % 4 === 0) {
      const arm = radius + 5;
      element("path", {
        d: `M${point.x - arm},${point.y}h${arm * 2} M${point.x},${point.y - arm}v${arm * 2}`,
        "stroke-width": 0.7 + point.depth, "stroke-linecap": "round", opacity: 0.65
      }, core);
    }
    element("circle", { class: "constellation-hit", cx: point.x, cy: point.y, r: 15 }, group);
    group.addEventListener("pointerenter", (event) => {
      if (event.pointerType === "touch") return;
      hovered = index;
      interact(index);
    });
    group.addEventListener("pointerleave", () => {
      hovered = null;
      schedule();
    });
    group.addEventListener("pointerdown", (event) => {
      if (event.pointerType === "touch") interact(index);
    });
  });

  function interact(index) {
    if (!visible || document.hidden || prefersReducedMotion) return;
    const now = performance.now();
    if (now - lastInteraction < 220) return;
    lastInteraction = now;
    cascade(index);
    schedule();
  }

  function cascade(source, still = false) {
    if (!visible || document.hidden || (!still && prefersReducedMotion)) return;
    const used = new Set([source]);
    let frontier = [source];
    const started = performance.now();
    if (!still) points[source].litAt = started;
    // Each arrival becomes the source of two more rays in the next wave.
    for (let wave = 0; wave < 3; wave++) {
      const next = [];
      frontier.forEach((from) => {
        const origin = points[from];
        const targets = points.map((point, index) => index).filter((index) => !used.has(index))
          .sort((a, b) => {
            const distance = (index) => Math.hypot(points[index].x - origin.x,
              points[index].y + points[index].offset - origin.y - origin.offset);
            return distance(a) - distance(b);
          }).slice(0, 2);
        targets.forEach((to) => {
          used.add(to);
          next.push(to);
          shoot(from, to, started + wave * rayTravel, still);
        });
      });
      frontier = next;
    }
    if (!still) requestFrame();
  }

  function shoot(source, target, started, still) {
    const from = points[source];
    const to = points[target];
    const group = element("g", { opacity: still ? 0.55 : 0 }, rays);
    // Bound the work when a pointer quickly visits many stars.
    if (activeRays.length >= 80) activeRays.shift().group.remove();
    const attributes = {
      "stroke-linecap": "round", pathLength: 1,
      "stroke-dasharray": still ? 1 : "0.0001 1.9999"
    };
    const halo = element("line", { ...attributes, "stroke-width": 9, opacity: 0.12 }, group);
    const line = element("line", { ...attributes, "stroke-width": 2.4, opacity: 0.9 }, group);
    const core = element("line", {
      ...attributes, "stroke-width": 0.7, stroke: "var(--paper)", opacity: 0.85
    }, group);
    const lines = [halo, line, core];
    lines.forEach((node) => positionLine(node, from, to));
    const spark = element("circle", { r: 3.3, stroke: "none", opacity: 0 }, group);
    const ripple = element("circle", { cx: to.x, cy: to.y + to.offset, r: 5, fill: "none", "stroke-width": 1.2, opacity: 0 }, group);
    activeRays.push({ group, lines, spark, ripple, from, to, started, arrived: false });
  }

  function positionLine(line, from, to) {
    line.setAttribute("x1", from.x);
    line.setAttribute("y1", from.y + from.offset);
    line.setAttribute("x2", to.x);
    line.setAttribute("y2", to.y + to.offset);
  }

  function requestFrame() {
    if (!frame && visible && !document.hidden && !prefersReducedMotion) {
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
      const pulse = Math.max(0, 1 - (now - point.litAt) / 700);
      point.halo.setAttribute("r", point.radius + 7 + pulse * 8);
      point.halo.setAttribute("opacity", 0.06 + point.depth * 0.06 + pulse * 0.2);
      point.core.setAttribute("opacity", Math.min(1, 0.4 + point.depth * 0.6 + pulse * 0.5));
      if (pulse > 0) moving = true;
    });
    edges.forEach(({ line, from, to }) => positionLine(line, from, to));
    for (let i = activeRays.length - 1; i >= 0; i--) {
      const ray = activeRays[i];
      const age = now - ray.started;
      if (age < 0) continue;
      if (age >= rayLifetime) {
        ray.group.remove();
        activeRays.splice(i, 1);
        continue;
      }
      const progress = Math.min(1, age / rayTravel);
      const after = age - rayTravel;
      const start = Math.max(0, after - 180) / 670;
      const length = Math.max(0.0001, progress - Math.min(progress, start));
      ray.lines.forEach((line) => {
        positionLine(line, ray.from, ray.to);
        line.setAttribute("stroke-dasharray", `${length} ${2 - length}`);
        line.setAttribute("stroke-dashoffset", -start);
      });
      ray.group.setAttribute("opacity", after > 350 ? Math.max(0, 1 - (after - 350) / 500) : 1);
      ray.spark.setAttribute("cx", ray.from.x + (ray.to.x - ray.from.x) * progress);
      const fromY = ray.from.y + ray.from.offset;
      const toY = ray.to.y + ray.to.offset;
      ray.spark.setAttribute("cy", fromY + (toY - fromY) * progress);
      ray.spark.setAttribute("opacity", after < 0 ? 1 : 0);
      if (after >= 0) {
        if (!ray.arrived) {
          ray.to.litAt = now;
          ray.arrived = true;
        }
        ray.ripple.setAttribute("cx", ray.to.x);
        ray.ripple.setAttribute("cy", toY);
        ray.ripple.setAttribute("r", ray.to.radius + 3 + after / 35);
        ray.ripple.setAttribute("opacity", Math.max(0, 0.6 * (1 - after / 700)));
      }
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

  function schedule(delay = cascadeInterval) {
    clearTimeout(timer);
    if (!visible || document.hidden || prefersReducedMotion) return;
    timer = setTimeout(() => {
      cascade(hovered ?? Math.floor(Math.random() * points.length));
      schedule();
    }, delay);
  }

  function reset() {
    rays.replaceChildren();
    activeRays.length = 0;
    lastInteraction = -Infinity;
    hovered = null;
    cancelAnimationFrame(frame);
    frame = null;
    lastFrame = 0;
    points.forEach((point) => {
      point.litAt = -Infinity;
      point.halo.setAttribute("r", point.radius + 7);
      point.halo.setAttribute("opacity", 0.06 + point.depth * 0.06);
      point.core.setAttribute("opacity", 0.4 + point.depth * 0.6);
    });
    if (prefersReducedMotion) {
      points.forEach((point) => {
        point.offset = 0;
        point.group.removeAttribute("transform");
      });
      edges.forEach(({ line, from, to }) => positionLine(line, from, to));
      cascade(Math.floor(points.length / 2), true);
    } else {
      updateScroll();
    }
    schedule(700);
  }

  new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && entry.intersectionRatio >= 0.01;
    reset();
  }, { threshold: 0.01 }).observe(intro);
  window.addEventListener("scroll", updateScroll, { passive: true });
  window.addEventListener("resize", updateScroll);
  document.addEventListener("visibilitychange", reset);
  reducedMotion.addEventListener("change", () => {
    prefersReducedMotion = reducedMotion.matches;
    reset();
  });
})();
