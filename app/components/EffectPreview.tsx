import { useEffect, useRef } from "react";

interface EffectPreviewProps {
  glyph: string;
  density: number;
  speed: number;
  size: number;
  wind: number;
  opacity: number;
  rotation: boolean;
}

interface Particle {
  x: number;
  y: number;
  size: number;
  vy: number;
  angle: number;
  spin: number;
  sway: number;
  swaySpeed: number;
  swayAmp: number;
}

/**
 * Live, bounded preview of the falling-elements effect for the Admin panel.
 * Mirrors the storefront renderer but scoped to a small box and re-initialised
 * whenever the config props change, so merchants get instant feedback.
 */
export default function EffectPreview({
  glyph,
  density,
  speed,
  size,
  wind,
  opacity,
  rotation,
}: EffectPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let raf = 0;
    let running = true;

    const count = Math.max(5, Math.min(80, Math.round(density / 1.6)));
    const fall = 0.3 + (speed / 100) * 2.4;
    const windX = (wind / 100) * 1.6;
    const alpha = Math.max(0, Math.min(1, opacity / 100));
    const symbol = glyph || "🍂";

    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const spawn = (initial: boolean): Particle => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : -size,
      size: size * (0.6 + Math.random() * 0.8),
      vy: fall * (0.6 + Math.random() * 0.8),
      angle: Math.random() * Math.PI * 2,
      spin: rotation ? (Math.random() - 0.5) * 0.05 : 0,
      sway: Math.random() * Math.PI * 2,
      swaySpeed: 0.01 + Math.random() * 0.02,
      swayAmp: 0.4 + Math.random() * 0.8,
    });

    resize();
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) particles.push(spawn(true));

    let last = performance.now();
    const frame = (now: number) => {
      if (!running) return;
      const dt = Math.min(2.5, (now - last) / 16.667);
      last = now;
      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = alpha;

      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        p.sway += p.swaySpeed * dt;
        p.y += p.vy * dt;
        p.x += (windX + Math.sin(p.sway) * p.swayAmp) * dt;
        p.angle += p.spin * dt;

        if (p.y - p.size > height) {
          particles[i] = spawn(false);
          continue;
        }
        if (p.x < -p.size) p.x = width + p.size;
        else if (p.x > width + p.size) p.x = -p.size;

        ctx.save();
        ctx.translate(p.x, p.y);
        if (p.spin) ctx.rotate(p.angle);
        ctx.font = `${p.size}px serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(symbol, 0, 0);
        ctx.restore();
      }

      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    const ro = new ResizeObserver(resize);
    ro.observe(container);

    return () => {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [glyph, density, speed, size, wind, opacity, rotation]);

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: 280,
        borderRadius: 8,
        overflow: "hidden",
        background: "linear-gradient(180deg, #eef3f8 0%, #dde7f0 100%)",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      />
    </div>
  );
}
