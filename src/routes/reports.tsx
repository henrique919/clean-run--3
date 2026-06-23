import { createFileRoute } from "@tanstack/react-router";
import { FileSpreadsheet, FileText, Printer } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { buildReportHtml } from "@/lib/report-builder";
import { isOverdue, useItems, useSettings } from "@/lib/store";
import type { Item } from "@/lib/types";
import { daysInProgress, isEscalated } from "@/lib/types";

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
    const scoped = items.filter((item) => item.project === settings.activeProject);
    if (key === "open") return scoped.filter((item) => item.status !== "closed" && item.status !== "complete");
    if (key === "overdue") return scoped.filter(isOverdue);
    if (key === "closed") return scoped.filter((item) => item.status === "closed" || item.status === "complete");
    if (key === "client") return scoped.filter((item) => item.type === "client");
    if (key === "incomplete") return scoped.filter((item) => item.type === "incomplete");
    return scoped;
  }

  function exportCsv(key: string) {
    const rows = filterFor(key);
    const header = ["Code", "Type", "Project", "Building", "Level", "Unit", "Room", "Trade", "Subcontractor", "Priority", "Status", "Issued", "Due", "Days In Progress", "Escalated", "RaisedBy", "Description", "Closed By", "Closed At"];
    const lines = [header.join(",")].concat(rows.map((row) => [
      row.code,
      row.type,
      row.project,
      row.building,
      row.level,
      row.unit,
      row.room,
      row.trade,
      row.subcontractor,
      row.priority,
      row.status,
      row.issuedAt ? row.issuedAt.slice(0, 10) : "",
      row.dueDate,
      daysInProgress(row) || "",
      isEscalated(row) ? "YES" : "",
      row.raisedBy ?? "",
      JSON.stringify(row.description),
      row.closeoutEvidence[0]?.by ?? "",
      row.closeoutEvidence[0]?.at ?? "",
    ].join(",")));
    download(`cleanrun-${key}-${stamp()}.csv`, lines.join("\n"), "text/csv");
  }

  function openPdf(key: string) {
    const rows = filterFor(key);
    const report = reportTypes.find((candidate) => candidate.key === key);
    const html = buildReportHtml({
      title: report?.label ?? "Report",
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
        {reportTypes.map((report) => {
          const count = filterFor(report.key).length;
          return (
            <div key={report.key} className={`rounded-2xl border bg-card p-4 ${report.featured ? "border-primary/40 ring-1 ring-primary/20" : "border-border"}`}>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-semibold">{report.label}</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">{count} item{count === 1 ? "" : "s"}</p>
                  {report.featured && <p className="mt-1 text-[11px] font-medium text-primary">Recommended for handover</p>}
                </div>
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div className="mt-4 flex gap-2">
                <button onClick={() => openPdf(report.key)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-medium text-primary-foreground"><Printer className="h-3.5 w-3.5" /> PDF</button>
                <button onClick={() => exportCsv(report.key)} className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-medium"><FileSpreadsheet className="h-3.5 w-3.5" /> Excel</button>
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
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}
