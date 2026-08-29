export function RatingScale({
  value,
  onChange,
  max = 5,
  label,
}: {
  value: number | undefined;
  onChange: (value: number) => void;
  max?: number;
  /** Accessible name for the group — the question text, so a screen reader
      announces "rate clarity of teaching, 3 of 5" rather than just "3". */
  label?: string;
}) {
  return (
    <div className="flex items-center gap-2 sm:gap-2.5" role="group" aria-label={label}>
      {Array.from({ length: max }, (_, i) => i + 1).map((n) => (
        <button
          type="button"
          key={n}
          onClick={() => onChange(n)}
          aria-pressed={value === n}
          aria-label={`${n} of ${max}`}
          className={`font-display flex h-12 w-12 flex-1 items-center justify-center rounded-2xl border text-base font-black transition-all sm:h-14 sm:w-14 sm:flex-none ${
            value === n
              ? "scale-105 border-primary bg-primary text-white shadow-md shadow-primary/25"
              : "border-border bg-surface text-foreground hover:border-primary/40 hover:bg-primary-light active:scale-95"
          }`}
        >
          {n}
        </button>
      ))}
    </div>
  );
}
