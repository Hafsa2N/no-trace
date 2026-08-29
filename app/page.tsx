import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { HomePageContent } from "@/components/homepage/HomePageContent";

// Must be evaluated per-request, not baked in at build time — otherwise
// whichever admin count happens to exist during `next build` gets
// permanently frozen into the prerendered page.
export const dynamic = "force-dynamic";

export default async function Home() {
  // A fresh deployment has no admin yet — send whoever opens the site
  // straight to setup instead of the marketing page, so a new college
  // doesn't need to already know the /setup URL exists.
  const rows = await sql`select count(*) as count from admins`;
  if (Number(rows[0].count) === 0) redirect("/setup");

  return <HomePageContent />;
}
