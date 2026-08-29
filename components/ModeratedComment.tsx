"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff, RotateCw } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export function ModeratedComment({ id, text }: { id: string; text: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [hiding, setHiding] = useState(false);

  async function hide() {
    setHiding(true);
    await fetch(`/api/responses/${id}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: true }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="text-sm">
        <div className="flex items-start justify-between gap-3">
          <span>{text}</span>
          <button
            onClick={() => setConfirming(true)}
            disabled={hiding || confirming}
            title="Hide this comment"
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:opacity-50"
          >
            {hiding ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <EyeOff className="h-3.5 w-3.5" />}
          </button>
        </div>
        {confirming && (
          <div className="animate-step-in mt-2.5 flex items-center gap-3 border-t border-border pt-2.5">
            <span className="text-xs text-muted">Hide this comment? Its rating still counts — only the text is hidden.</span>
            <button type="button" onClick={hide} className="shrink-0 text-xs font-medium text-danger hover:underline">
              Yes, hide
            </button>
            <button type="button" onClick={() => setConfirming(false)} className="shrink-0 text-xs text-muted hover:text-foreground">
              Cancel
            </button>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
