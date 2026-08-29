"use client";

import { useState } from "react";
import Link from "next/link";
import { Search } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { EmptySessionsIllustration } from "@/components/ui/illustrations/EmptySessions";

type SessionRow = {
  id: string;
  department: string;
  year: number;
  section: string;
  opens_at: string;
  closes_at: string;
  participant_count: number | string;
  eligible_count: number | string;
  subjects: string | null;
};

function statusOf(now: number, opensAt: string, closesAt: string) {
  const isOpen = now >= new Date(opensAt).getTime() && now <= new Date(closesAt).getTime();
  const isClosed = now > new Date(closesAt).getTime();
  return {
    tone: (isOpen ? "success" : isClosed ? "neutral" : "warning") as "success" | "neutral" | "warning",
    label: isOpen ? "Open" : isClosed ? "Closed" : "Not open",
  };
}

// A real data table on desktop — thin row dividers, hover highlight, no
// per-row card chrome — collapsing to a stacked list on small screens
// rather than shrinking the same table (an actual table doesn't fit a
// phone width; re-laying-out the same information does).
export function SessionsTable({ sessions }: { sessions: SessionRow[] }) {
  const [query, setQuery] = useState("");
  const now = Date.now();

  const q = query.trim().toLowerCase();
  const filtered = q
    ? sessions.filter((s) =>
        `${s.department} year ${s.year} section ${s.section} ${s.subjects ?? ""}`.toLowerCase().includes(q)
      )
    : sessions;

  if (sessions.length === 0) {
    return (
      <EmptyState
        illustration={<EmptySessionsIllustration />}
        title="No sessions yet"
        description="Create a feedback session to get a QR code and passcode students can use to submit responses for every subject in their class."
      />
    );
  }

  return (
    <div>
      {sessions.length > 5 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by department, section, or subject…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No sessions match &quot;{query}&quot;.</p>
      ) : (
        <>
          {/* Desktop / tablet: real table */}
          <Card className="hidden overflow-hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted">
                  <th scope="col" className="px-4 py-2 font-medium">
                    Class
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Subjects
                  </th>
                  <th scope="col" className="px-4 py-2 font-medium">
                    Status
                  </th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">
                    Participation
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((s) => {
                  const status = statusOf(now, s.opens_at, s.closes_at);
                  return (
                    <tr key={s.id} className="relative transition-colors hover:bg-background">
                      <td className="px-4 py-3 font-medium text-foreground">
                        <Link href={`/admin/sessions/${s.id}`} className="after:absolute after:inset-0">
                          {s.department} · Year {s.year} · Section {s.section}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-muted">{s.subjects ?? "No subjects yet"}</td>
                      <td className="px-4 py-3">
                        <Badge tone={status.tone}>{status.label}</Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-muted">
                        {s.participant_count} of {s.eligible_count}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Card>

          {/* Mobile: stacked list — same information, re-laid-out, not shrunk */}
          <Card className="divide-y divide-border sm:hidden">
            {filtered.map((s) => {
              const status = statusOf(now, s.opens_at, s.closes_at);
              return (
                <Link key={s.id} href={`/admin/sessions/${s.id}`} className="block px-4 py-3">
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <p className="font-medium text-foreground">
                      {s.department} · Y{s.year} · {s.section}
                    </p>
                    <Badge tone={status.tone}>{status.label}</Badge>
                  </div>
                  <p className="text-xs text-muted">{s.subjects ?? "No subjects yet"}</p>
                  <p className="mt-1 text-xs tabular-nums text-muted">
                    {s.participant_count} of {s.eligible_count} responded
                  </p>
                </Link>
              );
            })}
          </Card>
        </>
      )}
    </div>
  );
}
