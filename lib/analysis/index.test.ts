import { describe, it, expect } from "vitest";
import { analyzeComments } from "./index";

describe("analyzeComments", () => {
  it("combines sentiment, themes, and highlights into one result", () => {
    const result = analyzeComments([
      "Excellent course, loved the practical labs.",
      "The pace was too fast and hard to follow.",
      "Terrible exam, completely unfair grading.",
    ]);

    expect(result.sentiment.positive).toBeGreaterThan(0);
    expect(result.sentiment.negative).toBeGreaterThan(0);
    expect(result.themes["practical exposure"]).toBeGreaterThan(0);
    expect(result.themes.pace).toBeGreaterThan(0);
    expect(result.themes["assessment fairness"]).toBeGreaterThan(0);
    expect(result.highlights.length).toBeGreaterThan(0);
  });

  it("handles an empty comment set without throwing", () => {
    const result = analyzeComments([]);
    expect(result.sentiment).toEqual({ positive: 0, neutral: 0, negative: 0 });
    expect(result.highlights).toEqual([]);
  });
});
