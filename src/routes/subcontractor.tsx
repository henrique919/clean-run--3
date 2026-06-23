import { createFileRoute } from "@tanstack/react-router";
import { Camera, Send } from "lucide-react";
import { useRef, useState } from "react";
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
    <AppShell title="Subcontractor Portal" subtitle="Preview · what your subcontractor sees">
      <div className="rounded-2xl border border-border bg-card p-3">
        <label className="text-[11px] uppercase tracking-wide text-muted-foreground">Viewing as</label>
        <select value={sub} onChange={(e) => setSub(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
          {settings.subcontractors.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="mt-4 space-y-2">
        {assigned.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Nothing assigned.</p>
        ) : assigned.map((it) => <SubItem key={it.id} id={it.id} sub={sub} />)}
      </div>

      <p className="mt-6 text-[11px] text-muted-foreground">
        {/* TODO[production]: secure invite tokens; scoped data access only */}
        Subcontractors only see their own assigned items.
      </p>
    </AppShell>
  );
}

function SubItem({ id, sub }: { id: string; sub: string }) {
  const items = useItems();
  const item = items.find((i) => i.id === id);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);
  if (!item) return null;

  function handleFile(file?: File) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(file);
  }

  function submitRectification(advanceToReady: boolean) {
    if (!photo && !note.trim()) {
      alert("Add a photo or comment first.");
      return;
    }
    itemsStore.addRectification(item!.id, {
      photo,
      comment: note.trim() || undefined,
      by: sub,
      advanceToReady,
    });
    setNote("");
    setPhoto(undefined);
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-mono tracking-wider text-muted-foreground">{item.code}</p>
          <p className="text-xs text-muted-foreground">{item.building} · {item.level} · {item.unit} · {item.room}</p>
          <p className="mt-0.5 text-sm font-medium">{item.description}</p>
        </div>
        <StatusChip status={item.status} />
      </div>
      {/* Original photos: read-only */}
      {item.originalPhotos.length > 0 && (
        <div className="mt-2 flex gap-2 overflow-x-auto">
          {item.originalPhotos.map((p, i) => (
            <img key={i} src={p} alt="" className="h-16 w-20 shrink-0 rounded-lg object-cover" />
          ))}
        </div>
      )}
      <p className="mt-1 text-[11px] text-muted-foreground">Due {item.dueDate}</p>

      {/* Prior rectifications */}
      {item.rectificationEvidence.length > 0 && (
        <div className="mt-2 rounded-md border border-border/60 bg-background/40 p-2 text-[11px]">
          <p className="font-medium">Previously submitted</p>
          <ul className="mt-1 space-y-0.5">
            {item.rectificationEvidence.slice().reverse().map((e) => (
              <li key={e.id} className="text-muted-foreground">· {new Date(e.at).toLocaleDateString()} — {e.comment ?? "photo"}</li>
            ))}
          </ul>
        </div>
      )}
      {item.rejectionReason && (
        <p className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-[11px] text-destructive">
          Rejected: {item.rejectionReason}
        </p>
      )}

      <div className="mt-3 space-y-2">
        <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])} />
        {photo ? (
          <div className="relative">
            <img src={photo} alt="" className="h-32 w-full rounded-lg object-cover" />
            <button onClick={() => setPhoto(undefined)} className="absolute right-2 top-2 rounded-full bg-background/90 px-2 py-0.5 text-xs">remove</button>
          </div>
        ) : (
          <button onClick={() => fileRef.current?.click()} className="flex h-20 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
            <Camera className="h-4 w-4" /> Upload rectification photo
          </button>
        )}
        <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Comment (optional)" />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" onClick={() => submitRectification(false)}>Save progress</Button>
          <Button onClick={() => submitRectification(true)}><Send className="mr-1 h-4 w-4" /> Mark Ready</Button>
        </div>
      </div>
    </div>
  );
}
