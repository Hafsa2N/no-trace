import { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

// A closed session's QR/passcode/link is no longer actionable — collapsing
// it behind a disclosure keeps the page from opening on dead controls
// while still leaving them one click away for admins who duplicate a past
// session or need to double-check what students saw.
export function AccessDetails({ defaultOpen, children }: { defaultOpen: boolean; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-border bg-surface" open={defaultOpen}>
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-medium text-foreground">
        QR code, passcode &amp; link
        <ChevronDown className="h-4 w-4 text-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-border px-4 py-4">{children}</div>
    </details>
  );
}
