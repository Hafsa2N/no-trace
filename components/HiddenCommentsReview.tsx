"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronRight, RotateCw, Eye } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

function UnhideRow({ id, text }: { id: string; text: string }) {
  const router = useRouter();
  const [unhiding, setUnhiding] = useState(false);

  async function unhide() {
    setUnhiding(true);
    await fetch(`/api/responses/${id}/moderate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ hidden: false }),
    });
    router.refresh();
  }

  return (
    <Card>
      <CardBody className="text-sm">
        <div className="flex items-start justify-between gap-3">
          <span className="text-muted">{text}</span>
          <button
            onClick={unhide}
            disabled={unhiding}
            title="Unhide this comment"
            className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-accent-light hover:text-accent disabled:opacity-50"
          >
            {unhiding ? <RotateCw className="h-3.5 w-3.5 animate-spin" /> : <Eye className="h-3.5 w-3.5" />}
          </button>
        </div>
      </CardBody>
    </Card>
  );
}

export function HiddenCommentsReview({ records }: { records: { id: string; text: string }[] }) {
  const [open, setOpen] = useState(false);

  if (records.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-muted hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        {records.length} hidden by staff
      </button>
      {open && (
        <div className="animate-step-in mt-2 space-y-2">
          {records.map((r) => (
            <UnhideRow key={r.id} id={r.id} text={r.text} />
          ))}
        </div>
      )}
    </div>
  );
}
