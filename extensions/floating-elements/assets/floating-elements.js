/**
 * Floating Elements storefront renderer.
 * Vanilla JS, no dependencies. Draws configurable falling elements on a single
 * full-viewport canvas. Designed to be light on the merchant's store:
 *   - skips entirely when the visitor prefers reduced motion,
 *   - pauses while the tab is hidden,
 *   - caps device pixel ratio and particle count,
 *   - pointer-events: none so it never blocks clicks.
 */
(function () {
  "use strict";

  if (window.__floatingElementsLoaded) return;
  window.__floatingElementsLoaded = true;

  var script =
    document.currentScript ||
    (function () {
      var s = document.getElementsByTagName("script");
      return s[s.length - 1];
    })();

  var CONFIG_URL =
    script.getAttribute("data-config-url") || "/apps/floating-elements/config";
  var TEMPLATE = script.getAttribute("data-template") || "";
  var Z_INDEX = parseInt(script.getAttribute("data-z-index"), 10) || 2147483000;

  // Accessibility + perf: never animate for reduced-motion visitors.
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  fetch(CONFIG_URL, { headers: { Accept: "application/json" } })
    .then(function (r) {
      return r.json();
    })
    .then(function (cfg) {
      if (cfg && cfg.enabled && pageMatches(cfg.pages, TEMPLATE)) {
        buildSprites(cfg, function (pool) {
          if (pool.length) start(cfg, pool);
        });
      }
    })
    .catch(function () {
      /* fail silent — never break the storefront */
    });

  function pageMatches(pages, template) {
    if (!pages || pages === "all") return true;
    var map = {
      home: "index",
      product: "product",
      collection: "collection",
      cart: "cart",
    };
    return map[pages] === template;
  }

  // Build the pool of drawable sprites: the selected catalog glyph plus any
  // custom assets (Premium). Images are preloaded before animating.
  function buildSprites(cfg, done) {
    var pool = [{ type: "text", value: cfg.glyph || "🍂" }];

    (cfg.assets || []).forEach(function (a) {
      if (a.kind === "emoji") {
        pool.push({ type: "text", value: a.value });
      } else if (a.kind === "svg") {
        pool.push({
          type: "image",
          src: "data:image/svg+xml;utf8," + encodeURIComponent(a.value),
        });
      } else if (a.kind === "image") {
        pool.push({ type: "image", src: a.value });
      }
    });

    var images = pool.filter(function (p) {
      return p.type === "image";
    });
    var pending = images.length;
    if (!pending) return done(pool);

    images.forEach(function (p) {
      var img = new Image();
      img.onload = function () {
        p.img = img;
        if (--pending === 0) ready();
      };
      img.onerror = function () {
        p.broken = true;
        if (--pending === 0) ready();
      };
      img.src = p.src;
    });

    function ready() {
      done(
        pool.filter(function (p) {
          return !p.broken;
        }),
      );
    }
  }

  function start(cfg, pool) {
    var canvas = document.createElement("canvas");
    canvas.setAttribute("aria-hidden", "true");
    var s = canvas.style;
    s.position = "fixed";
    s.top = "0";
    s.left = "0";
    s.width = "100%";
    s.height = "100%";
    s.pointerEvents = "none";
    s.zIndex = String(Z_INDEX);
    document.body.appendChild(canvas);

    var ctx = canvas.getContext("2d");
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var W = 0;
    var H = 0;
    var particles = [];

    var count = Math.max(5, Math.min(150, cfg.density || 40));
    var baseSize = cfg.size || 28;
    var fall = 0.3 + (cfg.speed / 100) * 2.4;
    var windX = (cfg.wind / 100) * 1.6;
    var alpha = Math.max(0, Math.min(1, (cfg.opacity || 90) / 100));
    var canSpin = !!cfg.rotation;

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function spawn(initial) {
      var sprite = pool[(Math.random() * pool.length) | 0];
      return {
        sprite: sprite,
        x: Math.random() * W,
        y: initial ? Math.random() * H : -baseSize,
        size: baseSize * (0.6 + Math.random() * 0.8),
        vy: fall * (0.6 + Math.random() * 0.8),
        angle: Math.random() * Math.PI * 2,
        spin: canSpin ? (Math.random() - 0.5) * 0.05 : 0,
        sway: Math.random() * Math.PI * 2,
        swaySpeed: 0.01 + Math.random() * 0.02,
        swayAmp: 0.4 + Math.random() * 0.8,
      };
    }

    resize();
    for (var i = 0; i < count; i++) particles.push(spawn(true));

    var last = performance.now();
    var running = true;

    function frame(now) {
      if (!running) return;
      var dt = Math.min(2.5, (now - last) / 16.667);
      last = now;
      ctx.clearRect(0, 0, W, H);
      ctx.globalAlpha = alpha;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.sway += p.swaySpeed * dt;
        p.y += p.vy * dt;
        p.x += (windX + Math.sin(p.sway) * p.swayAmp) * dt;
        p.angle += p.spin * dt;

        if (p.y - p.size > H) {
          particles[i] = spawn(false);
          continue;
        }
        if (p.x < -p.size) p.x = W + p.size;
        else if (p.x > W + p.size) p.x = -p.size;

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.spin) ctx.rotate(p.angle);
        if (p.sprite.type === "image" && p.sprite.img) {
          ctx.drawImage(
            p.sprite.img,
            -p.size / 2,
            -p.size / 2,
            p.size,
            p.size,
          );
        } else {
          ctx.font = p.size + "px serif";
          ctx.textAlign = "center";
          ctx.textBaseline = "middle";
          ctx.fillText(p.sprite.value, 0, 0);
        }
        ctx.restore();
      }

      requestAnimationFrame(frame);
    }

    requestAnimationFrame(frame);

    // Pause when the tab is hidden; resume cleanly.
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) {
        running = false;
      } else if (!running) {
        running = true;
        last = performance.now();
        requestAnimationFrame(frame);
      }
    });

    var resizeTimer;
    window.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 150);
    });
  }
})();
