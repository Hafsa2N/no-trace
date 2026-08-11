// TextRank (Mihalcea & Tarau, 2004) — a graph-based ranking algorithm from
// the same family as PageRank. Comments are nodes; edge weight is lexical
// overlap. Running power iteration over that graph surfaces the comments
// most "central" to what the group is saying, without generating any new
// text — the output is always an actual thing a student wrote.

const STOPWORDS = new Set([
  "the", "a", "an", "and", "or", "but", "is", "are", "was", "were", "be", "been",
  "to", "of", "in", "on", "for", "with", "it", "this", "that", "i", "we", "you",
  "not", "very", "so", "as", "at", "by", "from", "than", "too", "more", "some",
  "there", "here", "just", "also", "could", "would", "should", "have", "has",
]);

function wordsOf(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .match(/[a-z']+/g)
      ?.filter((w) => w.length > 2 && !STOPWORDS.has(w)) ?? []
  );
}

function similarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let overlap = 0;
  for (const word of a) if (b.has(word)) overlap++;
  const denom = Math.log(a.size + 1) + Math.log(b.size + 1);
  return denom === 0 ? 0 : overlap / denom;
}

/** Returns the top `count` most representative comments, ranked by TextRank score. */
export function rankByTextRank(comments: string[], count: number, damping = 0.85, iterations = 30): string[] {
  const n = comments.length;
  if (n === 0) return [];
  if (n <= count) return comments;

  const wordSets = comments.map(wordsOf);
  const sim: number[][] = Array.from({ length: n }, () => new Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      const s = similarity(wordSets[i], wordSets[j]);
      sim[i][j] = s;
      sim[j][i] = s;
    }
  }

  const outWeightSum = sim.map((row) => row.reduce((a, b) => a + b, 0));
  let scores = new Array(n).fill(1);

  for (let iter = 0; iter < iterations; iter++) {
    const next = new Array(n).fill(1 - damping);
    for (let i = 0; i < n; i++) {
      let incoming = 0;
      for (let j = 0; j < n; j++) {
        if (j === i || outWeightSum[j] === 0) continue;
        incoming += (sim[j][i] / outWeightSum[j]) * scores[j];
      }
      next[i] += damping * incoming;
    }
    scores = next;
  }

  return comments
    .map((text, i) => ({ text, score: scores[i] }))
    .sort((a, b) => b.score - a.score)
    .slice(0, count)
    .map((c) => c.text);
}
