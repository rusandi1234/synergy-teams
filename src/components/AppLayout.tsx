import { Link, Outlet } from "@tanstack/react-router";
import { LayoutDashboard, Users, Users2, AlertTriangle, BarChart3, Sparkles, LogOut, User, Shuffle } from "lucide-react";
import type { ReactNode } from "react";

const FACULTY_NAV = [
  { to: "/", label: "Faculty Dashboard", icon: LayoutDashboard },
  { to: "/students", label: "Students", icon: Users },
  { to: "/teams", label: "Teams", icon: Users2 },
  { to: "/conflicts", label: "Conflicts", icon: AlertTriangle },
  { to: "/rebalancing", label: "Rebalancing", icon: Shuffle },
  { to: "/analytics", label: "Analytics", icon: BarChart3 },
] as const;

const STUDENT_NAV = [
  { to: "/student", label: "My Dashboard", icon: User },
] as const;

export function AppLayout({ children, user, role = "faculty", onSignOut }: { children?: ReactNode; user?: { email: string }; role?: "faculty" | "student"; onSignOut?: () => void }) {
  const NAV = role === "student" ? STUDENT_NAV : FACULTY_NAV;
  const roleLabel = role === "student" ? "Student" : "Faculty";
  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="w-64 shrink-0 hidden md:flex flex-col relative overflow-hidden hero-gradient">
        <div className="absolute inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="absolute -top-24 -right-16 size-64 rounded-full bg-primary/30 blur-3xl pointer-events-none" />
        <div className="relative px-6 py-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl bg-primary grid place-items-center shadow-[var(--shadow-glow)]">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div>
              <div className="font-bold tracking-tight text-base">SYNERGY</div>
              <div className="text-[10px] uppercase tracking-[0.18em] opacity-70">Team Formation AI</div>
            </div>
          </div>
        </div>
        <nav className="relative px-3 py-4 flex-1 space-y-1">
          <div className="px-3 pb-2 text-[10px] uppercase tracking-[0.18em] opacity-50 font-semibold">Workspace</div>
          {NAV.map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              activeOptions={{ exact: to === "/" }}
              activeProps={{ className: "bg-primary text-primary-foreground shadow-[var(--shadow-glow)]" }}
              inactiveProps={{ className: "hover:bg-white/8 text-navy-foreground/85" }}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all"
            >
              <Icon className="size-4" /> {label}
            </Link>
          ))}
        </nav>
        <div className="relative p-3 border-t border-white/10 space-y-2">
          {user && (
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
              <div className="size-7 rounded-full bg-primary grid place-items-center text-[11px] font-bold uppercase">
                {user.email.slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1 text-xs">
                <div className="opacity-60 uppercase tracking-wider text-[9px]">{roleLabel}</div>
                <div className="truncate font-medium">{user.email}</div>
              </div>
            </div>
          )}
          {onSignOut && (
            <button
              onClick={onSignOut}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-white/5 hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              <LogOut className="size-4" /> Sign out
            </button>
          )}
          <div className="px-2 text-[10px] opacity-50">University Edition · v1.0</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="md:hidden hero-gradient text-navy-foreground px-4 py-3 flex items-center gap-3">
          <Sparkles className="size-5 text-primary" />
          <div className="font-bold">SYNERGY</div>
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
