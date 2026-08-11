"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { EyeOff } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";

export function ModeratedComment({ id, text }: { id: string; text: string }) {
  const router = useRouter();
  const [hiding, setHiding] = useState(false);

  async function hide() {
    if (!confirm("Hide this comment from all views? Its rating still counts — only the text is hidden.")) return;
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
      <CardBody className="flex items-start justify-between gap-3 text-sm">
        <span>{text}</span>
        <button
          onClick={hide}
          disabled={hiding}
          title="Hide this comment"
          className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:opacity-50"
        >
          <EyeOff className="h-3.5 w-3.5" />
        </button>
      </CardBody>
    </Card>
  );
}
