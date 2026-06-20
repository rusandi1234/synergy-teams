import { Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, Users2, AlertTriangle, BarChart3, Sparkles } from "lucide-react";
import type { ReactNode } from "react";

const NAV = [
  { to: "/", label: "Faculty Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/teams", label: "Teams", icon: Users2 },
  { to: "/conflicts", label: "Conflicts", icon: AlertTriangle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

export function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 bg-navy text-navy-foreground hidden md:flex flex-col">
        <div className="px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-md bg-primary grid place-items-center">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-semibold tracking-tight">SYNERGY</div>
              <div className="text-[11px] uppercase tracking-wider opacity-60">Team Formation</div>
            </div>
          </div>
        </div>
        <nav className="px-3 py-4 flex-1 space-y-1">
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-primary text-primary-foreground" }}
              inactiveProps={{ className: "hover:bg-white/5 text-navy-foreground/80" }}
              className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="p-4 text-xs opacity-60 border-t border-white/10">
          University Edition · v1.0
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden bg-navy text-navy-foreground px-4 py-3 flex items-center gap-3">
          <Sparkles className="size-5 text-primary" />
          <div className="font-semibold">SYNERGY</div>
          <nav className="ml-auto flex gap-3 text-sm">
            {NAV.map(n => (
              <Link key={n.to} to={n.to} activeOptions={{ exact: n.to === "/" }}
                activeProps={{ className: "text-primary" }}
                className="opacity-80 hover:opacity-100">
                {n.label.split(" ")[0]}
              </Link>
            ))}
          </nav>
        </header>
        <div className="p-6 md:p-8 max-w-[1400px] mx-auto">
          {children ?? <Outlet />}
        </div>
      </main>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function StatCard({ label, value, hint, accent }: { label: string; value: ReactNode; hint?: string; accent?: "primary" | "navy" | "success" | "warning" | "info" }) {
  const bar =
    accent === "primary" ? "bg-primary" :
    accent === "navy" ? "bg-navy" :
    accent === "success" ? "bg-success" :
    accent === "info" ? "bg-info" :
    accent === "warning" ? "bg-warning" : "bg-muted";
  return (
    <div className="bg-card rounded-xl border border-border p-5 shadow-sm relative overflow-hidden">
      <div className={`absolute left-0 top-0 h-full w-1 ${bar}`} />
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 text-3xl font-semibold">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Badge({ children, tone = "default" }: { children: ReactNode; tone?: "default" | "primary" | "success" | "warning" | "danger" | "info" | "navy" }) {
  const map: Record<string, string> = {
    default: "bg-muted text-foreground",
    primary: "bg-primary/10 text-primary border border-primary/20",
    success: "bg-success/10 text-success border border-success/20",
    warning: "bg-warning/15 text-foreground border border-warning/30",
    danger: "bg-destructive/10 text-destructive border border-destructive/20",
    info: "bg-info/10 text-info border border-info/20",
    navy: "bg-navy text-navy-foreground",
  };
  return <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${map[tone]}`}>{children}</span>;
}
