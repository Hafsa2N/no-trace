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
  "assessment fairness": ["exam", "test", "assess", "grad", "mark", "fair", "unfair", "evaluat"],
} as const;

export type Theme = keyof typeof THEMES;

function normalize(text: string): string {
  return text.toLowerCase();
}

export function tagThemes(comment: string): Theme[] {
  const normalized = normalize(comment);
  const matched: Theme[] = [];
  for (const [theme, stems] of Object.entries(THEMES) as [Theme, readonly string[]][]) {
    if (stems.some((stem) => normalized.includes(stem))) {
      matched.push(theme);
    }
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
