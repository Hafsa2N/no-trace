import { describe, it, expect } from "vitest";
import { tagThemes, aggregateThemes } from "./themes";

describe("tagThemes", () => {
  it("tags a comment about pacing", () => {
    expect(tagThemes("The pace of this class is way too fast for beginners.")).toContain("pace");
  });

  it("tags a comment about clarity", () => {
    expect(tagThemes("I was often confused and couldn't understand the explanations.")).toContain("clarity");
  });

  it("tags multi-word stems like 'hands-on' and 'real world'", () => {
    expect(tagThemes("More hands-on labs would help.")).toContain("practical exposure");
    expect(tagThemes("Give us more real world examples.")).toContain("practical exposure");
  });

  it("can tag a comment with more than one theme", () => {
    const themes = tagThemes("The exam was unfair and the pace was too fast.");
    expect(themes).toContain("assessment fairness");
    expect(themes).toContain("pace");
  });

  it("returns no themes for an unrelated comment", () => {
    expect(tagThemes("The weather was nice today.")).toEqual([]);
  });

  it("does not false-positive on 'mark' inside unrelated words", () => {
    // Regression test: substring matching used to tag any comment
    // containing "remarkable" or "supermarket" as being about assessment
    // fairness, because "mark" is a substring of both.
    expect(tagThemes("The professor was remarkable and very kind.")).not.toContain("assessment fairness");
    expect(tagThemes("We talked about the supermarket for an example.")).not.toContain("assessment fairness");
  });

  it("still matches real word forms of a stem ('marked', 'marking')", () => {
    expect(tagThemes("Assignments were marked very harshly.")).toContain("assessment fairness");
    expect(tagThemes("The marking scheme felt unclear.")).toContain("assessment fairness");
  });
});

describe("aggregateThemes", () => {
  it("counts theme occurrences across multiple comments", () => {
    const counts = aggregateThemes(["Too fast pace.", "Also too fast for me.", "Great practical labs."]);
    expect(counts.pace).toBe(2);
    expect(counts["practical exposure"]).toBe(1);
  });

  it("returns zero for every theme on an empty comment list", () => {
    const counts = aggregateThemes([]);
    expect(Object.values(counts).every((n) => n === 0)).toBe(true);
  });
});
