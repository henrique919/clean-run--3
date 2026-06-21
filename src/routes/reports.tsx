import { createFileRoute } from "@tanstack/react-router";
import { Download, FileSpreadsheet, FileText, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useItems, useSettings, isOverdue } from "@/lib/store";
import type { Item } from "@/lib/types";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — CleanRun IQ" }] }),
  component: ReportsPage,
});

const reportTypes = [
  { key: "open", label: "Open Defects Report" },
  { key: "closed", label: "Closed / Handover Evidence Report" },
  { key: "subcontractor", label: "Subcontractor Report" },
  { key: "client", label: "Client Defects Report" },
  { key: "incomplete", label: "Incomplete Works Report" },
] as const;

function ReportsPage() {
  const items = useItems();
  const settings = useSettings();

  function filterFor(key: string): Item[] {
    if (key === "open") return items.filter((i) => i.status !== "closed" && i.status !== "complete");
    if (key === "closed") return items.filter((i) => i.status === "closed" || i.status === "complete");
    if (key === "subcontractor") return items;
    if (key === "client") return items.filter((i) => i.type === "client");
    if (key === "incomplete") return items.filter((i) => i.type === "incomplete");
    return items;
  }

  function exportCsv(key: string) {
    const rows = filterFor(key);
    const header = ["ID","Type","Project","Building","Level","Unit","Room","Trade","Subcontractor","Priority","Due","Status","Description","Closed By","Closed At"];
    const lines = [header.join(",")].concat(
      rows.map((r) =>
        [r.id, r.type, r.project, r.building, r.level, r.unit, r.room, r.trade, r.subcontractor, r.priority, r.dueDate, r.status, JSON.stringify(r.description), r.closeout?.signedBy ?? "", r.closeout?.signedAt ?? ""].join(","),
      ),
    );
    download(`cleanrun-${key}-${stamp()}.csv`, lines.join("\n"), "text/csv");
  }

  function openPdf(key: string) {
    const rows = filterFor(key);
    const label = reportTypes.find((r) => r.key === key)?.label ?? "Report";
    const html = buildReportHtml({ title: label, project: settings.activeProject, items: rows });
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(html);
      w.document.close();
      setTimeout(() => w.print(), 500);
    }
  }

  return (
    <AppShell title="Reports" subtitle="PDF and Excel exports for handover">
      <div className="grid gap-3 md:grid-cols-2">
        {reportTypes.map((r) => {
          const count = filterFor(r.key).length;
          return (
            <div key={r.key} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{r.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
                </div>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openPdf(r.key)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground">
                  <Printer className="h-3.5 w-3.5" /> PDF
                </button>
                <button onClick={() => exportCsv(r.key)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium">
                  <FileSpreadsheet className="h-3.5 w-3.5" /> Excel
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Reports include CleanRun IQ branding, summary counts, photos, closeout evidence and audit signoffs.
        {/* TODO[production]: server-side PDF rendering for high-fidelity branded reports */}
      </p>
    </AppShell>
  );
}

function stamp() {
  return new Date().toISOString().slice(0, 10);
}

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function buildReportHtml({ title, project, items }: { title: string; project: string; items: Item[] }) {
  const open = items.filter((i) => i.status !== "closed" && i.status !== "complete").length;
  const closed = items.length - open;
  const overdue = items.filter(isOverdue).length;
  const date = new Date().toLocaleString();

  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title>
  <style>
    @page { margin: 18mm; }
    body { font-family: -apple-system, Inter, system-ui, sans-serif; color: #11203a; }
    header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #11203a; padding-bottom:12px; margin-bottom:18px; }
    .brand { font-weight: 700; font-size: 18px; letter-spacing: -0.01em; }
    .muted { color:#6b7280; font-size: 12px; }
    h1 { font-size: 22px; margin: 0 0 4px; }
    h2 { font-size: 14px; margin: 24px 0 10px; text-transform: uppercase; letter-spacing: .08em; color:#6b7280; }
    .stats { display:flex; gap:12px; margin: 12px 0 8px; }
    .stat { flex:1; border:1px solid #e5e7eb; border-radius:10px; padding:10px 12px; }
    .stat b { font-size:20px; display:block; }
    .item { border:1px solid #e5e7eb; border-radius:12px; padding:12px; margin-bottom:10px; page-break-inside: avoid; }
    .row { display:flex; gap:12px; }
    .thumb { width:120px; height:90px; object-fit:cover; border-radius:8px; background:#f1f5f9; }
    .meta { font-size:11px; color:#6b7280; }
    .chip { display:inline-block; padding:2px 8px; border-radius:999px; font-size:10px; background:#eef2ff; color:#3730a3; margin-right:4px; }
    .chip.closed { background:#dcfce7; color:#166534; }
    .chip.overdue { background:#fee2e2; color:#991b1b; }
    .close { margin-top:10px; padding:10px; background:#f0fdf4; border-radius:8px; font-size:11px; }
    footer { margin-top:20px; padding-top:10px; border-top:1px solid #e5e7eb; font-size:10px; color:#9ca3af; display:flex; justify-content:space-between; }
  </style></head><body>
  <header>
    <div>
      <div class="brand">CleanRun IQ</div>
      <div class="muted">The smarter way to a clean handover</div>
    </div>
    <div style="text-align:right">
      <h1>${title}</h1>
      <div class="muted">${project} · ${date}</div>
    </div>
  </header>
  <div class="stats">
    <div class="stat"><span class="muted">Total</span><b>${items.length}</b></div>
    <div class="stat"><span class="muted">Open</span><b>${open}</b></div>
    <div class="stat"><span class="muted">Closed</span><b>${closed}</b></div>
    <div class="stat"><span class="muted">Overdue</span><b>${overdue}</b></div>
  </div>
  <h2>Items</h2>
  ${items.map((i) => `
    <div class="item">
      <div class="row">
        ${i.photos[0] ? `<img class="thumb" src="${i.photos[0]}" />` : `<div class="thumb"></div>`}
        <div style="flex:1">
          <div><b>${escapeHtml(i.building)} / ${escapeHtml(i.level)} / ${escapeHtml(i.unit)} — ${escapeHtml(i.room)}</b></div>
          <div class="meta">${escapeHtml(i.trade)} · ${escapeHtml(i.subcontractor || "Unassigned")} · Due ${i.dueDate}</div>
          <p>${escapeHtml(i.description)}</p>
          <span class="chip ${i.status === "closed" || i.status === "complete" ? "closed" : ""} ${isOverdue(i) ? "overdue" : ""}">${i.status.replace(/_/g, " ")}</span>
          <span class="chip">${i.priority}</span>
        </div>
      </div>
      ${i.closeout ? `<div class="close">
        <b>Closed</b> by ${escapeHtml(i.closeout.signedBy)} (${escapeHtml(i.closeout.role)}) · ${new Date(i.closeout.signedAt).toLocaleString()}
        ${i.closeout.note ? `<div>${escapeHtml(i.closeout.note)}</div>` : ""}
        ${i.closeout.photo ? `<img class="thumb" style="margin-top:6px" src="${i.closeout.photo}" />` : ""}
      </div>` : ""}
    </div>
  `).join("")}
  <footer><span>Generated by CleanRun IQ</span><span>${date}</span></footer>
  </body></html>`;
}

function escapeHtml(s: string) {
  return (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
