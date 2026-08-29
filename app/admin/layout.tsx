import Link from "next/link";
import { LayoutDashboard, Upload, Megaphone, ScrollText, GraduationCap, Users2, ChevronDown } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { Badge } from "@/components/ui/Badge";
import { LogoutButton } from "@/components/LogoutButton";
import { MobileNav } from "@/components/MobileNav";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getAdminSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="relative border-b border-border print:hidden">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-6 py-4">
          <div className="flex min-w-0 items-center gap-6">
            <Link href={session ? "/admin" : "/"} className="flex shrink-0 items-center gap-2">
              <span className="signal-dot h-2 w-2 shrink-0 rounded-full bg-primary" />
              <span className="font-display text-lg font-black uppercase tracking-tight">No Trace</span>
            </Link>
            {session && (
              <nav className="hidden items-center gap-1 text-sm text-muted sm:flex">
                <Link href="/admin" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-background hover:text-foreground">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Overview
                </Link>
                {session.role === "admin" && (
                  <div className="group relative">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-background hover:text-foreground"
                    >
                      <Users2 className="h-3.5 w-3.5" />
                      People &amp; structure
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <div className="invisible absolute left-0 top-full z-20 min-w-[10rem] rounded-md border border-border bg-surface py-1 opacity-0 shadow-lg transition-[opacity,visibility] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <Link href="/admin/staff" className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground">
                        <Users2 className="h-3.5 w-3.5" />
                        Staff
                      </Link>
                      <Link href="/admin/courses" className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground">
                        <GraduationCap className="h-3.5 w-3.5" />
                        Courses
                      </Link>
                      <Link href="/admin/roster" className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground">
                        <Upload className="h-3.5 w-3.5" />
                        Roster
                      </Link>
                    </div>
                  </div>
                )}
                {session.role === "admin" ? (
                  <div className="group relative">
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-background hover:text-foreground"
                    >
                      <ScrollText className="h-3.5 w-3.5" />
                      System
                      <ChevronDown className="h-3 w-3" />
                    </button>
                    <div className="invisible absolute left-0 top-full z-20 min-w-[10rem] rounded-md border border-border bg-surface py-1 opacity-0 shadow-lg transition-[opacity,visibility] group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
                      <Link href="/admin/updates" className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground">
                        <Megaphone className="h-3.5 w-3.5" />
                        Updates
                      </Link>
                      <Link href="/admin/audit" className="flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-background hover:text-foreground">
                        <ScrollText className="h-3.5 w-3.5" />
                        Audit log
                      </Link>
                    </div>
                  </div>
                ) : (
                  <Link href="/admin/updates" className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors hover:bg-background hover:text-foreground">
                    <Megaphone className="h-3.5 w-3.5" />
                    Updates
                  </Link>
                )}
              </nav>
            )}
          </div>
          {session && (
            <div className="flex min-w-0 shrink-0 items-center gap-3">
              <Badge tone="primary" className="hidden shrink-0 sm:inline-flex">
                {session.role === "admin" ? "Admin" : "Faculty"}
              </Badge>
              <Link
                href="/admin/account"
                className="hidden max-w-[10rem] truncate text-sm text-muted transition-colors hover:text-foreground md:inline lg:max-w-none"
                title={session.email}
              >
                {session.email}
              </Link>
              <MobileNav role={session.role} />
              <LogoutButton />
            </div>
          )}
        </div>
      </header>
      {/* min-w-0 is load-bearing: without it, a flex child containing any
          long unbreakable content (like the session URL below) refuses to
          shrink below that content's natural width — the classic flexbox
          "min-width: auto" blowout — and pushes the whole page wider than
          the viewport instead of letting `truncate` do its job. */}
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
