import { createFileRoute } from "@tanstack/react-router";
import { MapPin, Plus } from "lucide-react";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Plans — CleanRun IQ" }] }),
  component: PlansPage,
});

function PlansPage() {
  return (
    <AppShell title="Plans" subtitle="Pin items directly on level plans">
      <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MapPin className="h-5 w-5" />
        </div>
        <h2 className="mt-3 text-base font-semibold">Plan pins</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Upload a level plan to start pinning items. Existing plan pins from earlier versions will appear here.
        </p>
        <button className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          <Plus className="h-4 w-4" /> Upload plan
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground">
          {/* TODO[production]: persist plans + pins to storage */}
        </p>
      </div>
    </AppShell>
  );
}
