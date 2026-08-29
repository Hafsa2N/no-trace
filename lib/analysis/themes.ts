// Deterministic keyword-dictionary tagging — no model, no API. Each theme
// is a hand-picked set of stems relevant to academic feedback; a comment is
// tagged with a theme if any stem appears as a substring of any word in it.
// Transparent by construction: anyone can read this file and know exactly
// why a comment got tagged the way it did.

export const THEMES = {
  pace: ["pace", "fast", "slow", "rush", "speed", "hurried"],
  clarity: ["clar", "explain", "understand", "confus", "clear"],
  engagement: ["engag", "interact", "question", "discuss", "participat", "boring", "interest"],
  "practical exposure": ["practical", "lab", "hands-on", "hands on", "demo", "project", "example", "real-world", "real world"],
  // "exam" as a plain prefix also matches "example" — prefixed with "="
  // to require an exact word match instead (see tagThemes below).
  "assessment fairness": ["=exam", "=exams", "test", "assess", "grad", "mark", "fair", "unfair", "evaluat"],
} as const;

export type Theme = keyof typeof THEMES;

function normalize(text: string): string {
  return text.toLowerCase();
}

function wordsOf(text: string): string[] {
  return text.match(/[a-z']+/g) ?? [];
}

export function tagThemes(comment: string): Theme[] {
  const normalized = normalize(comment);
  const words = wordsOf(normalized);
  const matched: Theme[] = [];
  for (const [theme, stems] of Object.entries(THEMES) as [Theme, readonly string[]][]) {
    // Multi-word stems ("hands-on", "real world") only make sense as a
    // substring of the raw text. A "=" prefix means "exact word only" —
    // for stems short enough to also prefix-match an unrelated word
    // ("exam" -> "example"). Everything else matches as a word prefix
    // ("mark" -> "marked"/"marking"), which is safer than a raw substring
    // of the whole comment (that also fired on "remarkable"/"supermarket").
    const hit = stems.some((stem) => {
      if (stem.includes(" ") || stem.includes("-")) return normalized.includes(stem);
      if (stem.startsWith("=")) return words.includes(stem.slice(1));
      return words.some((w) => w.startsWith(stem));
    });
    if (hit) matched.push(theme);
  }
  return matched;
}

export function aggregateThemes(comments: string[]): Record<Theme, number> {
  const counts = Object.fromEntries(Object.keys(THEMES).map((t) => [t, 0])) as Record<Theme, number>;
  for (const comment of comments) {
    for (const theme of tagThemes(comment)) {
      counts[theme]++;
    }
  }
  return counts;
}
