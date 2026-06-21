import { createFileRoute } from "@tanstack/react-router";
import { Plus, HardHat } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { itemsStore, useItems, useSettings } from "@/lib/store";

export const Route = createFileRoute("/subcontractors")({
  head: () => ({ meta: [{ title: "Subcontractors — CleanRun IQ" }] }),
  component: SubsPage,
});

function SubsPage() {
  const settings = useSettings();
  const items = useItems();
  const [name, setName] = useState("");

  return (
    <AppShell title="Subcontractors" subtitle="Admin · who you assign work to">
      <div className="rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Add subcontractor</h3>
        <div className="mt-2 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Company name" />
          <Button onClick={() => { if (name.trim()) { itemsStore.addSubcontractor(name.trim()); setName(""); } }}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        {settings.subcontractors.map((s) => {
          const open = items.filter((i) => i.subcontractor === s && i.status !== "closed" && i.status !== "complete").length;
          const ready = items.filter((i) => i.subcontractor === s && i.status === "ready_for_review").length;
          return (
            <div key={s} className="flex items-center justify-between rounded-2xl border border-border bg-card p-3">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <HardHat className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{s}</p>
                  <p className="text-xs text-muted-foreground">{open} open · {ready} ready for review</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </AppShell>
  );
}
