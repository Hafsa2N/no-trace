import { describe, it, expect } from "vitest";
import { scoreSentiment, aggregateSentiment } from "./sentiment";

describe("scoreSentiment", () => {
  it("labels a clearly positive comment as positive", () => {
    expect(scoreSentiment("This was an excellent, brilliant, wonderful course.").label).toBe("positive");
  });

  it("labels a clearly negative comment as negative", () => {
    expect(scoreSentiment("This was a terrible, awful, horrible course.").label).toBe("negative");
  });

  it("labels a purely factual comment as neutral", () => {
    expect(scoreSentiment("The class meets on Tuesdays and Thursdays.").label).toBe("neutral");
  });

  it("labels an empty comment as neutral rather than throwing", () => {
    expect(scoreSentiment("").label).toBe("neutral");
  });

  it("does not let comment length alone bias the label", () => {
    // `comparative` normalizes by word count — a short strongly-positive
    // comment and a long, padded-out version of the same sentiment should
    // land on the same label.
    const short = scoreSentiment("Excellent course.");
    const long = scoreSentiment(
      "Excellent course, excellent course, excellent course, excellent course, excellent course."
    );
    expect(short.label).toBe(long.label);
  });
});

describe("aggregateSentiment", () => {
  it("buckets a mixed set of comments into all three labels", () => {
    const counts = aggregateSentiment([
      "Amazing, fantastic, wonderful teaching.",
      "Terrible, awful, dreadful pacing.",
      "The exam is on the 5th.",
    ]);
    expect(counts.positive).toBe(1);
    expect(counts.negative).toBe(1);
    expect(counts.neutral).toBe(1);
  });

  it("returns all-zero counts for an empty comment list", () => {
    expect(aggregateSentiment([])).toEqual({ positive: 0, neutral: 0, negative: 0 });
  });
});
