import { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "primary";

const tones: Record<Tone, string> = {
  neutral: "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-300",
  success: "bg-accent-light text-accent",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
  primary: "bg-primary-light text-primary",
};

export function Badge({
  tone = "neutral",
  className = "",
  ...props
}: HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${tones[tone]} ${className}`}
      {...props}
    />
  );
}
