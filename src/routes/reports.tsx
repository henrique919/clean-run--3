import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { isOverdue, useItems, useSettings } from "@/lib/store";
import type { Item } from "@/lib/types";
import { daysInProgress, isEscalated, STATUS_LABEL, TYPE_LABEL } from "@/lib/types";

export const Route = createFileRoute("/reports")({
  head: () => ({ meta: [{ title: "Reports — CleanRun IQ" }] }),
  component: ReportsPage,
});

const reportTypes: { key: string; label: string; featured?: boolean }[] = [
  { key: "open", label: "Open Items Report" },
  { key: "overdue", label: "Overdue Items Report" },
  { key: "closed", label: "Closed / Handover Evidence Report", featured: true },
  { key: "subcontractor", label: "Subcontractor Report" },
  { key: "client", label: "Client Defects Report" },
  { key: "incomplete", label: "Incomplete Works Report" },
];

function ReportsPage() {
  const items = useItems();
  const settings = useSettings();

  function filterFor(key: string): Item[] {
    const scoped = items.filter((i) => i.project === settings.activeProject);
    if (key === "open") return scoped.filter((i) => i.status !== "closed" && i.status !== "complete");
    if (key === "overdue") return scoped.filter(isOverdue);
    if (key === "closed") return scoped.filter((i) => i.status === "closed" || i.status === "complete");
    if (key === "client") return scoped.filter((i) => i.type === "client");
    if (key === "incomplete") return scoped.filter((i) => i.type === "incomplete");
    return scoped;
  }

  function exportCsv(key: string) {
    const rows = filterFor(key);
    const header = ["Code","Type","Project","Building","Level","Unit","Room","Trade","Subcontractor","Priority","Status","Issued","Due","Days In Progress","Escalated","RaisedBy","Description","Closed By","Closed At"];
    const lines = [header.join(",")].concat(rows.map((r) => [
      r.code, r.type, r.project, r.building, r.level, r.unit, r.room, r.trade,
      r.subcontractor, r.priority, r.status, r.issuedAt ? r.issuedAt.slice(0, 10) : "", r.dueDate,
      daysInProgress(r) || "", isEscalated(r) ? "YES" : "", r.raisedBy ?? "",
      JSON.stringify(r.description), r.closeoutEvidence[0]?.by ?? "", r.closeoutEvidence[0]?.at ?? "",
    ].join(",")));
    download(`cleanrun-${key}-${stamp()}.csv`, lines.join("\n"), "text/csv");
  }

  function openPdf(key: string) {
    const rows = filterFor(key);
    const def = reportTypes.find((r) => r.key === key);
    const html = buildReportHtml({
      title: def?.label ?? "Report",
      project: settings.activeProject,
      company: settings.company ?? "",
      preparedBy: settings.preparedBy ?? "",
      isClosed: key === "closed",
      items: rows,
    });
    const w = window.open("", "_blank");
    if (w) { w.document.write(html); w.document.close(); setTimeout(() => w.print(), 500); }
  }

  return (
    <AppShell title="Reports" subtitle={`${settings.activeProject} · grouped by Building → Level`}>
      <div className="grid gap-3 md:grid-cols-2">
        {reportTypes.map((r) => {
          const count = filterFor(r.key).length;
          return (
            <div key={r.key} className={`rounded-2xl border bg-card p-4 ${r.featured ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{r.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
                  {r.featured && <p className="mt-1 text-[11px] font-medium text-primary">Recommended for handover</p>}
                </div>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openPdf(r.key)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Printer className="h-3.5 w-3.5" /> PDF</button>
                <button onClick={() => exportCsv(r.key)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="mt-6 text-xs text-muted-foreground">Closeout reports separate original issue evidence, subcontractor rectification evidence, and signed-off closeout evidence.</p>
    </AppShell>
  );
}

function stamp() { return new Date().toISOString().slice(0, 10); }

function download(name: string, content: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = name; a.click();
  URL.revokeObjectURL(url);
}

function groupByBuildingLevel(items: Item[]): Array<{ building: string; levels: Array<{ level: string; items: Item[] }> }> {
  const buildings = new Map<string, Map<string, Item[]>>();
  for (const it of items) {
    const b = it.building || "Unassigned";
    const l = it.level || "—";
    if (!buildings.has(b)) buildings.set(b, new Map());
    const levelMap = buildings.get(b)!;
    if (!levelMap.has(l)) levelMap.set(l, []);
    levelMap.get(l)!.push(it);
  }
  return Array.from(buildings.keys()).sort().map((b) => ({
    building: b,
    levels: Array.from(buildings.get(b)!.keys()).sort().map((l) => ({
      level: l,
      items: buildings.get(b)!.get(l)!.slice().sort((x, y) => x.code.localeCompare(y.code)),
    })),
  }));
}

function buildReportHtml({ title, project, company, preparedBy, isClosed, items }: { title: string; project: string; company: string; preparedBy: string; isClosed: boolean; items: Item[] }) {
  const open = items.filter((i) => i.status !== "closed" && i.status !== "complete").length;
  const closed = items.length - open;
  const overdue = items.filter(isOverdue).length;
  const escalated = items.filter(isEscalated).length;
  const date = new Date().toLocaleString();
  const groups = groupByBuildingLevel(items);
  const outstanding = items.filter((i) => i.status === "rejected");

  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)} — ${escapeHtml(project)}</title><style>
    @page{margin:12mm;size:A4 landscape}*{box-sizing:border-box}body{font-family:-apple-system,Inter,system-ui,sans-serif;color:#0f172a;font-size:10.5px;line-height:1.4}header{display:flex;justify-content:space-between;border-bottom:2px solid #0f172a;padding-bottom:10px;margin-bottom:14px}.brand{font-weight:800;font-size:18px}.brand small{display:block;font-weight:500;font-size:10px;color:#64748b}.meta{color:#64748b;font-size:10px;text-align:right}.meta b{color:#0f172a}h1{font-size:18px;margin:0 0 2px}h2.building{font-size:13px;margin:18px 0 4px;padding:7px 10px;background:#0f172a;color:#fff;border-radius:6px}h3.level{font-size:10.5px;margin:10px 0 4px;padding:4px 8px;background:#e2e8f0;border-radius:4px;text-transform:uppercase;letter-spacing:.06em}.stats{display:flex;gap:8px;margin:8px 0}.stat{flex:1;border:1px solid #e2e8f0;border-radius:8px;padding:8px 10px}.stat b{font-size:18px;display:block}.stat span{color:#64748b;font-size:9px;text-transform:uppercase}table{width:100%;border-collapse:collapse;table-layout:fixed}th{background:#f8fafc;text-align:left;font-size:9.5px;text-transform:uppercase;color:#475569;padding:6px;border-bottom:1px solid #cbd5e1}td{padding:8px 6px;border-bottom:1px solid #e2e8f0;vertical-align:top}tr.escalated td{background:#fef2f2}tr.closed td{background:#f0fdf4}.code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-weight:700}.loc-b{font-weight:600}.loc-m,.signoff{color:#64748b;font-size:9px}.status{display:inline-block;padding:1px 7px;border-radius:999px;font-size:9px;font-weight:600;background:#e2e8f0}.status.closed{background:#dcfce7;color:#166534}.status.issued{background:#dbeafe;color:#1e40af}.status.progress{background:#fef3c7;color:#92400e}.status.review{background:#ede9fe;color:#5b21b6}.status.rejected{background:#fee2e2;color:#991b1b}.pill{display:inline-block;padding:1px 6px;border-radius:999px;font-size:8.5px;font-weight:700;text-transform:uppercase;margin-right:2px}.pill.high{background:#fef3c7;color:#92400e}.pill.urgent{background:#fee2e2;color:#991b1b}.pill.over,.pill.esc{background:#dc2626;color:#fff}.photos{display:flex;flex-wrap:wrap;gap:2px}.photos img{width:44px;height:34px;object-fit:cover;border-radius:3px;border:1px solid #e2e8f0}.ev-col h5{margin:0 0 3px;font-size:8.5px;text-transform:uppercase;color:#64748b}.empty{font-size:8.5px;color:#94a3b8;font-style:italic}.ready{color:#166534;font-weight:600}.signoff-box{border:1px dashed #cbd5e1;border-radius:4px;padding:6px;text-align:center;font-size:9px;color:#64748b}.line{border-top:1px solid #94a3b8;margin-top:18px;padding-top:2px}footer{margin-top:18px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:9px;color:#94a3b8;display:flex;justify-content:space-between}.outstanding{margin-top:20px;border:1px solid #fecaca;background:#fff7f7;padding:10px 12px;border-radius:8px}.outstanding h3{margin:0 0 6px;font-size:12px;color:#991b1b}col.c-code{width:6%}col.c-loc{width:12%}col.c-stat{width:11%}col.c-orig{width:${isClosed ? "12%" : "15%"}}col.c-rect{width:${isClosed ? "12%" : "0%"}}col.c-clos{width:${isClosed ? "12%" : "0%"}}col.c-desc{width:${isClosed ? "17%" : "30%"}}col.c-resp{width:12%}col.c-sig{width:${isClosed ? "6%" : "14%"}}
  </style></head><body><header><div><div class="brand">CleanRun IQ<small>${escapeHtml(company || "The smarter way to a clean handover")}</small></div></div><div class="meta"><h1>${escapeHtml(title)}</h1><div><b>${escapeHtml(project)}</b></div><div>Generated ${escapeHtml(date)}</div>${preparedBy ? `<div>Prepared by <b>${escapeHtml(preparedBy)}</b></div>` : ""}</div></header><div class="stats"><div class="stat"><span>Total</span><b>${items.length}</b></div><div class="stat"><span>Open</span><b>${open}</b></div><div class="stat"><span>Closed</span><b>${closed}</b></div><div class="stat"><span>Overdue</span><b>${overdue}</b></div><div class="stat"><span>Escalated 10d+</span><b>${escalated}</b></div></div>${groups.length === 0 ? `<p class="meta" style="margin-top:20px">No items in scope for this report.</p>` : ""}${groups.map((g) => renderGroup(g, isClosed)).join("")}${outstanding.length > 0 ? `<div class="outstanding"><h3>Outstanding — rejected items requiring re-issue (${outstanding.length})</h3><ul>${outstanding.map((i) => `<li><b>${escapeHtml(i.code)}</b> · ${escapeHtml(i.building)} ${escapeHtml(i.unit)} · ${escapeHtml(i.subcontractor || "Unassigned")} — ${escapeHtml(i.rejectionReason ?? "Rejected on inspection")}</li>`).join("")}</ul></div>` : ""}<footer><span>Generated by CleanRun IQ${company ? ` · ${escapeHtml(company)}` : ""}</span><span>${escapeHtml(date)}</span></footer></body></html>`;
}

function renderGroup(g: { building: string; levels: Array<{ level: string; items: Item[] }> }, isClosed: boolean) {
  return `<h2 class="building">${escapeHtml(g.building)} <span style="opacity:.7;font-weight:500;font-size:11px">· ${g.levels.reduce((a, l) => a + l.items.length, 0)} item(s)</span></h2>${g.levels.map((lvl) => `<h3 class="level">${escapeHtml(lvl.level)} · ${lvl.items.length} item(s)</h3><table><colgroup><col class="c-code"/><col class="c-loc"/><col class="c-stat"/><col class="c-orig"/>${isClosed ? `<col class="c-rect"/><col class="c-clos"/>` : ""}<col class="c-desc"/><col class="c-resp"/><col class="c-sig"/></colgroup><thead><tr><th>Defect #</th><th>Location</th><th>Status / Issued</th><th>${isClosed ? "Original" : "Photos"}</th>${isClosed ? "<th>Rectification</th><th>Closeout</th>" : ""}<th>Description</th><th>Responsible</th><th>Sign-off</th></tr></thead><tbody>${lvl.items.map((i) => renderRow(i, isClosed)).join("")}</tbody></table>`).join("")}`;
}

function renderPhotos(photos: Array<string | undefined>, empty: string) {
  const valid = photos.filter((p): p is string => !!p);
  return valid.length ? `<div class="photos">${valid.slice(0, 3).map((p) => `<img src="${escapeHtml(p)}" alt="" />`).join("")}</div>` : `<div class="empty">${escapeHtml(empty)}</div>`;
}

function statusClass(s: string): string {
  if (s === "closed" || s === "complete") return "closed";
  if (s === "issued") return "issued";
  if (s === "in_progress") return "progress";
  if (s === "ready_for_review" || s === "under_inspection") return "review";
  if (s === "rejected") return "rejected";
  return "";
}

function renderRow(i: Item, isClosed: boolean): string {
  const closed = i.status === "closed" || i.status === "complete";
  const escalated = isEscalated(i);
  const overdue = isOverdue(i);
  const issued = i.issuedAt ? new Date(i.issuedAt).toLocaleDateString() : "—";
  const inProg = daysInProgress(i);
  const firstCloseout = i.closeoutEvidence[0];
  const signoff = closed && firstCloseout ? `<div class="signoff ready">✓ ${i.status === "complete" ? "Complete" : "Closed"}</div><div class="signoff"><b>${escapeHtml(firstCloseout.by)}</b><br/>${escapeHtml(firstCloseout.role)}</div><div class="signoff">${new Date(firstCloseout.at).toLocaleDateString()}</div>` : i.status === "ready_for_review" || i.status === "under_inspection" ? `<div class="signoff ready">Inspection</div><div class="signoff-box"><div class="line">Signature</div></div>` : `<div class="signoff-box"><div class="line">Pending</div></div>`;
  const rectCol = isClosed ? `<td class="ev-col"><h5>Subcontractor rectification</h5>${renderPhotos(i.rectificationEvidence.map((e) => e.photo), "No photo attached")}${i.rectificationEvidence[0]?.comment ? `<div class="signoff">${escapeHtml(i.rectificationEvidence[0].comment)}</div>` : ""}${i.rectificationEvidence[0]?.by ? `<div class="signoff">${escapeHtml(i.rectificationEvidence[0].by)}</div>` : ""}</td>` : "";
  const closeEmpty = i.type === "incomplete" && i.status === "complete" ? "Completed without photo evidence" : "No photo attached";
  const closeCol = isClosed ? `<td class="ev-col"><h5>Closeout evidence</h5>${renderPhotos(i.closeoutEvidence.map((e) => e.photo), closeEmpty)}${firstCloseout?.note ? `<div class="signoff">${escapeHtml(firstCloseout.note)}</div>` : ""}</td>` : "";
  return `<tr class="${escalated ? "escalated" : closed ? "closed" : ""}"><td><span class="code">${escapeHtml(i.code)}</span><div class="loc-m">${escapeHtml(TYPE_LABEL[i.type])}</div></td><td><div class="loc-b">${escapeHtml(i.unit || "—")}</div><div class="loc-m">${escapeHtml(i.room || "")}</div><div class="loc-m">${escapeHtml(i.building)} · ${escapeHtml(i.level)}</div>${i.raisedBy ? `<div class="loc-m">Raised: ${escapeHtml(i.raisedBy)}</div>` : ""}</td><td><span class="status ${statusClass(i.status)}">${escapeHtml(STATUS_LABEL[i.status])}</span><div class="loc-m" style="margin-top:4px">Issued: ${escapeHtml(issued)}</div><div class="loc-m">Due: ${escapeHtml(i.dueDate)}</div><div style="margin-top:4px"><span class="pill ${i.priority}">${escapeHtml(i.priority)}</span>${overdue ? `<span class="pill over">Overdue</span>` : ""}${escalated ? `<span class="pill esc">Esc ${inProg}d</span>` : ""}</div></td><td class="ev-col"><h5>Original issue evidence</h5>${renderPhotos(i.originalPhotos, "No photo attached")}</td>${rectCol}${closeCol}<td>${escapeHtml(i.description)}${i.rejectionReason ? `<div class="signoff" style="color:#991b1b;margin-top:4px">Rejected: ${escapeHtml(i.rejectionReason)}</div>` : ""}${i.closeoutEvidence.length > 1 ? `<div class="signoff">Previous closeout entries retained: ${i.closeoutEvidence.length}</div>` : ""}</td><td><div style="font-weight:600">${escapeHtml(i.subcontractor || "Unassigned")}</div><div class="loc-m">${escapeHtml(i.trade || "")}</div></td><td>${signoff}</td></tr>`;
}

function escapeHtml(s: string) {
  return (s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]!));
}
