import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Nothing behind these paths is meant to be indexed — admin tools,
        // a student's one-time session link, and account-recovery flows
        // are all either private or dead ends for a crawler.
        disallow: ["/admin/", "/session/", "/setup", "/my-data"],
      },
    ],
    sitemap: `${process.env.NEXT_PUBLIC_BASE_URL ?? "https://anon-feedback-iota.vercel.app"}/sitemap.xml`,
  };
}
