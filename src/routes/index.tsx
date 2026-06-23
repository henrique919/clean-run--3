import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, ChevronRight, Plus, AlertTriangle, Eye, CheckCircle2, ClipboardList } from "lucide-react";
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
  const projectItems = items.filter((i) => i.project === settings.activeProject);

  const open = projectItems.filter((i) => i.status !== "closed" && i.status !== "complete").length;
  const overdue = projectItems.filter(isOverdue).length;
  const ready = projectItems.filter((i) => i.status === "ready_for_review").length;
  const closedToday = projectItems.filter(
    (i) => (i.status === "closed" || i.status === "complete") && i.updatedAt.slice(0, 10) === today,
  ).length;

  const next = projectItems
    .filter((i) => i.status !== "closed" && i.status !== "complete")
    .sort((a, b) => {
      const pr = { urgent: 0, high: 1 } as const;
      if (pr[a.priority] !== pr[b.priority]) return pr[a.priority] - pr[b.priority];
      return a.dueDate.localeCompare(b.dueDate);
    })
    .slice(0, 4);

  return (
    <AppShell title="Field Mode" subtitle={settings.activeProject}>
      {/* Hero CTA */}
      <Link
        to="/capture"
        className="group relative flex items-center justify-between overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-[oklch(0.38_0.10_255)] p-5 text-primary-foreground shadow-sm transition hover:shadow-md"
      >
        <div className="relative z-10">
          <p className="text-[11px] font-medium uppercase tracking-wider text-primary-foreground/70">Start here</p>
          <p className="mt-1 text-xl font-semibold tracking-tight">Capture Item</p>
          <p className="mt-1 text-xs text-primary-foreground/80">Photo first. Assign. Issue. Close.</p>
        </div>
        <div className="relative z-10 flex h-14 w-14 items-center justify-center rounded-full bg-primary-foreground/15 transition group-hover:scale-105 group-hover:bg-primary-foreground/20">
          <Camera className="h-6 w-6" />
        </div>
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-primary-foreground/5 blur-2xl" />
      </Link>

      {/* Stat cards */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Stat label="Open" value={open} icon={ClipboardList} tone="default" />
        <Stat label="Overdue" value={overdue} icon={AlertTriangle} tone="danger" />
        <Stat label="Ready" value={ready} icon={Eye} tone="review" />
        <Stat label="Closed today" value={closedToday} icon={CheckCircle2} tone="success" />
      </div>

      {/* Next */}
      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold">Next {next.length || 4} to deal with</h2>
          <Link to="/items" className="inline-flex items-center gap-0.5 text-xs font-medium text-primary">
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

      <p className="mt-8 px-1 text-center text-[11px] text-muted-foreground">
        The smarter way to a clean handover.
      </p>
    </AppShell>
  );
}

function Stat({
  label, value, icon: Icon, tone,
}: {
  label: string; value: number; icon: typeof ClipboardList;
  tone: "default" | "danger" | "review" | "success";
}) {
  const toneCls = {
    default: "text-foreground",
    danger: "text-destructive",
    review: "text-review",
    success: "text-success",
  }[tone];
  const iconCls = {
    default: "bg-muted text-muted-foreground",
    danger: "bg-destructive/10 text-destructive",
    review: "bg-review/10 text-review",
    success: "bg-success/10 text-success",
  }[tone];
  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-center justify-between">
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
        <span className={`flex h-6 w-6 items-center justify-center rounded-full ${iconCls}`}>
          <Icon className="h-3 w-3" />
        </span>
      </div>
      <p className={`mt-1 text-2xl font-semibold tabular-nums ${toneCls}`}>{value}</p>
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
