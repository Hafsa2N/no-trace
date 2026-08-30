import { describe, it, expect, vi, afterEach } from "vitest";
import { logError } from "./logger";

describe("logError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns a short error ID and logs a single JSON line containing it", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorId = logError(new Error("boom"));

    expect(errorId).toMatch(/^[0-9a-f]{8}$/);
    expect(spy).toHaveBeenCalledTimes(1);
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.errorId).toBe(errorId);
    expect(logged.message).toBe("boom");
    expect(logged.level).toBe("error");
  });

  it("returns a different ID on each call, so two failures aren't confused for one report", () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const first = logError(new Error("a"));
    const second = logError(new Error("b"));
    expect(first).not.toBe(second);
  });

  it("handles a thrown non-Error value without crashing", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    const errorId = logError("just a string");
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.message).toBe("just a string");
    expect(errorId).toMatch(/^[0-9a-f]{8}$/);
  });

  it("merges extra context into the logged record", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    logError(new Error("boom"), { route: "/api/sessions" });
    const logged = JSON.parse(spy.mock.calls[0][0] as string);
    expect(logged.route).toBe("/api/sessions");
  });
});
