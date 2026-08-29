"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Merge } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

type Course = { id: string; name: string; department: string };

export function MergeCoursesForm({ courses }: { courses: Course[] }) {
  const router = useRouter();
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(false);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!sourceId || !targetId || sourceId === targetId) {
      setError("Pick two different courses.");
      return;
    }
    setConfirming(true);
  }

  async function onMerge() {
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/courses/merge", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceId, targetId }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not merge courses");
      return;
    }
    setSourceId("");
    setTargetId("");
    setConfirming(false);
    router.refresh();
  }

  if (courses.length < 2) return null;

  const source = courses.find((c) => c.id === sourceId);
  const target = courses.find((c) => c.id === targetId);

  return (
    <Card className="mb-6">
      <CardBody>
        <div className="mb-3 flex items-center gap-2">
          <Merge className="h-4 w-4 text-muted" />
          <h2 className="text-sm font-medium">Merge duplicate courses</h2>
        </div>
        <p className="mb-4 text-xs text-muted">
          For a course that ended up as two records — a genuine cross-listing, or a name typed
          differently across terms. This is a manual, deliberate action: two courses sharing a
          name aren&apos;t always the same course, so nothing merges automatically.
        </p>
        <form onSubmit={onSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
          <Field label="Merge this course">
            <Select value={sourceId} onChange={(e) => { setSourceId(e.target.value); setConfirming(false); }}>
              <option value="">— Select —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.department})
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Into this course">
            <Select value={targetId} onChange={(e) => { setTargetId(e.target.value); setConfirming(false); }}>
              <option value="">— Select —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.department})
                </option>
              ))}
            </Select>
          </Field>
          {!confirming && (
            <Button type="submit" variant="secondary">
              Merge
            </Button>
          )}
        </form>
        {confirming && source && target && (
          <div className="animate-step-in mt-3 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-3 text-sm">
            <p className="text-danger">
              Merge <strong>{source.name}</strong> ({source.department}) into{" "}
              <strong>{target.name}</strong> ({target.department})? This moves all its sessions
              and updates, then deletes the duplicate. This can&apos;t be undone.
            </p>
            <div className="mt-2.5 flex items-center gap-3">
              <Button type="button" variant="danger" size="sm" onClick={onMerge} disabled={submitting}>
                {submitting ? "Merging…" : "Yes, merge"}
              </Button>
              <button type="button" onClick={() => setConfirming(false)} className="text-sm text-muted hover:text-foreground">
                Cancel
              </button>
            </div>
          </div>
        )}
        {error && (
          <div className="mt-3">
            <Alert tone="error">{error}</Alert>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
