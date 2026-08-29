import { ReactNode } from "react";
import { Card, CardBody } from "@/components/ui/Card";

/**
 * Reserved for the empty states that matter most (a brand-new admin's
 * first view of a main list) — not every "no results" moment. A large
 * illustration on every minor empty spot (search-no-match, an empty
 * sub-list inside a detail page) would be noise, not polish; those stay
 * as a plain line of muted text.
 */
export function EmptyState({
  illustration,
  title,
  description,
  action,
}: {
  illustration: ReactNode;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <Card>
      <CardBody className="flex flex-col items-center gap-3 py-14 text-center">
        <div className="h-36 w-36">{illustration}</div>
        <p className="font-medium">{title}</p>
        <p className="max-w-xs text-sm text-muted">{description}</p>
        {action}
      </CardBody>
    </Card>
  );
}
