"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";

export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [deleting, setDeleting] = useState(false);

  async function confirmDelete() {
    setDeleting(true);
    setError("");
    const res = await fetch(`/api/sessions/${sessionId}`, { method: "DELETE" });
    const data = await res.json();
    setDeleting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not delete this session");
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-muted transition-colors hover:border-danger/40 hover:text-danger"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <span className="text-sm text-danger">Delete this session permanently?</span>
        <Button variant="danger" size="sm" onClick={confirmDelete} disabled={deleting}>
          {deleting ? "Deleting…" : "Yes, delete"}
        </Button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="text-sm text-muted hover:text-foreground"
        >
          Cancel
        </button>
      </div>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
