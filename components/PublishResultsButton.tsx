"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { csrfHeaders } from "@/lib/csrf-client";

export function PublishResultsButton({ offeringId, published }: { offeringId: string; published: boolean }) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function toggle() {
    setSubmitting(true);
    setError("");
    const res = await fetch(`/api/offerings/${offeringId}/publish`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ published: !published }),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) {
      setError(data.error ?? "Could not update");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" variant={published ? "secondary" : "primary"} size="sm" onClick={toggle} disabled={submitting}>
        {published ? (
          <>
            <Undo2 className="h-3.5 w-3.5" />
            {submitting ? "Unsharing…" : "Unshare report"}
          </>
        ) : (
          <>
            <Send className="h-3.5 w-3.5" />
            {submitting ? "Sharing…" : "Share report with faculty"}
          </>
        )}
      </Button>
      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
