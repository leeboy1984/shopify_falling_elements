/**
 * Floating Elements storefront renderer.
 * Vanilla JS, no dependencies. Draws configurable falling elements on a single
 * full-viewport canvas.
 *
 * PERFORMANCE: each unique sprite (emoji/SVG/image) is rasterized ONCE to an
 * offscreen canvas (a "sprite cache"). Every frame we only call drawImage() with
 * a single setTransform() per particle — no per-frame fillText(), no save()/
 * restore(). Rasterizing emoji glyphs every frame was the cause of the jank;
 * caching makes 150 particles run at a steady 60fps without WebGL.
 *
 * It is also light on the merchant's store:
 *   - skips entirely when the visitor prefers reduced motion,
 *   - pauses while the tab is hidden,
 *   - caps device pixel ratio,
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

  var TEMPLATE = script.getAttribute("data-template") || "";
  var Z_INDEX = parseInt(script.getAttribute("data-z-index"), 10) || 2147483000;

  // Accessibility + perf: never animate for reduced-motion visitors.
  if (
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  ) {
    return;
  }

  // Config is injected inline from the shop metafield — no network request.
  var cfg = {};
  try {
    cfg = JSON.parse(script.getAttribute("data-config") || "{}");
    if (typeof cfg === "string") cfg = JSON.parse(cfg);
  } catch (e) {
    cfg = {};
  }

  if (cfg && cfg.enabled && pageMatches(cfg.pages, TEMPLATE)) {
    buildSprites(cfg, function (pool) {
      if (pool.length) start(cfg, pool);
    });
  }

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

  // Build the pool of drawable tokens: the selected catalog glyph plus any
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

  // Rasterize one token to an offscreen canvas, once. `refPx` is the CSS size the
  // glyph is drawn at; particles scale this cached bitmap to their own size.
  function makeSprite(token, refPx, dpr) {
    var pad = 3;
    var cssSize = refPx + pad * 2;
    var c = document.createElement("canvas");
    c.width = Math.ceil(cssSize * dpr);
    c.height = Math.ceil(cssSize * dpr);
    var cx = c.getContext("2d");
    cx.scale(dpr, dpr);
    var mid = cssSize / 2;
    if (token.type === "image" && token.img) {
      cx.drawImage(token.img, pad, pad, refPx, refPx);
    } else {
      cx.font = refPx + "px serif";
      cx.textAlign = "center";
      cx.textBaseline = "middle";
      cx.fillText(token.value, mid, mid);
    }
    token.cache = c;
    token.cacheCss = cssSize;
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

    // Reference size for the cached bitmaps: the largest a particle can get
    // (base × 1.4), with a floor so small sizes stay crisp.
    var refPx = Math.max(24, Math.ceil(baseSize * 1.4));
    pool.forEach(function (token) {
      makeSprite(token, refPx, dpr);
    });

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = Math.floor(W * dpr);
      canvas.height = Math.floor(H * dpr);
    }

    function spawn(initial) {
      return {
        sprite: pool[(Math.random() * pool.length) | 0],
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

      // Clear in device space, then draw each particle with one transform.
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = alpha;

      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.sway += p.swaySpeed * dt;
        p.y += p.vy * dt;
        p.x += (windX + Math.sin(p.sway) * p.swayAmp) * dt;

        if (p.y - p.size > H) {
          particles[i] = spawn(false);
          continue;
        }
        if (p.x < -p.size) p.x = W + p.size;
        else if (p.x > W + p.size) p.x = -p.size;

        var sprite = p.sprite;
        var dw = sprite.cacheCss * (p.size / refPx);
        var half = dw / 2;

        if (p.spin) {
          p.angle += p.spin * dt;
          var cos = Math.cos(p.angle);
          var sin = Math.sin(p.angle);
          ctx.setTransform(
            dpr * cos,
            dpr * sin,
            -dpr * sin,
            dpr * cos,
            dpr * p.x,
            dpr * p.y,
          );
        } else {
          ctx.setTransform(dpr, 0, 0, dpr, dpr * p.x, dpr * p.y);
        }
        ctx.drawImage(sprite.cache, -half, -half, dw, dw);
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
