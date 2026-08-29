import { Card } from "@/components/ui/Card";

type DepartmentRow = { department: string; sessions: number; responseRate: number | null; tooFewEligible?: boolean };

// Magnitude comparison across departments — sequential encoding (one hue,
// bar length = value), per the "compare magnitude, low to high" rule.
// Never a chart forced onto one row of data: with a single department this
// still just reads as one accurate row, not a fabricated bar chart.
export function DepartmentTable({ departments, className = "" }: { departments: DepartmentRow[]; className?: string }) {
  return (
    <Card className={`overflow-hidden ${className}`}>
      <div className="border-b border-border px-4 py-2.5 text-xs font-medium text-muted">By department</div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted">
              <th scope="col" className="px-4 py-2 font-medium">
                Department
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Sessions
              </th>
              <th scope="col" className="px-4 py-2 font-medium">
                Response rate
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {departments.map((d) => (
              <tr key={d.department} className="transition-colors hover:bg-background">
                <td className="px-4 py-3 font-medium text-foreground">{d.department}</td>
                <td className="px-4 py-3 tabular-nums text-muted">{d.sessions}</td>
                <td className="px-4 py-3">
                  {d.responseRate === null ? (
                    <span className="text-muted" title={d.tooFewEligible ? "Too few eligible students to show a rate without risking re-identification" : undefined}>
                      {d.tooFewEligible ? "Not enough data" : "—"}
                    </span>
                  ) : (
                    <div className="flex items-center gap-2.5">
                      <div
                        className="h-1.5 w-24 overflow-hidden rounded-full bg-border"
                        role="img"
                        aria-label={`${d.responseRate}% response rate`}
                      >
                        <div className="h-full rounded-full bg-primary" style={{ width: `${d.responseRate}%` }} />
                      </div>
                      <span className="tabular-nums text-foreground">{d.responseRate}%</span>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
