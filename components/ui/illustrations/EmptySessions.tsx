export function EmptySessionsIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <circle cx="80" cy="80" r="72" fill="var(--primary-light)" />

      {/* Card holding a QR-code-like grid, tilted slightly */}
      <g transform="rotate(-6 80 82)">
        <rect x="38" y="42" width="84" height="84" rx="12" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((col) => {
            const on = (row + col) % 2 === 0 || (row === 1 && col === 1);
            return (
              <rect
                key={`${row}-${col}`}
                x={54 + col * 20}
                y={58 + row * 20}
                width="14"
                height="14"
                rx="3"
                fill={on ? "var(--primary)" : "var(--primary-light)"}
              />
            );
          })
        )}
      </g>

      {/* "+" badge, upright, suggesting "create one" */}
      <circle cx="122" cy="112" r="17" fill="var(--accent)" />
      <path d="M122 105v14M115 112h14" stroke="var(--surface)" strokeWidth="3" strokeLinecap="round" />

      {/* Sparkle accents */}
      <path d="M34 108l2.5 6 6 2.5-6 2.5-2.5 6-2.5-6-6-2.5 6-2.5z" fill="var(--accent)" opacity="0.8" />
      <circle cx="128" cy="46" r="4" fill="var(--primary)" opacity="0.5" />
    </svg>
  );
}
