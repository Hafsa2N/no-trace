import { randomUUID } from "crypto";

/**
 * Structured (JSON) server-side error logging. Not an external monitoring
 * service (Sentry/Datadog etc.) — that would need a third-party account and
 * a secret this codebase doesn't have. What this adds over a bare
 * `console.error(err)`: a one-line JSON record Vercel's log viewer/drain can
 * filter and query on, and a short error ID handed back to the client so a
 * user-reported "I got an error" can be grepped straight to the matching
 * server log line.
 */
export function logError(err: unknown, context?: Record<string, unknown>): string {
  const errorId = randomUUID().slice(0, 8);
  const record = {
    level: "error",
    timestamp: new Date().toISOString(),
    errorId,
    message: err instanceof Error ? err.message : String(err),
    stack: err instanceof Error ? err.stack : undefined,
    ...context,
  };
  console.error(JSON.stringify(record));
  return errorId;
}
