import { Link } from "@tanstack/react-router";
import { Camera, MapPin, CalendarDays, User } from "lucide-react";
import type { Item } from "@/lib/types";
import { isOverdue } from "@/lib/store";
import { StatusChip, PriorityChip, OverdueChip } from "./StatusChip";

export function ItemCard({ item }: { item: Item }) {
  const overdue = isOverdue(item);
  return (
    <Link
      to="/items/$id"
      params={{ id: item.id }}
      className="group block rounded-2xl border border-border bg-card p-3 transition hover:border-primary/40 hover:shadow-sm"
    >
      <div className="flex gap-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          {item.photos[0] ? (
            <img src={item.photos[0]} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <Camera className="h-6 w-6" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 text-xs text-muted-foreground flex items-center gap-1">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {item.building} · {item.level} · {item.unit} · {item.room}
              </span>
            </div>
            {overdue ? <OverdueChip /> : null}
          </div>
          <p className="mt-1 line-clamp-2 text-sm font-medium text-foreground">{item.description}</p>
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
    </Link>
  );
}
