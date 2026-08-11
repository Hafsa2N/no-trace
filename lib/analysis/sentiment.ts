import Sentiment from "sentiment";

// AFINN-165 lexicon lookup — sums pre-scored words (-5..+5) per comment.
// Deterministic and fully inspectable, unlike an LLM call.
const analyzer = new Sentiment();

export type SentimentLabel = "positive" | "neutral" | "negative";

export function scoreSentiment(comment: string): { score: number; label: SentimentLabel } {
  const result = analyzer.analyze(comment);
  // `comparative` normalizes by word count so a short comment isn't
  // penalized/boosted just for being short.
  const label: SentimentLabel = result.comparative > 0.15 ? "positive" : result.comparative < -0.15 ? "negative" : "neutral";
  return { score: result.score, label };
}

export function aggregateSentiment(comments: string[]): Record<SentimentLabel, number> {
  const counts: Record<SentimentLabel, number> = { positive: 0, neutral: 0, negative: 0 };
  for (const comment of comments) {
    counts[scoreSentiment(comment).label]++;
  }
  return counts;
}
