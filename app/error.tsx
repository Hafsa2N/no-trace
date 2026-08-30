"use client";

import { useEffect } from "react";
import Link from "next/link";
import { ArrowLeft, RotateCw, TriangleAlert } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Button, buttonClasses } from "@/components/ui/Button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // No error-tracking service is wired up (see the technical dossier's
    // observability gap) — this at least keeps the failure visible in
    // server/function logs instead of failing silently behind a blank page.
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-danger/10 text-danger">
          <TriangleAlert className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">Something went wrong</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Nothing here was saved and nothing was traced — try again, or head back and start over.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Button onClick={reset}>
            <RotateCw className="h-4 w-4" />
            Try again
          </Button>
          <Link href="/" className={buttonClasses("secondary", "md")}>
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </main>
    </div>
  );
}
