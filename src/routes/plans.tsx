import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronLeft, MapPin, Plus, Trash2, Upload, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { plansStore, usePlans, type Plan, type PlanPin } from "@/lib/plansStore";
import { activeProjectConfig, useItems, useSettings } from "@/lib/store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/plans")({
  head: () => ({ meta: [{ title: "Plans — CleanRun IQ" }] }),
  component: PlansPage,
});

function PlansPage() {
  const plans = usePlans();
  const settings = useSettings();
  const cfg = activeProjectConfig(settings);
  const [active, setActive] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  const projectPlans = plans.filter((p) => p.project === settings.activeProject);
  const current = active ? plans.find((p) => p.id === active) : null;

  if (current) {
    return <PlanEditor plan={current} onBack={() => setActive(null)} />;
  }

  return (
    <AppShell
      title="Plans"
      subtitle={`${settings.activeProject} · pin items on level plans`}
      action={
        <Button size="sm" onClick={() => setUploading(true)}>
          <Plus className="mr-1 h-4 w-4" /> Upload plan
        </Button>
      }
    >
      {projectPlans.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MapPin className="h-5 w-5" />
          </div>
          <h2 className="mt-3 text-base font-semibold">No plans yet</h2>
          <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
            Upload a level plan image, then tap to drop pins linked to items. Pins are stored on this device.
          </p>
          <Button className="mt-4" onClick={() => setUploading(true)}>
            <Upload className="mr-1 h-4 w-4" /> Upload plan image
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {projectPlans.map((p) => (
            <button
              key={p.id}
              onClick={() => setActive(p.id)}
              className="overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-primary/40"
            >
              <div className="aspect-[16/10] bg-muted">
                <img src={p.image} alt="" className="h-full w-full object-cover" />
              </div>
              <div className="p-3">
                <p className="text-sm font-medium">{p.name}</p>
                <p className="text-xs text-muted-foreground">{p.building} · {p.level} · {p.pins.length} pin{p.pins.length === 1 ? "" : "s"}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {uploading && (
        <UploadDialog
          buildings={cfg.buildings}
          levels={cfg.levels}
          project={settings.activeProject}
          onClose={() => setUploading(false)}
          onUploaded={(id) => { setUploading(false); setActive(id); }}
        />
      )}
    </AppShell>
  );
}

function UploadDialog({ buildings, levels, project, onClose, onUploaded }: {
  buildings: string[]; levels: string[]; project: string;
  onClose: () => void; onUploaded: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [building, setBuilding] = useState(buildings[0] ?? "");
  const [level, setLevel] = useState(levels[0] ?? "");
  const [image, setImage] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  function handle(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setImage(r.result as string);
    r.readAsDataURL(file);
  }

  function submit() {
    if (!image) { alert("Add a plan image."); return; }
    if (!name.trim()) { alert("Add a plan name."); return; }
    const plan = plansStore.add({ name: name.trim(), building, level, project, image });
    onUploaded(plan.id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Upload plan</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => handle(e.target.files?.[0])} />
          {image ? (
            <img src={image} alt="" className="w-full rounded-lg border border-border" />
          ) : (
            <button onClick={() => fileRef.current?.click()} className="flex h-32 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground">
              <Upload className="h-4 w-4" /> Choose image
            </button>
          )}
          <div>
            <Label className="text-[11px] uppercase">Plan name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Block A — Level 3" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] uppercase">Building</Label>
              <select value={building} onChange={(e) => setBuilding(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {buildings.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <Label className="text-[11px] uppercase">Level</Label>
              <select value={level} onChange={(e) => setLevel(e.target.value)} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                {levels.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
          </div>
        </div>
        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} className="flex-1">Add plan</Button>
        </div>
      </div>
    </div>
  );
}

function PlanEditor({ plan, onBack }: { plan: Plan; onBack: () => void }) {
  const items = useItems();
  const [selectedPin, setSelectedPin] = useState<PlanPin | null>(null);

  const scoped = useMemo(
    () => items.filter((i) => i.project === plan.project && (i.building === plan.building || !i.building) && (i.level === plan.level || !i.level)),
    [items, plan.project, plan.building, plan.level],
  );

  function handleCanvasClick(e: React.MouseEvent<HTMLDivElement>) {
    if (selectedPin) { setSelectedPin(null); return; }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    const pin = plansStore.addPin(plan.id, { x, y, label: `P${plan.pins.length + 1}` });
    setSelectedPin(pin);
  }

  return (
    <AppShell
      title={plan.name}
      subtitle={`${plan.building} · ${plan.level} · tap the plan to drop a pin`}
      action={
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ChevronLeft className="h-3 w-3" /> Plans
        </button>
      }
    >
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
        <div className="relative" onClick={handleCanvasClick}>
          <img src={plan.image} alt="" className="block w-full select-none" draggable={false} />
          {plan.pins.map((p) => {
            const linked = p.itemId ? items.find((i) => i.id === p.itemId) : undefined;
            const closed = linked?.status === "closed" || linked?.status === "complete";
            return (
              <button
                key={p.id}
                onClick={(e) => { e.stopPropagation(); setSelectedPin(p); }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-full rounded-full px-2 py-0.5 text-[10px] font-semibold shadow-md ring-2 ring-white",
                  closed ? "bg-emerald-600 text-white" : linked ? "bg-primary text-primary-foreground" : "bg-amber-500 text-white",
                )}
                style={{ left: `${p.x * 100}%`, top: `${p.y * 100}%` }}
              >
                {linked?.code ?? p.label ?? "•"}
              </button>
            );
          })}
        </div>
      </div>

      {selectedPin && (
        <PinPanel
          pin={selectedPin}
          plan={plan}
          candidates={scoped}
          onClose={() => setSelectedPin(null)}
        />
      )}

      <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground">
        <span>{plan.pins.length} pin{plan.pins.length === 1 ? "" : "s"}</span>
        <button onClick={() => { if (confirm("Delete this plan?")) { plansStore.remove(plan.id); onBack(); } }} className="inline-flex items-center gap-1 text-destructive">
          <Trash2 className="h-3 w-3" /> Delete plan
        </button>
      </div>
    </AppShell>
  );
}

function PinPanel({ pin, plan, candidates, onClose }: {
  pin: PlanPin; plan: Plan; candidates: ReturnType<typeof useItems>; onClose: () => void;
}) {
  const linked = pin.itemId ? candidates.find((c) => c.id === pin.itemId) : undefined;
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card p-4 shadow-lg lg:relative lg:mt-4 lg:rounded-2xl lg:border">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Pin {pin.label ?? ""}</p>
        <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
      </div>
      {linked ? (
        <div className="mt-2 rounded-lg border border-border bg-background/40 p-2">
          <p className="text-xs font-mono">{linked.code}</p>
          <p className="text-sm">{linked.description}</p>
          <Link to="/items/$id" params={{ id: linked.id }} className="mt-1 inline-block text-xs text-primary">Open item →</Link>
        </div>
      ) : (
        <>
          <p className="mt-1 text-xs text-muted-foreground">Link this pin to an item:</p>
          <div className="mt-2 max-h-48 space-y-1 overflow-y-auto">
            {candidates.length === 0 && <p className="text-xs italic text-muted-foreground">No items on this level yet.</p>}
            {candidates.map((c) => (
              <button
                key={c.id}
                onClick={() => { plansStore.updatePin(plan.id, pin.id, { itemId: c.id, label: c.code }); onClose(); }}
                className="w-full rounded-md border border-border bg-background px-2 py-1.5 text-left text-xs hover:bg-accent"
              >
                <span className="font-mono">{c.code}</span> · {c.unit} {c.room} — <span className="text-muted-foreground">{c.description.slice(0, 50)}</span>
              </button>
            ))}
          </div>
        </>
      )}
      <div className="mt-3 flex justify-end">
        <button onClick={() => { plansStore.removePin(plan.id, pin.id); onClose(); }} className="text-xs text-destructive">Remove pin</button>
      </div>
    </div>
  );
}
