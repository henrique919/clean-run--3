import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Item } from "@/lib/types";
import { Modal } from "./Modal";

interface Props {
  item: Item;
  onClose: () => void;
  subs: string[];
  defaultBy?: string;
  onIssue: (to: string, note?: string, reissue?: boolean) => void;
}

export function ReissueDialog({ item, onClose, subs, defaultBy, onIssue }: Props) {
  const [to, setTo] = useState(item.subcontractor || subs[0] || "");
  const [note, setNote] = useState("");
  const reissue = item.issueHistory.length > 0;
  const label = reissue ? "Re-issue" : "Issue";

  function submit() {
    if (!to) { alert("Choose a subcontractor."); return; }
    onIssue(to, note.trim() || undefined, reissue);
    onClose();
  }

  return (
    <Modal title={`${label} ${item.code}`} onClose={onClose}>
      <Label className="text-[11px] uppercase">Subcontractor</Label>
      <select value={to} onChange={(event) => setTo(event.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
        {!to && <option value="">Choose subcontractor</option>}
        {subs.map((sub) => <option key={sub} value={sub}>{sub}</option>)}
      </select>
      <Label className="mt-3 block text-[11px] uppercase">Note (optional)</Label>
      <Textarea rows={3} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Any extra context for the subcontractor" />
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={submit} className="flex-1">{label}</Button>
      </div>
      {defaultBy && <p className="mt-2 text-[11px] text-muted-foreground">Issued by {defaultBy}</p>}
    </Modal>
  );
}
