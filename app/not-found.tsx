import Link from "next/link";
import { ArrowLeft, SearchX } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { buttonClasses } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />
      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <span className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-primary-light text-primary">
          <SearchX className="h-6 w-6" />
        </span>
        <h1 className="text-2xl font-semibold tracking-tight">This page doesn&apos;t exist</h1>
        <p className="mt-2 max-w-sm text-sm text-muted">
          The link may be old, mistyped, or a session that&apos;s already been removed. Nothing here
          traces back to anything either way.
        </p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link href="/" className={buttonClasses("primary", "md")}>
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
          <Link href="/admin/login" className={buttonClasses("secondary", "md")}>
            Staff login
          </Link>
        </div>
      </div>
    </div>
  );
}
