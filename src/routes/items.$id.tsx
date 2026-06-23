import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft, Camera, CheckCircle2, Mail, MapPin, MessageSquare, Send, ShieldAlert,
  Undo2, X, ClipboardList, Search,
} from "lucide-react";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip, PriorityChip, OverdueChip, EscalatedChip } from "@/components/StatusChip";
import { itemsStore, useItems, isOverdue, useSettings } from "@/lib/store";
import type { CloseoutEvidence, Item, ItemStatus } from "@/lib/types";
import { TYPE_LABEL, daysInProgress } from "@/lib/types";

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
  const settings = useSettings();
  const item = items.find((i) => i.id === id);
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [reissuing, setReissuing] = useState(false);

  if (!item) throw notFound();

  const overdue = isOverdue(item);
  const canCloseType = item.type === "defect" || item.type === "client";

  function issueMail() {
    const subject = `[CleanRun IQ] ${item!.code} ${TYPE_LABEL[item!.type]} — ${item!.building} ${item!.unit} ${item!.room}`;
    const body = [
      `Project: ${item!.project}`,
      `Location: ${item!.building} / ${item!.level} / ${item!.unit} / ${item!.room}`,
      `Trade: ${item!.trade}`,
      `Priority: ${item!.priority}`,
      `Due: ${item!.dueDate}`,
      "", item!.description, "",
      `View item: ${window.location.origin}/items/${item!.id}`,
    ].join("\n");
    window.location.href = `mailto:${encodeURIComponent(settings.subProfiles[item!.subcontractor]?.email ?? "")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <AppShell
      title={`${item.code} · ${item.building} ${item.unit} · ${item.room}`}
      subtitle={`${TYPE_LABEL[item.type]} · ${item.project}`}
      action={
        <Link to="/items" className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <ArrowLeft className="h-3 w-3" /> Back
        </Link>
      }
    >
      {/* Header summary */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {item.originalPhotos[0] ? (
          <img src={item.originalPhotos[0]} alt="" className="h-56 w-full object-cover sm:h-72" />
        ) : (
          <div className="flex h-40 items-center justify-center text-muted-foreground"><Camera className="h-8 w-8" /></div>
        )}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-[11px] font-semibold tracking-wider">{item.code}</span>
            <StatusChip status={item.status} />
            <PriorityChip priority={item.priority} />
            {overdue && <OverdueChip />}
            {daysInProgress(item) > 10 && <EscalatedChip />}
          </div>
          <p className="text-sm text-foreground">{item.description}</p>
          <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {item.building} · {item.level}</span>
            <span>Due: <span className="text-foreground">{item.dueDate}</span></span>
            <span>Trade: <span className="text-foreground">{item.trade || "—"}</span></span>
            <span>Sub: <span className="text-foreground">{item.subcontractor || "Unassigned"}</span></span>
            {item.raisedBy && <span className="col-span-2">Raised by: <span className="text-foreground">{item.raisedBy}</span></span>}
          </div>
        </div>
      </div>

      {/* Next action */}
      <NextActionBar
        item={item}
        onIssue={() => setReissuing(true)}
        onMarkProgress={() => itemsStore.markInProgress(item.id, settings.preparedBy)}
        onMarkReady={() => itemsStore.markReady(item.id, settings.preparedBy)}
        onStartInspect={() => itemsStore.startInspection(item.id, settings.preparedBy ?? "Site Manager")}
        onReject={() => setRejecting(true)}
        onClose={() => setClosing(true)}
        onReissue={() => setReissuing(true)}
        onReopen={() => itemsStore.reopen(item.id, settings.preparedBy)}
        canCloseType={canCloseType}
      />

      {/* A. Original Issue */}
      <Section title="Original issue" icon={ClipboardList}>
        {item.originalPhotos.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {item.originalPhotos.slice(1).map((p, i) => (
              <img key={i} src={p} alt="" className="h-20 w-full rounded-lg object-cover" />
            ))}
          </div>
        )}
        <KV label="Captured" value={`${new Date(item.createdAt).toLocaleString()}${item.createdBy ? ` · ${item.createdBy}` : ""}`} />
        <KV label="Description" value={item.description} />
      </Section>

      {/* B. Assignment */}
      <Section title="Assignment & issue history" icon={Mail}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm">
            <p className="font-medium">{item.subcontractor || "Unassigned"}</p>
            <p className="text-xs text-muted-foreground">{item.trade || "—"}</p>
          </div>
          <Button variant="outline" size="sm" onClick={issueMail}><Mail className="mr-1 h-3.5 w-3.5" /> Email sub</Button>
        </div>
        {item.issueHistory.length === 0 ? (
          <p className="text-xs text-muted-foreground">Not yet issued.</p>
        ) : (
          <ul className="space-y-1 text-xs">
            {item.issueHistory.slice().reverse().map((e, i) => (
              <li key={i} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                <span className="font-medium">{e.reissue ? "Re-issued" : "Issued"}</span> to {e.to}
                <span className="text-muted-foreground"> · {new Date(e.at).toLocaleString()}</span>
                {e.by && <span className="text-muted-foreground"> · {e.by}</span>}
                {e.note && <p className="mt-0.5 text-muted-foreground">{e.note}</p>}
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* C. Subcontractor response */}
      <Section title="Subcontractor response" icon={Send}>
        {item.rectificationEvidence.length === 0 ? (
          <p className="text-xs text-muted-foreground">No rectification evidence yet.</p>
        ) : (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-2">
              {item.rectificationEvidence.map((e) => e.photo && (
                <img key={e.id} src={e.photo} alt="" className="h-24 w-full rounded-lg object-cover" />
              ))}
            </div>
            <ul className="space-y-1 text-xs">
              {item.rectificationEvidence.slice().reverse().map((e) => (
                <li key={e.id} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                  <span className="font-medium">{e.by}</span>
                  <span className="text-muted-foreground"> · {new Date(e.at).toLocaleString()}</span>
                  {e.comment && <p className="mt-0.5">{e.comment}</p>}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Section>

      {/* D. Inspection */}
      {(item.status === "ready_for_review" || item.status === "under_inspection" || item.status === "rejected" || item.inspectionHistory.length > 0) && (
        <Section title="Inspection" icon={Search}>
          {item.inspectionHistory.length === 0 ? (
            <p className="text-xs text-muted-foreground">Inspection not started.</p>
          ) : (
            <ul className="space-y-1 text-xs">
              {item.inspectionHistory.slice().reverse().map((e, i) => (
                <li key={i} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
                  <span className="font-medium capitalize">{e.action}</span>
                  <span className="text-muted-foreground"> · {new Date(e.at).toLocaleString()} · {e.by}</span>
                  {e.reason && <p className="mt-0.5 text-destructive">Reason: {e.reason}</p>}
                </li>
              ))}
            </ul>
          )}
          {item.rejectionReason && (
            <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
              <ShieldAlert className="mr-1 inline h-3 w-3" /> {item.rejectionReason}
            </p>
          )}
        </Section>
      )}

      {/* E. Closeout */}
      {item.closeoutEvidence.length > 0 && (
        <Section title="Closeout evidence" icon={CheckCircle2}>
          <div className="space-y-3">
            {item.closeoutEvidence.map((e) => (
              <div key={e.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">
                <img src={e.photo} alt="" className="h-40 w-full rounded-lg object-cover" />
                <p className="mt-2 text-xs">
                  <span className="font-medium">{e.by}</span> · {e.role} · {new Date(e.at).toLocaleString()}
                </p>
                {e.note && <p className="mt-1 text-sm">{e.note}</p>}
                {e.confirmation && <p className="mt-1 text-[11px] italic text-muted-foreground">"{e.confirmation}"</p>}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* F. Comments */}
      <CommentsBlock item={item} />

      {/* G. Audit trail */}
      <Section title="Audit trail">
        <ol className="space-y-2 border-l border-border pl-4">
          {item.auditEvents.slice().reverse().map((h, i) => (
            <li key={i} className="relative text-xs text-muted-foreground">
              <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary" />
              <span className="font-medium text-foreground">{h.action}</span>
              {h.by && <span> · {h.by}</span>}
              <span className="ml-1">{new Date(h.at).toLocaleString()}</span>
              {h.note && <p className="mt-0.5">{h.note}</p>}
            </li>
          ))}
        </ol>
      </Section>

      <div className="mt-8 flex justify-end">
        <button
          onClick={() => {
            if (confirm("Archive this item?")) { itemsStore.remove(item.id); navigate({ to: "/items" }); }
          }}
          className="text-xs text-destructive"
        >Archive item</button>
      </div>

      {closing && <CloseoutDialog item={item} onClose={() => setClosing(false)} defaultBy={settings.preparedBy ?? ""} />}
      {rejecting && <RejectDialog item={item} onClose={() => setRejecting(false)} defaultBy={settings.preparedBy ?? "Site Manager"} />}
      {reissuing && <ReissueDialog item={item} onClose={() => setReissuing(false)} subs={settings.subcontractors} defaultBy={settings.preparedBy} />}
    </AppShell>
  );
}

function NextActionBar(props: {
  item: Item;
  onIssue: () => void; onMarkProgress: () => void; onMarkReady: () => void;
  onStartInspect: () => void; onReject: () => void; onClose: () => void;
  onReissue: () => void; onReopen: () => void; canCloseType: boolean;
}) {
  const s: ItemStatus = props.item.status;
  const btns: { label: string; onClick: () => void; primary?: boolean; danger?: boolean; icon?: typeof Mail }[] = [];

  if (s === "open") btns.push({ label: "Issue to subcontractor", onClick: props.onIssue, primary: true, icon: Mail });
  if (s === "issued") {
    btns.push({ label: "Mark in progress", onClick: props.onMarkProgress, primary: true });
    btns.push({ label: "Re-issue", onClick: props.onReissue, icon: Undo2 });
  }
  if (s === "in_progress") {
    btns.push({ label: "Mark ready for review", onClick: props.onMarkReady, primary: true, icon: Send });
    btns.push({ label: "Re-issue", onClick: props.onReissue, icon: Undo2 });
  }
  if (s === "ready_for_review") {
    btns.push({ label: "Start inspection", onClick: props.onStartInspect, primary: true });
    btns.push({ label: "Reject", onClick: props.onReject, danger: true });
  }
  if (s === "under_inspection") {
    btns.push({ label: props.canCloseType ? "Close with evidence" : "Mark complete", onClick: props.onClose, primary: true, icon: CheckCircle2 });
    btns.push({ label: "Reject", onClick: props.onReject, danger: true });
  }
  if (s === "rejected") {
    btns.push({ label: "Re-issue", onClick: props.onReissue, primary: true, icon: Undo2 });
  }
  if (s === "closed" || s === "complete") {
    btns.push({ label: "Reopen", onClick: props.onReopen });
  }

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Next action</p>
      <div className={`grid gap-2 ${btns.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
        {btns.map((b, i) => (
          <Button
            key={i}
            onClick={b.onClick}
            variant={b.primary ? "default" : b.danger ? "destructive" : "outline"}
          >
            {b.icon && <b.icon className="mr-1 h-4 w-4" />} {b.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Section({ title, icon: Icon, children }: { title: string; icon?: typeof Mail; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl border border-border bg-card p-4">
      <h3 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {Icon && <Icon className="h-3.5 w-3.5" />} {title}
      </h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid grid-cols-3 gap-2 text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="col-span-2">{value}</span>
    </div>
  );
}

function CommentsBlock({ item }: { item: Item }) {
  const settings = useSettings();
  const [text, setText] = useState("");
  return (
    <Section title="Comments" icon={MessageSquare}>
      {item.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      {item.comments.length > 0 && (
        <ul className="space-y-1 text-xs">
          {item.comments.slice().reverse().map((c) => (
            <li key={c.id} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5">
              <span className="font-medium">{c.by}</span>
              <span className="text-muted-foreground"> · {new Date(c.at).toLocaleString()}</span>
              <p className="mt-0.5">{c.text}</p>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="h-9" />
        <Button
          size="sm"
          onClick={() => {
            if (!text.trim()) return;
            itemsStore.addComment(item.id, { text: text.trim(), by: settings.preparedBy ?? "Site Manager" });
            setText("");
          }}
        >Post</Button>
      </div>
    </Section>
  );
}

function CloseoutDialog({ item, onClose, defaultBy }: { item: Item; onClose: () => void; defaultBy: string }) {
  const [signedBy, setSignedBy] = useState(defaultBy);
  const [role, setRole] = useState("Site Manager");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSkipPhoto = item.type === "incomplete";

  function handleFile(file: File | undefined) {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setPhotos((p) => [...p, r.result as string]);
    r.readAsDataURL(file);
  }

  function submit() {
    if (!canSkipPhoto && photos.length === 0) { alert("At least one closeout photo is required."); return; }
    if (!signedBy.trim()) { alert("Signed off by is required."); return; }
    if (!confirmed) { alert("Please confirm the item has been inspected and is acceptable for closeout."); return; }
    const evidence: Omit<CloseoutEvidence, "id" | "at">[] = photos.length
      ? photos.map((photo) => ({ photo, by: signedBy.trim(), role, note: note.trim() || undefined, confirmation: "I confirm this item has been inspected and is acceptable for closeout." }))
      : [{ photo: "", by: signedBy.trim(), role, note: note.trim() || "Marked complete without photo evidence.", confirmation: "I confirm this item has been inspected and is acceptable for closeout." }];
    itemsStore.closeWithEvidence(item.id, evidence);
    onClose();
  }

  return (
    <Modal title={`Close out ${item.code}`} onClose={onClose}>
      <p className="mt-1 text-xs text-muted-foreground">
        {canSkipPhoto ? "Photo evidence is recommended for incomplete works." : "Photo evidence and sign-off are required."}
      </p>
      <div className="mt-4 space-y-3">
        <div>
          <Label className="text-[11px] uppercase">Closeout photos{canSkipPhoto ? "" : " *"}</Label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0])} />
          {photos.length > 0 ? (
            <div className="mt-1 grid grid-cols-3 gap-2">
              {photos.map((p, i) => (
                <div key={i} className="relative">
                  <img src={p} alt="" className="h-20 w-full rounded-lg object-cover" />
                  <button onClick={() => setPhotos((arr) => arr.filter((_, j) => j !== i))} className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5">
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">
                + Add
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="mt-1 flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground">
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
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
        </div>
        <label className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2 text-xs">
          <input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" />
          <span>I confirm this item has been inspected and is acceptable for closeout.</span>
        </label>
      </div>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={submit} className="flex-1">Close item</Button>
      </div>
    </Modal>
  );
}

function RejectDialog({ item, onClose, defaultBy }: { item: Item; onClose: () => void; defaultBy: string }) {
  const [reason, setReason] = useState("");
  const [by] = useState(defaultBy);
  return (
    <Modal title={`Reject ${item.code}`} onClose={onClose}>
      <p className="text-xs text-muted-foreground">Provide a clear reason — this goes back to the subcontractor.</p>
      <Textarea rows={3} className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" />
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="destructive" onClick={() => {
          if (!reason.trim()) { alert("A rejection reason is required."); return; }
          itemsStore.reject(item.id, by, reason.trim()); onClose();
        }} className="flex-1">Reject</Button>
      </div>
    </Modal>
  );
}

function ReissueDialog({ item, onClose, subs, defaultBy }: { item: Item; onClose: () => void; subs: string[]; defaultBy?: string }) {
  const [to, setTo] = useState(item.subcontractor || subs[0] || "");
  const [note, setNote] = useState("");
  const reissue = item.issueHistory.length > 0;
  return (
    <Modal title={`${reissue ? "Re-issue" : "Issue"} ${item.code}`} onClose={onClose}>
      <Label className="text-[11px] uppercase">Subcontractor</Label>
      <select value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {subs.map((s) => <option key={s} value={s}>{s}</option>)}
      </select>
      <Label className="mt-3 block text-[11px] uppercase">Note (optional)</Label>
      <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Any extra context for the sub" />
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={() => {
          if (!to) { alert("Choose a subcontractor."); return; }
          itemsStore.issue(item.id, { to, by: defaultBy, note: note.trim() || undefined, reissue });
          onClose();
        }} className="flex-1">{reissue ? "Re-issue" : "Issue"}</Button>
      </div>
    </Modal>
  );
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-foreground/30 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-3xl bg-card p-5 shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold">{title}</h3>
          <button onClick={onClose} className="rounded-full p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
