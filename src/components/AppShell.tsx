import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  Camera,
  ClipboardList,
  Map,
  Menu,
  LayoutDashboard,
  FileText,
  HardHat,
  Settings2,
  CheckCircle2,
  Building2,
} from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useSettings, itemsStore } from "@/lib/store";

const mobileTabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/capture", label: "Capture", icon: Camera },
  { to: "/items", label: "Items", icon: ClipboardList },
  { to: "/plans", label: "Plans", icon: Map },
  { to: "/more", label: "More", icon: Menu },
] as const;

const desktopNav = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/capture", label: "Capture", icon: Camera },
  { to: "/items", label: "Items", icon: ClipboardList },
  { to: "/reports", label: "Reports", icon: FileText },
  { to: "/plans", label: "Plans", icon: Map },
  { to: "/subcontractors", label: "Subcontractors", icon: HardHat },
  { to: "/setup", label: "Project Setup", icon: Settings2 },
] as const;

export function AppShell({ children, title, subtitle, action }: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar text-sidebar-foreground lg:flex">
        <div className="flex items-center gap-2 px-5 py-5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold leading-tight">CleanRun IQ</p>
            <p className="text-[11px] text-sidebar-foreground/60">Clean handover, fast.</p>
          </div>
        </div>
        <nav className="mt-2 flex-1 space-y-0.5 px-3">
          {desktopNav.map((n) => {
            const active = pathname === n.to || pathname.startsWith(n.to + "/");
            return (
              <Link
                key={n.to}
                to={n.to}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground",
                )}
              >
                <n.icon className="h-4 w-4" />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border px-3 py-3">
          <Link
            to="/more"
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent/60"
          >
            <Menu className="h-4 w-4" /> Admin & more
          </Link>
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 border-b border-border bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-muted-foreground">CleanRun IQ</p>
            <h1 className="truncate text-base font-semibold tracking-tight">{title ?? "Field Mode"}</h1>
            {subtitle ? <p className="truncate text-xs text-muted-foreground">{subtitle}</p> : null}
          </div>
          {action}
        </div>
      </header>

      {/* Main content */}
      <main className="lg:pl-64">
        <div className="mx-auto max-w-5xl px-4 pb-28 pt-4 lg:px-8 lg:pt-8">
          <div className="mb-6 hidden items-center justify-between gap-4 lg:flex">
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-semibold tracking-tight">{title}</h1>
              {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
            </div>
            <div className="flex items-center gap-2">
              {settings.projects.length > 1 ? (
                <label className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs">
                  <Building2 className="h-3.5 w-3.5 text-muted-foreground" />
                  <select
                    value={settings.activeProject}
                    onChange={(e) => itemsStore.setActiveProject(e.target.value)}
                    className="bg-transparent text-xs font-medium outline-none"
                  >
                    {settings.projects.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </label>
              ) : null}
              {action}
            </div>
          </div>
          {children}
        </div>
      </main>


      {/* Mobile bottom nav */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5">
          {mobileTabs.map((t) => {
            const active = pathname === t.to || (t.to !== "/" && pathname.startsWith(t.to));
            const isCapture = t.to === "/capture";
            return (
              <Link
                key={t.to}
                to={t.to}
                className={cn(
                  "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
                  active ? "text-primary" : "text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full transition",
                    isCapture && "bg-primary text-primary-foreground shadow-sm",
                    !isCapture && active && "bg-primary/10",
                  )}
                >
                  <t.icon className="h-4.5 w-4.5" style={{ width: 18, height: 18 }} />
                </span>
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
