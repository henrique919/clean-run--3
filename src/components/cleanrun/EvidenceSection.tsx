import { Camera, CheckCircle2, ClipboardList, Search, Send, ShieldAlert } from "lucide-react";
import type { Item } from "@/lib/types";
import { SectionCard } from "./SectionCard";

export function OriginalIssueSection({ item }: { item: Item }) {
  return (
    <SectionCard title="Original issue" icon={ClipboardList}>
      {item.originalPhotos.length > 1 ? (
        <div className="grid grid-cols-4 gap-2">
          {item.originalPhotos.slice(1).filter(Boolean).map((photo, index) => <img key={index} src={photo} alt="" className="h-20 w-full rounded-lg object-cover" />)}
        </div>
      ) : (
        <p className="flex items-center gap-1 text-xs text-muted-foreground"><Camera className="h-3 w-3" /> No additional original photos.</p>
      )}
      <KV label="Captured" value={`${new Date(item.createdAt).toLocaleString()}${item.createdBy ? ` · ${item.createdBy}` : ""}`} />
      <KV label="Description" value={item.description} />
    </SectionCard>
  );
}

export function RectificationEvidenceSection({ item }: { item: Item }) {
  return (
    <SectionCard title="Subcontractor response" icon={Send}>
      {item.rectificationEvidence.length === 0 ? <p className="text-xs text-muted-foreground">No rectification evidence yet.</p> : <>
        {item.rectificationEvidence.some((e) => e.photo) ? <div className="grid grid-cols-3 gap-2">{item.rectificationEvidence.map((e) => e.photo && <img key={e.id} src={e.photo} alt="" className="h-24 w-full rounded-lg object-cover" />)}</div> : <p className="text-xs text-muted-foreground">No photo attached.</p>}
        <EventList events={item.rectificationEvidence.slice().reverse().map((e) => ({ id: e.id, title: e.by, at: e.at, note: e.comment }))} />
      </>}
    </SectionCard>
  );
}

export function InspectionSection({ item }: { item: Item }) {
  const visible = item.status === "ready_for_review" || item.status === "under_inspection" || item.status === "rejected" || item.inspectionHistory.length > 0;
  if (!visible) return null;
  return (
    <SectionCard title="Inspection" icon={Search}>
      {item.inspectionHistory.length === 0 ? <p className="text-xs text-muted-foreground">Inspection not started.</p> : <EventList events={item.inspectionHistory.slice().reverse().map((e, index) => ({ id: `${e.at}-${index}`, title: e.action, at: e.at, by: e.by, note: e.reason }))} dangerNote />}
      {item.rejectionReason && <p className="rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive"><ShieldAlert className="mr-1 inline h-3 w-3" /> {item.rejectionReason}</p>}
    </SectionCard>
  );
}

export function CloseoutEvidenceSection({ item }: { item: Item }) {
  if (item.closeoutEvidence.length === 0) return null;
  return (
    <SectionCard title="Closeout evidence" icon={CheckCircle2}>
      <div className="space-y-3">
        {item.closeoutEvidence.map((e) => <div key={e.id} className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-3">{e.photo ? <img src={e.photo} alt="" className="h-40 w-full rounded-lg object-cover" /> : <p className="rounded-lg border border-dashed border-border bg-background/50 p-3 text-xs text-muted-foreground">{item.type === "incomplete" ? "Completed without photo evidence" : "No photo attached"}</p>}<p className="mt-2 text-xs"><span className="font-medium">{e.by}</span> · {e.role} · {new Date(e.at).toLocaleString()}</p>{e.note && <p className="mt-1 text-sm">{e.note}</p>}{e.confirmation && <p className="mt-1 text-[11px] italic text-muted-foreground">"{e.confirmation}"</p>}</div>)}
      </div>
    </SectionCard>
  );
}

function KV({ label, value }: { label: string; value: string }) {
  return <div className="grid grid-cols-3 gap-2 text-xs"><span className="text-muted-foreground">{label}</span><span className="col-span-2">{value}</span></div>;
}

export function EventList({ events, dangerNote }: { events: { id: string; title: string; at: string; by?: string; note?: string }[]; dangerNote?: boolean }) {
  return <ul className="space-y-1 text-xs">{events.map((event) => <li key={event.id} className="rounded-md border border-border/60 bg-background/40 px-2 py-1.5"><span className="font-medium capitalize">{event.title}</span>{event.by && <span className="text-muted-foreground"> · {event.by}</span>}<span className="text-muted-foreground"> · {new Date(event.at).toLocaleString()}</span>{event.note && <p className={`mt-0.5 ${dangerNote ? "text-destructive" : "text-muted-foreground"}`}>{event.note}</p>}</li>)}</ul>;
}
