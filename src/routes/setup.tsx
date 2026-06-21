import { createFileRoute } from "@tanstack/react-router";
import { Plus } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { itemsStore, useSettings } from "@/lib/store";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Project Setup — CleanRun IQ" }] }),
  component: SetupPage,
});

function SetupPage() {
  const settings = useSettings();
  const [name, setName] = useState("");

  return (
    <AppShell title="Project Setup" subtitle="Admin · projects and defaults">
      <div className="rounded-2xl border border-border bg-card p-4">
        <Label className="text-xs uppercase">Active project</Label>
        <select
          value={settings.activeProject}
          onChange={(e) => itemsStore.setSettings({ ...settings, activeProject: e.target.value })}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {settings.projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>

      <div className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Add project</h3>
        <div className="mt-2 flex gap-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Project name" />
          <Button onClick={() => { if (name.trim()) { itemsStore.addProject(name.trim()); setName(""); } }}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {settings.projects.map((p) => <li key={p} className="text-muted-foreground">· {p}</li>)}
        </ul>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        {/* TODO[production]: persist projects + settings to backend, role-gated */}
        Settings are stored on this device for the pilot.
      </p>
    </AppShell>
  );
}
