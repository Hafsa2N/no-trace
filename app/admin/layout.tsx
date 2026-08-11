import Link from "next/link";
import { LayoutDashboard, Upload, Megaphone, ScrollText, GraduationCap, Users2 } from "lucide-react";
import { getAdminSession } from "@/lib/auth";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/Badge";
import { LogoutButton } from "@/components/LogoutButton";

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const session = await getAdminSession();

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Logo href={session ? "/admin" : "/"} />
            {session && (
              <nav className="hidden items-center gap-4 text-sm text-muted sm:flex">
                <Link href="/admin" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <LayoutDashboard className="h-3.5 w-3.5" />
                  Sessions
                </Link>
                {session.role === "admin" && (
                  <Link href="/admin/roster" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    <Upload className="h-3.5 w-3.5" />
                    Roster
                  </Link>
                )}
                {session.role === "admin" && (
                  <Link href="/admin/staff" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    <Users2 className="h-3.5 w-3.5" />
                    Staff
                  </Link>
                )}
                {session.role === "admin" && (
                  <Link href="/admin/courses" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    <GraduationCap className="h-3.5 w-3.5" />
                    Courses
                  </Link>
                )}
                <Link href="/admin/updates" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                  <Megaphone className="h-3.5 w-3.5" />
                  Updates
                </Link>
                {session.role === "admin" && (
                  <Link href="/admin/audit" className="inline-flex items-center gap-1.5 transition-colors hover:text-foreground">
                    <ScrollText className="h-3.5 w-3.5" />
                    Audit log
                  </Link>
                )}
              </nav>
            )}
          </div>
          {session && (
            <div className="flex items-center gap-4">
              <Badge tone="primary" className="hidden sm:inline-flex">
                {session.role === "admin" ? "Admin" : "Faculty"}
              </Badge>
              <span className="hidden text-sm text-muted sm:inline">{session.email}</span>
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
