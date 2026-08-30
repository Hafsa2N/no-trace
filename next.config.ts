import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

// No nonce-based CSP here deliberately: nonces require every page to opt into
// dynamic rendering (no static optimization), which is a much larger change
// than this app's actual threat model calls for. 'unsafe-inline' on
// script-src is required even without third-party scripts — Next.js's App
// Router itself injects inline <script> tags carrying the RSC hydration
// payload, which a strict script-src silently breaks (confirmed: without it,
// the client throws "Invariant: Expected a request ID..." and never
// hydrates). 'unsafe-inline' on style-src is needed because several chart
// components (RatingsBreakdown, TrendLine, SentimentDonut,
// McqDistributionList, DepartmentTable) and the error boundaries set inline
// `style={{...}}` widths/colors directly.
// @vercel/analytics loads its script from an external CDN
// (va.vercel-scripts.com) only in local development; in production on
// Vercel it's served same-origin from /_vercel/insights/script.js, so this
// extra allowance is dev-only and doesn't loosen the deployed CSP.
const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval' https://va.vercel-scripts.com" : ""};
  style-src 'self' 'unsafe-inline';
  img-src 'self' data:;
  font-src 'self';
  connect-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
`
  .replace(/\s{2,}/g, " ")
  .trim();

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  // 2 years, subdomains included, eligible for browser preload lists — Vercel
  // already forces HTTPS at the edge, this makes the browser enforce it too.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
