import { MessageSquare } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { itemsStore, useSettings } from "@/lib/store";
import type { Item } from "@/lib/types";
import { EventList } from "./EvidenceSection";
import { SectionCard } from "./SectionCard";

export function CommentsBlock({ item }: { item: Item }) {
  const settings = useSettings();
  const [text, setText] = useState("");
  return (
    <SectionCard title="Comments" icon={MessageSquare}>
      {item.comments.length === 0 && <p className="text-xs text-muted-foreground">No comments yet.</p>}
      {item.comments.length > 0 && <EventList events={item.comments.slice().reverse().map((c) => ({ id: c.id, title: c.by, at: c.at, note: c.text }))} />}
      <div className="flex gap-2">
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="Add a comment…" className="h-9" />
        <Button size="sm" onClick={() => { if (!text.trim()) return; itemsStore.addComment(item.id, { text: text.trim(), by: settings.preparedBy ?? "Site Manager" }); setText(""); }}>Post</Button>
      </div>
    </SectionCard>
  );
}
