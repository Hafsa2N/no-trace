import { describe, it, expect } from "vitest";
import { rankByTextRank } from "./textrank";

describe("rankByTextRank", () => {
  it("returns an empty array for no comments", () => {
    expect(rankByTextRank([], 3)).toEqual([]);
  });

  it("returns everything unchanged when there are fewer comments than requested", () => {
    const comments = ["Good pacing.", "Great labs."];
    expect(rankByTextRank(comments, 5)).toEqual(comments);
  });

  it("never invents text — every result is one of the original comments", () => {
    const comments = [
      "The pace of the course was too fast for me to follow.",
      "I found the pace way too fast throughout the semester.",
      "Labs were fun and hands-on, really enjoyed them.",
      "The exam felt completely unrelated to what was taught in class.",
      "Pace was rushed and left no time for questions.",
    ];
    const top = rankByTextRank(comments, 2);
    expect(top).toHaveLength(2);
    for (const c of top) expect(comments).toContain(c);
  });

  it("surfaces the comments most lexically central to the group, not an outlier", () => {
    // Three comments share vocabulary about pacing being too fast; one is
    // a lone, unrelated comment about parking. TextRank should prefer the
    // comments that echo the group's shared language.
    const comments = [
      "The pace of the class was too fast for beginners.",
      "Way too fast pace, hard to keep up with the fast pace.",
      "Fast pacing made it hard to take notes.",
      "The parking lot near campus is always full.",
    ];
    const [top] = rankByTextRank(comments, 1);
    expect(top).not.toBe("The parking lot near campus is always full.");
  });

  it("is deterministic — same input always produces the same output", () => {
    const comments = ["Great course overall.", "Loved the pace.", "Labs were excellent.", "Would recommend."];
    const first = rankByTextRank(comments, 2);
    const second = rankByTextRank(comments, 2);
    expect(first).toEqual(second);
  });
});
