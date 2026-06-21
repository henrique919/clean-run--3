import { Link } from "@tanstack/react-router";
import { Camera, MapPin, CalendarDays, User, ArrowRight } from "lucide-react";
import type { Item } from "@/lib/types";
import { nextActionLabel, TYPE_LABEL, isEscalated } from "@/lib/types";
import { isOverdue } from "@/lib/store";
import { StatusChip, PriorityChip, OverdueChip, EscalatedChip } from "./StatusChip";

export function ItemCard({ item }: { item: Item }) {
  const overdue = isOverdue(item);
  const escalated = isEscalated(item);
  const isClosed = item.status === "closed" || item.status === "complete";
  return (
    <Link
      to="/items/$id"
      params={{ id: item.id }}
      className="group block overflow-hidden rounded-2xl border border-border bg-card transition hover:border-primary/40 hover:shadow-[0_2px_12px_-4px_rgb(0_0_0_/0.08)]"
    >
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {item.photos[0] ? (
            <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Camera className="h-6 w-6" />
            </div>
          )}
          <span className="absolute bottom-1 left-1 rounded-full bg-background/85 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-foreground/80 backdrop-blur">
            {TYPE_LABEL[item.type]}
          </span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <span className="rounded-md bg-foreground/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold tracking-wider text-foreground">
              {item.code}
            </span>
            <div className="flex items-center gap-1">
              {escalated && <EscalatedChip />}
              {overdue && <OverdueChip />}
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">
              {item.building} · {item.level} · {item.unit} · {item.room}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium leading-snug text-foreground">{item.description}</p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <StatusChip status={item.status} />
            <PriorityChip priority={item.priority} />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1 truncate">
              <User className="h-3 w-3 shrink-0" />
              <span className="truncate">{item.subcontractor || "Unassigned"}</span>
            </span>
            <span className="flex items-center gap-1 shrink-0">
              <CalendarDays className="h-3 w-3" />
              {item.dueDate}
            </span>
          </div>
        </div>
      </div>
      {!isClosed && (
        <div className="flex items-center justify-between border-t border-border bg-muted/40 px-3 py-1.5 text-[11px]">
          <span className="text-muted-foreground">Next</span>
          <span className="inline-flex items-center gap-1 font-medium text-primary">
            {nextActionLabel(item.status)} <ArrowRight className="h-3 w-3" />
          </span>
        </div>
      )}
    </Link>
  );
}
