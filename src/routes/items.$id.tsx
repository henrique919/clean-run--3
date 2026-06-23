import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Undo2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { AuditTrail } from "@/components/cleanrun/AuditTrail";
import { CloseoutDialog } from "@/components/cleanrun/CloseoutDialog";
import { CommentsBlock } from "@/components/cleanrun/CommentsBlock";
import { CloseoutEvidenceSection, InspectionSection, OriginalIssueSection, RectificationEvidenceSection } from "@/components/cleanrun/EvidenceSection";
import { IssueHistorySection } from "@/components/cleanrun/IssueHistorySection";
import { ItemSummaryCard } from "@/components/cleanrun/ItemSummaryCard";
import { NextActionBar } from "@/components/cleanrun/NextActionBar";
import { ReissueDialog } from "@/components/cleanrun/ReissueDialog";
import { RejectDialog } from "@/components/cleanrun/RejectDialog";
import { ReopenDialog } from "@/components/cleanrun/ReopenDialog";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/AppShell";
import { buildIssueEmail, itemTypeLabel, openMailto, subcontractorEmail } from "@/lib/cleanrun-utils";
import { itemsStore, useItems, useSettings } from "@/lib/store";

export const Route = createFileRoute("/items/$id")({
  component: ItemDetail,
  head: () => ({ meta: [{ title: "Item — CleanRun IQ" }] }),
  notFoundComponent: () => <AppShell title="Not found"><p className="text-sm text-muted-foreground">Item not found.</p></AppShell>,
});

function ItemDetail() {
  const { id } = Route.useParams();
  const items = useItems();
  const settings = useSettings();
  const item = items.find((candidate) => candidate.id === id);
  const navigate = useNavigate();
  const [closing, setClosing] = useState(false);
  const [rejecting, setRejecting] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [reopening, setReopening] = useState(false);

  if (!item) throw notFound();

  function emailSubcontractor(to = item.subcontractor, note?: string) {
    if (!to) { toast.error("Choose a subcontractor before emailing."); return; }
    const email = subcontractorEmail(settings, to);
    if (!email) toast.warning("No email set for this subcontractor.");
    const { subject, body } = buildIssueEmail({ ...item, subcontractor: to }, note);
    openMailto(email, subject, body);
  }

  function issueSubcontractor(to: string, note?: string, reissue = item.issueHistory.length > 0) {
    if (!to) { toast.error("Choose a subcontractor before issuing."); return; }
    itemsStore.issue(item.id, { to, by: settings.preparedBy, note, reissue });
    emailSubcontractor(to, note);
  }

  return (
    <AppShell
      title={`${item.code} · ${item.building} ${item.unit} · ${item.room}`}
      subtitle={`${itemTypeLabel(item.type)} · ${item.project}`}
      action={<Link to="/items" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="h-3 w-3" /> Back</Link>}
    >
      <ItemSummaryCard item={item} />
      <NextActionBar
        item={item}
        onIssue={() => setIssuing(true)}
        onMarkProgress={() => itemsStore.markInProgress(item.id, settings.preparedBy)}
        onMarkReady={() => itemsStore.markReady(item.id, settings.preparedBy)}
        onStartInspect={() => itemsStore.startInspection(item.id, settings.preparedBy ?? "Site Manager")}
        onReject={() => setRejecting(true)}
        onClose={() => setClosing(true)}
        onReissue={() => setIssuing(true)}
      />
      <OriginalIssueSection item={item} />
      <IssueHistorySection item={item} onEmailSubcontractor={() => emailSubcontractor()} />
      <RectificationEvidenceSection item={item} />
      <InspectionSection item={item} />
      <CloseoutEvidenceSection item={item} />
      <CommentsBlock item={item} />
      <AuditTrail item={item} />

      {(item.status === "closed" || item.status === "complete") && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Admin action</p>
          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">Reopening returns the item to In Progress and keeps all previous closeout evidence and audit history.</p>
            <Button variant="outline" size="sm" onClick={() => setReopening(true)}><Undo2 className="mr-1 h-3.5 w-3.5" /> Reopen</Button>
          </div>
        </section>
      )}

      <div className="mt-8 flex justify-end">
        <button onClick={() => { if (confirm("Archive this item?")) { itemsStore.remove(item.id); navigate({ to: "/items" }); } }} className="text-xs text-destructive">Archive item</button>
      </div>

      {closing && <CloseoutDialog item={item} onClose={() => setClosing(false)} defaultBy={settings.preparedBy ?? ""} />}
      {rejecting && <RejectDialog item={item} onClose={() => setRejecting(false)} defaultBy={settings.preparedBy ?? "Site Manager"} />}
      {issuing && <ReissueDialog item={item} onClose={() => setIssuing(false)} subs={settings.subcontractors} defaultBy={settings.preparedBy} onIssue={issueSubcontractor} />}
      {reopening && <ReopenDialog item={item} onClose={() => setReopening(false)} defaultBy={settings.preparedBy ?? "Site Manager"} />}
    </AppShell>
  );
}
