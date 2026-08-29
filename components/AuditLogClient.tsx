"use client";

import { Fragment, useMemo, useState } from "react";
import { Search, Plus, Trash2, Upload, Megaphone, EyeOff, Eye, GitMerge, Send, Undo2, UserPlus, KeyRound, UserX, UserCheck, UserPen, Users, LogIn, ShieldAlert, AlertOctagon } from "lucide-react";
import { Card, CardBody } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";

export type AuditEntry = {
  action: string;
  actorEmail: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
};

type Severity = "info" | "warning" | "critical";
type Category = "authentication" | "feedback_cycle" | "permissions" | "configuration" | "moderation";

const CATEGORY_LABEL: Record<Category, string> = {
  authentication: "Authentication",
  feedback_cycle: "Feedback cycle",
  permissions: "Permissions",
  configuration: "Configuration",
  moderation: "Moderation",
};

const ACTION_META: Record<string, { icon: typeof Plus; label: string; severity: Severity; category: Category }> = {
  "auth.login_succeeded": { icon: LogIn, label: "logged in", severity: "info", category: "authentication" },
  "auth.login_failed": { icon: ShieldAlert, label: "failed to log in", severity: "warning", category: "authentication" },
  "session.created": { icon: Plus, label: "created session", severity: "info", category: "feedback_cycle" },
  "session.deleted": { icon: Trash2, label: "deleted session", severity: "critical", category: "feedback_cycle" },
  "update.posted": { icon: Megaphone, label: "posted update", severity: "info", category: "configuration" },
  "roster.uploaded": { icon: Upload, label: "uploaded roster", severity: "info", category: "configuration" },
  "comment.hidden": { icon: EyeOff, label: "hid a comment", severity: "warning", category: "moderation" },
  "comment.unhidden": { icon: Eye, label: "unhid a comment", severity: "info", category: "moderation" },
  "courses.merged": { icon: GitMerge, label: "merged courses", severity: "warning", category: "configuration" },
  "results.published": { icon: Send, label: "shared results with faculty", severity: "info", category: "feedback_cycle" },
  "results.unpublished": { icon: Undo2, label: "withdrew results from faculty", severity: "warning", category: "feedback_cycle" },
  "staff.created": { icon: UserPlus, label: "added a staff account", severity: "info", category: "permissions" },
  "staff.bulk_created": { icon: Users, label: "bulk-added staff accounts", severity: "info", category: "permissions" },
  "staff.password_reset": { icon: KeyRound, label: "reset a staff password", severity: "warning", category: "permissions" },
  "staff.reactivated": { icon: UserCheck, label: "reactivated a staff account", severity: "info", category: "permissions" },
  "staff.deactivated": { icon: UserX, label: "deactivated a staff account", severity: "critical", category: "permissions" },
  "staff.name_updated": { icon: UserPen, label: "updated a staff name", severity: "info", category: "permissions" },
};

const SEVERITY_STYLE: Record<Severity, { dot: string; label: string }> = {
  info: { dot: "bg-accent", label: "Info" },
  warning: { dot: "bg-warning", label: "Warning" },
  critical: { dot: "bg-danger", label: "Critical" },
};

function describe(action: string, details: Record<string, unknown> | null): string {
  if (!details) return "";
  if (action === "auth.login_failed" && "reason" in details) return "account deactivated";
  if ("subject" in details) return String(details.subject);
  if ("title" in details) return String(details.title);
  if ("count" in details && "emails" in details) return `${details.count} accounts`;
  if (action === "roster.uploaded" && "upserted" in details) return `${details.upserted} students`;
  return "";
}

// A failed login against an email that matches no account has no actor_id
// (nothing to attribute it to) — details.email is the attempted address in
// that one case, so the row still shows who was targeted instead of a bare
// "Unknown".
function whoFor(action: string, actorEmail: string | null, details: Record<string, unknown> | null): string {
  if (actorEmail) return actorEmail;
  if (action === "auth.login_failed" && details && "email" in details) return String(details.email);
  return "Unknown";
}

const DATE_RANGES = { today: "Today", "7d": "Last 7 days", "30d": "Last 30 days", all: "All time" } as const;
type DateRange = keyof typeof DATE_RANGES;

export function AuditLogClient({ entries }: { entries: AuditEntry[] }) {
  const [query, setQuery] = useState("");
  const [severityFilter, setSeverityFilter] = useState<"all" | Severity>("all");
  const [categoryFilter, setCategoryFilter] = useState<"all" | Category>("all");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const rows = useMemo(
    () =>
      entries.map((e) => {
        const meta = ACTION_META[e.action] ?? { icon: Plus, label: e.action, severity: "info" as Severity, category: "configuration" as Category };
        return { ...e, meta, detail: describe(e.action, e.details), who: whoFor(e.action, e.actorEmail, e.details) };
      }),
    [entries]
  );

  const counts = useMemo(() => {
    const c: Record<Severity, number> = { info: 0, warning: 0, critical: 0 };
    for (const r of rows) c[r.meta.severity]++;
    return c;
  }, [rows]);

  const rangeCutoff = useMemo(() => {
    if (dateRange === "all") return null;
    const days = dateRange === "today" ? 0 : dateRange === "7d" ? 7 : 30;
    const cutoff = new Date();
    cutoff.setHours(0, 0, 0, 0);
    cutoff.setDate(cutoff.getDate() - days);
    return cutoff;
  }, [dateRange]);

  const noFiltersActive = severityFilter === "all" && categoryFilter === "all" && dateRange === "all" && !query.trim();
  // Surfaced above the chronological log, not instead of it — a single
  // critical event from three days ago shouldn't require scrolling past
  // fifty routine logins to find. Hidden the moment a filter is applied so
  // it never contradicts what the list below is actually showing.
  const attentionRows = noFiltersActive ? rows.filter((r) => r.meta.severity !== "info").slice(0, 5) : [];

  const filtered = rows.filter((r) => {
    if (severityFilter !== "all" && r.meta.severity !== severityFilter) return false;
    if (categoryFilter !== "all" && r.meta.category !== categoryFilter) return false;
    if (rangeCutoff && new Date(r.createdAt) < rangeCutoff) return false;
    if (!query.trim()) return true;
    const q = query.trim().toLowerCase();
    return r.who.toLowerCase().includes(q) || r.meta.label.toLowerCase().includes(q) || r.detail.toLowerCase().includes(q);
  });

  const todayStr = new Date().toDateString();
  const today = filtered.filter((r) => new Date(r.createdAt).toDateString() === todayStr);
  const earlier = filtered.filter((r) => new Date(r.createdAt).toDateString() !== todayStr);

  return (
    <div>
      <div className="mb-6 grid grid-cols-3 divide-x divide-border overflow-hidden rounded-lg border border-border">
        {(["info", "warning", "critical"] as Severity[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setSeverityFilter(severityFilter === s ? "all" : s)}
            className={`px-4 py-3 text-left transition-colors ${severityFilter === s ? "bg-primary-light" : "hover:bg-background"}`}
          >
            <div className="flex items-center gap-1.5">
              <span className={`h-2 w-2 rounded-full ${SEVERITY_STYLE[s].dot}`} />
              <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-muted">{SEVERITY_STYLE[s].label}</span>
            </div>
            <p className="mt-1 font-display text-2xl font-black tabular-nums">{counts[s]}</p>
          </button>
        ))}
      </div>

      {attentionRows.length > 0 && (
        <div className="mb-6">
          <p className="mb-2 flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-danger">
            <AlertOctagon className="h-3.5 w-3.5" />
            Needs attention
          </p>
          <EntryGroup rows={attentionRows} expanded={expanded} onToggle={setExpanded} idPrefix="attention" />
        </div>
      )}

      {/* Severity already has its own control above — the stat tiles double
          as a filter — so this row is deliberately just the two things that
          don't have another home: what kind of event, and when. A third
          severity dropdown here would just be the same filter twice,
          fighting the tiles for attention instead of the tiles being the
          one obvious place severity lives. */}
      <div className="mb-4 flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <Input placeholder="Search by actor or action…" value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9" />
        </div>
        <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value as "all" | Category)} className="sm:w-44">
          <option value="all">All categories</option>
          {(Object.keys(CATEGORY_LABEL) as Category[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </Select>
        <Select value={dateRange} onChange={(e) => setDateRange(e.target.value as DateRange)} className="sm:w-40">
          {(Object.keys(DATE_RANGES) as DateRange[]).map((r) => (
            <option key={r} value={r}>{DATE_RANGES[r]}</option>
          ))}
        </Select>
      </div>

      {filtered.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-sm text-muted">
            {entries.length === 0 ? "No actions logged yet." : "No entries match your filters."}
          </CardBody>
        </Card>
      ) : (
        <div className="space-y-6">
          {today.length > 0 && <EntryGroup label="Today" rows={today} expanded={expanded} onToggle={setExpanded} />}
          {earlier.length > 0 && <EntryGroup label="Earlier" rows={earlier} expanded={expanded} onToggle={setExpanded} />}
        </div>
      )}
    </div>
  );
}

type Row = AuditEntry & { meta: { icon: typeof Plus; label: string; severity: Severity; category: Category }; detail: string; who: string };

function EntryGroup({
  label,
  idPrefix,
  rows,
  expanded,
  onToggle,
}: {
  label?: string;
  idPrefix?: string;
  rows: Row[];
  expanded: string | null;
  onToggle: (i: string | null) => void;
}) {
  const prefix = idPrefix ?? label ?? "group";
  return (
    <div>
      {label && <p className="mb-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">{label}</p>}
      <Card className="overflow-hidden">
        <div className="divide-y divide-border">
          {rows.map((r, i) => {
            const Icon = r.meta.icon;
            const rowKey = `${prefix}-${i}`;
            const rowId = rowKey;
            const isOpen = expanded === rowId;
            const hasDetails = r.details && Object.keys(r.details).length > 0;
            return (
              <div key={rowKey} className={r.meta.severity === "critical" ? "bg-danger-light/40" : undefined}>
                <button
                  type="button"
                  onClick={() => hasDetails && onToggle(isOpen ? null : rowId)}
                  className={`flex w-full items-start gap-3 px-4 py-3 text-left text-sm transition-colors ${hasDetails ? "cursor-pointer hover:bg-background/60" : "cursor-default"}`}
                >
                  <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${SEVERITY_STYLE[r.meta.severity].dot}`} aria-hidden="true" />
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary-light text-primary">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate">
                      <span className="font-medium">{r.who}</span> {r.meta.label}
                      {r.detail ? ` — ${r.detail}` : ""}
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-muted">
                      <span className="font-mono uppercase tracking-[0.04em]">{CATEGORY_LABEL[r.meta.category]}</span>
                      <span aria-hidden="true">·</span>
                      {new Date(r.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}
                    </p>
                  </div>
                  {r.meta.severity !== "info" && (
                    <Badge tone={r.meta.severity === "critical" ? "danger" : "warning"}>{SEVERITY_STYLE[r.meta.severity].label}</Badge>
                  )}
                </button>
                {isOpen && hasDetails && (
                  <div className="border-t border-border bg-background px-4 py-3 pl-[3.75rem]">
                    <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                      {Object.entries(r.details as Record<string, unknown>).map(([key, value]) => (
                        <Fragment key={key}>
                          <dt className="text-muted">{key}</dt>
                          <dd className="text-foreground">{String(value)}</dd>
                        </Fragment>
                      ))}
                    </dl>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}
