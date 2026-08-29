import { ShieldCheck } from "lucide-react";
import Link from "next/link";

export function Logo({ href = "/" }: { href?: string }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2 font-semibold tracking-tight">
      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-white">
        <ShieldCheck className="h-4 w-4" />
      </span>
      <span>No Trace</span>
    </Link>
  );
}
