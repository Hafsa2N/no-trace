import type { Metadata, Viewport } from "next";
import { Big_Shoulders, Archivo, IBM_Plex_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

// The same three-face system as the public homepage, loaded once here so
// every page in the app (not just "/") shares the theme — a characterful
// display face for headings, a civic-adjacent grotesk for body text, and
// a monospace for data/IDs, instead of the generic Geist default.
const bigShoulders = Big_Shoulders({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["700", "900"],
});

const archivo = Archivo({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono-nt",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "https://anon-feedback-iota.vercel.app"),
  title: {
    default: "No Trace",
    template: "%s · No Trace",
  },
  description: "Feedback students actually trust enough to be honest in — verified students, genuinely anonymous responses.",
  openGraph: {
    title: "No Trace",
    description: "Feedback students actually trust enough to be honest in.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#ff4b33",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bigShoulders.variable} ${archivo.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
      </body>
    </html>
  );
}
