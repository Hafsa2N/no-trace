import { describe, it, expect } from "vitest";
import { isSessionOpen } from "./sessionWindow";

const opens = "2026-01-01T10:00:00.000Z";
const closes = "2026-01-01T12:00:00.000Z";

describe("isSessionOpen", () => {
  it("is open strictly between opens_at and closes_at", () => {
    expect(isSessionOpen(opens, closes, new Date("2026-01-01T11:00:00.000Z"))).toBe(true);
  });

  it("is open at the exact opening instant", () => {
    expect(isSessionOpen(opens, closes, new Date(opens))).toBe(true);
  });

  it("is open at the exact closing instant — the boundary is inclusive", () => {
    expect(isSessionOpen(opens, closes, new Date(closes))).toBe(true);
  });

  it("is closed one millisecond after closes_at — this is the exact P0 case: a token minted before close must not be redeemable after it", () => {
    expect(isSessionOpen(opens, closes, new Date("2026-01-01T12:00:00.001Z"))).toBe(false);
  });

  it("is closed long after closes_at — a held/replayed token must never succeed regardless of how much time has passed", () => {
    expect(isSessionOpen(opens, closes, new Date("2026-02-01T00:00:00.000Z"))).toBe(false);
  });

  it("is not yet open before opens_at", () => {
    expect(isSessionOpen(opens, closes, new Date("2026-01-01T09:59:59.999Z"))).toBe(false);
  });

  it("accepts Date objects as well as ISO strings for both bounds", () => {
    expect(isSessionOpen(new Date(opens), new Date(closes), new Date("2026-01-01T11:00:00.000Z"))).toBe(true);
  });
});
