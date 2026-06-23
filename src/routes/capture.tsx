import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { AlertTriangle, Camera, ChevronDown, Images, Loader2, Mic, Sparkles, Square, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { activeProjectConfig, itemsStore, useSettings } from "@/lib/store";
import { RAISED_BY_OPTIONS, TRADES, type ItemType, type Priority } from "@/lib/types";
import { transcribeAndExtract } from "@/lib/voice.functions";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/capture")({
  head: () => ({
    meta: [
      { title: "Capture — CleanRun IQ" },
      { name: "description", content: "Photo-first capture for defects, incomplete works and client defects." },
    ],
  }),
  component: CapturePage,
});

interface Draft {
  project: string;
  building: string;
  level: string;
  unit: string;
  room: string;
  type: ItemType;
  trade: string;
  subcontractor: string;
  priority: Priority;
  dueDate: string;
  description: string;
  photos: string[];
  raisedBy: string;
}

const emptyDraft = (project: string, dueDays: number): Draft => ({
  project,
  building: "",
  level: "",
  unit: "",
  room: "",
  type: "defect",
  trade: "",
  subcontractor: "",
  priority: "high",
  dueDate: addDays(dueDays),
  description: "",
  photos: [],
  raisedBy: "",
});

function addDays(d: number) {
  const date = new Date();
  date.setDate(date.getDate() + d);
  return date.toISOString().slice(0, 10);
}

function CapturePage() {
  const settings = useSettings();
  const cfg = activeProjectConfig(settings);
  const navigate = useNavigate();
  const [walk, setWalk] = useState(false);
  const [walkCount, setWalkCount] = useState(0);
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(settings.activeProject, cfg.defaultDueDays));
  const cameraRef = useRef<HTMLInputElement>(null);
  const libRef = useRef<HTMLInputElement>(null);

  const [recording, setRecording] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [transcript, setTranscript] = useState<string>("");
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const transcribe = useServerFn(transcribeAndExtract);

  useEffect(() => () => { streamRef.current?.getTracks().forEach((t) => t.stop()); }, []);

  function update<K extends keyof Draft>(k: K, v: Draft[K]) {
    setDraft((d) => ({ ...d, [k]: v }));
  }

  const subOptions = useMemo(() => {
    if (!draft.trade) return settings.subcontractors;
    const filtered = settings.subcontractors.filter((s) => settings.subProfiles[s]?.trade === draft.trade);
    return filtered.length ? filtered : settings.subcontractors;
  }, [draft.trade, settings.subcontractors, settings.subProfiles]);

  function pickMime(): string | undefined {
    if (typeof MediaRecorder === "undefined") return undefined;
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/mpeg"];
    return candidates.find((c) => MediaRecorder.isTypeSupported(c));
  }

  async function startRecording() {
    try {
      const mimeType = pickMime();
      if (!mimeType) { toast.error("This browser can't record a supported audio format."); return; }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const rec = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) { toast.error("That recording was empty — please try again."); return; }
        await sendForTranscription(blob);
      };
      rec.start();
      recorderRef.current = rec;
      setRecording(true);
    } catch {
      toast.error("Microphone access denied.");
    }
  }

  function stopRecording() {
    recorderRef.current?.stop();
    recorderRef.current = null;
    setRecording(false);
  }

  async function sendForTranscription(blob: Blob) {
    setProcessing(true);
    try {
      const buf = await blob.arrayBuffer();
      const u8 = new Uint8Array(buf);
      let bin = "";
      const CHUNK = 0x8000;
      for (let i = 0; i < u8.length; i += CHUNK) bin += String.fromCharCode(...u8.subarray(i, i + CHUNK));
      const audioBase64 = btoa(bin);
      const result = await transcribe({
        data: {
          audioBase64,
          mimeType: blob.type || "audio/webm",
          projects: settings.projects,
          trades: TRADES,
          subcontractors: settings.subcontractors,
        },
      });
      setTranscript(result.transcript);
      const f = result.fields || {};
      setDraft((d) => ({
        ...d,
        building: f.building || d.building,
        level: f.level || d.level,
        unit: f.unit || d.unit,
        room: f.room || d.room,
        trade: f.trade || d.trade,
        subcontractor: f.subcontractor || d.subcontractor,
        priority: (f.priority as Priority) || d.priority,
        description: f.description ? (d.description ? `${d.description}\n${f.description}` : f.description) : d.description,
      }));
      toast.success("Voice note transcribed and applied.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Transcription failed";
      toast.error(msg);
    } finally {
      setProcessing(false);
    }
  }

  async function handleFiles(files: FileList | null) {
    if (!files) return;
    const arr = await Promise.all(
      Array.from(files).map((f) => new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(r.result as string);
        r.readAsDataURL(f);
      })),
    );
    setDraft((d) => ({ ...d, photos: [...d.photos, ...arr] }));
  }

  function validate(intent: "issue" | "save"): { ok: boolean; message?: string; warn?: string } {
    if (!draft.description.trim()) return { ok: false, message: "Add a short description before saving." };
    if (!draft.project) return { ok: false, message: "Select a project." };
    if (!draft.building.trim() || !draft.unit.trim()) return { ok: false, message: "Building and Unit are required." };

    const requiresPhoto = draft.type === "defect" || draft.type === "client";
    if (requiresPhoto && draft.photos.length === 0) {
      return { ok: false, message: `A ${draft.type === "client" ? "client defect" : "defect"} cannot be saved without at least one original photo.` };
    }
    if (draft.type === "client" && !draft.raisedBy) {
      return { ok: false, message: "Client defects require a Raised By source." };
    }
    if (intent === "issue") {
      if (!draft.trade) return { ok: false, message: "Select a trade before issuing." };
      if (!draft.subcontractor) return { ok: false, message: "Select a subcontractor before issuing." };
    }
    if (draft.type === "incomplete" && draft.photos.length === 0) {
      return { ok: true, warn: "No photo added. Incomplete works can be saved without a photo, but evidence is recommended." };
    }
    return { ok: true };
  }

  function save(next: "issue" | "next" | "view" | "nextPhoto") {
    const v = validate(next === "issue" ? "issue" : "save");
    if (!v.ok) { toast.error(v.message ?? "Required information missing."); return; }
    if (v.warn) {
      if (!confirm(v.warn + "\n\nContinue saving without a photo?")) return;
    }

    const created = itemsStore.create({
      project: draft.project,
      building: draft.building,
      level: draft.level,
      unit: draft.unit,
      room: draft.room,
      type: draft.type,
      trade: draft.trade,
      subcontractor: draft.subcontractor,
      priority: draft.priority,
      dueDate: draft.dueDate,
      description: draft.description,
      originalPhotos: draft.photos,
      raisedBy: draft.type === "client" ? draft.raisedBy : undefined,
      createdBy: settings.preparedBy,
    });

    if (next === "issue") {
      issueByMail(created.id, draft);
      navigate({ to: "/items/$id", params: { id: created.id } });
      return;
    }
    if (next === "view") {
      navigate({ to: "/items/$id", params: { id: created.id } });
      return;
    }
    setWalkCount((c) => c + 1);
    toast.success(`Saved ${created.code}`);
    // Walk capture: keep project/building/level/unit/trade/sub; clear photos + description + room.
    setDraft((d) => ({
      ...d,
      description: "",
      room: "",
      photos: [],
    }));
    if (next === "nextPhoto") setTimeout(() => cameraRef.current?.click(), 50);
  }

  return (
    <AppShell
      title="Capture Item"
      subtitle="Photo first. Assign. Issue. Close."
      action={
        <button
          onClick={() => setWalk((w) => !w)}
          className={cn(
            "rounded-full border px-3 py-1.5 text-xs font-medium transition",
            walk ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-foreground",
          )}
        >
          {walk ? `Walk · ${walkCount} captured` : "Walk Capture"}
        </button>
      }
    >
      {/* Photo block */}
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl bg-primary px-4 py-5 text-primary-foreground transition hover:brightness-110"
          >
            <Camera className="h-7 w-7" />
            <span className="text-sm font-medium">Take Photo</span>
          </button>
          <button
            type="button"
            onClick={() => libRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-5 transition hover:bg-accent"
          >
            <Images className="h-7 w-7 text-primary" />
            <span className="text-sm font-medium">Camera Roll</span>
          </button>
        </div>
        <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />
        <input ref={libRef} type="file" accept="image/*" multiple className="hidden"
          onChange={(e) => handleFiles(e.target.files)} />

        {draft.photos.length > 0 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {draft.photos.map((p, i) => (
              <div key={i} className="relative h-20 w-20 shrink-0 overflow-hidden rounded-lg">
                <img src={p} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => setDraft((d) => ({ ...d, photos: d.photos.filter((_, j) => j !== i) }))}
                  className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background/90"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          (draft.type === "defect" || draft.type === "client") && (
            <p className="mt-3 flex items-center gap-1.5 text-[11px] text-amber-700 dark:text-amber-300">
              <AlertTriangle className="h-3 w-3" />
              At least one original photo is required for {draft.type === "client" ? "client defects" : "defects"}.
            </p>
          )
        )}

        <div className="mt-3 rounded-xl border border-dashed border-border bg-background/40 p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-sm font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                Voice note → auto-fill
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                e.g. "Building 3, Unit 301, Laundry, tiling needs to be rectified, ASTW Tiling to action."
              </p>
            </div>
            {!recording ? (
              <button
                type="button"
                onClick={startRecording}
                disabled={processing}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-60"
              >
                {processing ? (<><Loader2 className="h-3.5 w-3.5 animate-spin" /> Transcribing…</>) : (<><Mic className="h-3.5 w-3.5" /> Record</>)}
              </button>
            ) : (
              <button
                type="button"
                onClick={stopRecording}
                className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-red-600 px-4 text-xs font-semibold text-white animate-pulse"
              >
                <Square className="h-3.5 w-3.5 fill-current" /> Stop
              </button>
            )}
          </div>
          {transcript && (
            <p className="mt-2 rounded-md bg-muted/50 p-2 text-[11px] italic text-muted-foreground">
              "{transcript}"
            </p>
          )}
        </div>
      </div>

      {/* Type toggle — three types */}
      <div className="mt-4 grid grid-cols-3 gap-2">
        <TypeChip active={draft.type === "defect"} onClick={() => update("type", "defect")} label="Defect" />
        <TypeChip active={draft.type === "incomplete"} onClick={() => update("type", "incomplete")} label="Incomplete" />
        <TypeChip active={draft.type === "client"} onClick={() => update("type", "client")} label="Client Defect" />
      </div>

      {/* Client-specific */}
      {draft.type === "client" && (
        <Section title="Client defect source">
          <Selectish
            label="Raised by *"
            value={draft.raisedBy}
            onChange={(v) => update("raisedBy", v)}
            options={[...RAISED_BY_OPTIONS]}
            placeholder="Who raised this?"
          />
        </Section>
      )}

      {/* Location */}
      <Section title="Location">
        <Selectish label="Project" value={draft.project} onChange={(v) => update("project", v)} options={settings.projects} />
        <div className="grid grid-cols-3 gap-2">
          <Selectish label="Building *" value={draft.building} onChange={(v) => update("building", v)} options={cfg.buildings} placeholder="Building" allowFree />
          <Selectish label="Level" value={draft.level} onChange={(v) => update("level", v)} options={cfg.levels} placeholder="Level" allowFree />
          <Field label="Unit *"><Input value={draft.unit} onChange={(e) => update("unit", e.target.value)} placeholder="e.g. 304" /></Field>
        </div>
        <Selectish label="Room / Location" value={draft.room} onChange={(v) => update("room", v)} options={cfg.rooms} placeholder="Room" allowFree />
      </Section>

      {/* Assign */}
      <Section title="Assign">
        <div className="grid grid-cols-2 gap-2">
          <Selectish label="Trade" value={draft.trade} onChange={(v) => update("trade", v)} options={TRADES} placeholder="Select trade" />
          <Selectish label="Subcontractor" value={draft.subcontractor} onChange={(v) => update("subcontractor", v)} options={subOptions} placeholder="Select sub" />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Selectish label="Priority" value={draft.priority} onChange={(v) => update("priority", v as Priority)} options={["high", "urgent"]} />
          <Field label="Due date"><Input type="date" value={draft.dueDate} onChange={(e) => update("dueDate", e.target.value)} /></Field>
        </div>
      </Section>

      {/* Description */}
      <Section title="Description">
        <Textarea
          value={draft.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Short, specific. e.g. 'Cracked tile under vanity, replace and regrout.'"
          rows={4}
        />
      </Section>

      {/* Save actions */}
      <div className="sticky bottom-20 z-20 mt-6 lg:bottom-4">
        <div className="rounded-2xl border border-border bg-card/95 p-2 shadow-lg backdrop-blur">
          <div className="grid grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => save("view")}>Save</Button>
            <Button variant="outline" onClick={() => save(walk ? "nextPhoto" : "next")}>
              Save + Next{walk ? " Photo" : ""}
            </Button>
            <Button onClick={() => save("issue")}>Issue Now</Button>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function TypeChip({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-xl border px-3 py-3 text-sm font-medium transition",
        active ? "border-primary bg-primary/5 text-primary" : "border-border bg-card text-muted-foreground",
      )}
    >
      {label}
    </button>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 space-y-2 rounded-2xl border border-border bg-card p-4">
      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h3>
      <div className="space-y-2">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function Selectish({ label, value, onChange, options, placeholder, allowFree }: {
  label: string; value: string; onChange: (v: string) => void; options: readonly string[]; placeholder?: string; allowFree?: boolean;
}) {
  const showCustom = allowFree && value && !options.includes(value);
  return (
    <Field label={label}>
      <div className="relative">
        <select
          value={showCustom ? "__custom__" : value}
          onChange={(e) => {
            if (e.target.value === "__custom__") return;
            onChange(e.target.value);
          }}
          className="h-10 w-full appearance-none rounded-md border border-input bg-background px-3 pr-8 text-sm"
        >
          {!value && <option value="">{placeholder ?? "Select…"}</option>}
          {options.map((o) => (<option key={o} value={o}>{o}</option>))}
          {allowFree && <option value="__custom__">+ Custom…</option>}
          {showCustom && <option value={value}>{value}</option>}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>
      {allowFree && (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`or type ${label.toLowerCase().replace(" *", "")}`}
          className="mt-1 h-8 text-xs"
        />
      )}
    </Field>
  );
}

function issueByMail(id: string, d: Draft) {
  const subject = `[CleanRun IQ] ${d.type === "defect" ? "Defect" : d.type === "client" ? "Client Defect" : "Incomplete Work"} — ${d.building} ${d.unit} ${d.room}`;
  const body = [
    `Project: ${d.project}`,
    `Location: ${d.building} / ${d.level} / ${d.unit} / ${d.room}`,
    `Trade: ${d.trade}`,
    `Priority: ${d.priority}`,
    `Due: ${d.dueDate}`,
    d.raisedBy ? `Raised by: ${d.raisedBy}` : "",
    "",
    d.description,
    "",
    `View item: ${typeof window !== "undefined" ? window.location.origin : ""}/items/${id}`,
    "",
    "— Issued via CleanRun IQ",
  ].filter(Boolean).join("\n");
  itemsStore.issue(id, { to: d.subcontractor || "subcontractor" });
  if (typeof window !== "undefined") {
    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }
}
