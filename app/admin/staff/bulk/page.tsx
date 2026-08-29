"use client";

import { DragEvent, useState } from "react";
import Link from "next/link";
import { FileSpreadsheet, UploadCloud, ArrowLeft } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { CopyButton } from "@/components/CopyButton";

type CreatedRow = { email: string; role: string; tempPassword: string };
type SkippedRow = { row: number; email: string; reason: string };

export default function BulkStaffUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [created, setCreated] = useState<CreatedRow[] | null>(null);
  const [skipped, setSkipped] = useState<SkippedRow[]>([]);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setCreated(null);
    setSkipped([]);
    if (!file) return;

    setSubmitting(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/staff/bulk", { method: "POST", body: form });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setCreated(data.created);
    setSkipped(data.skipped);
    setFile(null);
  }

  const allAsText = (created ?? [])
    .map((c) => `${c.email}\t${c.role}\t${c.tempPassword}`)
    .join("\n");

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <Link href="/admin/staff" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to staff
      </Link>
      <h1 className="font-display text-3xl font-black uppercase tracking-tight">Bulk-add staff accounts</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">
        Excel or CSV with columns:{" "}
        <code className="rounded bg-primary-light px-1 py-0.5 text-primary">email, role, name</code>. Role
        defaults to <code className="rounded bg-primary-light px-1 py-0.5 text-primary">faculty</code>{" "}
        if left blank — use <code className="rounded bg-primary-light px-1 py-0.5 text-primary">admin</code>{" "}
        for full-access accounts. Name is optional but shown instead of the email wherever results
        are attributed to someone. A random temporary password is generated for each new account —
        share it with them directly, since email delivery may not be configured yet.
      </p>

      <Card>
        <CardBody>
          <form onSubmit={onSubmit} className="space-y-4">
            <label
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-6 py-10 text-center transition-colors ${
                dragging ? "border-primary bg-primary-light" : "border-border hover:border-primary/40"
              }`}
            >
              {file ? (
                <>
                  <FileSpreadsheet className="h-8 w-8 text-primary" />
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB — click to change</p>
                </>
              ) : (
                <>
                  <UploadCloud className="h-8 w-8 text-muted" />
                  <p className="text-sm font-medium">Drop your file here, or click to browse</p>
                  <p className="text-xs text-muted">.xlsx, .xls, or .csv</p>
                </>
              )}
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>

            {error && <Alert tone="error">{error}</Alert>}

            <Button type="submit" className="w-full" disabled={!file || submitting}>
              {submitting ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </CardBody>
      </Card>

      {created && (
        <div className="mt-6 space-y-4">
          {created.length > 0 && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <h2 className="font-medium">{created.length} account{created.length === 1 ? "" : "s"} created</h2>
                <div className="flex items-center gap-1 text-xs text-muted">
                  Copy all
                  <CopyButton value={allAsText} />
                </div>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Role</th>
                      <th className="px-3 py-2 font-medium">Temporary password</th>
                      <th className="px-3 py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {created.map((c) => (
                      <tr key={c.email} className="border-t border-border">
                        <td className="px-3 py-2">{c.email}</td>
                        <td className="px-3 py-2">
                          <Badge tone={c.role === "admin" ? "primary" : "neutral"}>{c.role}</Badge>
                        </td>
                        <td className="px-3 py-2 font-mono">{c.tempPassword}</td>
                        <td className="px-3 py-2">
                          <CopyButton value={`${c.email}\t${c.tempPassword}`} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}

          {skipped.length > 0 && (
            <div>
              <h2 className="mb-2 font-medium">{skipped.length} row{skipped.length === 1 ? "" : "s"} skipped</h2>
              <div className="overflow-hidden rounded-lg border border-border">
                <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-surface text-left text-xs text-muted">
                    <tr>
                      <th className="px-3 py-2 font-medium">Row</th>
                      <th className="px-3 py-2 font-medium">Email</th>
                      <th className="px-3 py-2 font-medium">Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {skipped.map((s, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="px-3 py-2 text-muted">{s.row}</td>
                        <td className="px-3 py-2">{s.email || "—"}</td>
                        <td className="px-3 py-2 text-muted">{s.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
