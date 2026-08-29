// Rule-based, deterministic insight generation — no LLM, no invented
// numbers. Every insight is derived directly from the same averages/
// sentiment/theme data already shown on the page; this just surfaces the
// comparisons a human would otherwise have to do by eye (which dimension
// is weakest, is sentiment skewed, what's the dominant theme) so the
// report reads as analysis rather than a raw data dump.

export type Insight = {
  tone: "positive" | "concern" | "neutral";
  text: string;
};

export function generateInsights(input: {
  averages: Record<string, number>;
  sentiment: { positive: number; neutral: number; negative: number } | null;
  themes: Record<string, number>;
  responseCount: number;
  evidenceLevel: "high" | "moderate" | "low" | null;
}): Insight[] {
  const { averages, sentiment, themes, responseCount, evidenceLevel } = input;
  const insights: Insight[] = [];

  const dims = Object.entries(averages);
  if (dims.length >= 2) {
    const sorted = [...dims].sort((a, b) => a[1] - b[1]);
    const [weakestKey, weakestVal] = sorted[0];
    const [strongestKey, strongestVal] = sorted[sorted.length - 1];
    if (strongestVal - weakestVal >= 0.5) {
      insights.push({
        tone: "concern",
        text: `${cap(weakestKey)} (${weakestVal.toFixed(1)}/5) is rated well below ${cap(weakestKey === strongestKey ? "" : strongestKey)}${strongestKey !== weakestKey ? ` (${strongestVal.toFixed(1)}/5)` : ""} — the clearest single gap to address before the next session.`,
      });
    } else {
      insights.push({
        tone: "positive",
        text: `Ratings are consistent across all ${dims.length} dimensions (${weakestVal.toFixed(1)}–${strongestVal.toFixed(1)}/5) — no single area stands out as a problem.`,
      });
    }
  } else if (dims.length === 1) {
    insights.push({ tone: "neutral", text: `${cap(dims[0][0])} averaged ${dims[0][1].toFixed(1)}/5.` });
  }

  if (sentiment) {
    const total = sentiment.positive + sentiment.neutral + sentiment.negative;
    if (total > 0) {
      const negPct = Math.round((sentiment.negative / total) * 100);
      const posPct = Math.round((sentiment.positive / total) * 100);
      if (negPct >= 40) {
        insights.push({
          tone: "concern",
          text: `${negPct}% of comments read negative — worth reading directly rather than relying on the numeric averages alone.`,
        });
      } else if (posPct >= 70) {
        insights.push({
          tone: "positive",
          text: `${posPct}% of comments read positive — sentiment backs up the numeric ratings.`,
        });
      }
    }
  }

  const themeEntries = Object.entries(themes).filter(([, c]) => c > 0).sort((a, b) => b[1] - a[1]);
  if (themeEntries.length > 0) {
    const [topTheme, topCount] = themeEntries[0];
    if (topCount >= 3) {
      insights.push({
        tone: "neutral",
        text: `"${cap(topTheme)}" came up in ${topCount} comment${topCount === 1 ? "" : "s"} — the most recurring topic this term.`,
      });
    }
  }

  if (evidenceLevel === "low") {
    insights.push({
      tone: "concern",
      text: `Response rate is low enough (${responseCount} respondents) that these patterns are directional, not conclusive — treat as a signal to investigate, not a verdict.`,
    });
  }

  return insights;
}

function cap(s: string) {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}
