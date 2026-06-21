import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { ItemCard } from "@/components/ItemCard";
import { useItems, useSettings, isOverdue } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CleanRun IQ — Field Home" },
      { name: "description", content: "Capture defects, assign, issue and close out — fast." },
    ],
  }),
  component: FieldHome,
});

function FieldHome() {
  const items = useItems();
  const settings = useSettings();
  const today = new Date().toISOString().slice(0, 10);

  const open = items.filter((i) => i.status !== "closed" && i.status !== "complete").length;
  const overdue = items.filter(isOverdue).length;
  const ready = items.filter((i) => i.status === "ready_for_review").length;
  const closedToday = items.filter(
    (i) => (i.status === "closed" || i.status === "complete") && i.updatedAt.slice(0, 10) === today,
  ).length;

  const next = items
    .filter((i) => i.status !== "closed" && i.status !== "complete")
    .sort((a, b) => {
      const pr = { urgent: 0, high: 1, medium: 2, low: 3 } as const;
      if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 4);

  return (
    <AppShell title="Field Mode" subtitle={settings.activeProject}>
      {/* Hero CTA */}
      <Link
        to="/capture"
        className="group flex items-center justify-between rounded-2xl bg-primary p-5 text-primary-foreground shadow-sm transition hover:brightness-110"
      >
        <div>
          <p className="text-xs uppercase tracking-wide text-primary-foreground/70">Start here</p>
          <p className="mt-1 text-xl font-semibold">Capture Item</p>
          <p className="mt-0.5 text-xs text-primary-foreground/80">Photo first. Assign. Issue. Close.</p>
        </div>
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/15 transition group-hover:scale-105">
          <Camera className="h-6 w-6" />
        </div>
      </Link>

      {/* Counts */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Open" value={open} tone="default" />
        <Stat label="Overdue" value={overdue} tone="danger" />
        <Stat label="Ready" value={ready} tone="review" />
        <Stat label="Closed today" value={closedToday} tone="success" />
      </div>

      {/* Next */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Next 4 to deal with</h2>
          <Link to="/items" className="text-xs text-primary inline-flex items-center gap-0.5">
            All items <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {next.length === 0 ? (
          <EmptyHomeState />
        ) : (
          <div className="space-y-2">
            {next.map((i) => <ItemCard key={i.id} item={i} />)}
          </div>
        )}
      </section>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "default" | "danger" | "review" | "success" }) {
  const toneCls = {
    default: "text-foreground",
    danger: "text-destructive",
    review: "text-review",
    success: "text-success",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`mt-1 text-2xl font-semibold ${toneCls}`}>{value}</p>
    </div>
  );
}

function EmptyHomeState() {
  return (
    <Link
      to="/capture"
      className="flex items-center gap-3 rounded-2xl border border-dashed border-border bg-card p-4 text-sm text-muted-foreground"
    >
      <Plus className="h-4 w-4" />
      Nothing outstanding. Capture your first item.
    </Link>
  );
}
