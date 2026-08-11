import { aggregateSentiment } from "./sentiment";
import { aggregateThemes } from "./themes";
import { rankByTextRank } from "./textrank";

export function analyzeComments(comments: string[]) {
  return {
    sentiment: aggregateSentiment(comments),
    themes: aggregateThemes(comments),
    highlights: rankByTextRank(comments, 3),
  };
}

export type CommentAnalysis = ReturnType<typeof analyzeComments>;
