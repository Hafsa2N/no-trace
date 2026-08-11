export function RatingScale({
  value,
  onChange,
  max = 5,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  max?: number;
}) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          className={`flex h-11 w-11 items-center justify-center rounded-full border text-sm font-medium transition-colors ${
            value === n
              ? "border-primary bg-primary text-white shadow-sm shadow-primary/25"
              : "border-border bg-surface text-foreground hover:border-primary/40 hover:bg-primary-light"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
