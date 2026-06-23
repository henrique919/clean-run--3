import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { itemsStore } from "@/lib/store";
import type { Item } from "@/lib/types";
import { Modal } from "./Modal";

export function RejectDialog({ item, onClose, defaultBy }: { item: Item; onClose: () => void; defaultBy: string }) {
  const [reason, setReason] = useState("");
  return (
    <Modal title={`Reject ${item.code}`} onClose={onClose}>
      <p className="text-xs text-muted-foreground">Provide a clear reason — this goes back to the subcontractor.</p>
      <Textarea rows={3} className="mt-3" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason for rejection" />
      <div className="mt-5 flex gap-2">
        <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
        <Button variant="destructive" onClick={() => { if (!reason.trim()) { alert("A rejection reason is required."); return; } itemsStore.reject(item.id, defaultBy, reason.trim()); onClose(); }} className="flex-1">Reject</Button>
      </div>
    </Modal>
  );
}
