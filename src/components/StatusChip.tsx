import type { ItemStatus, Priority } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

const statusStyles: Record<ItemStatus, string> = {
  open: "bg-secondary text-secondary-foreground",
  issued: "bg-info/15 text-info",
  in_progress: "bg-warning/20 text-warning-foreground",
  ready_for_review: "bg-review/15 text-review",
  under_inspection: "bg-review/15 text-review",
  rejected: "bg-destructive/15 text-destructive",
  closed: "bg-success/15 text-success",
  complete: "bg-success/15 text-success",
};

export function StatusChip({ status, className }: { status: ItemStatus; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        statusStyles[status],
        className,
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}

const priorityStyles: Record<Priority, string> = {
  low: "bg-muted text-muted-foreground",
  medium: "bg-info/10 text-info",
  high: "bg-warning/20 text-warning-foreground",
  urgent: "bg-destructive/15 text-destructive",
};

export function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide",
        priorityStyles[priority],
      )}
    >
      {priority}
    </span>
  );
}

export function OverdueChip() {
  return (
    <span className="inline-flex items-center rounded-full bg-destructive px-2 py-0.5 text-[11px] font-semibold text-destructive-foreground">
      Overdue
    </span>
  );
}
