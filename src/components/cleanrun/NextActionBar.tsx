import { CheckCircle2, Mail, Send, Undo2, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Item, ItemStatus } from "@/lib/types";

export function NextActionBar({ item, onIssue, onMarkProgress, onMarkReady, onStartInspect, onReject, onClose, onReissue }: {
  item: Item;
  onIssue: () => void;
  onMarkProgress: () => void;
  onMarkReady: () => void;
  onStartInspect: () => void;
  onReject: () => void;
  onClose: () => void;
  onReissue: () => void;
}) {
  const buttons = nextButtons(item.status, item.type === "incomplete", { onIssue, onMarkProgress, onMarkReady, onStartInspect, onReject, onClose, onReissue });
  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-3">
      <p className="mb-2 text-[11px] uppercase tracking-wide text-muted-foreground">Next action</p>
      {buttons.length > 0 ? (
        <div className={`grid gap-2 ${buttons.length > 1 ? "grid-cols-2" : "grid-cols-1"}`}>
          {buttons.map((button, index) => (
            <Button key={index} onClick={button.onClick} variant={button.primary ? "default" : button.danger ? "destructive" : "outline"}>
              {button.icon && <button.icon className="mr-1 h-4 w-4" />} {button.label}
            </Button>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-border bg-background/40 p-2 text-xs text-muted-foreground">No normal workflow action available.</p>
      )}
    </div>
  );
}

type Handlers = {
  onIssue: () => void;
  onMarkProgress: () => void;
  onMarkReady: () => void;
  onStartInspect: () => void;
  onReject: () => void;
  onClose: () => void;
  onReissue: () => void;
};

function nextButtons(status: ItemStatus, incomplete: boolean, h: Handlers) {
  const buttons: { label: string; onClick: () => void; primary?: boolean; danger?: boolean; icon?: LucideIcon }[] = [];
  if (status === "open") buttons.push({ label: "Issue to subcontractor", onClick: h.onIssue, primary: true, icon: Mail });
  if (status === "issued") {
    buttons.push({ label: "Mark in progress", onClick: h.onMarkProgress, primary: true });
    buttons.push({ label: "Re-issue", onClick: h.onReissue, icon: Undo2 });
  }
  if (status === "in_progress") {
    buttons.push({ label: "Mark ready for review", onClick: h.onMarkReady, primary: true, icon: Send });
    buttons.push({ label: "Re-issue", onClick: h.onReissue, icon: Undo2 });
  }
  if (status === "ready_for_review") {
    buttons.push({ label: "Start inspection", onClick: h.onStartInspect, primary: true });
    buttons.push({ label: "Reject", onClick: h.onReject, danger: true });
  }
  if (status === "under_inspection") {
    buttons.push({ label: incomplete ? "Mark complete" : "Close with evidence", onClick: h.onClose, primary: true, icon: CheckCircle2 });
    buttons.push({ label: "Reject", onClick: h.onReject, danger: true });
  }
  if (status === "rejected") buttons.push({ label: "Re-issue", onClick: h.onReissue, primary: true, icon: Undo2 });
  return buttons;
}
