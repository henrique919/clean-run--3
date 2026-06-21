import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LayoutDashboard, Users, FileText, Settings2, QrCode, Archive, ShieldCheck, ClipboardCheck, Monitor } from "lucide-react";
import { AppShell } from "@/components/AppShell";

const groups = [
  {
    title: "Switch view",
    items: [
      { to: "/dashboard", label: "Full Site (Desktop view)", icon: Monitor },
      { to: "/subcontractor", label: "Subcontractor Portal preview", icon: Users },
    ],
  },
  {
    title: "Reports & data",
    items: [
      { to: "/reports", label: "Reports", icon: FileText },
      { to: "/items?type=client", label: "Client Defects", icon: ClipboardCheck },
    ],
  },
  {
    title: "Admin",
    items: [
      { to: "/setup", label: "Project Setup", icon: Settings2 },
      { to: "/subcontractors", label: "Subcontractor Management", icon: Users },
      { to: "/qr", label: "QR Unit Codes", icon: QrCode },
      { to: "/qa", label: "QA / ITP", icon: ShieldCheck },
      { to: "/archive", label: "Archive", icon: Archive },
    ],
  },
] as const;

export const Route = createFileRoute("/more")({
  head: () => ({ meta: [{ title: "More — CleanRun IQ" }] }),
  component: MorePage,
});

function MorePage() {
  return (
    <AppShell title="More" subtitle="Admin & full site tools">
      <div className="space-y-5">
        {groups.map((g) => (
          <section key={g.title}>
            <h3 className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{g.title}</h3>
            <div className="overflow-hidden rounded-2xl border border-border bg-card">
              {g.items.map((it, idx) => (
                <Link
                  key={it.label}
                  to={it.to as string}
                  className={`flex items-center gap-3 px-4 py-3.5 text-sm transition hover:bg-accent ${idx > 0 ? "border-t border-border" : ""}`}
                >
                  <it.icon className="h-4 w-4 text-primary" />
                  <span className="flex-1">{it.label}</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </section>
        ))}

        <p className="px-1 text-[11px] text-muted-foreground">
          CleanRun IQ — field pilot build. Data is stored on this device.
          {/* TODO[production]: backend auth, roles, secure storage, immutable audit log */}
        </p>
      </div>
    </AppShell>
  );
}
