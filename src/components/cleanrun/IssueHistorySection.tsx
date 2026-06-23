import { Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { Item } from "@/lib/types";
import { EventList } from "./EvidenceSection";
import { SectionCard } from "./SectionCard";

export function IssueHistorySection({ item, onEmailSubcontractor }: { item: Item; onEmailSubcontractor: () => void }) {
  return (
    <SectionCard title="Assignment & issue history" icon={Mail}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm">
          <p className="font-medium">{item.subcontractor || "Unassigned"}</p>
          <p className="text-xs text-muted-foreground">{item.trade || "—"}</p>
        </div>
        <Button variant="outline" size="sm" onClick={onEmailSubcontractor}>
          <Mail className="mr-1 h-3.5 w-3.5" /> Email subcontractor
        </Button>
      </div>
      {item.issueHistory.length === 0 ? (
        <p className="text-xs text-muted-foreground">Not yet issued.</p>
      ) : (
        <EventList events={item.issueHistory.slice().reverse().map((e) => ({ id: e.at, title: e.reissue ? `Re-issued to ${e.to}` : `Issued to ${e.to}`, at: e.at, by: e.by, note: e.note }))} />
      )}
    </SectionCard>
  );
}
