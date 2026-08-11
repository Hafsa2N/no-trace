"use client";

import { useState } from "react";

type Point = { label: string; value: number | null };

const WIDTH = 280;
const HEIGHT = 64;
const PAD_X = 10;
const PAD_Y = 12;

export function TrendLine({ points, tone = "primary" }: { points: Point[]; tone?: "primary" | "accent" | "danger" }) {
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const usable = points.filter((p) => p.value !== null);
  if (usable.length === 0) return null;

  const values = usable.map((p) => p.value as number);
  const min = Math.min(0, ...values);
  const max = Math.max(100, ...values);
  const span = max - min || 1;

  const step = points.length > 1 ? (WIDTH - PAD_X * 2) / (points.length - 1) : 0;
  const coords = points.map((p, i) => {
    const x = PAD_X + step * i;
    const y = p.value === null ? null : HEIGHT - PAD_Y - ((p.value - min) / span) * (HEIGHT - PAD_Y * 2);
    return { x, y, point: p };
  });

  const linePath = coords
    .filter((c) => c.y !== null)
    .map((c, i) => `${i === 0 ? "M" : "L"} ${c.x} ${c.y}`)
    .join(" ");

  const colorVar = tone === "accent" ? "var(--accent)" : tone === "danger" ? "var(--danger)" : "var(--primary)";
  const lastValid = [...coords].reverse().find((c) => c.y !== null);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" style={{ height: HEIGHT }}>
        <line x1={PAD_X} y1={HEIGHT - PAD_Y} x2={WIDTH - PAD_X} y2={HEIGHT - PAD_Y} stroke="var(--border)" strokeWidth={1} />
        {linePath && <path d={linePath} fill="none" stroke={colorVar} strokeWidth={2} strokeLinecap="round" />}
        {coords.map(
          (c, i) =>
            c.y !== null && (
              <circle
                key={i}
                cx={c.x}
                cy={c.y}
                r={hoverIndex === i ? 5 : 4}
                fill={colorVar}
                stroke="var(--surface)"
                strokeWidth={2}
                onMouseEnter={() => setHoverIndex(i)}
                onMouseLeave={() => setHoverIndex(null)}
                className="cursor-pointer transition-all"
              />
            )
        )}
        {lastValid && (
          <text x={lastValid.x} y={(lastValid.y ?? 0) - 10} textAnchor="end" fontSize="11" fontWeight="600" fill={colorVar}>
            {lastValid.point.value}%
          </text>
        )}
      </svg>
      {hoverIndex !== null && coords[hoverIndex].y !== null && (
        <div
          className="pointer-events-none absolute rounded-md border border-border bg-surface px-2 py-1 text-xs shadow-sm"
          style={{
            left: `${(coords[hoverIndex].x / WIDTH) * 100}%`,
            top: 0,
            transform: "translate(-50%, -100%)",
          }}
        >
          <span className="font-medium">{coords[hoverIndex].point.label}</span>: {coords[hoverIndex].point.value}%
        </div>
      )}
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        {points.map((p, i) => (
          <span key={i} className={i === 0 || i === points.length - 1 ? "" : "hidden sm:inline"}>
            {p.label}
          </span>
        ))}
      </div>
    </div>
  );
}
