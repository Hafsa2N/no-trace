import { Megaphone } from "lucide-react";
import { PublicHeader } from "@/components/PublicHeader";
import { Card, CardBody } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { sql } from "@/lib/db";

// Must reflect newly-posted updates immediately — without this, Next would
// statically prerender this page at build time (it reads no cookies) and
// freeze its content until the next deploy.
export const dynamic = "force-dynamic";

export default async function UpdatesPage() {
  const updates = await sql`
    select title, body, department, created_at from updates order by created_at desc
  `;

  return (
    <div className="flex flex-1 flex-col">
      <PublicHeader />

      <div className="mx-auto w-full max-w-2xl px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight">What changed because of feedback</h1>
        <p className="mt-3 text-muted">
          Feedback that goes nowhere is why people stop giving it. Here&apos;s what&apos;s actually
          changed as a result of what students said.
        </p>

        {updates.length === 0 ? (
          <Card className="mt-10">
            <CardBody className="flex flex-col items-center gap-2 py-16 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary-light text-primary">
                <Megaphone className="h-5 w-5" />
              </span>
              <p className="font-medium">Nothing posted yet</p>
              <p className="max-w-xs text-sm text-muted">
                Once feedback leads to a change, it&apos;ll show up here.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="mt-10 space-y-4">
            {updates.map((u, i) => (
              <Card key={i}>
                <CardBody>
                  <div className="mb-1.5 flex items-center gap-2">
                    <h2 className="font-medium">{u.title}</h2>
                    {u.department && <Badge tone="primary">{u.department}</Badge>}
                  </div>
                  <p className="text-sm text-muted">{u.body}</p>
                  <p className="mt-2 text-xs text-muted">
                    {new Date(u.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </CardBody>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
