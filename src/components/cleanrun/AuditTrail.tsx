import type { Item } from "@/lib/types";
import { SectionCard } from "./SectionCard";

export function AuditTrail({ item }: { item: Item }) {
  return (
    <SectionCard title="Audit trail">
      <ol className="space-y-2 border-l border-border pl-4">
        {item.auditEvents.slice().reverse().map((event, index) => (
          <li key={`${event.at}-${index}`} className="relative text-xs text-muted-foreground">
            <span className="absolute -left-[17px] top-1.5 h-2 w-2 rounded-full bg-primary" />
            <span className="font-medium text-foreground">{event.action}</span>
            {event.by && <span> · {event.by}</span>}
            <span className="ml-1">{new Date(event.at).toLocaleString()}</span>
            {event.note && <p className="mt-0.5">{event.note}</p>}
          </li>
        ))}
      </ol>
    </SectionCard>
  );
}
