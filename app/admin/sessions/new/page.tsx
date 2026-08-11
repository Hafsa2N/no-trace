"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

type Staff = { id: string; email: string; role: "admin" | "faculty" };
type Term = { id: string; name: string; starts_at: string; ends_at: string };
type OfferingRow = { subject: string; assignedFaculty: string };

const NEW_TERM = "__new__";

export default function NewSessionPage() {
  const router = useRouter();
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState(1);
  const [section, setSection] = useState("");
  const [opensAt, setOpensAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState(10);
  const [staff, setStaff] = useState<Staff[]>([]);

  const [offerings, setOfferings] = useState<OfferingRow[]>([{ subject: "", assignedFaculty: "" }]);

  const [terms, setTerms] = useState<Term[]>([]);
  const [termSelection, setTermSelection] = useState("");
  const [newTermName, setNewTermName] = useState("");
  const [newTermStarts, setNewTermStarts] = useState("");
  const [newTermEnds, setNewTermEnds] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/staff")
      .then((r) => r.json())
      .then((data) => setStaff(data.staff ?? []))
      .catch(() => {});
    fetch("/api/terms")
      .then((r) => r.json())
      .then((data) => {
        const list: Term[] = data.terms ?? [];
        setTerms(list);
        setTermSelection(list.length > 0 ? list[0].id : NEW_TERM);
      })
      .catch(() => setTermSelection(NEW_TERM));
  }, []);

  function updateOffering(index: number, patch: Partial<OfferingRow>) {
    setOfferings((rows) => rows.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }

  function addOffering() {
    setOfferings((rows) => [...rows, { subject: "", assignedFaculty: "" }]);
  }

  function removeOffering(index: number) {
    setOfferings((rows) => rows.filter((_, i) => i !== index));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        department,
        year,
        section,
        opensAt: new Date(opensAt).toISOString(),
        durationMinutes,
        offerings: offerings
          .filter((o) => o.subject.trim())
          .map((o) => ({ subject: o.subject.trim(), assignedFaculty: o.assignedFaculty || null })),
        ...(termSelection === NEW_TERM
          ? { termName: newTermName, termStartsAt: newTermStarts, termEndsAt: newTermEnds }
          : { termId: termSelection }),
      }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not create session");
      return;
    }
    router.push(`/admin/sessions/${data.session.id}`);
  }

  const facultyOptions = staff.filter((s) => s.role === "faculty");

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">New feedback session</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">
        One QR code for the whole class — students verify once and rate every subject below in
        one sitting.
      </p>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Department">
              <Input placeholder="e.g. CSE" value={department} onChange={(e) => setDepartment(e.target.value)} required autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year">
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
              </Field>
              <Field label="Section">
                <Input placeholder="e.g. A" value={section} onChange={(e) => setSection(e.target.value)} required />
              </Field>
            </div>
            <Field label="Opens at">
              <Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} required />
            </Field>
            <Field label="Duration (minutes)" hint="How long the form stays open for students.">
              <Input
                type="number"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                required
              />
            </Field>
            <Field
              label="Term"
              hint="Which academic term this belongs to — needed to compare feedback across semesters later."
            >
              <Select value={termSelection} onChange={(e) => setTermSelection(e.target.value)}>
                {terms.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
                <option value={NEW_TERM}>+ Add new term…</option>
              </Select>
            </Field>
            {termSelection === NEW_TERM && (
              <div className="space-y-4 rounded-lg border border-border bg-primary-light/40 p-4">
                <Field label="Term name">
                  <Input placeholder="e.g. Fall 2026" value={newTermName} onChange={(e) => setNewTermName(e.target.value)} required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Starts">
                    <Input type="date" value={newTermStarts} onChange={(e) => setNewTermStarts(e.target.value)} required />
                  </Field>
                  <Field label="Ends">
                    <Input type="date" value={newTermEnds} onChange={(e) => setNewTermEnds(e.target.value)} required />
                  </Field>
                </div>
              </div>
            )}

            <div>
              <p className="mb-1.5 block text-sm font-medium">Subjects taught to this class</p>
              <p className="mb-3 text-xs text-muted">
                Each subject appears as its own block in the combined form students fill out, and
                each stays scoped to the faculty assigned to it.
              </p>
              <div className="space-y-3">
                {offerings.map((offering, i) => (
                  <div key={i} className="flex items-end gap-2 rounded-lg border border-border p-3">
                    <div className="flex-1 space-y-3">
                      <Field label="Subject">
                        <Input
                          placeholder="e.g. DBMS"
                          value={offering.subject}
                          onChange={(e) => updateOffering(i, { subject: e.target.value })}
                        />
                      </Field>
                      <Field label="Faculty (optional)" hint="Only this account will see this subject's results.">
                        <Select
                          value={offering.assignedFaculty}
                          onChange={(e) => updateOffering(i, { assignedFaculty: e.target.value })}
                        >
                          <option value="">— None —</option>
                          {facultyOptions.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.email}
                            </option>
                          ))}
                        </Select>
                      </Field>
                    </div>
                    {offerings.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOffering(i)}
                        className="rounded-md p-2 text-muted transition-colors hover:bg-danger-light hover:text-danger"
                        aria-label="Remove subject"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <button
                type="button"
                onClick={addOffering}
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                Add another subject
              </button>
            </div>

            {error && <Alert tone="error">{error}</Alert>}
            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? "Creating…" : "Create session"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
