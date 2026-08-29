export function EmptyCoursesIllustration() {
  return (
    <svg viewBox="0 0 160 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <circle cx="80" cy="80" r="72" fill="var(--primary-light)" />

      {/* Back book, tilted */}
      <g transform="rotate(-8 60 88)">
        <rect x="38" y="60" width="52" height="66" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <rect x="38" y="60" width="10" height="66" rx="4" fill="var(--primary-light)" />
      </g>

      {/* Front book, upright */}
      <g>
        <rect x="70" y="50" width="56" height="72" rx="6" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <rect x="70" y="50" width="11" height="72" rx="4" fill="var(--primary)" />
        <path d="M92 74h24M92 86h24M92 98h16" stroke="var(--border)" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Upward trend line — the cross-term tracking this app is built for */}
      <path
        d="M42 40l14-10 12 6 16-14"
        stroke="var(--accent)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="84" cy="22" r="4" fill="var(--accent)" />

      <circle cx="126" cy="114" r="4" fill="var(--primary)" opacity="0.5" />
    </svg>
  );
}
