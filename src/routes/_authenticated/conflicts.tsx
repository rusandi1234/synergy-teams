import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "@/components/AppLayout";
import { MetricCard, SeverityBadge, SectionHeader } from "@/components/SynergyUI";
import { useStudents } from "@/lib/useStudents";
import { useSynergyForStudents } from "@/lib/synergy";
import { AlertTriangle, Lightbulb, AlertOctagon, Info, Shield, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/conflicts")({
  head: () => ({
    meta: [
      { title: "Conflict Report · SYNERGY" },
      { name: "description", content: "Detected team conflicts with severity, suggested fixes, and intelligent recommendations." },
    ],
  }),
  component: ConflictsPage,
});

function ConflictsPage() {
  const { data: students = [] } = useStudents();
  const { conflicts, recommendations } = useSynergyForStudents(students);
  const high = conflicts.filter(c => c.severity === "High").length;
  const med = conflicts.filter(c => c.severity === "Medium").length;
  const low = conflicts.filter(c => c.severity === "Low").length;

  return (
    <>
      <PageHeader title="Conflict Report" subtitle="Auto-detected issues with severity classification and intelligent suggested fixes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <MetricCard label="Total Conflicts" value={conflicts.length} icon={Shield} accent="navy" hint="Across all teams" />
        <MetricCard label="High Severity" value={high} icon={AlertOctagon} accent="primary" hint="Resolve before publishing" />
        <MetricCard label="Medium" value={med} icon={AlertTriangle} accent="warning" hint="Recommended fixes" />
        <MetricCard label="Low / Info" value={low} icon={Info} accent="info" hint="Optional optimisations" />
      </div>

      {!conflicts.length ? (
        <div className="surface-elevated p-12 text-center">
          <ShieldCheck className="size-10 mx-auto text-success/60 mb-3" />
          <div className="text-muted-foreground">No conflicts detected. Generate teams to populate this report.</div>
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {conflicts.map((c, i) => {
            const accent = c.severity === "High" ? "border-l-destructive" : c.severity === "Medium" ? "border-l-warning" : "border-l-info";
            const iconBg = c.severity === "High" ? "bg-destructive/10 text-destructive" : c.severity === "Medium" ? "bg-warning/15 text-warning" : "bg-info/10 text-info";
            const Icon = c.severity === "High" ? AlertOctagon : c.severity === "Medium" ? AlertTriangle : Info;
            return (
              <div key={i} className={`surface-elevated p-5 border-l-4 ${accent} hover:shadow-[var(--shadow-elegant)] transition-all`}>
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
              </div>
            );
          })}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-8 surface-elevated p-6 relative overflow-hidden">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <SectionHeader
            icon={Lightbulb}
            title="Recommendation Engine"
            subtitle="Specific moves that will raise compatibility and resolve conflicts"
          />
          <ul className="relative grid md:grid-cols-2 gap-2 text-sm">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-3 border border-border rounded-lg p-3 bg-background/60 hover:border-primary/30 transition">
                <div className="size-6 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-bold shrink-0">{i + 1}</div>
                <span className="leading-relaxed">{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
