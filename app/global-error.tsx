"use client";

import { useEffect } from "react";

// Only catches errors thrown by the root layout itself (a rare case distinct
// from app/error.tsx, which handles everything else) — this replaces the
// entire document, so it renders its own <html>/<body> and avoids depending
// on anything the root layout would otherwise provide.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "0.75rem",
          fontFamily: "system-ui, sans-serif",
          background: "#faf9f6",
          color: "#1a1a1a",
          textAlign: "center",
          padding: "2rem",
        }}
      >
        <h1 style={{ fontSize: "1.5rem", fontWeight: 600, margin: 0 }}>Something went wrong</h1>
        <p style={{ maxWidth: "24rem", color: "#666", margin: 0 }}>
          Nothing here was saved and nothing was traced. Try reloading — if it keeps happening, come back later.
        </p>
        <button
          onClick={reset}
          style={{
            marginTop: "0.5rem",
            padding: "0.5rem 1.25rem",
            borderRadius: "0.5rem",
            border: "none",
            background: "#ff4b33",
            color: "#fff",
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Try again
        </button>
      </body>
    </html>
  );
}
