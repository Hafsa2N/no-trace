"use client";

import { useState } from "react";

type Segment = { key: "positive" | "neutral" | "negative"; label: string; value: number; color: string };

const SIZE = 160;
const STROKE = 22;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Hand-rolled, not a charting library — same philosophy as TrendLine.
// Status colors (not arbitrary categorical hues) since sentiment is a
// state, not a series identity: positive=accent, neutral=muted gray,
// negative=danger — already reserved, distinct tokens elsewhere in the
// app, so this doesn't invent a new color meaning.
export function SentimentDonut({
  positive,
  neutral,
  negative,
}: {
  positive: number;
  neutral: number;
  negative: number;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const total = positive + neutral + negative;
  if (total === 0) return null;

  const allSegments: Segment[] = [
    { key: "positive", label: "Positive", value: positive, color: "var(--accent)" },
    { key: "neutral", label: "Neutral", value: neutral, color: "var(--muted)" },
    { key: "negative", label: "Negative", value: negative, color: "var(--danger)" },
  ];
  const segments = allSegments.filter((s) => s.value > 0);

  let offset = 0;
  const arcs = segments.map((s) => {
    const fraction = s.value / total;
    const length = fraction * CIRCUMFERENCE;
    const arc = { ...s, fraction, dasharray: `${length} ${CIRCUMFERENCE - length}`, dashoffset: -offset };
    offset += length;
    return arc;
  });

  const hovered = hover !== null ? arcs[hover] : null;

  return (
    <div className="flex items-center gap-6">
      <div className="relative shrink-0" style={{ width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} className="-rotate-90">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--border)" strokeWidth={STROKE} />
          {arcs.map((a, i) => (
            <circle
              key={a.key}
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={a.color}
              strokeWidth={hover === i ? STROKE + 4 : STROKE}
              strokeDasharray={a.dasharray}
              strokeDashoffset={a.dashoffset}
              className="cursor-pointer transition-[stroke-width]"
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          {hovered ? (
            <>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{hovered.value}</p>
              <p className="text-xs text-muted">{hovered.label}</p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold tabular-nums text-foreground">{total}</p>
              <p className="text-xs text-muted">Responses</p>
            </>
          )}
        </div>
      </div>
      <div className="space-y-2 text-sm">
        {arcs.map((a, i) => (
          <div
            key={a.key}
            className="flex cursor-pointer items-center gap-2"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: a.color }} />
            <span className="text-foreground">{a.label}</span>
            <span className="tabular-nums text-muted">
              {a.value} · {Math.round(a.fraction * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
