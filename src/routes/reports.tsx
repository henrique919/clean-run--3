import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { useItems, useSettings, isOverdue } from "@/lib/store";
import type { Item } from "@/lib/types";
import { STATUS_LABEL, isEscalated, daysInProgress } from "@/lib/types";

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
    const scoped = items.filter((i) => i.project === settings.activeProject);
    if (key === "open") return scoped.filter((i) => i.status !== "closed" && i.status !== "complete");
    if (key === "closed") return scoped.filter((i) => i.status === "closed" || i.status === "complete");
    if (key === "subcontractor") return scoped;
    if (key === "client") return scoped.filter((i) => i.type === "client");
    if (key === "incomplete") return scoped.filter((i) => i.type === "incomplete");
    return scoped;
  }

  function exportCsv(key: string) {
    const rows = filterFor(key);
    const header = [
      "Code","Type","Project","Building","Level","Unit","Room","Trade",
      "Subcontractor","Priority","Status","Issued","Due","Days In Progress",
      "Escalated","Description","Closed By","Closed At",
    ];
    const lines = [header.join(",")].concat(
      rows.map((r) => [
        r.code, r.type, r.project, r.building, r.level, r.unit, r.room, r.trade,
        r.subcontractor, r.priority, r.status,
        r.issuedAt ? r.issuedAt.slice(0,10) : "",
        r.dueDate,
        daysInProgress(r) || "",
        isEscalated(r) ? "YES" : "",
        JSON.stringify(r.description),
        r.closeout?.signedBy ?? "",
        r.closeout?.signedAt ?? "",
      ].join(",")),
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
    <AppShell title="Reports" subtitle={`${settings.activeProject} · grouped by Building → Level`}>
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
        Reports group items by Building then Level, with one row per defect: code, location, status &amp; issued date, photos, description, responsible party and sign-off column for inspection.
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

/** Group items by Building then by Level, preserving a deterministic order. */
function groupByBuildingLevel(items: Item[]): Array<{
  building: string;
  levels: Array<{ level: string; items: Item[] }>;
}> {
  const buildings = new Map<string, Map<string, Item[]>>();
  for (const it of items) {
    const b = it.building || "Unassigned";
    const l = it.level || "—";
    if (!buildings.has(b)) buildings.set(b, new Map());
    const lvl = buildings.get(b)!;
    if (!lvl.has(l)) lvl.set(l, []);
    lvl.get(l)!.push(it);
  }
  const sortedBuildings = Array.from(buildings.keys()).sort();
  return sortedBuildings.map((b) => {
    const lvl = buildings.get(b)!;
    const sortedLevels = Array.from(lvl.keys()).sort();
    return {
      building: b,
      levels: sortedLevels.map((l) => ({
        level: l,
        items: lvl.get(l)!.slice().sort((x, y) => x.code.localeCompare(y.code)),
      })),
    };
  });
}

function buildReportHtml({ title, project, items }: { title: string; project: string; items: Item[] }) {
  const open = items.filter((i) => i.status !== "closed" && i.status !== "complete").length;
  const closed = items.length - open;
  const overdue = items.filter(isOverdue).length;
  const escalated = items.filter(isEscalated).length;
  const date = new Date().toLocaleString();
  const groups = groupByBuildingLevel(items);

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — ${escapeHtml(project)}</title>
  <style>
    @page { margin: 14mm; size: A4 landscape; }
    * { box-sizing: border-box; }
    body { font-family: -apple-system, Inter, system-ui, sans-serif; color: #0f172a; font-size: 11px; line-height: 1.4; }
    header { display:flex; justify-content:space-between; align-items:flex-start; border-bottom:2px solid #0f172a; padding-bottom:10px; margin-bottom:14px; }
    .brand { font-weight: 800; font-size: 16px; letter-spacing: -0.01em; }
    .tag { color:#64748b; font-size: 10px; }
    h1 { font-size: 18px; margin: 0 0 2px; }
    h2.building { font-size: 13px; margin: 18px 0 4px; padding: 6px 10px; background:#0f172a; color:#fff; border-radius:6px; }
    h3.level { font-size: 11px; margin: 10px 0 4px; padding: 4px 8px; background:#e2e8f0; color:#0f172a; border-radius:4px; text-transform: uppercase; letter-spacing: .06em; font-weight: 700; }
    .stats { display:flex; gap:8px; margin: 8px 0 4px; }
    .stat { flex:1; border:1px solid #e2e8f0; border-radius:8px; padding:8px 10px; }
    .stat b { font-size:18px; display:block; line-height: 1.1; }
    .stat span { color:#64748b; font-size: 10px; text-transform: uppercase; letter-spacing: .05em; }
    table { width: 100%; border-collapse: collapse; table-layout: fixed; }
    th { background:#f8fafc; text-align: left; font-size: 10px; text-transform: uppercase; letter-spacing: .04em; color:#475569; font-weight: 600; padding: 6px 6px; border-bottom: 1px solid #cbd5e1; }
    td { padding: 8px 6px; border-bottom: 1px solid #e2e8f0; vertical-align: top; }
    tr.escalated td { background: #fef2f2; }
    tr.closed td { background: #f0fdf4; }
    .code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-weight: 700; font-size: 11px; }
    .loc-b { font-weight: 600; }
    .loc-m { color:#64748b; font-size: 10px; }
    .status { display:inline-block; padding:1px 7px; border-radius:999px; font-size:9px; font-weight:600; background:#e2e8f0; color:#0f172a; }
    .status.closed { background:#dcfce7; color:#166534; }
    .status.issued { background:#dbeafe; color:#1e40af; }
    .status.progress { background:#fef3c7; color:#92400e; }
    .status.review { background:#ede9fe; color:#5b21b6; }
    .status.rejected { background:#fee2e2; color:#991b1b; }
    .pill { display:inline-block; padding:1px 6px; border-radius:999px; font-size:9px; font-weight:700; text-transform: uppercase; letter-spacing:.04em; }
    .pill.high { background:#fef3c7; color:#92400e; }
    .pill.urgent { background:#fee2e2; color:#991b1b; }
    .pill.over { background:#dc2626; color:#fff; }
    .pill.esc { background:#dc2626; color:#fff; }
    .photos { display:flex; gap:3px; }
    .photos img { width:54px; height:42px; object-fit:cover; border-radius:3px; background:#f1f5f9; border:1px solid #e2e8f0; }
    .desc { color:#0f172a; }
    .resp { font-weight: 600; }
    .resp-t { color:#64748b; font-size: 10px; }
    .signoff { font-size: 9px; color:#64748b; }
    .signoff.ready { color:#166534; font-weight:600; }
    .signoff-box { border:1px dashed #cbd5e1; border-radius:4px; padding: 8px 6px; text-align:center; }
    .signoff-box .line { border-top:1px solid #94a3b8; margin-top:18px; padding-top:2px; font-size:9px; color:#64748b; }
    footer { margin-top:18px; padding-top:8px; border-top:1px solid #e2e8f0; font-size:9px; color:#94a3b8; display:flex; justify-content:space-between; }
    /* Column widths */
    col.c-code { width: 7%; }
    col.c-loc  { width: 14%; }
    col.c-stat { width: 11%; }
    col.c-pho  { width: 14%; }
    col.c-desc { width: 23%; }
    col.c-resp { width: 14%; }
    col.c-sig  { width: 17%; }
  </style></head><body>
  <header>
    <div>
      <div class="brand">CleanRun IQ</div>
      <div class="tag">The smarter way to a clean handover</div>
    </div>
    <div style="text-align:right">
      <h1>${escapeHtml(title)}</h1>
      <div class="tag">${escapeHtml(project)} · ${escapeHtml(date)}</div>
    </div>
  </header>

  <div class="stats">
    <div class="stat"><span>Total</span><b>${items.length}</b></div>
    <div class="stat"><span>Open</span><b>${open}</b></div>
    <div class="stat"><span>Closed</span><b>${closed}</b></div>
    <div class="stat"><span>Overdue</span><b>${overdue}</b></div>
    <div class="stat"><span>Escalated 10d+</span><b>${escalated}</b></div>
  </div>

  ${groups.length === 0 ? `<p class="tag" style="margin-top:20px">No items in scope for this report.</p>` : ""}

  ${groups.map((g) => `
    <h2 class="building">${escapeHtml(g.building)} <span style="opacity:.7;font-weight:500;font-size:11px">· ${g.levels.reduce((a, l) => a + l.items.length, 0)} item(s)</span></h2>
    ${g.levels.map((lvl) => `
      <h3 class="level">${escapeHtml(lvl.level)} · ${lvl.items.length} item(s)</h3>
      <table>
        <colgroup>
          <col class="c-code"/><col class="c-loc"/><col class="c-stat"/><col class="c-pho"/>
          <col class="c-desc"/><col class="c-resp"/><col class="c-sig"/>
        </colgroup>
        <thead>
          <tr>
            <th>Defect #</th>
            <th>Location</th>
            <th>Status / Issued</th>
            <th>Photos</th>
            <th>Description</th>
            <th>Responsible</th>
            <th>Sign-off / Inspection</th>
          </tr>
        </thead>
        <tbody>
          ${lvl.items.map((i) => renderRow(i)).join("")}
        </tbody>
      </table>
    `).join("")}
  `).join("")}

  <footer><span>Generated by CleanRun IQ</span><span>${escapeHtml(date)}</span></footer>
  </body></html>`;
}

function statusClass(s: string): string {
  if (s === "closed" || s === "complete") return "closed";
  if (s === "issued") return "issued";
  if (s === "in_progress") return "progress";
  if (s === "ready_for_review" || s === "under_inspection") return "review";
  if (s === "rejected") return "rejected";
  return "";
}

function renderRow(i: Item): string {
  const closed = i.status === "closed" || i.status === "complete";
  const escalated = isEscalated(i);
  const overdue = isOverdue(i);
  const rowClass = escalated ? "escalated" : closed ? "closed" : "";
  const photos = i.photos.slice(0, 3).map((p) => `<img src="${p}" alt="" />`).join("");
  const issued = i.issuedAt ? new Date(i.issuedAt).toLocaleDateString() : "—";
  const inProg = daysInProgress(i);

  const signoff = closed && i.closeout
    ? `<div class="signoff ready">✓ Closed</div>
       <div class="signoff">${escapeHtml(i.closeout.signedBy)} · ${escapeHtml(i.closeout.role)}</div>
       <div class="signoff">${new Date(i.closeout.signedAt).toLocaleDateString()}</div>`
    : i.status === "ready_for_review" || i.status === "under_inspection"
      ? `<div class="signoff ready">Inspection ready</div>
         <div class="signoff-box"><div class="line">Site Manager signature</div></div>`
      : `<div class="signoff-box"><div class="line">Pending closeout</div></div>`;

  return `<tr class="${rowClass}">
    <td><span class="code">${escapeHtml(i.code)}</span></td>
    <td>
      <div class="loc-b">${escapeHtml(i.unit || "—")}</div>
      <div class="loc-m">${escapeHtml(i.room || "")}</div>
      <div class="loc-m">${escapeHtml(i.building)} · ${escapeHtml(i.level)}</div>
    </td>
    <td>
      <span class="status ${statusClass(i.status)}">${escapeHtml(STATUS_LABEL[i.status])}</span>
      <div class="loc-m" style="margin-top:4px">Issued: ${escapeHtml(issued)}</div>
      <div class="loc-m">Due: ${escapeHtml(i.dueDate)}</div>
      <div style="margin-top:4px">
        <span class="pill ${i.priority}">${escapeHtml(i.priority)}</span>
        ${overdue ? `<span class="pill over">Overdue</span>` : ""}
        ${escalated ? `<span class="pill esc">Escalated ${inProg}d</span>` : ""}
      </div>
    </td>
    <td><div class="photos">${photos || `<div class="loc-m">—</div>`}</div></td>
    <td><div class="desc">${escapeHtml(i.description)}</div></td>
    <td>
      <div class="resp">${escapeHtml(i.subcontractor || "Unassigned")}</div>
      <div class="resp-t">${escapeHtml(i.trade || "")}</div>
    </td>
    <td>${signoff}</td>
  </tr>`;
}

function escapeHtml(s: string) {
  return (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
