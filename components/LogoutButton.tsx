"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { csrfHeaders } from "@/lib/csrf-client";

export function LogoutButton() {
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST", headers: csrfHeaders() });
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={logout}
      className="inline-flex items-center gap-1.5 text-sm text-muted transition-colors hover:text-danger"
    >
      <LogOut className="h-3.5 w-3.5" />
      Log out
    </button>
  );
}
