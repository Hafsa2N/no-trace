"use client";

import { Fragment, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, UserPen, KeyRound, BarChart3, UserX, UserCheck } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { csrfHeaders } from "@/lib/csrf-client";

type StaffRow = { id: string; email: string; name: string | null; role: "admin" | "faculty"; is_active: boolean; created_at: string };

export function StaffListClient({ staff, currentUserId }: { staff: StaffRow[]; currentUserId: string }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowError, setRowError] = useState<{ id: string; message: string } | null>(null);
  const [resetTargetId, setResetTargetId] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetDone, setResetDone] = useState<string | null>(null);
  const [nameTargetId, setNameTargetId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const filtered = staff.filter(
    (s) => s.email.toLowerCase().includes(query.trim().toLowerCase()) || (s.name ?? "").toLowerCase().includes(query.trim().toLowerCase())
  );

  function openNameEdit(s: StaffRow) {
    setNameTargetId(s.id);
    setNameDraft(s.name ?? "");
    setRowError(null);
  }

  async function submitName(id: string) {
    setBusyId(id);
    setRowError(null);
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ name: nameDraft }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setRowError({ id, message: data.error ?? "Could not update name" });
      return;
    }
    setNameTargetId(null);
    router.refresh();
  }

  async function toggleActive(id: string, active: boolean) {
    setBusyId(id);
    setRowError(null);
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ active }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setRowError({ id, message: data.error ?? "Could not update this account" });
      return;
    }
    router.refresh();
  }

  function openReset(id: string) {
    setResetTargetId(id);
    setNewPassword("");
    setRowError(null);
    setResetDone(null);
  }

  async function submitReset(id: string) {
    if (newPassword.length < 8) {
      setRowError({ id, message: "New password must be at least 8 characters" });
      return;
    }
    setBusyId(id);
    setRowError(null);
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...csrfHeaders() },
      body: JSON.stringify({ newPassword }),
    });
    const data = await res.json();
    setBusyId(null);
    if (!res.ok) {
      setRowError({ id, message: data.error ?? "Could not reset password" });
      return;
    }
    setResetTargetId(null);
    setNewPassword("");
    setResetDone(id);
  }

  return (
    <div>
      {staff.length > 5 && (
        <div className="relative mb-3">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by email…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
        </div>
      )}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted">No staff match &quot;{query}&quot;.</p>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted">
                <th scope="col" className="px-4 py-2 font-medium">
                  Email
                </th>
                <th scope="col" className="px-4 py-2 font-medium">
                  Role
                </th>
                <th scope="col" className="hidden px-4 py-2 font-medium sm:table-cell">
                  Added
                </th>
                <th scope="col" className="px-4 py-2 text-right font-medium">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <Fragment key={s.id}>
                  <tr className="transition-colors hover:bg-background">
                    <td className="px-4 py-3">
                      <p className={`font-medium ${!s.is_active ? "text-muted line-through" : "text-foreground"}`}>
                        {s.name || s.email}
                        {s.id === currentUserId && <span className="ml-1.5 font-normal text-muted">(you)</span>}
                      </p>
                      {s.name && <p className="text-xs text-muted">{s.email}</p>}
                      {rowError?.id === s.id && <p className="mt-0.5 text-xs text-danger">{rowError.message}</p>}
                      {resetDone === s.id && (
                        <p className="mt-0.5 text-xs text-accent">Password reset — share the new one with them directly.</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge tone={s.role === "admin" ? "primary" : "neutral"}>
                          {s.role === "admin" ? "Admin" : "Faculty"}
                        </Badge>
                        {!s.is_active && <Badge tone="neutral">Deactivated</Badge>}
                      </div>
                    </td>
                    <td className="hidden px-4 py-3 text-muted sm:table-cell">{new Date(s.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {s.role === "faculty" && (
                          <Link
                            href={`/admin/staff/${s.id}/analysis`}
                            title="View analysis"
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-primary-light hover:text-primary"
                          >
                            <BarChart3 className="h-4 w-4" />
                          </Link>
                        )}
                        <button
                          type="button"
                          onClick={() => (nameTargetId === s.id ? setNameTargetId(null) : openNameEdit(s))}
                          title={s.name ? "Edit name" : "Add name"}
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-primary-light hover:text-primary"
                        >
                          <UserPen className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => (resetTargetId === s.id ? setResetTargetId(null) : openReset(s.id))}
                          title="Reset password"
                          className="rounded-md p-1.5 text-muted transition-colors hover:bg-primary-light hover:text-primary"
                        >
                          <KeyRound className="h-4 w-4" />
                        </button>
                        {s.id !== currentUserId && (
                          <button
                            type="button"
                            onClick={() => toggleActive(s.id, !s.is_active)}
                            disabled={busyId === s.id}
                            title={s.is_active ? "Deactivate" : "Reactivate"}
                            className="rounded-md p-1.5 text-muted transition-colors hover:bg-danger-light hover:text-danger disabled:opacity-50"
                          >
                            {s.is_active ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  {nameTargetId === s.id && (
                    <tr className="bg-background">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="e.g. Dr. Priya Rao"
                            value={nameDraft}
                            onChange={(e) => setNameDraft(e.target.value)}
                            className="max-w-xs"
                            autoFocus
                          />
                          <Button type="button" size="sm" onClick={() => submitName(s.id)} disabled={busyId === s.id}>
                            {busyId === s.id ? "Saving…" : "Save"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                  {resetTargetId === s.id && (
                    <tr className="bg-background">
                      <td colSpan={4} className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            placeholder="New temporary password"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="max-w-xs"
                            autoFocus
                          />
                          <Button type="button" size="sm" onClick={() => submitReset(s.id)} disabled={busyId === s.id}>
                            {busyId === s.id ? "Setting…" : "Set password"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              ))}
            </tbody>
          </table>
          </div>
        </Card>
      )}
    </div>
  );
}
