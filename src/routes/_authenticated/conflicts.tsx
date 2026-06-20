import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { PageHeader } from "@/components/AppLayout";
import { MetricCard, SeverityBadge, SectionHeader } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents, rebalanceTeam, type Conflict, type Severity } from "@/lib/synergy";
import { AlertTriangle, Lightbulb, AlertOctagon, Info, Shield, ShieldCheck, Search, X } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/conflicts")({
  head: () => ({
    meta: [
      { title: "Conflict Report · SYNERGY" },
      { name: "description", content: "Detected team conflicts with severity, suggested fixes, and intelligent recommendations." },
    ],
  }),
  component: ConflictsPage,
});

const SEVERITIES: ("All" | Severity)[] = ["All", "High", "Medium", "Low"];

function ConflictsPage() {
  const { data: students = [] } = useStudents();
  const { conflicts, recommendations, teams } = useSynergyForStudents(students);

  const [severity, setSeverity] = useState<"All" | Severity>("All");
  const [team, setTeam] = useState<string>("All");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<Conflict | null>(null);

  const teamOptions = useMemo(
    () => ["All", ...Array.from(new Set(conflicts.map(c => c.teamName)))],
    [conflicts],
  );

  const filtered = conflicts.filter(c => {
    if (severity !== "All" && c.severity !== severity) return false;
    if (team !== "All" && c.teamName !== team) return false;
    if (q && !(`${c.type} ${c.teamName} ${c.suggestion}`).toLowerCase().includes(q.toLowerCase())) return false;
    return true;
  });

  const high = conflicts.filter(c => c.severity === "High").length;
  const med = conflicts.filter(c => c.severity === "Medium").length;
  const low = conflicts.filter(c => c.severity === "Low").length;

  const detailTeam = open ? teams.find(t => t.id === open.teamId) : undefined;

  return (
    <>
      <PageHeader title="Conflict Report" subtitle="Auto-detected issues with severity classification and intelligent suggested fixes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <button onClick={() => setSeverity("All")} className="text-left">
          <MetricCard label="Total Conflicts" value={conflicts.length} icon={Shield} accent="navy" hint="Click to clear filter" />
        </button>
        <button onClick={() => setSeverity("High")} className="text-left">
          <MetricCard label="High Severity" value={high} icon={AlertOctagon} accent="primary" hint="Filter to High" />
        </button>
        <button onClick={() => setSeverity("Medium")} className="text-left">
          <MetricCard label="Medium" value={med} icon={AlertTriangle} accent="warning" hint="Filter to Medium" />
        </button>
        <button onClick={() => setSeverity("Low")} className="text-left">
          <MetricCard label="Low / Info" value={low} icon={Info} accent="info" hint="Filter to Low" />
        </button>
      </div>

      {/* Filters */}
      <div className="bg-card border border-border rounded-xl p-4 mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[220px]">
          <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            value={q} onChange={e => setQ(e.target.value)}
            placeholder="Search conflicts…"
            className="w-full pl-9 pr-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
          />
        </div>
        <select value={severity} onChange={e => setSeverity(e.target.value as any)} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          {SEVERITIES.map(s => <option key={s}>{s}</option>)}
        </select>
        <select value={team} onChange={e => setTeam(e.target.value)} className="px-3 py-2 rounded-md border border-border bg-background text-sm">
          {teamOptions.map(t => <option key={t}>{t}</option>)}
        </select>
        {(severity !== "All" || team !== "All" || q) && (
          <button onClick={() => { setSeverity("All"); setTeam("All"); setQ(""); }} className="btn-ghost text-sm">
            <X className="size-4" /> Clear
          </button>
        )}
      </div>

      {!conflicts.length ? (
        <div className="surface-elevated p-12 text-center">
          <ShieldCheck className="size-10 mx-auto text-success/60 mb-3" />
          <div className="text-muted-foreground">No conflicts detected. Generate teams to populate this report.</div>
        </div>
      ) : !filtered.length ? (
        <div className="surface-elevated p-10 text-center text-sm text-muted-foreground">
          No conflicts match the current filters.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {filtered.map((c, i) => {
            const accent = c.severity === "High" ? "border-l-destructive" : c.severity === "Medium" ? "border-l-warning" : "border-l-info";
            const iconBg = c.severity === "High" ? "bg-destructive/10 text-destructive" : c.severity === "Medium" ? "bg-warning/15 text-warning" : "bg-info/10 text-info";
            const Icon = c.severity === "High" ? AlertOctagon : c.severity === "Medium" ? AlertTriangle : Info;
            return (
              <button
                key={i}
                type="button"
                onClick={() => setOpen(c)}
                className={`text-left surface-elevated p-5 border-l-4 ${accent} hover:shadow-[var(--shadow-elegant)] hover:-translate-y-0.5 transition-all`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className={`size-9 rounded-lg grid place-items-center shrink-0 ${iconBg}`}>
                      <Icon className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold truncate">{c.teamName}</div>
                      <div className="text-sm text-muted-foreground mt-0.5">{c.type}</div>
                    </div>
                  </div>
                  <SeverityBadge severity={c.severity} />
                </div>
                <div className="mt-4 rounded-lg bg-background/60 border border-border p-3 text-sm">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 font-semibold">Suggested Fix</div>
                  <div className="leading-relaxed">{c.suggestion}</div>
                </div>
                <div className="mt-3 text-[11px] text-primary font-medium">View details →</div>
              </button>
            );
          })}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-8 surface-elevated p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <SectionHeader icon={Lightbulb} title="Recommendation Engine" subtitle="Specific moves that will raise compatibility and resolve conflicts" />
          <ul className="relative grid md:grid-cols-2 gap-2 text-sm">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 border border-border rounded-lg p-3 bg-background/60">
                <div className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">{i + 1}</div>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-lg">
          {open && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={open.severity} />
                  <DialogTitle>{open.type}</DialogTitle>
                </div>
                <DialogDescription>Affecting <strong>{open.teamName}</strong></DialogDescription>
              </DialogHeader>
              <div className="space-y-4 text-sm">
                <div className="rounded-md bg-muted/40 border border-border p-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1">Suggested Fix</div>
                  <div>{open.suggestion}</div>
                </div>
                {detailTeam && (
                  <div>
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-2">Current Members</div>
                    <ul className="space-y-1.5">
                      {detailTeam.members.map(m => (
                        <li key={m.id} className="flex items-center justify-between border border-border rounded-md px-3 py-2 bg-background/60">
                          <span className="font-medium">{m.name}</span>
                          <span className="text-xs text-muted-foreground">{m.role} · {m.workload}%</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
              <DialogFooter className="gap-2">
                {detailTeam && (
                  <button
                    type="button"
                    className="btn-secondary text-sm"
                    onClick={() => {
                      const r = rebalanceTeam(detailTeam.id);
                      r.ok ? toast.success(r.message) : toast.message(r.message);
                    }}
                  >
                    Auto-Rebalance
                  </button>
                )}
                <Link to="/teams" className="btn-primary text-sm" onClick={() => setOpen(null)}>
                  Go to Team
                </Link>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
