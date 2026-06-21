import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ItemCard } from "@/components/ItemCard";
import { useItems, useSettings, isOverdue } from "@/lib/store";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Dashboard — CleanRun IQ" }] }),
  component: Dashboard,
});

function Dashboard() {
  const items = useItems();
  const settings = useSettings();
  const today = new Date().toISOString().slice(0, 10);

  const open = items.filter((i) => i.status !== "closed" && i.status !== "complete");
  const overdue = items.filter(isOverdue);
  const ready = items.filter((i) => i.status === "ready_for_review");
  const closed = items.filter((i) => i.status === "closed" || i.status === "complete");
  const closedToday = closed.filter((i) => i.updatedAt.slice(0, 10) === today);

  const byTrade = group(open, (i) => i.trade || "—");
  const byLocation = group(open, (i) => i.building || "—");
  const topPriority = open
    .filter((i) => i.priority === "urgent" || i.priority === "high")
    .slice(0, 5);

  return (
    <AppShell
      title="Dashboard"
      subtitle={settings.activeProject}
      action={
        <Link to="/capture" className="inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Capture
        </Link>
      }
    >
      <div className="grid gap-3 md:grid-cols-4">
        <Stat label="Open" value={open.length} />
        <Stat label="Overdue" value={overdue.length} tone="danger" />
        <Stat label="Ready for Review" value={ready.length} tone="review" />
        <Stat label="Closed today" value={closedToday.length} tone="success" />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Trade closeout summary">
          <SimpleBars data={byTrade} />
        </Panel>
        <Panel title="Open items by location">
          <SimpleBars data={byLocation} />
        </Panel>
      </div>

      <div className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Highest priority items</h3>
        {topPriority.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            Nothing urgent. Clean.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2">
            {topPriority.map((i) => <ItemCard key={i.id} item={i} />)}
          </div>
        )}
      </div>
    </AppShell>
  );
}

function Stat({ label, value, tone = "default" }: { label: string; value: number; tone?: "default" | "danger" | "success" | "review" }) {
  const cls = { default: "text-foreground", danger: "text-destructive", success: "text-success", review: "text-review" }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-3xl font-semibold ${cls}`}>{value}</p>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function group<T>(arr: T[], key: (x: T) => string): Record<string, number> {
  return arr.reduce<Record<string, number>>((acc, x) => {
    const k = key(x);
    acc[k] = (acc[k] ?? 0) + 1;
    return acc;
  }, {});
}

function SimpleBars({ data }: { data: Record<string, number> }) {
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  if (entries.length === 0) return <p className="text-sm text-muted-foreground">No data.</p>;
  return (
    <div className="space-y-2">
      {entries.map(([k, v]) => (
        <div key={k} className="text-xs">
          <div className="mb-1 flex justify-between"><span className="truncate">{k}</span><span className="text-muted-foreground">{v}</span></div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${(v / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}
