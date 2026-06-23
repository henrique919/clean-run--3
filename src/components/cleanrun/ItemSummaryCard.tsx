import { Camera, MapPin } from "lucide-react";
import { EscalatedChip, OverdueChip, PriorityChip, StatusChip } from "@/components/StatusChip";
import { formatLocation } from "@/lib/cleanrun-utils";
import { isOverdue } from "@/lib/store";
import type { Item } from "@/lib/types";
import { daysInProgress } from "@/lib/types";

export function ItemSummaryCard({ item }: { item: Item }) {
  return (
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
          {isOverdue(item) && <OverdueChip />}
          {daysInProgress(item) > 10 && <EscalatedChip />}
        </div>
        <p className="text-sm text-foreground">{item.description}</p>
        <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
          <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {formatLocation(item)}</span>
          <span>Due: <span className="text-foreground">{item.dueDate}</span></span>
          <span>Trade: <span className="text-foreground">{item.trade || "—"}</span></span>
          <span>Sub: <span className="text-foreground">{item.subcontractor || "Unassigned"}</span></span>
          {item.raisedBy && <span className="col-span-2">Raised by: <span className="text-foreground">{item.raisedBy}</span></span>}
        </div>
      </div>
    </div>
  );
}
