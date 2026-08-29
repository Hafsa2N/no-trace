"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select, Textarea } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

type Course = { id: string; name: string; department: string };

export default function NewUpdatePage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [department, setDepartment] = useState("");
  const [courses, setCourses] = useState<Course[]>([]);
  const [courseId, setCourseId] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!department) {
      setCourses([]);
      setCourseId("");
      return;
    }
    fetch(`/api/courses?department=${encodeURIComponent(department)}`)
      .then((r) => r.json())
      .then((data) => setCourses(data.courses ?? []))
      .catch(() => {});
  }, [department]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/updates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, body, department: department || null, courseId: courseId || null }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not post update");
      return;
    }
    router.push("/admin/updates");
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="font-display text-3xl font-black uppercase tracking-tight">Post an update</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">
        Shown publicly at /updates. Keep it aggregate — this is about what changed, not
        who said what.
      </p>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Title">
              <Input
                placeholder="e.g. More lab sessions added for DBMS"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                autoFocus
              />
            </Field>
            <Field label="Details">
              <Textarea
                rows={4}
                placeholder="What changed, and what feedback prompted it?"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                required
              />
            </Field>
            <Field label="Department" hint="Leave blank to show this college-wide.">
              <Input placeholder="e.g. CSE" value={department} onChange={(e) => setDepartment(e.target.value)} />
            </Field>
            {department && (
              <Field
                label="Course (optional)"
                hint="Link this to the specific course it addresses, so the recurring-issue tracker knows this theme got a response."
              >
                <Select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
                  <option value="">— Not course-specific —</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </Select>
              </Field>
            )}
            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Posting…" : "Post update"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
