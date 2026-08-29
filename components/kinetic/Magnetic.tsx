"use client";

import { useRef, ReactNode, useEffect } from "react";

// Wrap any single interactive child (button, Link) to make it drift toward
// the cursor within its parent's hover area — the same effect used across
// the public homepage. `strength` scales how far it travels; kept subtle
// by default since this is used inside real operational UI, not a hero.
export function Magnetic({ children, strength = 0.2, className = "" }: { children: ReactNode; strength?: number; className?: string }) {
  const wrapRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const target = wrap.firstElementChild as HTMLElement | null;
    if (!target) return;
    if (!window.matchMedia("(pointer: fine)").matches || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    target.style.transition = "transform 0.18s cubic-bezier(0.2,0.8,0.2,1)";
    target.style.willChange = "transform";
    const onMove = (e: MouseEvent) => {
      const r = target.getBoundingClientRect();
      const x = e.clientX - r.left - r.width / 2;
      const y = e.clientY - r.top - r.height / 2;
      target.style.transform = `translate(${x * strength}px, ${y * strength * 1.3}px)`;
    };
    const onLeave = () => { target.style.transform = "translate(0,0)"; };
    wrap.addEventListener("mousemove", onMove);
    wrap.addEventListener("mouseleave", onLeave);
    return () => {
      wrap.removeEventListener("mousemove", onMove);
      wrap.removeEventListener("mouseleave", onLeave);
    };
  }, [strength]);

  return (
    <span ref={wrapRef} className={`relative inline-flex ${className}`}>
      {children}
    </span>
  );
}
