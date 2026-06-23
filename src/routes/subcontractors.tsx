import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Pencil, Plus, Trash2, User, X } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { itemsStore, useItems, useSettings } from "@/lib/store";
import { TRADES, type SubProfile } from "@/lib/types";

export const Route = createFileRoute("/subcontractors")({
  head: () => ({ meta: [{ title: "Subcontractors — CleanRun IQ" }] }),
  component: SubsPage,
});

function SubsPage() {
  const settings = useSettings();
  const items = useItems();
  const [editing, setEditing] = useState<SubProfile | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <AppShell title="Subcontractors" subtitle="Profiles · contacts · workload">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs text-muted-foreground">{settings.subcontractors.length} subcontractor{settings.subcontractors.length === 1 ? "" : "s"}</p>
        <Button size="sm" onClick={() => setCreating(true)}><Plus className="mr-1 h-4 w-4" /> Add</Button>
      </div>

      <div className="space-y-2">
        {settings.subcontractors.map((name) => {
          const profile = settings.subProfiles[name] ?? { name };
          const sub = items.filter((i) => i.subcontractor === name);
          const open = sub.filter((i) => i.status !== "closed" && i.status !== "complete").length;
          const overdue = sub.filter((i) => i.status !== "closed" && i.status !== "complete" && i.dueDate < new Date().toISOString().slice(0, 10)).length;
          const ready = sub.filter((i) => i.status === "ready_for_review").length;
          const lastIssued = sub.map((i) => i.issuedAt).filter((d): d is string => !!d).sort().pop();
          return (
            <div key={name} className="rounded-2xl border border-border bg-card p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{name}</p>
                    <p className="truncate text-xs text-muted-foreground">{profile.trade || "Trade not set"} · {profile.contact || "—"}</p>
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
                      {profile.email && <span className="inline-flex items-center gap-1"><Mail className="h-3 w-3" /> {profile.email}</span>}
                      {profile.phone && <span className="inline-flex items-center gap-1"><Phone className="h-3 w-3" /> {profile.phone}</span>}
                    </div>
                  </div>
                </div>
                <button onClick={() => setEditing(profile)} className="rounded-md p-1.5 text-muted-foreground hover:bg-accent">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <Stat label="Open" value={open} />
                <Stat label="Overdue" value={overdue} tone={overdue > 0 ? "danger" : undefined} />
                <Stat label="Ready" value={ready} tone={ready > 0 ? "review" : undefined} />
              </div>
              {lastIssued && (
                <p className="mt-2 text-[11px] text-muted-foreground">Last issued: {new Date(lastIssued).toLocaleDateString()}</p>
              )}
            </div>
          );
        })}
      </div>

      {(editing || creating) && (
        <EditDialog
          initial={editing ?? { name: "" }}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSave={(p) => { itemsStore.addSubcontractor(p); setEditing(null); setCreating(false); }}
          onDelete={editing ? () => { itemsStore.removeSubcontractor(editing.name); setEditing(null); } : undefined}
        />
      )}

      <p className="mt-6 text-[11px] text-muted-foreground">
        {/* TODO[production]: secure invite tokens; portal auth */}
        Profiles stored on this device for pilot.
      </p>
    </AppShell>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "danger" | "review" }) {
  const cls = tone === "danger" ? "text-destructive" : tone === "review" ? "text-violet-600 dark:text-violet-300" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-background/40 px-2 py-1.5">
      <p className={`text-base font-semibold tabular-nums ${cls}`}>{value}</p>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
    </div>
  );
}

function EditDialog({ initial, onClose, onSave, onDelete }: {
  initial: SubProfile;
  onClose: () => void;
  onSave: (p: SubProfile) => void;
  onDelete?: () => void;
}) {
  const [p, setP] = useState<SubProfile>({ ...initial });
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{initial.name ? "Edit subcontractor" : "Add subcontractor"}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-3">
          <Row label="Company name *"><Input value={p.name} onChange={(e) => setP({ ...p, name: e.target.value })} /></Row>
          <Row label="Trade">
            <select value={p.trade ?? ""} onChange={(e) => setP({ ...p, trade: e.target.value || undefined })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
              <option value="">Select trade</option>
              {TRADES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </Row>
          <Row label="Contact person"><Input value={p.contact ?? ""} onChange={(e) => setP({ ...p, contact: e.target.value })} /></Row>
          <Row label="Email"><Input type="email" value={p.email ?? ""} onChange={(e) => setP({ ...p, email: e.target.value })} /></Row>
          <Row label="Phone"><Input value={p.phone ?? ""} onChange={(e) => setP({ ...p, phone: e.target.value })} /></Row>
        </div>
        <div className="mt-5 flex gap-2">
          {onDelete && <Button variant="outline" onClick={() => { if (confirm("Remove this subcontractor?")) onDelete(); }} className="text-destructive"><Trash2 className="mr-1 h-4 w-4" /> Delete</Button>}
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={() => { if (!p.name.trim()) { alert("Name required."); return; } onSave({ ...p, name: p.name.trim() }); }} className="flex-1">Save</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
