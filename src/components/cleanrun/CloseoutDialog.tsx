import { Camera, X } from "lucide-react";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { itemsStore } from "@/lib/store";
import type { CloseoutEvidence, Item } from "@/lib/types";
import { Modal } from "./Modal";

export function CloseoutDialog({ item, onClose, defaultBy }: { item: Item; onClose: () => void; defaultBy: string }) {
  const [signedBy, setSignedBy] = useState(defaultBy);
  const [role, setRole] = useState("Site Manager");
  const [note, setNote] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [confirmed, setConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const canSkipPhoto = item.type === "incomplete";

  function handleFile(file?: File) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setPhotos((current) => [...current, reader.result as string]);
    reader.readAsDataURL(file);
  }

  function submit() {
    if (!canSkipPhoto && photos.length === 0) { alert("At least one closeout photo is required."); return; }
    if (canSkipPhoto && photos.length === 0 && !confirm("Complete this incomplete work without photo evidence?")) return;
    if (!signedBy.trim()) { alert("Signed off by is required."); return; }
    if (!confirmed) { alert("Please confirm the item has been inspected and is acceptable for closeout."); return; }
    const evidence: Omit<CloseoutEvidence, "id" | "at">[] = photos.length
      ? photos.map((photo) => ({ photo, by: signedBy.trim(), role, note: note.trim() || undefined, confirmation: "I confirm this item has been inspected and is acceptable for closeout." }))
      : [{ by: signedBy.trim(), role, note: note.trim() || "Completed without photo evidence.", confirmation: "I confirm this item has been inspected and is acceptable for closeout." }];
    itemsStore.closeWithEvidence(item.id, evidence);
    onClose();
  }

  return (
    <Modal title={`Close out ${item.code}`} onClose={onClose}>
      <p className="mt-1 text-xs text-muted-foreground">{canSkipPhoto ? "Photo evidence is recommended for incomplete works." : "Photo evidence and sign-off are required."}</p>
      <div className="mt-4 space-y-3">
        <div>
          <Label className="text-[11px] uppercase">Closeout photos{canSkipPhoto ? "" : " *"}</Label>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          {photos.length > 0 ? (
            <div className="mt-1 grid grid-cols-3 gap-2">
              {photos.map((photo, index) => (
                <div key={index} className="relative">
                  <img src={photo} alt="" className="h-20 w-full rounded-lg object-cover" />
                  <button onClick={() => setPhotos((current) => current.filter((_, i) => i !== index))} className="absolute right-1 top-1 rounded-full bg-background/90 p-0.5"><X className="h-3 w-3" /></button>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} className="flex h-20 items-center justify-center rounded-lg border-2 border-dashed border-border text-xs text-muted-foreground">+ Add</button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()} className="mt-1 flex h-24 w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border text-sm text-muted-foreground"><Camera className="h-4 w-4" /> Take or upload photo</button>
          )}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div><Label className="text-[11px] uppercase">Signed off by *</Label><Input value={signedBy} onChange={(e) => setSignedBy(e.target.value)} placeholder="Full name" /></div>
          <div><Label className="text-[11px] uppercase">Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} /></div>
        </div>
        <div><Label className="text-[11px] uppercase">Note</Label><Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" /></div>
        <label className="flex items-start gap-2 rounded-lg border border-border bg-background/40 p-2 text-xs"><input type="checkbox" checked={confirmed} onChange={(e) => setConfirmed(e.target.checked)} className="mt-0.5" /><span>I confirm this item has been inspected and is acceptable for closeout.</span></label>
      </div>
      <div className="mt-5 flex gap-2"><Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button><Button onClick={submit} className="flex-1">Close item</Button></div>
    </Modal>
  );
}
