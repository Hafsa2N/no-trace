"use client";

import { DotLottieReact } from "@lottiefiles/dotlottie-react";

/**
 * Full-page loading state — replaces plain "Loading…" text at the handful
 * of spots that block on a real network round-trip before anything
 * meaningful can render (session lookup, setup-state check). Deliberately
 * not used for inline button spinners — a full animation there would be
 * noisy for something that resolves in milliseconds.
 */
export function LoadingScreen({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-20">
      <div className="h-28 w-28">
        <DotLottieReact src="/animations/loading.lottie" loop autoplay />
      </div>
      <p className="text-sm text-muted">{label}</p>
    </div>
  );
}
