import { Check } from "lucide-react";

export function StepIndicator({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-center">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "upcoming";
        return (
          <div key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex flex-col items-center gap-1.5">
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors ${
                  state === "done"
                    ? "bg-accent text-white"
                    : state === "active"
                      ? "bg-primary text-white"
                      : "bg-slate-100 text-muted dark:bg-white/5"
                }`}
              >
                {state === "done" ? <Check className="h-3.5 w-3.5" /> : i + 1}
              </span>
              <span
                className={`text-xs ${state === "upcoming" ? "text-muted" : "font-medium text-foreground"}`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`mx-2 mb-5 h-px flex-1 ${i < current ? "bg-accent" : "bg-border"}`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
