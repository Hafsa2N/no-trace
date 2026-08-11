"use client";

import { DragEvent, useState } from "react";
import { FileSpreadsheet, UploadCloud } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function RosterUploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [result, setResult] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function handleDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files?.[0];
    if (dropped) setFile(dropped);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setResult("");
    if (!file) return;

    setSubmitting(true);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/roster/upload", { method: "POST", body: form });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setResult(`Upserted ${data.upserted} of ${data.rowsProcessed} rows.`);
    setFile(null);
  }

  return (
    <div className="mx-auto max-w-lg px-6 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Upload student roster</h1>
      <p className="mt-1.5 mb-6 text-sm text-muted">
        Excel file with columns: <code className="rounded bg-primary-light px-1 py-0.5 text-primary">roll_number, name, department, year, section, email</code>.
        Existing rows with the same roll number are updated, not duplicated.
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
                  <p className="text-sm font-medium">Drop your .xlsx file here, or click to browse</p>
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
            {result && <Alert tone="success">{result}</Alert>}

            <Button type="submit" className="w-full" disabled={!file || submitting}>
              {submitting ? "Uploading…" : "Upload"}
            </Button>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
