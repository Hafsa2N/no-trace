"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, Send, Undo2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

type Offering = {
  id: string;
  courseName: string;
  facultyEmail: string | null;
  facultyName: string | null;
  assignedFaculty: string | null;
  responseCount: number;
  resultsPublished: boolean;
};

export function OfferingsTable({
  sessionId,
  offerings,
  isAdmin,
}: {
  sessionId: string;
  offerings: Offering[];
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  // Only subjects with a faculty assigned can meaningfully be "sent" —
  // there's no one on the other end for an unassigned subject.
  const assignable = offerings.filter((o) => o.assignedFaculty);
  const allSelected = assignable.length > 0 && assignable.every((o) => selected.has(o.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(allSelected ? new Set() : new Set(assignable.map((o) => o.id)));
  }

  async function bulkPublish(published: boolean) {
    if (selected.size === 0) return;
    setSubmitting(true);
    const res = await fetch(`/api/sessions/${sessionId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ offeringIds: Array.from(selected), published }),
    });
    setSubmitting(false);
    if (res.ok) {
      setSelected(new Set());
      router.refresh();
    }
  }

  return (
    <Card className="overflow-hidden">
      {isAdmin && selected.size > 0 && (
        <div className="flex items-center justify-between gap-3 border-b border-border bg-primary-light/40 px-4 py-2.5">
          <p className="text-sm font-medium">{selected.size} selected</p>
          <div className="flex items-center gap-2">
            <Button type="button" size="sm" variant="secondary" disabled={submitting} onClick={() => bulkPublish(false)}>
              <Undo2 className="h-3.5 w-3.5" />
              Unshare reports
            </Button>
            <Button type="button" size="sm" variant="primary" disabled={submitting} onClick={() => bulkPublish(true)}>
              <Send className="h-3.5 w-3.5" />
              Share reports with faculty
            </Button>
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted">
            {isAdmin && (
              <th scope="col" className="w-8 px-4 py-2">
                {assignable.length > 0 && (
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all subjects with faculty assigned"
                    className="h-3.5 w-3.5 rounded border-border"
                  />
                )}
              </th>
            )}
            <th scope="col" className="px-4 py-2 font-medium">
              Subject
            </th>
            {isAdmin && (
              <th scope="col" className="px-4 py-2 font-medium">
                Faculty
              </th>
            )}
            <th scope="col" className="px-4 py-2 text-right font-medium">
              Responses
            </th>
            <th scope="col" className="w-8 px-4 py-2"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {offerings.map((o) => (
            <tr key={o.id} className="relative transition-colors hover:bg-background">
              {isAdmin && (
                <td className="px-4 py-3">
                  {o.assignedFaculty && (
                    <input
                      type="checkbox"
                      checked={selected.has(o.id)}
                      onChange={() => toggle(o.id)}
                      aria-label={`Select ${o.courseName}`}
                      className="relative z-10 h-3.5 w-3.5 rounded border-border"
                    />
                  )}
                </td>
              )}
              <td className="px-4 py-3 font-medium text-foreground">
                <Link href={`/admin/sessions/${sessionId}/offerings/${o.id}`} className="after:absolute after:inset-0">
                  {o.courseName}
                </Link>
                {isAdmin && o.assignedFaculty && (
                  <Badge tone={o.resultsPublished ? "success" : "neutral"} className="ml-2">
                    {o.resultsPublished ? "Shared" : "Not shared"}
                  </Badge>
                )}
              </td>
              {isAdmin && <td className="px-4 py-3 text-muted">{o.facultyName ?? o.facultyEmail ?? "—"}</td>}
              <td className="px-4 py-3 text-right tabular-nums text-muted">{o.responseCount}</td>
              <td className="px-4 py-3">
                <ChevronRight className="h-4 w-4 text-muted" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </Card>
  );
}
