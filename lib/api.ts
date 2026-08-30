import { NextResponse } from "next/server";
import { logError } from "@/lib/logger";

/**
 * Every route handler is wrapped in this so an unexpected throw (DB
 * unreachable, bad env config, etc.) always comes back as JSON. Without it,
 * Next's default HTML error page breaks any client-side `res.json()` call
 * with an opaque "Unexpected end of JSON input" instead of a usable error.
 */
export function withErrors<Args extends unknown[]>(
  handler: (...args: Args) => Promise<NextResponse>
) {
  return async (...args: Args): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      const errorId = logError(err);
      return NextResponse.json(
        { error: "Something went wrong. Please try again.", errorId },
        { status: 500 }
      );
    }
  };
}
