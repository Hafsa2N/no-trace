import Link from "next/link";
import { ChevronRight } from "lucide-react";

export type Crumb = { label: string; href?: string };

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Breadcrumb" className="mb-3 flex items-center gap-1.5 text-sm text-muted">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5 min-w-0">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0" />}
          {item.href ? (
            <Link href={item.href} className="truncate transition-colors hover:text-foreground">
              {item.label}
            </Link>
          ) : (
            <span className="truncate text-foreground">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
