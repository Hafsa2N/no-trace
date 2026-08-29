"use client";

import { useEffect, useRef } from "react";

// Reads --dot-glow / --dot-base as real CSS custom properties at draw time
// (not hardcoded hex) so the same canvas works on any themed surface —
// dark panel or light — without a separate light/dark variant to maintain.
// Set those two custom properties via className on the parent; falls back
// to --primary / --muted if unset.
export function DotCanvas({ className = "" }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canvas = canvasRef.current;
    if (!canvas || reduceMotion) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const parent = canvas.parentElement!;
    const style = getComputedStyle(parent);
    const glow = (style.getPropertyValue("--dot-glow") || style.getPropertyValue("--primary") || "#ff4b33").trim();
    const base = (style.getPropertyValue("--dot-base") || style.getPropertyValue("--muted") || "#7a6156").trim();

    let w: number, h: number, dots: { x: number; y: number }[] = [];
    let px = -1000, py = -1000;
    function size() {
      w = canvas!.width = parent.offsetWidth;
      h = canvas!.height = parent.offsetHeight;
      dots = [];
      const gap = 34;
      for (let y = gap / 2; y < h; y += gap) for (let x = gap / 2; x < w; x += gap) dots.push({ x, y });
    }
    size();
    const ro = new ResizeObserver(size);
    ro.observe(parent);
    const onMove = (e: MouseEvent) => {
      const r = parent.getBoundingClientRect();
      px = e.clientX - r.left;
      py = e.clientY - r.top;
    };
    const onLeave = () => { px = -1000; py = -1000; };
    parent.addEventListener("mousemove", onMove);
    parent.addEventListener("mouseleave", onLeave);
    let raf: number;
    function draw() {
      ctx!.clearRect(0, 0, w, h);
      for (const d of dots) {
        const dist = Math.hypot(d.x - px, d.y - py);
        const near = Math.max(0, 1 - dist / 180);
        const r = 1.1 + near * 2.2;
        ctx!.beginPath();
        ctx!.arc(d.x, d.y, r, 0, Math.PI * 2);
        ctx!.fillStyle = near > 0.05 ? withAlpha(glow, 0.15 + near * 0.75) : withAlpha(base, 0.16);
        ctx!.fill();
      }
      raf = requestAnimationFrame(draw);
    }
    draw();
    return () => {
      ro.disconnect();
      parent.removeEventListener("mousemove", onMove);
      parent.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(raf);
    };
  }, []);

  return <canvas ref={canvasRef} className={`pointer-events-none absolute inset-0 h-full w-full ${className}`} aria-hidden="true" />;
}

// Accepts #rrggbb or a named/rgb() value already resolved by the browser
// (getComputedStyle always returns rgb()/rgba()) — parses either.
function withAlpha(color: string, alpha: number): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16), g = parseInt(color.slice(3, 5), 16), b = parseInt(color.slice(5, 7), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }
  const m = color.match(/[\d.]+/g);
  if (m && m.length >= 3) return `rgba(${m[0]},${m[1]},${m[2]},${alpha})`;
  return color;
}
