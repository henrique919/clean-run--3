import { createFileRoute, Link } from "@tanstack/react-router";
import { Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ItemCard } from "@/components/ItemCard";
import { useItems, isOverdue } from "@/lib/store";
import { cn } from "@/lib/utils";
import type { Item } from "@/lib/types";

export const Route = createFileRoute("/items")({
  head: () => ({
    meta: [
      { title: "Items — CleanRun IQ" },
      { name: "description", content: "Defects, incomplete works and client defects in one register." },
    ],
  }),
  component: ItemsPage,
});

type Filter = "all" | "open" | "overdue" | "ready" | "closed";
type Tab = "all" | "defect" | "incomplete" | "client";

const filters: { key: Filter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "overdue", label: "Overdue" },
  { key: "ready", label: "Ready for Review" },
  { key: "closed", label: "Closed" },
];

const tabs: { key: Tab; label: string }[] = [
  { key: "all", label: "All Items" },
  { key: "defect", label: "Defects" },
  { key: "incomplete", label: "Incomplete Works" },
  { key: "client", label: "Client Defects" },
];

function ItemsPage() {
  const items = useItems();
  const [filter, setFilter] = useState<Filter>("all");
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    return items.filter((it) => {
      if (tab !== "all" && it.type !== tab) return false;
      if (filter === "open" && (it.status === "closed" || it.status === "complete")) return false;
      if (filter === "overdue" && !isOverdue(it)) return false;
      if (filter === "ready" && it.status !== "ready_for_review") return false;
      if (filter === "closed" && it.status !== "closed" && it.status !== "complete") return false;
      if (q) {
        const s = q.toLowerCase();
        const hay = `${it.description} ${it.building} ${it.unit} ${it.room} ${it.subcontractor}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      return true;
    });
  }, [items, filter, tab, q]);

  return (
    <AppShell
      title="Items"
      subtitle="Defects · Incomplete works · Client defects"
      action={
        <Link
          to="/capture"
          className="hidden items-center gap-1.5 rounded-full bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground lg:inline-flex"
        >
          <Plus className="h-3.5 w-3.5" /> Capture
        </Link>
      }
    >
      {/* Tabs */}
      <div className="flex gap-1 overflow-x-auto pb-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              tab === t.key
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card text-muted-foreground",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative mt-3">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search location, sub, description…"
          className="h-10 w-full rounded-lg border border-input bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
        />
      </div>

      {/* Filters */}
      <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs font-medium transition",
              filter === f.key ? "bg-foreground text-background" : "bg-secondary text-secondary-foreground",
            )}
          >
            {f.label} <span className="ml-1 opacity-60">{count(items, f.key, tab)}</span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="mt-4 space-y-2">
        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No items match. Try a different filter.
          </div>
        ) : (
          filtered.map((it) => <ItemCard key={it.id} item={it} />)
        )}
      </div>
    </AppShell>
  );
}

function count(items: Item[], f: Filter, tab: Tab) {
  const base = tab === "all" ? items : items.filter((i) => i.type === tab);
  if (f === "all") return base.length;
  if (f === "open") return base.filter((i) => i.status !== "closed" && i.status !== "complete").length;
  if (f === "overdue") return base.filter(isOverdue).length;
  if (f === "ready") return base.filter((i) => i.status === "ready_for_review").length;
  return base.filter((i) => i.status === "closed" || i.status === "complete").length;
}
