"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Trash2, CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { QUESTION_TEMPLATES, COMMENT_QUESTION, CONSTRUCT_TEMPLATES, slugifyQuestionId, type SessionQuestion } from "@/lib/questionTemplates";
import { csrfHeaders } from "@/lib/csrf-client";

type Staff = { id: string; email: string; name: string | null; role: "admin" | "faculty" };
type Term = { id: string; name: string; starts_at: string; ends_at: string };
type OfferingRow = { subject: string; assignedFaculty: string };
type RosterClass = { department: string; year: number; section: string; count: number };

const NEW_TERM = "__new__";

export default function NewSessionPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const duplicateFrom = searchParams.get("from");
  const [prefilled, setPrefilled] = useState(false);
  const [department, setDepartment] = useState("");
  const [year, setYear] = useState(1);
  const [section, setSection] = useState("");
  const [opensAt, setOpensAt] = useState("");
  // 60, not a token 10 — a short default is a trap: setup (creating staff,
  // uploading a roster, building the session) routinely takes longer than
  // 10 minutes on its own, so a demo or first real session can silently
  // expire before anyone gets to actually open the link.
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [rosterClasses, setRosterClasses] = useState<RosterClass[]>([]);

  const [offerings, setOfferings] = useState<OfferingRow[]>([{ subject: "", assignedFaculty: "" }]);

  const [terms, setTerms] = useState<Term[]>([]);
  const [termSelection, setTermSelection] = useState("");
  const [newTermName, setNewTermName] = useState("");
  const [newTermStarts, setNewTermStarts] = useState("");
  const [newTermEnds, setNewTermEnds] = useState("");

  // The rubric an admin actually builds for this session — starts from the
  // suggested defaults, but every entry here is editable, removable, and
  // reorderable-by-addition, and admins can mix in fully custom rating,
  // multiple-choice, or the one free-text question.
  const [questions, setQuestions] = useState<SessionQuestion[]>(() => [
    ...QUESTION_TEMPLATES.filter((q) => q.defaultOn).map((q) => ({ id: q.id, type: "rating" as const, label: q.label })),
    COMMENT_QUESTION,
  ]);
  const [newQuestionLabel, setNewQuestionLabel] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<"rating" | "mcq" | "text">("rating");
  const [newQuestionOptions, setNewQuestionOptions] = useState("");

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  // Generated once per mount of this form, not per submit attempt — a
  // double-click or a retried request during the same attempt reuses this
  // key so the server can recognize and collapse the duplicate (Idempotency-
  // Key header, checked in app/api/sessions/route.ts).
  const [idempotencyKey] = useState(() => crypto.randomUUID());

  const suggestedRemaining = QUESTION_TEMPLATES.filter((t) => !questions.some((q) => q.id === t.id));
  const hasTextQuestion = questions.some((q) => q.type === "text");
  const constructsInUse = Array.from(new Set(questions.map((q) => q.construct).filter((c): c is string => !!c)));
  const constructsRemaining = CONSTRUCT_TEMPLATES.filter((t) => !constructsInUse.includes(t.name));

  function addSuggested(template: (typeof QUESTION_TEMPLATES)[number]) {
    setQuestions((qs) => [...qs, { id: template.id, type: "rating", label: template.label }]);
  }

  function removeQuestion(id: string) {
    setQuestions((qs) => qs.filter((q) => q.id !== id));
  }

  function updateQuestionLabel(id: string, label: string) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, label } : q)));
  }

  function updateQuestionOptions(id: string, optionsText: string) {
    const options = optionsText
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean);
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, options } : q)));
  }

  function updateQuestionConstruct(id: string, construct: string) {
    setQuestions((qs) => qs.map((q) => (q.id === id ? { ...q, construct: construct.trim() || undefined } : q)));
  }

  // Drops in a ready-made 3-question battery instead of one blunt
  // question — averaging differently-worded items on the same dimension
  // cancels out single-question noise (see lib/questionTemplates.ts).
  // Removes the equivalent single suggested question first, if present,
  // so an admin doesn't end up with both "Clarity" the construct and
  // "clarity" the flat question asking a near-duplicate thing.
  function addConstruct(template: (typeof CONSTRUCT_TEMPLATES)[number]) {
    const singleId = template.name.toLowerCase();
    setQuestions((qs) => [
      ...qs.filter((q) => q.id !== singleId),
      ...template.questions.map((q) => ({ id: q.id, type: "rating" as const, label: q.label, construct: template.name })),
    ]);
  }

  function addCustomQuestion() {
    const label = newQuestionLabel.trim();
    if (!label) return;
    const id = slugifyQuestionId(
      label,
      questions.map((q) => q.id)
    );
    if (newQuestionType === "mcq") {
      const options = newQuestionOptions
        .split(",")
        .map((o) => o.trim())
        .filter(Boolean);
      if (options.length < 2) {
        setError("A multiple-choice question needs at least 2 options, separated by commas.");
        return;
      }
      setQuestions((qs) => [...qs, { id, type: "mcq", label, options }]);
    } else if (newQuestionType === "text") {
      setQuestions((qs) => [...qs, { id, type: "text", label }]);
    } else {
      setQuestions((qs) => [...qs, { id, type: "rating", label }]);
    }
    setError("");
    setNewQuestionLabel("");
    setNewQuestionOptions("");
  }

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
    fetch("/api/students/classes")
      .then((r) => r.json())
      .then((data) => setRosterClasses(data.classes ?? []))
      .catch(() => {});
  }, []);

  // Live match against the roster as the class fields are filled in —
  // this is what would have caught the exact mistake that blocked a real
  // demo: a session created for the wrong year, with no signal until a
  // student tried it and failed. Matching is case/whitespace-insensitive
  // since "CSE" vs "cse " shouldn't silently read as zero matches.
  const normalize = (s: string) => s.trim().toLowerCase();
  const eligibleMatch = useMemo(() => {
    if (!department.trim() || !section.trim()) return null;
    return rosterClasses.find(
      (c) => normalize(c.department) === normalize(department) && c.year === year && normalize(c.section) === normalize(section)
    );
  }, [rosterClasses, department, year, section]);

  const departmentOptions = useMemo(
    () => Array.from(new Set(rosterClasses.map((c) => c.department))),
    [rosterClasses]
  );

  // "Duplicate for a new term": prefills the class + subjects/faculty from
  // an existing session. Deliberately does NOT copy opens_at/closes_at or
  // term — those must always be set fresh, not silently carried over.
  useEffect(() => {
    if (!duplicateFrom) return;
    fetch(`/api/sessions/${duplicateFrom}/prefill`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) return;
        setDepartment(data.department ?? "");
        setYear(data.year ?? 1);
        setSection(data.section ?? "");
        if (Array.isArray(data.offerings) && data.offerings.length > 0) {
          setOfferings(data.offerings);
        }
        setPrefilled(true);
      })
      .catch(() => {});
  }, [duplicateFrom]);

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
    const ratedQuestions = questions.filter((q) => q.type === "rating" || q.type === "mcq");
    if (ratedQuestions.length === 0) {
      setError("Add at least one rating or multiple-choice question for students to answer.");
      return;
    }
    if (questions.some((q) => !q.label.trim())) {
      setError("Every question needs a label — remove or fill in the empty one.");
      return;
    }
    if (questions.some((q) => q.type === "mcq" && (!q.options || q.options.length < 2))) {
      setError("Every multiple-choice question needs at least 2 options.");
      return;
    }
    setError("");
    setSubmitting(true);
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey, ...csrfHeaders() },
      body: JSON.stringify({
        department,
        year,
        section,
        opensAt: new Date(opensAt).toISOString(),
        durationMinutes,
        questions,
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
      <h1 className="font-display text-3xl font-black uppercase tracking-tight">New feedback session</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">
        One QR code for the whole class — students verify once and rate every subject below in
        one sitting.
      </p>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            {prefilled && (
              <Alert tone="info">
                Class and subjects copied from the previous session — set a new opening time,
                duration, and term below.
              </Alert>
            )}
            <Field label="Department">
              <Input
                placeholder="e.g. CSE"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                list="department-options"
                required
                autoFocus
              />
              <datalist id="department-options">
                {departmentOptions.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Year">
                <Input type="number" value={year} onChange={(e) => setYear(Number(e.target.value))} required />
              </Field>
              <Field label="Section">
                <Input placeholder="e.g. A" value={section} onChange={(e) => setSection(e.target.value)} required />
              </Field>
            </div>
            {eligibleMatch && (
              <div className="flex items-center gap-2 rounded-lg border border-accent/20 bg-accent-light px-3.5 py-2.5 text-sm text-accent">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                {eligibleMatch.count} student{eligibleMatch.count === 1 ? "" : "s"} on the roster match this
                class.
              </div>
            )}
            {eligibleMatch === undefined && department.trim() && section.trim() && rosterClasses.length > 0 && (
              <div className="flex items-start gap-2 rounded-lg border border-danger/20 bg-danger-light px-3.5 py-2.5 text-sm text-danger">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  No students on the roster match {department}, Year {year}, Section {section}. Double-check
                  these against the uploaded roster before continuing — this exact mismatch is what silently
                  breaks a session for every student.
                </span>
              </div>
            )}
            <Field label="Opens at">
              <Input type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} required />
            </Field>
            <Field
              label="Duration (minutes)"
              hint="How long the form stays open. Include setup time in your estimate — a session that closes before you've finished sharing the link is a common mistake."
            >
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
              <p className="font-display text-lg font-black uppercase tracking-tight">Feedback questions</p>
              <p className="mb-3 text-xs text-muted">
                Every subject uses the same rubric in one sitting — a lab-heavy course and a pure
                theory course don&apos;t need the same questions, so pick from a vetted library
                below, drop in a multi-item battery for a steadier read, or write your own.
              </p>
              <p className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">
                Currently asking ({questions.length})
              </p>
              <div className="space-y-2 rounded-lg border border-border p-3">
                {questions.map((q) => (
                  <div key={q.id} className="rounded-md border border-border bg-surface p-2.5">
                    <div className="flex items-start gap-2">
                      <Badge tone={q.type === "text" ? "neutral" : q.type === "mcq" ? "primary" : "success"} className="mt-0.5 shrink-0">
                        {q.type === "rating" ? "Rating" : q.type === "mcq" ? "Multiple choice" : "Free text"}
                      </Badge>
                      <Input
                        value={q.label}
                        onChange={(e) => updateQuestionLabel(q.id, e.target.value)}
                        className="flex-1 py-1.5 text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => removeQuestion(q.id)}
                        className="rounded p-1.5 text-muted transition-colors hover:bg-danger-light hover:text-danger"
                        aria-label={`Remove question: ${q.label}`}
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {q.type === "mcq" && (
                      <div className="mt-2 pl-[4.5rem]">
                        <Input
                          value={(q.options ?? []).join(", ")}
                          onChange={(e) => updateQuestionOptions(q.id, e.target.value)}
                          placeholder="Option A, Option B, Option C"
                          className="py-1 text-xs"
                        />
                      </div>
                    )}
                    {q.type === "rating" && (
                      <div className="mt-2 flex items-center gap-1.5 pl-[4.5rem]">
                        <span className="shrink-0 text-xs text-muted">Group with:</span>
                        <Input
                          value={q.construct ?? ""}
                          onChange={(e) => updateQuestionConstruct(q.id, e.target.value)}
                          placeholder="optional — e.g. Clarity"
                          list="construct-names"
                          className="py-1 text-xs"
                        />
                      </div>
                    )}
                  </div>
                ))}
                {questions.length === 0 && <p className="py-2 text-center text-xs text-muted">No questions yet — add one below.</p>}
                <datalist id="construct-names">
                  {constructsInUse.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              </div>

              {(suggestedRemaining.length > 0 || constructsRemaining.length > 0) && (
                <div className="mt-4 rounded-lg border border-border">
                  <div className="border-b border-border px-3.5 py-2.5">
                    <p className="text-sm font-medium">Question library</p>
                    <p className="text-xs text-muted">Vetted angles other feedback instruments use — add any that fit this course.</p>
                  </div>
                  <div className="space-y-3 p-3.5">
                    {suggestedRemaining.length > 0 && (
                      <div className="grid gap-1.5 sm:grid-cols-2">
                        {suggestedRemaining.map((t) => (
                          <button
                            key={t.id}
                            type="button"
                            onClick={() => addSuggested(t)}
                            className="flex items-start gap-2 rounded-md border border-border bg-surface px-3 py-2 text-left text-xs transition-colors hover:border-primary/30 hover:bg-primary-light"
                          >
                            <Plus className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
                            <span className="text-foreground">{t.label}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    {constructsRemaining.length > 0 && (
                      <div className="rounded-md bg-primary-light/40 p-3">
                        <p className="mb-2 text-xs text-foreground">
                          <strong className="font-medium">Want a steadier read on one dimension?</strong> Ask it 3
                          ways instead of 1 — averaging differently-worded questions cancels out
                          single-question noise, the same approach validated instruments like SEEQ use.
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {constructsRemaining.map((t) => (
                            <button
                              key={t.name}
                              type="button"
                              onClick={() => addConstruct(t)}
                              className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-surface px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary-light"
                            >
                              <Plus className="h-3 w-3" />
                              &quot;{t.name}&quot; battery ({t.questions.length} questions)
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <p className="mb-1.5 mt-4 font-mono text-[11px] uppercase tracking-[0.06em] text-muted">Or write your own</p>
              <div className="flex items-end gap-2 rounded-lg border border-dashed border-border p-3">
                <div className="flex-1 space-y-2">
                  <Input
                    placeholder={
                      newQuestionType === "mcq"
                        ? "e.g. How often did you attend lab sessions?"
                        : newQuestionType === "text"
                          ? "e.g. What would you change about this course?"
                          : "Add a custom rating question…"
                    }
                    value={newQuestionLabel}
                    onChange={(e) => setNewQuestionLabel(e.target.value)}
                    className="py-1.5 text-sm"
                  />
                  {newQuestionType === "mcq" && (
                    <Input
                      placeholder="Options, separated by commas"
                      value={newQuestionOptions}
                      onChange={(e) => setNewQuestionOptions(e.target.value)}
                      className="py-1 text-xs"
                    />
                  )}
                </div>
                <Select
                  value={newQuestionType}
                  onChange={(e) => setNewQuestionType(e.target.value as "rating" | "mcq" | "text")}
                  className="w-36 py-1.5 text-sm"
                >
                  <option value="rating">Rating</option>
                  <option value="mcq">Multiple choice</option>
                  <option value="text">Free text</option>
                </Select>
                <Button type="button" size="sm" variant="secondary" onClick={addCustomQuestion}>
                  <Plus className="h-3.5 w-3.5" />
                  Add
                </Button>
              </div>
              {!hasTextQuestion && (
                <button
                  type="button"
                  onClick={() => setQuestions((qs) => [...qs, COMMENT_QUESTION])}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary"
                >
                  <Plus className="h-3 w-3" />
                  Add back the free-text question
                </button>
              )}
            </div>

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
                              {f.name ? `${f.name} (${f.email})` : f.email}
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
