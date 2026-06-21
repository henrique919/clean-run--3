import type { ItemStatus, Priority } from "@/lib/types";
import { STATUS_LABEL } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Status chips use a calm, neutral palette with a small coloured dot to
 * communicate state. Only destructive states (rejected) carry a stronger tint
 * so the eye is drawn to genuine problems rather than every row in the list.
 */
const statusDot: Record<ItemStatus, string> = {
  open: "bg-muted-foreground/50",
  issued: "bg-sky-500",
  in_progress: "bg-amber-500",
  ready_for_review: "bg-violet-500",
  under_inspection: "bg-violet-500",
  rejected: "bg-destructive",
  closed: "bg-emerald-500",
  complete: "bg-emerald-500",
};

export function StatusChip({ status, className }: { status: ItemStatus; className?: string }) {
  const destructive = status === "rejected";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        destructive
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-border bg-secondary text-secondary-foreground",
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status])} />
      {STATUS_LABEL[status]}
    </span>
  );
}

const priorityStyles: Record<Priority, string> = {
  high: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  urgent: "border-destructive/30 bg-destructive/10 text-destructive",
};

export function PriorityChip({ priority }: { priority: Priority }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide",
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

export function EscalatedChip() {
  return (
    <span className="inline-flex items-center rounded-full border border-destructive/40 bg-destructive/10 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-destructive">
      Escalated · 10d+
    </span>
  );
}
