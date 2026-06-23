import { createFileRoute } from "@tanstack/react-router";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { activeProjectConfig, itemsStore, useSettings } from "@/lib/store";
import type { ProjectConfig } from "@/lib/types";

export const Route = createFileRoute("/setup")({
  head: () => ({ meta: [{ title: "Project Setup — CleanRun IQ" }] }),
  component: SetupPage,
});

function SetupPage() {
  const settings = useSettings();
  const cfg = activeProjectConfig(settings);
  const [newProject, setNewProject] = useState("");

  function updateCfg(patch: Partial<ProjectConfig>) {
    itemsStore.updateProjectConfig(cfg.name, patch);
  }

  return (
    <AppShell title="Project Setup" subtitle="Projects · locations · defaults">
      <Card title="Active project">
        <select
          value={settings.activeProject}
          onChange={(e) => itemsStore.setActiveProject(e.target.value)}
          className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
        >
          {settings.projects.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Field label="Project address">
            <Input value={cfg.address ?? ""} onChange={(e) => updateCfg({ address: e.target.value })} placeholder="Site address" />
          </Field>
          <Field label="Default due (days)">
            <Input type="number" min={1} value={cfg.defaultDueDays} onChange={(e) => updateCfg({ defaultDueDays: Math.max(1, Number(e.target.value) || 7) })} />
          </Field>
        </div>
      </Card>

      <Card title="Locations">
        <ChipEditor label="Buildings" items={cfg.buildings} onChange={(buildings) => updateCfg({ buildings })} placeholder="e.g. Block A" />
        <ChipEditor label="Levels" items={cfg.levels} onChange={(levels) => updateCfg({ levels })} placeholder="e.g. L01" />
        <ChipEditor label="Room presets" items={cfg.rooms} onChange={(rooms) => updateCfg({ rooms })} placeholder="e.g. Kitchen" />
        <ChipEditor label="Common units" items={cfg.units} onChange={(units) => updateCfg({ units })} placeholder="e.g. A-101" />
      </Card>

      <Card title="Company">
        <Field label="Company name">
          <Input value={settings.company ?? ""} onChange={(e) => itemsStore.setSettings({ ...settings, company: e.target.value })} />
        </Field>
        <Field label="Prepared by (default)">
          <Input value={settings.preparedBy ?? ""} onChange={(e) => itemsStore.setSettings({ ...settings, preparedBy: e.target.value })} placeholder="e.g. Sam Whitlock" />
        </Field>
      </Card>

      <Card title="Add project">
        <div className="flex gap-2">
          <Input value={newProject} onChange={(e) => setNewProject(e.target.value)} placeholder="Project name" />
          <Button onClick={() => { if (newProject.trim()) { itemsStore.addProject(newProject.trim()); setNewProject(""); } }}>
            <Plus className="mr-1 h-4 w-4" /> Add
          </Button>
        </div>
        <ul className="mt-3 space-y-1 text-sm">
          {settings.projects.map((p) => <li key={p} className="text-muted-foreground">· {p}</li>)}
        </ul>
      </Card>

      <p className="mt-6 text-xs text-muted-foreground">
        {/* TODO[production]: persist projects/settings to backend, role-gated */}
        Settings are stored on this device for the pilot.
      </p>
    </AppShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4 first:mt-0">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="mt-2 space-y-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function ChipEditor({ label, items, onChange, placeholder }: {
  label: string; items: string[]; onChange: (next: string[]) => void; placeholder?: string;
}) {
  const [val, setVal] = useState("");
  function add() {
    const v = val.trim();
    if (!v || items.includes(v)) return;
    onChange([...items, v]);
    setVal("");
  }
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {items.length === 0 && <span className="text-[11px] italic text-muted-foreground">None set yet</span>}
        {items.map((it) => (
          <span key={it} className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-0.5 text-xs">
            {it}
            <button onClick={() => onChange(items.filter((x) => x !== it))} className="text-muted-foreground hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input value={val} onChange={(e) => setVal(e.target.value)} placeholder={placeholder} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }} className="h-9" />
        <Button size="sm" onClick={add} variant="outline">Add</Button>
      </div>
    </div>
  );
}
