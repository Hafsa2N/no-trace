import type { ConstructResult } from "@/lib/sessionAnalytics";
import { Badge } from "@/components/ui/Badge";

type Dimension = {
  key: string;
  label: string;
  average: number;
  itemCount?: number;
  items?: { id: string; label: string; average: number }[];
};

// Scale-reference ticks at every whole point on the 0-5 scale, drawn once
// as a background gradient rather than four extra DOM nodes per bar — the
// same "recessive grid" idea a real chart axis uses, so a bar reads as a
// measurement against a fixed scale, not just "some rectangle that's
// pretty full."
const SCALE_TICKS = {
  backgroundImage:
    "repeating-linear-gradient(to right, transparent 0, transparent calc(20% - 1px), var(--surface) calc(20% - 1px), var(--surface) 20%)",
};

function Bar({ pct, tone = "primary" }: { pct: number; tone?: "primary" | "muted" }) {
  return (
    <div className="relative h-2.5 overflow-hidden rounded-full bg-primary-light" style={SCALE_TICKS}>
      <div
        className={`animate-bar-grow h-full rounded-full ${tone === "primary" ? "bg-primary" : "bg-muted"}`}
        style={{ "--bar-width": `${pct}%` } as React.CSSProperties}
      />
    </div>
  );
}

// The same magnitude-bar treatment for grouped constructs and flat
// questions, ranked highest to lowest so the pattern — what's strong, what
// needs attention — reads from the ordering itself before anyone reads a
// single label. Same 0.5-point gap threshold lib/insights.ts already uses
// to decide whether a spread is worth calling out, reused here rather than
// invented fresh, so the chart and the narrative text never disagree about
// what counts as a real gap.
export function RatingsBreakdown({
  constructs,
  ungroupedAverages,
  responseCount,
}: {
  constructs: ConstructResult[];
  ungroupedAverages: Record<string, number>;
  responseCount: number;
}) {
  const dims: Dimension[] = [
    ...constructs.map((c) => ({ key: c.name, label: c.name, average: c.average, itemCount: c.items.length, items: c.items })),
    ...Object.entries(ungroupedAverages).map(([key, average]) => ({ key, label: key, average })),
  ].sort((a, b) => b.average - a.average);

  const spread = dims.length >= 2 ? dims[0].average - dims[dims.length - 1].average : 0;
  const weakestKey = spread >= 0.5 ? dims[dims.length - 1].key : null;
  const strongestKey = spread >= 0.5 ? dims[0].key : null;

  return (
    <div className="space-y-5">
      {dims.map((d) => (
        <div key={d.key}>
          <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
            <span className="flex flex-wrap items-center gap-1.5 font-medium capitalize">
              {d.label}
              {d.itemCount && <span className="font-normal text-muted">· {d.itemCount} questions</span>}
              {d.key === strongestKey && <Badge tone="success">Highest</Badge>}
              {d.key === weakestKey && <Badge tone="warning">Lowest</Badge>}
            </span>
            <span
              className="shrink-0 font-medium tabular-nums"
              title={`${d.average.toFixed(2)} out of 5, average of ${responseCount} response${responseCount === 1 ? "" : "s"}`}
            >
              {d.average.toFixed(2)} / 5
            </span>
          </div>
          <Bar pct={(d.average / 5) * 100} />
          {d.items && (
            <div className="mt-2 space-y-1.5 border-l-2 border-border pl-3">
              {d.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between text-xs text-muted">
                  <span>{item.label}</span>
                  <span className="tabular-nums">{item.average.toFixed(2)} / 5</span>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
