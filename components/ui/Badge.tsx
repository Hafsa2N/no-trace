import { HTMLAttributes } from "react";

type Tone = "neutral" | "success" | "warning" | "primary" | "danger";

const tones: Record<Tone, string> = {
  neutral: "bg-border/40 text-foreground",
  success: "bg-accent-light text-accent",
  warning: "bg-warning-light text-warning",
  primary: "bg-primary-light text-primary",
  danger: "bg-danger-light text-danger",
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
