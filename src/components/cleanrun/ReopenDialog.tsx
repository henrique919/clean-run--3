import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { itemsStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { Modal } from "./Modal";

export function ReopenDialog({ item, onClose, defaultBy }: { item: Item; onClose: () => void; defaultBy: string }) {
  const [reason, setReason] = useState("");
  const [confirmed, setConfirmed] = useState(false);

  function submit() {
    if (!reason.trim()) { alert("A reopen reason is required."); return; }
    if (!confirmed) { alert("Please confirm before reopening."); return; }
    itemsStore.reopen(item.id, defaultBy, reason.trim());
    onClose();
  }

  return (
    <Modal title={`Reopen ${item.code}`} onClose={onClose}>
      <p className="text-xs text-muted-foreground">This returns the item to In Progress. Previous closeout evidence and audit history will remain visible.</p>
      <Label className="mt-3 block text-[11px] uppercase">Reason *</Label>
      <Textarea rows={3} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Why is this item being reopened?" />
      <label className="mt-3 flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2 text-xs">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5" />
        <span>I understand this is an admin action and the previous closeout record will remain.</span>
      </label>
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button onClick={submit} className="flex-1">Reopen item</Button>
      </div>
    </Modal>
  );
}
