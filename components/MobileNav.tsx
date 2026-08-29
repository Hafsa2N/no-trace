"use client";

import { useState } from "react";
import Link from "next/link";
import { Menu, X, LayoutDashboard, Upload, Megaphone, ScrollText, GraduationCap, Users2 } from "lucide-react";

// The desktop nav in AdminLayout is `hidden` below `sm` with no fallback —
// on a phone an admin/faculty account previously had no way to reach
// Roster/Staff/Courses/Updates/Audit log at all, only whatever the
// dashboard itself happened to link to. This is that fallback: the same
// links, in a full-width disclosure panel instead of a hover dropdown
// (hover has no equivalent on touch).
export function MobileNav({ role }: { role: "admin" | "faculty" }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="sm:hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={open ? "Close menu" : "Open menu"}
        className="flex h-9 w-9 items-center justify-center rounded-md text-foreground transition-colors hover:bg-background"
      >
        {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>
      {open && (
        <nav className="absolute inset-x-0 top-full z-20 border-b border-border bg-surface px-3 py-2 shadow-lg">
          <Link href="/admin" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
            <LayoutDashboard className="h-4 w-4 text-muted" />
            Overview
          </Link>
          {role === "admin" && (
            <>
              <Link href="/admin/staff" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
                <Users2 className="h-4 w-4 text-muted" />
                Staff
              </Link>
              <Link href="/admin/courses" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
                <GraduationCap className="h-4 w-4 text-muted" />
                Courses
              </Link>
              <Link href="/admin/roster" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
                <Upload className="h-4 w-4 text-muted" />
                Roster
              </Link>
            </>
          )}
          <Link href="/admin/updates" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
            <Megaphone className="h-4 w-4 text-muted" />
            Updates
          </Link>
          {role === "admin" && (
            <Link href="/admin/audit" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
              <ScrollText className="h-4 w-4 text-muted" />
              Audit log
            </Link>
          )}
          <Link href="/admin/account" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2.5 text-sm text-foreground hover:bg-background">
            Account
          </Link>
        </nav>
      )}
    </div>
  );
}
