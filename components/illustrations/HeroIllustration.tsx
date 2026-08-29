export function HeroIllustration() {
  return (
    <svg viewBox="0 0 480 480" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <defs>
        <linearGradient id="hero-shield" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary-hover)" />
        </linearGradient>
        <radialGradient id="hero-bg" cx="50%" cy="35%" r="65%">
          <stop offset="0%" stopColor="var(--primary-light)" />
          <stop offset="100%" stopColor="var(--primary-light)" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="240" cy="230" r="200" fill="url(#hero-bg)" />
      <circle cx="240" cy="230" r="150" fill="none" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="3 7" />

      {/* Connector lines from the badges to the shield */}
      <path d="M240 230L120 130" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M240 230L360 140" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 5" />
      <path d="M240 230L150 350" stroke="var(--border)" strokeWidth="1.5" strokeDasharray="4 5" />

      {/* Central shield-check card */}
      <g transform="translate(240 230)">
        <rect x="-72" y="-72" width="144" height="144" rx="34" fill="url(#hero-shield)" />
        <path
          d="M0 -34l44 16v30c0 30-19 50-44 60-25-10-44-30-44-60v-30z"
          fill="none"
          stroke="#ffffff"
          strokeWidth="6"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        <path d="M-18 2l14 14 28-30" fill="none" stroke="#ffffff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      </g>

      {/* Badge: verified student */}
      <g transform="translate(120 130)">
        <circle r="34" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <path
          d="M-12 6a12 12 0 1 1 24 0"
          fill="none"
          stroke="var(--primary)"
          strokeWidth="3"
          strokeLinecap="round"
        />
        <circle cy="-8" r="7" fill="var(--primary)" />
      </g>

      {/* Badge: anonymity (eye-off) */}
      <g transform="translate(360 140)">
        <circle r="34" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <path
          d="M-14 -8c14-10 28-10 28 0M-16 4l8-6M16 4l-8-6M-4 8l1-8M4 8l-1-8"
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <path d="M-16 -14l32 28" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" />
      </g>

      {/* Badge: insight (bars) */}
      <g transform="translate(150 350)">
        <circle r="34" fill="var(--surface)" stroke="var(--border)" strokeWidth="2" />
        <rect x="-16" y="0" width="8" height="16" rx="2" fill="var(--primary)" />
        <rect x="-4" y="-8" width="8" height="24" rx="2" fill="var(--primary)" />
        <rect x="8" y="-14" width="8" height="30" rx="2" fill="var(--accent)" />
      </g>

      {/* Sparkle accents */}
      <path d="M400 300l3 7 7 3-7 3-3 7-3-7-7-3 7-3z" fill="var(--accent)" opacity="0.7" />
      <circle cx="90" cy="260" r="4" fill="var(--primary)" opacity="0.4" />
    </svg>
  );
}
