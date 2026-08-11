import Link from "next/link";
import { Logo } from "./Logo";

export function PublicHeader() {
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
        <Logo />
        <nav className="flex items-center gap-6 text-sm">
          {/* Secondary on small screens — the privacy link is already inline
              in the student flow copy, and "what changed" isn't essential
              chrome for someone who just scanned a QR code. */}
          <Link href="/updates" className="hidden text-muted transition-colors hover:text-foreground sm:inline">
            What changed
          </Link>
          <Link href="/privacy" className="hidden text-muted transition-colors hover:text-foreground sm:inline">
            How privacy works
          </Link>
          <Link
            href="/admin/login"
            className="rounded-lg border border-border px-3 py-1.5 font-medium transition-colors hover:border-primary/40 hover:text-primary"
          >
            Staff login
          </Link>
        </nav>
      </div>
    </header>
  );
}
