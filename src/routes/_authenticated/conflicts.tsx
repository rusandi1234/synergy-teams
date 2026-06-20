import { createFileRoute } from "@tanstack/react-router";
import { PageHeader, Badge, StatCard } from "@/components/AppLayout";
import { useSynergy } from "@/lib/synergy";
import { AlertTriangle, Lightbulb } from "lucide-react";

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
  const { conflicts, recommendations } = useSynergy();
  const high = conflicts.filter(c => c.severity === "High").length;
  const med = conflicts.filter(c => c.severity === "Medium").length;
  const low = conflicts.filter(c => c.severity === "Low").length;

  return (
    <>
      <PageHeader title="Conflict Report" subtitle="Auto-detected issues with severity and suggested fixes." />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Total Conflicts" value={conflicts.length} accent="navy" />
        <StatCard label="High" value={high} accent="primary" />
        <StatCard label="Medium" value={med} accent="warning" />
        <StatCard label="Low" value={low} accent="success" />
      </div>

      {!conflicts.length ? (
        <div className="bg-card border border-border rounded-xl p-10 text-center text-muted-foreground">
          No conflicts detected. Generate teams to populate this report.
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-4">
          {conflicts.map((c, i) => (
            <div key={i} className={`bg-card rounded-xl p-5 border-l-4 ${
              c.severity === "High" ? "border-l-destructive border border-destructive/20"
              : c.severity === "Medium" ? "border-l-warning border border-warning/30"
              : "border-l-info border border-info/20"
            }`}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <AlertTriangle className={`size-5 mt-0.5 ${c.severity === "High" ? "text-destructive" : c.severity === "Medium" ? "text-warning" : "text-info"}`} />
                  <div>
                    <div className="font-semibold">{c.teamName}</div>
                    <div className="text-sm text-muted-foreground">{c.type}</div>
                  </div>
                </div>
                <Badge tone={c.severity === "High" ? "danger" : c.severity === "Medium" ? "warning" : "info"}>
                  {c.severity}
                </Badge>
              </div>
              <div className="mt-3 text-sm">
                <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">Suggested Fix</div>
                {c.suggestion}
              </div>
            </div>
          ))}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="mt-8 bg-card border border-border rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="size-5 text-primary" />
            <h2 className="text-lg font-semibold">Recommendation Engine</h2>
          </div>
          <ul className="space-y-2 text-sm">
            {recommendations.map((r, i) => (
              <li key={i} className="flex gap-2 border border-border rounded-md p-3 bg-background">
                <span className="text-primary mt-0.5">→</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </>
  );
}
