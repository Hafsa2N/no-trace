import type { McqDistribution } from "@/lib/sessionAnalytics";

// A sequential single-hue magnitude bar per option, ranked by share so the
// most-picked answer reads first — same treatment as the rating bars
// elsewhere, just one per choice instead of one per question. Deliberately
// not a pie/donut: with 3+ options and thin slices, a ranked bar list with
// the percentage as a direct label reads faster than arc comparison.
export function McqDistributionList({ distribution }: { distribution: McqDistribution }) {
  if (distribution.total === 0) return null;
  const ranked = [...distribution.options].sort((a, b) => (distribution.counts[b] ?? 0) - (distribution.counts[a] ?? 0));
  return (
    <div>
      <p className="mb-2 text-sm font-medium">{distribution.label}</p>
      <div className="space-y-1.5">
        {ranked.map((option) => {
          const count = distribution.counts[option] ?? 0;
          const pct = distribution.total > 0 ? Math.round((count / distribution.total) * 100) : 0;
          return (
            <div key={option} title={`${count} of ${distribution.total} responses`}>
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="text-foreground">{option}</span>
                <span className="tabular-nums text-muted">
                  {count} · {pct}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-primary-light">
                <div
                  className="animate-bar-grow h-full rounded-full bg-primary"
                  style={{ "--bar-width": `${pct}%` } as React.CSSProperties}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
