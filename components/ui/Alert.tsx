import { ReactNode } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

type Tone = "success" | "error" | "info";

const config: Record<Tone, { className: string; icon: typeof CheckCircle2 }> = {
  success: { className: "bg-accent-light text-accent border-accent/20", icon: CheckCircle2 },
  error: { className: "bg-danger-light text-danger border-danger/20", icon: AlertCircle },
  info: { className: "bg-primary-light text-primary border-primary/20", icon: Info },
};

export function Alert({ tone, children }: { tone: Tone; children: ReactNode }) {
  const { className, icon: Icon } = config[tone];
  return (
    <div
      className={`flex items-start gap-2.5 rounded-lg border px-3.5 py-3 text-sm ${className}`}
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{children}</span>
    </div>
  );
}
