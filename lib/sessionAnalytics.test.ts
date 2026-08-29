import { describe, it, expect } from "vitest";
import { getEvidenceLevel } from "./sessionAnalytics";

describe("getEvidenceLevel", () => {
  it("returns null when there is no rate to assess", () => {
    expect(getEvidenceLevel(null)).toBeNull();
  });

  it("classifies at and above 66% as high", () => {
    expect(getEvidenceLevel(66)).toBe("high");
    expect(getEvidenceLevel(100)).toBe("high");
  });

  it("classifies 40%-65.9% as moderate", () => {
    expect(getEvidenceLevel(40)).toBe("moderate");
    expect(getEvidenceLevel(65.9)).toBe("moderate");
  });

  it("classifies below 40% as low", () => {
    expect(getEvidenceLevel(39.9)).toBe("low");
    expect(getEvidenceLevel(0)).toBe("low");
  });
});
