import { createFileRoute, Link } from "@tanstack/react-router";
import { Camera, MessageSquare, Send } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/StatusChip";
import { itemsStore, useItems, useSettings } from "@/lib/store";

export const Route = createFileRoute("/subcontractor")({
  head: () => ({ meta: [{ title: "Subcontractor Portal — CleanRun IQ" }] }),
  component: SubPortal,
});

function SubPortal() {
  const settings = useSettings();
  const items = useItems();
  const [sub, setSub] = useState(settings.subcontractors[0] ?? "");
  const assigned = items.filter((i) => i.subcontractor === sub && i.status !== "closed" && i.status !== "complete");

  return (
    <AppShell title="Subcontractor Portal" subtitle="Preview · what your sub sees">
      <div className="rounded-2xl border border-border bg-card p-3">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Viewing as</label>
        <select value={sub} onChange={(e) => setSub(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {settings.subcontractors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {assigned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing assigned.</p>
        ) : assigned.map((it) => (
          <SubItem key={it.id} id={it.id} />
        ))}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground">
        {/* TODO[production]: real subcontractor auth via secure invite tokens; scoped data access only */}
        Subcontractors only see their own assigned items.
      </p>
    </AppShell>
  );
}

function SubItem({ id }: { id: string }) {
  const items = useItems();
  const item = items.find((i) => i.id === id);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  if (!item) return null;

  function handleFile(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(file);
  }

  function submitReady() {
    const updated = [...item!.photos];
    if (photo) updated.push(photo);
    itemsStore.update(
      item!.id,
      { photos: updated, status: "ready_for_review" },
      { at: new Date().toISOString(), action: "Sub: marked ready", by: item!.subcontractor, note: note || undefined },
    );
    setNote(""); setPhoto(undefined);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">{item.building} · {item.level} · {item.unit} · {item.room}</p>
          <p className="mt-0.5 text-sm font-medium">{item.description}</p>
        </div>
        <StatusChip status={item.status} />
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground">Due {item.dueDate}</p>
      <div className="mt-3 space-y-2">
        <label className="flex h-20 cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
          <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <Camera className="h-4 w-4" /> {photo ? "Photo ready" : "Upload rectification photo"}
        </label>
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comment (optional)" />
        <Button onClick={submitReady} className="w-full">
          <Send className="mr-1 h-4 w-4" /> Mark Ready for Review
        </Button>
      </div>
    </div>
  );
}
