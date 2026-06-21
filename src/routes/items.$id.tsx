import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { ArrowLeft, Camera, CheckCircle2, Mail, MapPin, Send, X } from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip, PriorityChip } from "@/components/StatusChip";
import { itemsStore, useItems, isOverdue } from "@/lib/store";

export const Route = createFileRoute("/items/$id")({
  component: ItemDetail,
  head: () => ({ meta: [{ title: "Item — CleanRun IQ" }] }),
  notFoundComponent: () => (
    <AppShell title="Not found"><p className="text-sm text-muted-foreground">Item not found.</p></AppShell>
  ),
});

function ItemDetail() {
  const { id } = Route.useParams();
  const items = useItems();
  const item = items.find((i) => i.id === id);
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);

  if (!item) throw notFound();

  function issue() {
    const subject = `[CleanRun IQ] ${item!.type} — ${item!.building} ${item!.unit} ${item!.room}`;
    const body = [
      `Project: ${item!.project}`,
      `Location: ${item!.building} / ${item!.level} / ${item!.unit} / ${item!.room}`,
      `Trade: ${item!.trade}`,
      `Priority: ${item!.priority}`,
      `Due: ${item!.dueDate}`,
      "",
      item!.description,
      "",
      `View item: ${window.location.origin}/items/${item!.id}`,
    ].join("\n");
    itemsStore.setStatus(item!.id, "issued", `Re-issued to ${item!.subcontractor || "subcontractor"}`);
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <AppShell
      title={`${item.code} · ${item.building} · ${item.unit} · ${item.room}`}
      subtitle={item.project}
      action={
        <Link to="/items" className="text-xs text-muted-foreground inline-flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
      }
    >
      {/* Hero photo */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {item.photos[0] ? (
          <img src={item.photos[0]} alt="" className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground">
            <Camera className="h-8 w-8" />
          </div>
        )}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <StatusChip status={item.status} />
            <PriorityChip priority={item.priority} />
            {isOverdue(item) && (
              <span className="rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
                Overdue
              </span>
            )}
          </div>
          <p className="text-sm text-foreground">{item.description}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.building}/{item.level}</span>
            <span>Trade: <span className="text-foreground">{item.trade || "—"}</span></span>
            <span>Sub: <span className="text-foreground">{item.subcontractor || "Unassigned"}</span></span>
            <span>Due: <span className="text-foreground">{item.dueDate}</span></span>
          </div>
        </div>
      </div>

      {/* Extra photos */}
      {item.photos.length > 1 && (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {item.photos.slice(1).map((p, i) => (
            <img key={i} src={p} alt="" className="h-20 w-full rounded-lg object-cover" />
          ))}
        </div>
      )}

      {/* Actions */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Button variant="outline" onClick={issue}>
          <Mail className="mr-1 h-4 w-4" /> {item.status === "open" ? "Issue" : "Re-issue"}
        </Button>
        <Button
          variant="outline"
          onClick={() => itemsStore.setStatus(item.id, "ready_for_review", "Marked Ready")}
          disabled={item.status === "ready_for_review"}
        >
          <Send className="mr-1 h-4 w-4" /> Mark Ready
        </Button>
        <Button
          variant="outline"
          onClick={() => itemsStore.setStatus(item.id, "under_inspection", "Inspecting")}
          disabled={item.status !== "ready_for_review"}
        >
          Review
        </Button>
        <Button onClick={() => setClosing(true)} disabled={item.status === "closed" || item.status === "complete"}>
          <CheckCircle2 className="mr-1 h-4 w-4" /> Close
        </Button>
      </div>

      {/* Closeout */}
      {item.closeout && (
        <section className="mt-6 rounded-2xl border border-success/30 bg-success/5 p-4">
          <h3 className="text-sm font-semibold text-success">Closed out</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            By {item.closeout.signedBy} ({item.closeout.role}) · {new Date(item.closeout.signedAt).toLocaleString()}
          </p>
          {item.closeout.note && <p className="mt-2 text-sm">{item.closeout.note}</p>}
          {item.closeout.photo && (
            <img src={item.closeout.photo} alt="Closeout" className="mt-3 h-40 w-full rounded-lg object-cover" />
          )}
        </section>
      )}

      {/* History */}
      <section className="mt-6">
        <h3 className="mb-2 text-sm font-semibold">Audit trail</h3>
        <ol className="space-y-2 border-l border-border pl-4">
          {item.history.slice().reverse().map((h, i) => (
            <li key={i} className="relative text-xs text-muted-foreground">
              <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium text-foreground">{h.action}</span>
              {h.by && <span> · {h.by}</span>}
              <span className="ml-1">{new Date(h.at).toLocaleString()}</span>
              {h.note && <p className="mt-0.5">{h.note}</p>}
            </li>
          ))}
        </ol>
      </section>

      {/* Danger */}
      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            if (confirm("Archive this item?")) {
              itemsStore.remove(item.id);
              navigate({ to: "/items" });
            }
          }}
          className="text-xs text-destructive"
        >
          Archive item
        </button>
      </div>

      {closing && <CloseoutDialog itemId={item.id} onClose={() => setClosing(false)} />}
    </AppShell>
  );
}

function CloseoutDialog({ itemId, onClose }: { itemId: string; onClose: () => void }) {
  const [signedBy, setSignedBy] = useState("");
  const [role, setRole] = useState("Site Manager");
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | undefined>();
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File | undefined) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setPhoto(r.result as string);
    r.readAsDataURL(file);
  }

  function submit() {
    if (!photo || !signedBy.trim()) {
      alert("Closeout photo and name are required.");
      return;
    }
    itemsStore.close(itemId, {
      photo,
      signedBy: signedBy.trim(),
      role,
      note: note.trim() || undefined,
      signedAt: new Date().toISOString(),
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">Close out item</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">Closeout photo and signoff are required.</p>

        <div className="mt-4 space-y-3">
          <div>
            <Label className="text-[11px] uppercase">Closeout photo *</Label>
            <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
              onChange={(e) => handleFile(e.target.files?.[0])} />
            {photo ? (
              <div className="relative mt-1">
                <img src={photo} alt="" className="h-40 w-full rounded-lg object-cover" />
                <button onClick={() => setPhoto(undefined)} className="absolute right-2 top-2 rounded-full bg-background/90 p-1">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                className="mt-1 flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground"
              >
                <Camera className="h-4 w-4" /> Take or upload photo
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-[11px] uppercase">Signed off by *</Label>
              <Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name" />
            </div>
            <div>
              <Label className="text-[11px] uppercase">Role</Label>
              <Input value={role} onChange={(e) => setRole(e.target.value)} />
            </div>
          </div>
          <div>
            <Label className="text-[11px] uppercase">Note</Label>
            <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>
        </div>

        <div className="mt-5 flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={submit} className="flex-1">Close item</Button>
        </div>
      </div>
    </div>
  );
}
