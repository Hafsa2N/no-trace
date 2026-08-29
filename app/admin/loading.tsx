// Deliberately NOT the Lottie-based LoadingScreen here. This fallback fires
// on every admin navigation via Next's route-level Suspense boundary — a
// canvas-driven animation mounting/unmounting that frequently is overkill,
// and empirically caused the client to get stuck mid-swap when tested. The
// Lottie treatment stays reserved for the one-time, meaningful waits
// (/setup, /session/[id]) where it's already confirmed working.
export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <div
        className="h-8 w-8 animate-spin rounded-full border-2 border-primary/20 border-t-primary"
        role="status"
        aria-label="Loading"
      />
    </div>
  );
}
