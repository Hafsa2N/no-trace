import { ImageResponse } from "next/og";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#FDF4EC",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            width: 96,
            height: 96,
            borderRadius: 24,
            background: "#E8481F",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 36,
            boxShadow: "0 20px 40px rgba(232,72,31,0.3)",
          }}
        >
          <svg width="52" height="52" viewBox="0 0 64 64" fill="none">
            <path
              d="M32 12l16 6v11c0 11-7 18.5-16 22.5C23 47.5 16 40 16 29V18l16-6z"
              stroke="#ffffff"
              strokeWidth="3.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
            <path d="M25 31.5l5 5 10-10.5" stroke="#ffffff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: "#241A2E", letterSpacing: -1, textTransform: "uppercase" }}>
          No Trace
        </div>
        <div style={{ display: "flex", fontSize: 28, color: "#6E5C55", marginTop: 16 }}>
          Feedback students actually trust enough to be honest in.
        </div>
      </div>
    ),
    { ...size }
  );
}
